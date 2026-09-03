import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { WalletService } from '@/lib/wallet-service';
import { getServiceCommission } from '@/lib/service-utils';
import { getFawryPurchaseRate, computeWalletDeltas } from '@/lib/fawry-utils';

// Helper to check if item's employee has an active open shift
async function isEmployeeShiftOpen(employeeId?: string | null, timestamp?: Date | null) {
  if (!employeeId) return false;
  const activeShift = await db.shifts.findFirst({
    where: { employee_id: employeeId, end_time: null }
  });
  if (!activeShift) return false;
  if (timestamp && activeShift.start_time) {
    return new Date(timestamp) >= new Date(activeShift.start_time);
  }
  return true;
}

// Helper to check if invoice is completed
async function isInvoiceCompleted(invoiceCode?: string | null) {
  if (!invoiceCode) return false;
  const inv = await db.invoices.findFirst({
    where: { invoice_number: invoiceCode }
  });
  return inv?.status === 'مكتملة';
}

// PUT: Edit invoice item (service, ticket, or wallet)
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { id, type, newAmount, newCount, newNotes, newFaceType, newCommission, newTransactionType, newKomandaProvider, newFawryType } = await req.json();

    if (!id || !type || newAmount === undefined) {
      return NextResponse.json({ error: 'معرف العنصر ونوعه والمبلغ الجديد مطلوبان' }, { status: 400 });
    }

    const numNewAmount = Number(newAmount);

    await db.$transaction(async (tx) => {
      if (type === 'service') {
        if (!hasPermission(user, 'services', 'update')) throw new Error('ليس لديك صلاحية تعديل خدمات الطباعة');
        const entry = await tx.service_entries.findUnique({ where: { id } });
        if (!entry) throw new Error('العنصر غير موجود');

        const isCompleted = await isInvoiceCompleted(entry.invoice_code);
        if (user.role !== 'manager') {
          if (entry.employee_id !== user.id) throw new Error('غير مصرح بتعديل هذا العنصر');
          if (isCompleted) throw new Error('لا يمكن التعديل بعد إنهاء الفاتورة');
        }

        const shiftOpen = await isEmployeeShiftOpen(entry.employee_id, entry.timestamp);

        // Adjust custody balance ONLY if shift is open
        if (shiftOpen) {
          const oldAmount = Number(entry.amount);
          const diff = numNewAmount - oldAmount;
          if (diff !== 0 && entry.employee_id) {
            await WalletService.adjustEmployeeWallet(entry.employee_id, diff, tx);
          }
        }

        const { employeeCommission, isCommissionable } = await getServiceCommission(entry.service_id, entry.service_name, numNewAmount, tx);

        await tx.service_entries.update({
          where: { id },
          data: {
            amount: numNewAmount,
            ...(newCount !== undefined ? { paper_count: Number(newCount) } : {}),
            ...(newNotes !== undefined ? { notes: newNotes } : {}),
            ...(newFaceType !== undefined ? { face_type: newFaceType } : {}),
            employee_commission: employeeCommission,
            is_commissionable: isCommissionable
          }
        });
      }
      else if (type === 'ticket') {
        const ticket = await tx.train_ticket_bookings.findUnique({ where: { id } });
        if (!ticket) throw new Error('العنصر غير موجود');

        const isCompleted = await isInvoiceCompleted(ticket.invoice_code);
        if (user.role !== 'manager') {
          if (ticket.employee_id !== user.id) throw new Error('غير مصرح بتعديل هذا العنصر');
          if (isCompleted) throw new Error('لا يمكن التعديل بعد إنهاء الفاتورة');
        }

        const shiftOpen = await isEmployeeShiftOpen(ticket.employee_id, ticket.timestamp);

        if (shiftOpen) {
          const oldAmount = Number(ticket.amount);
          const diff = numNewAmount - oldAmount;
          if (diff !== 0 && ticket.employee_id) {
            await WalletService.adjustEmployeeWallet(ticket.employee_id, diff, tx);
          }
        }

        await tx.train_ticket_bookings.update({
          where: { id },
          data: {
            amount: numNewAmount,
            ...(newCount !== undefined ? { item_count: Number(newCount) } : {}),
            ...(newNotes !== undefined ? { notes: newNotes } : {}),
          }
        });
      }
      else if (type === 'wallet') {
        const txItem = await tx.wallet_transactions.findUnique({ where: { id } });
        if (!txItem) throw new Error('العنصر غير موجود');

        const isCompleted = await isInvoiceCompleted(txItem.invoice_code);
        if (user.role !== 'manager') {
          if (txItem.employee_id !== user.id) throw new Error('غير مصرح بتعديل هذا العنصر');
          if (isCompleted) throw new Error('لا يمكن التعديل بعد إنهاء الفاتورة');
        }

        const shiftOpen = await isEmployeeShiftOpen(txItem.employee_id, txItem.timestamp);

        const targetTxType = newTransactionType || txItem.transaction_type;
        const oldAmount = Number(txItem.amount || 0);
        const oldCommission = Number(txItem.wallet_commission || 0);
        const numNewCommission = newCommission !== undefined ? Number(newCommission) : oldCommission;
        const targetFawryType = newFawryType !== undefined ? newFawryType : txItem.fawry_type;
        const fawryRate = await getFawryPurchaseRate(tx);

        // If shift is open, adjust balances
        if (shiftOpen) {
          const wallet = txItem.wallet_id ? await tx.external_wallets.findUnique({ where: { id: txItem.wallet_id } }) : null;

          const oldDeltas = computeWalletDeltas({
            amount: oldAmount,
            commission: oldCommission,
            transactionType: txItem.transaction_type,
            fawryType: txItem.fawry_type,
            walletType: wallet?.wallet_type || '',
            walletName: wallet?.wallet_name,
            fawryPurchaseRate: fawryRate,
          });
          const newDeltas = computeWalletDeltas({
            amount: numNewAmount,
            commission: numNewCommission,
            transactionType: targetTxType,
            fawryType: targetFawryType,
            walletType: wallet?.wallet_type || '',
            walletName: wallet?.wallet_name,
            fawryPurchaseRate: fawryRate,
          });

          const diffExternal = newDeltas.externalDelta - oldDeltas.externalDelta;
          const diffEmployeeCash = newDeltas.employeeCashDelta - oldDeltas.employeeCashDelta;

          if (diffExternal !== 0 && txItem.wallet_id) {
            await tx.external_wallets.update({
              where: { id: txItem.wallet_id },
              data: {
                current_balance: { increment: diffExternal },
                actual_balance: { increment: diffExternal }
              }
            });
          }

          if (diffEmployeeCash !== 0 && txItem.employee_id) {
            await WalletService.adjustEmployeeWallet(txItem.employee_id, diffEmployeeCash, tx);
          }
        }

        const netDeltas = computeWalletDeltas({
          amount: numNewAmount,
          commission: numNewCommission,
          transactionType: targetTxType,
          fawryType: targetFawryType,
          walletType: '',
          fawryPurchaseRate: fawryRate,
        });

        await tx.wallet_transactions.update({
          where: { id },
          data: {
            amount: numNewAmount,
            wallet_commission: numNewCommission,
            net_commission: netDeltas.realCommission,
            transaction_type: targetTxType,
            ...(newKomandaProvider !== undefined ? { comanda_type: newKomandaProvider } : {}),
            ...(newFawryType !== undefined ? { fawry_type: newFawryType } : {}),
            ...(newNotes !== undefined ? { description: newNotes } : {})
          }
        });
      }
      else {
        throw new Error('نوع العنصر غير معروف');
      }
    });

    return NextResponse.json({ success: true, message: 'تم تعديل البند بنجاح' });

  } catch (error: any) {
    console.error('Invoice Item Edit Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء التعديل' }, { status: 500 });
  }
}

// DELETE: Delete invoice item
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { id, type } = await req.json();

    if (!id || !type) {
      return NextResponse.json({ error: 'معرف العنصر ونوعه مطلوبان' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      if (type === 'service') {
        const entry = await tx.service_entries.findUnique({ where: { id } });
        if (!entry) throw new Error('العنصر غير موجود');

        const isCompleted = await isInvoiceCompleted(entry.invoice_code);
        if (user.role !== 'manager') {
          if (entry.employee_id !== user.id) throw new Error('غير مصرح بحذف هذا العنصر');
          if (isCompleted) throw new Error('لا يمكن الحذف بعد إنهاء الفاتورة');
        } else if (isCompleted && !hasPermission(user, 'services', 'delete')) {
          throw new Error('ليس لديك صلاحية حذف خدمات الطباعة المكتملة');
        }

        const shiftOpen = await isEmployeeShiftOpen(entry.employee_id, entry.timestamp);

        if (shiftOpen && entry.employee_id) {
          await WalletService.adjustEmployeeWallet(entry.employee_id, -Number(entry.amount), tx);
        }

        await tx.service_entries.delete({ where: { id } });
      }
      else if (type === 'ticket') {
        const ticket = await tx.train_ticket_bookings.findUnique({ where: { id } });
        if (!ticket) throw new Error('العنصر غير موجود');

        const isCompleted = await isInvoiceCompleted(ticket.invoice_code);
        if (user.role !== 'manager') {
          if (ticket.employee_id !== user.id) throw new Error('غير مصرح بحذف هذا العنصر');
          if (isCompleted) throw new Error('لا يمكن الحذف بعد إنهاء الفاتورة');
        } else if (isCompleted && !hasPermission(user, 'tickets', 'delete')) {
          throw new Error('ليس لديك صلاحية حذف التذاكر المكتملة');
        }

        const shiftOpen = await isEmployeeShiftOpen(ticket.employee_id, ticket.timestamp);

        if (shiftOpen && ticket.employee_id) {
          await WalletService.adjustEmployeeWallet(ticket.employee_id, -Number(ticket.amount), tx);
        }

        await tx.train_ticket_bookings.delete({ where: { id } });
      }
      else if (type === 'wallet') {
        const trans = await tx.wallet_transactions.findUnique({ where: { id } });
        if (!trans) throw new Error('العنصر غير موجود');

        const isCompleted = await isInvoiceCompleted(trans.invoice_code);
        if (user.role !== 'manager') {
          if (trans.employee_id !== user.id) throw new Error('غير مصرح بحذف هذا العنصر');
          if (isCompleted) throw new Error('لا يمكن الحذف بعد إنهاء الفاتورة');
        } else if (isCompleted && !hasPermission(user, 'charge_history', 'delete')) {
          throw new Error('ليس لديك صلاحية حذف العمليات المالية والشحن المكتملة');
        }

        const shiftOpen = await isEmployeeShiftOpen(trans.employee_id, trans.timestamp);

        if (shiftOpen) {
          const wallet = trans.wallet_id ? await tx.external_wallets.findUnique({ where: { id: trans.wallet_id } }) : null;
          const fawryRate = await getFawryPurchaseRate(tx);

          // نحسب نفس التغيرات اللي حصلت وقت الإنشاء، ونعكسها بالسالب
          const deltas = computeWalletDeltas({
            amount: Number(trans.amount),
            commission: Number(trans.wallet_commission || 0),
            transactionType: trans.transaction_type,
            fawryType: trans.fawry_type,
            walletType: wallet?.wallet_type || '',
            walletName: wallet?.wallet_name,
            fawryPurchaseRate: fawryRate,
          });

          if (trans.employee_id) {
            await WalletService.adjustEmployeeWallet(trans.employee_id, -deltas.employeeCashDelta, tx);
          }
          if (trans.wallet_id) {
            await tx.external_wallets.update({
              where: { id: trans.wallet_id },
              data: {
                current_balance: { increment: -deltas.externalDelta },
                actual_balance: { increment: -deltas.externalDelta }
              }
            });
          }
        }

        await tx.wallet_transactions.delete({ where: { id } });
      }
    });

    return NextResponse.json({ success: true, message: 'تم حذف العنصر بنجاح' });

  } catch (error: any) {
    console.error('Invoice Item Delete Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء الحذف' }, { status: 500 });
  }
}
