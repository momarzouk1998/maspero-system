import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WalletService } from '@/lib/wallet-service';

// PUT: Edit invoice item (service or ticket) — adjust amount difference in custody
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { id, type, newAmount, newCount, newNotes, newFaceType, newCommission } = await req.json();

    if (!id || !type || newAmount === undefined) {
      return NextResponse.json({ error: 'معرف العنصر ونوعه والمبلغ الجديد مطلوبان' }, { status: 400 });
    }

    const numNewAmount = Number(newAmount);

    await db.$transaction(async (tx) => {
      if (type === 'service') {
        const entry = await tx.service_entries.findUnique({ where: { id } });
        if (!entry) throw new Error('العنصر غير موجود');
        if (entry.employee_id !== user.id && user.role !== 'manager') throw new Error('غير مصرح بتعديل هذا العنصر');

        const oldAmount = Number(entry.amount);
        const diff = numNewAmount - oldAmount;

        // adjust custody by the difference only
        if (diff !== 0) {
          await WalletService.adjustEmployeeWallet(entry.employee_id!, diff, tx);
        }

        await tx.service_entries.update({
          where: { id },
          data: {
            amount: numNewAmount,
            ...(newCount !== undefined ? { paper_count: Number(newCount) } : {}),
            ...(newNotes !== undefined ? { notes: newNotes } : {}),
            ...(newFaceType !== undefined ? { face_type: newFaceType } : {}),
          }
        });
      }
      else if (type === 'ticket') {
        const ticket = await tx.train_ticket_bookings.findUnique({ where: { id } });
        if (!ticket) throw new Error('العنصر غير موجود');
        if (ticket.employee_id !== user.id && user.role !== 'manager') throw new Error('غير مصرح بتعديل هذا العنصر');

        const oldAmount = Number(ticket.amount);
        const diff = numNewAmount - oldAmount;

        if (diff !== 0) {
          await WalletService.adjustEmployeeWallet(ticket.employee_id!, diff, tx);
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
        if (txItem.employee_id !== user.id && user.role !== 'manager') throw new Error('غير مصرح بتعديل هذا العنصر');

        const oldAmount = Number(txItem.amount || 0);
        const oldCommission = Number(txItem.wallet_commission || 0);
        const numNewCommission = newCommission !== undefined ? Number(newCommission) : oldCommission;

        const wallet = txItem.wallet_id ? await tx.external_wallets.findUnique({ where: { id: txItem.wallet_id } }) : null;

        const oldBalanceChange = txItem.transaction_type === 'إيداع' ? -oldAmount : oldAmount;
        const newBalanceChange = txItem.transaction_type === 'إيداع' ? -numNewAmount : numNewAmount;
        const diffExternal = newBalanceChange - oldBalanceChange;

        const isDrawer = wallet ? (wallet.wallet_type === 'درج كاشير' || wallet.wallet_name.includes('درج')) : false;
        const oldEmployeeCash = isDrawer
          ? (txItem.transaction_type === 'إيداع' ? -oldAmount : oldAmount)
          : (txItem.transaction_type === 'إيداع' ? (oldAmount + oldCommission) : -(oldAmount - oldCommission));

        const newEmployeeCash = isDrawer
          ? (txItem.transaction_type === 'إيداع' ? -numNewAmount : numNewAmount)
          : (txItem.transaction_type === 'إيداع' ? (numNewAmount + numNewCommission) : -(numNewAmount - numNewCommission));

        const diffEmployeeCash = newEmployeeCash - oldEmployeeCash;

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

        await tx.wallet_transactions.update({
          where: { id },
          data: {
            amount: numNewAmount,
            wallet_commission: numNewCommission,
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

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { id, type } = await req.json();

    if (!id || !type) {
      return NextResponse.json({ error: 'معرف العنصر ونوعه مطلوبان' }, { status: 400 });
    }

    // Only allow deletion if it belongs to the user, OR if the user is manager.
    // In POS, the employee can delete items from their current invoice before it's "closed".
    // Since there's no strict "closed" state yet, we just allow deleting their own items.

    await db.$transaction(async (tx) => {
      if (type === 'service') {
        const entry = await tx.service_entries.findUnique({ where: { id } });
        if (!entry) throw new Error('العنصر غير موجود');
        if (entry.employee_id !== user.id && user.role !== 'manager') throw new Error('غير مصرح بحذف هذا العنصر');

        // Revert wallet
        await WalletService.adjustEmployeeWallet(entry.employee_id!, -Number(entry.amount), tx);
        await tx.service_entries.delete({ where: { id } });
      }
      else if (type === 'ticket') {
        const ticket = await tx.train_ticket_bookings.findUnique({ where: { id } });
        if (!ticket) throw new Error('العنصر غير موجود');
        if (ticket.employee_id !== user.id && user.role !== 'manager') throw new Error('غير مصرح بحذف هذا العنصر');

        // Revert wallet
        await WalletService.adjustEmployeeWallet(ticket.employee_id!, -Number(ticket.amount), tx);
        await tx.train_ticket_bookings.delete({ where: { id } });
      }
      else if (type === 'wallet') {
        const trans = await tx.wallet_transactions.findUnique({ where: { id } });
        if (!trans) throw new Error('العنصر غير موجود');
        if (trans.employee_id !== user.id && user.role !== 'manager') throw new Error('غير مصرح بحذف هذا العنصر');

        // Revert wallet balance & employee custody based on transaction type
        const totalAmount = Number(trans.amount) + Number(trans.wallet_commission);
        const externalWallet = await tx.external_wallets.findUnique({ where: { id: trans.wallet_id! } });
        if (!externalWallet) throw new Error('المحفظة غير موجودة');

        if (trans.transaction_type === 'إيداع') {
          // It was a deposit (we subtracted from custody, added to external wallet) -> WAIT NO: 
          // New logic: It was a deposit (we added to custody, subtracted from external wallet)
          // Revert: Subtract from custody, add back to external wallet
          await WalletService.adjustEmployeeWallet(trans.employee_id!, -totalAmount, tx);
          await tx.external_wallets.update({
            where: { id: trans.wallet_id! },
            data: {
              current_balance: { increment: Number(trans.amount) },
              actual_balance: { increment: Number(trans.amount) }
            }
          });
        } else if (trans.transaction_type === 'سحب') {
          // New logic: It was a withdrawal (we subtracted from custody, added to external wallet)
          // Revert: Add to custody, subtract from external wallet
          await WalletService.adjustEmployeeWallet(trans.employee_id!, totalAmount, tx);
          await tx.external_wallets.update({
            where: { id: trans.wallet_id! },
            data: {
              current_balance: { decrement: Number(trans.amount) },
              actual_balance: { decrement: Number(trans.amount) }
            }
          });
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
