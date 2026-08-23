import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET custody items (wallets, machines, cash drawers) & shift custody status
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    // 1. Fetch active shifts
    const activeShifts = await db.shifts.findMany({
      where: { end_time: null },
      select: { id: true, employee_id: true, employee_name: true, start_time: true }
    });

    const isUserShiftActive = activeShifts.some((s: any) => s.employee_id === user.id);
    const activeColleaguesCount = activeShifts.filter((s: any) => s.employee_id !== user.id).length;
    const isMorningOrSoloShift = activeColleaguesCount === 0;

    // 2. Ensure the 3 exact cash drawers exist and are active
    const targetDrawerNames = ['درج كاشير 1', 'درج كاشير 2', 'درج كاشير 3'];
    for (let idx = 0; idx < 3; idx++) {
      const name = targetDrawerNames[idx];
      const existing = await db.external_wallets.findFirst({
        where: {
          OR: [
            { wallet_name: name },
            { wallet_name: `درج كاش ${idx + 1}` },
            { wallet_name: `درج كاشير ${idx + 1}` }
          ]
        }
      });

      if (!existing) {
        await db.external_wallets.create({
          data: {
            wallet_name: name,
            wallet_type: 'درج كاشير',
            current_balance: 0,
            actual_balance: 0,
            sort: idx + 1,
            is_active: true
          }
        });
      } else {
        await db.external_wallets.update({
          where: { id: existing.id },
          data: {
            wallet_name: name,
            wallet_type: 'درج كاشير',
            is_active: true
          }
        });
      }
    }

    // 3. Fetch all active external wallets, machines & cash drawers
    const allCustodyItems = await db.external_wallets.findMany({
      where: { is_active: true },
      orderBy: [{ wallet_type: 'asc' }, { sort: 'asc' }]
    });

    // Group items into Wallets, Machines, Cash Drawers
    const drawers = allCustodyItems.filter((i: any) => i.wallet_type === 'درج كاشير' || i.wallet_name.includes('درج'));
    const wallets = allCustodyItems.filter((i: any) => i.wallet_type === 'محفظة' && !i.wallet_name.includes('درج'));
    const machines = allCustodyItems.filter((i: any) => i.wallet_type === 'ماكينة' && !i.wallet_name.includes('درج'));

    // 4. Check items in current user's custody
    const itemsInUserCustody = allCustodyItems.filter((i: any) => i.custodian_id === user.id);

    // 5. Calculate online cashiers summary (active shift cashiers & cash balances)
    const userRecords = await db.users.findMany({
      where: { is_active: true },
      select: { id: true, name: true, short_name: true, wallet_balance: true }
    });

    const activeUserIds = new Set(userRecords.map(u => u.id));

    const onlineCashiers = activeShifts
      .filter((s: any) => s.employee_id && activeUserIds.has(s.employee_id))
      .map((s: any) => {
        const uRec = userRecords.find((u: any) => u.id === s.employee_id);
        const bal = Number(uRec?.wallet_balance || 0);

        let displayName = uRec?.short_name || s.employee_name || 'موظف';
        if (!uRec?.short_name) {
          if (displayName.startsWith('أ/ ')) {
            displayName = displayName.replace(/^أ\/\s*/, '').trim();
          }
          if (displayName.includes(' ')) {
            displayName = displayName.split(' ')[0];
          }
        }

        return {
          id: s.employee_id,
          name: displayName,
          fullName: s.employee_name || 'موظف',
          balance: Math.round(bal)
        };
      });

    // 6. Pending handover requests sent to user
    const pendingHandovers = await db.wallet_custody_handovers.findMany({
      where: { receiver_id: user.id, status: 'PENDING' },
      orderBy: { created_at: 'desc' }
    });

    // 7. Check if sales are locked (Rules 1 & 2)
    let isSalesLocked = false;
    let lockReason = '';

    const currentUserRecord = userRecords.find(u => u.id === user.id);
    const userCashBalance = Number(currentUserRecord?.wallet_balance || 0);

    if (!isUserShiftActive) {
      isSalesLocked = true;
      lockReason = 'صفحة البيع مغلقة لحين بدء الشفت. برجاء بدء الشفت أولاً من صفحة الشفتات والعهدة.';
    } else if (user.role !== 'manager' && userCashBalance <= 0) {
      isSalesLocked = true;
      lockReason = 'صفحة البيع مغلقة لأن رصيد عهدة الكاش يساوي صفر. برجاء استلام عهدة كاش للبدء في البيع.';
    }

    const formattedDrawers = drawers.map((d: any) => ({
      ...d,
      actual_balance: Number(d.actual_balance || d.current_balance || 0),
      current_balance: Number(d.actual_balance || d.current_balance || 0)
    }));

    const activeShiftEmployeeIds = new Set(activeShifts.map((s: any) => s.employee_id));

    const assignedWalletIds = allCustodyItems
      .filter((i: any) =>
        i.wallet_type !== 'درج كاشير' &&
        !i.wallet_name.includes('درج') &&
        i.custodian_name !== 'ماسـبيرو (المركز)' &&
        i.custodian_name !== 'ماسبيرو (المركز)' &&
        i.custodian_id !== null &&
        activeShiftEmployeeIds.has(i.custodian_id)
      )
      .map((i: any) => i.id);

    return NextResponse.json({
      isUserShiftActive,
      isMorningOrSoloShift,
      activeColleaguesCount,
      isSalesLocked,
      lockReason,
      userCashBalance,
      assignedWalletIds,
      wallets,
      machines,
      drawers: formattedDrawers,
      itemsInUserCustody,
      onlineCashiers,
      pendingHandovers,
      myCustodyBalance: userCashBalance
    });

  } catch (error: any) {
    console.error('Custody GET Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء جلب العهدة' }, { status: 500 });
  }
}

// POST: Receive, Fast Confirm (Like 👍), Deliver, Deliver All to Maspero, or Deposit to Drawer
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const body = await req.json();
    const { action, walletId, actualBalance, discrepancyReason, receiverId, amount, notes } = body;

    // --- Action: Deliver Cash Custody to Drawer (Transfer Cash Custody to Drawer for next shift) ---
    if (action === 'deliver_to_drawer') {
      const drawerId = walletId;

      if (!drawerId) {
        return NextResponse.json({ error: 'برجاء تحديد الدرج' }, { status: 400 });
      }

      const drawer = await db.external_wallets.findUnique({ where: { id: drawerId } });
      if (!drawer || (drawer.wallet_type !== 'درج كاشير' && !drawer.wallet_name.includes('درج'))) {
        return NextResponse.json({ error: 'درج الكاشير غير موجود' }, { status: 404 });
      }

      const dbUser = await db.users.findUnique({ where: { id: user.id } });
      const empCustodyBal = Number(dbUser?.wallet_balance || 0);

      if (empCustodyBal <= 0) {
        return NextResponse.json({ error: 'عذراً، ليس لديك عهدة كاش لتسليمها بالدرج!' }, { status: 400 });
      }

      const deliverAmount = amount ? Number(amount) : empCustodyBal;

      if (deliverAmount > empCustodyBal) {
        return NextResponse.json({ error: `المبلغ المطلوب (${deliverAmount}) أكبر من عهدة الكاش المتاحة لديك (${empCustodyBal})` }, { status: 400 });
      }

      const today = new Date();
      const monthStr = `${today.getFullYear()} ${today.getMonth() + 1}`;

      await db.$transaction(async (tx: any) => {
        // 1. Transfer cash custody into cash drawer balance
        await tx.external_wallets.update({
          where: { id: drawerId },
          data: {
            current_balance: { increment: deliverAmount },
            actual_balance: { increment: deliverAmount },
            custodian_id: user.id,
            custodian_name: `${user.name} (سلم بالدرج)`
          }
        });

        // 2. Deduct delivered cash from employee's personal cash custody balance
        await tx.users.update({
          where: { id: user.id },
          data: { wallet_balance: { decrement: deliverAmount } }
        });

        // 3. Log transaction
        await tx.wallet_transactions.create({
          data: {
            date: today,
            transaction_month: monthStr,
            time_str: today.toLocaleTimeString('en-US'),
            wallet_id: drawerId,
            wallet_name: drawer.wallet_name,
            transaction_type: 'تسليم للدرج',
            wallet_type: 'درج كاشير',
            amount: deliverAmount,
            description: `تسليم عهدة كاش الموظف (${user.name}) بالدرج (${drawer.wallet_name}) للموظف التالي`,
            employee_id: user.id,
            employee_name: user.name,
            timestamp: today
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: `تم تسليم ${deliverAmount} ج من عهدتك النقدية بالدرج (${drawer.wallet_name}) بنجاح 📥`
      });
    }

    // --- Deliver All Items directly to Maspero Center (Single Click Day Closing) ---
    if (action === 'deliver_all') {
      const { drawerId } = body;

      const dbUser = await db.users.findUnique({ where: { id: user.id } });
      const empCustodyBal = Number(dbUser?.wallet_balance || 0);

      if (empCustodyBal > 0 && !drawerId) {
        return NextResponse.json({ error: 'برجاء تحديد درج الكاشير لتسليم العهدة النقدية به' }, { status: 400 });
      }

      const userItems = await db.external_wallets.findMany({
        where: { is_active: true, custodian_id: user.id }
      });

      const walletsAndMachines = userItems.filter(
        (i: any) => i.wallet_type !== 'درج كاشير' && !i.wallet_name.includes('درج')
      );

      const today = new Date();
      const monthStr = `${today.getFullYear()} ${today.getMonth() + 1}`;

      await db.$transaction(async (tx: any) => {
        // 1. Handover held wallets & machines to Maspero Center
        for (const item of walletsAndMachines) {
          const bal = Number(item.actual_balance || item.current_balance || 0);
          await tx.wallet_custody_handovers.create({
            data: {
              wallet_id: item.id,
              wallet_name: item.wallet_name,
              sender_id: user.id,
              sender_name: user.name,
              receiver_id: null,
              receiver_name: 'ماسـبيرو (المركز)',
              balance_at_time: bal,
              expected_balance: bal,
              actual_balance: bal,
              difference: 0,
              status: 'ACCEPTED',
              review_status: 'تم تسليم العهدة لماسبيرو',
              responded_at: today
            }
          });

          await tx.external_wallets.update({
            where: { id: item.id },
            data: {
              custodian_id: null,
              custodian_name: 'ماسـبيرو (المركز)'
            }
          });
        }

        // 2. Deliver cash custody to selected cashier drawer if balance > 0
        if (empCustodyBal > 0 && drawerId) {
          const drawer = await tx.external_wallets.findUnique({ where: { id: drawerId } });
          if (drawer) {
            await tx.external_wallets.update({
              where: { id: drawerId },
              data: {
                current_balance: { increment: empCustodyBal },
                actual_balance: { increment: empCustodyBal },
                custodian_id: user.id,
                custodian_name: `${user.name} (سلم بالدرج)`
              }
            });

            await tx.users.update({
              where: { id: user.id },
              data: { wallet_balance: 0 }
            });

            await tx.wallet_transactions.create({
              data: {
                date: today,
                transaction_month: monthStr,
                time_str: today.toLocaleTimeString('en-US'),
                wallet_id: drawerId,
                wallet_name: drawer.wallet_name,
                transaction_type: 'تسليم للدرج',
                amount: empCustodyBal,
                wallet_commission: 0,
                employee_id: user.id,
                employee_name: user.name,
                description: `تسليم مجمع لعهدة الكاش بالدرج (${drawer.wallet_name})`
              }
            });
          }
        }
      });

      return NextResponse.json({
        success: true,
        message: 'تم تسليم عهدة الكاش للدرج وتسليم المحافظ والماكينات لـ (ماسـبيرو - المركز) بنجاح 🏛️'
      });
    }

    if (!walletId) {
      return NextResponse.json({ error: 'معرف العهدة مطلوب' }, { status: 400 });
    }

    const item = await db.external_wallets.findUnique({ where: { id: walletId } });
    if (!item) {
      return NextResponse.json({ error: 'العهدة غير موجودة' }, { status: 404 });
    }

    const expectedBalance = Number(item.actual_balance || item.current_balance || 0);

    // --- Action: Fast Confirm (Like 👍) ---
    if (action === 'fast_receive') {
      const updatedItem = await db.$transaction(async (tx: any) => {
        await tx.wallet_custody_handovers.create({
          data: {
            wallet_id: walletId,
            wallet_name: item.wallet_name,
            sender_id: item.custodian_id || undefined,
            sender_name: item.custodian_name || 'النظام',
            receiver_id: user.id,
            receiver_name: user.name,
            balance_at_time: expectedBalance,
            expected_balance: expectedBalance,
            actual_balance: expectedBalance,
            difference: 0,
            status: 'ACCEPTED',
            review_status: 'تم المطابقة',
            responded_at: new Date()
          }
        });

        const isDrawer = item.wallet_type === 'درج كاشير' || item.wallet_name.includes('درج');

        if (isDrawer && expectedBalance > 0) {
          // Transfer drawer cash to receiving employee's personal cash custody
          await tx.users.update({
            where: { id: user.id },
            data: { wallet_balance: { increment: expectedBalance } }
          });
        }

        return await tx.external_wallets.update({
          where: { id: walletId },
          data: {
            custodian_id: user.id,
            custodian_name: user.name,
            actual_balance: isDrawer ? 0 : expectedBalance,
            current_balance: isDrawer ? 0 : expectedBalance
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: `تم استلام وتأكيد (${item.wallet_name}) بنجاح 👍`,
        item: updatedItem
      });
    }

    // --- Action: Custom Receive (Dislike 👎 or entering typed actual balance) ---
    if (action === 'receive') {
      if (actualBalance === undefined || actualBalance === null) {
        return NextResponse.json({ error: 'برجاء كتابة المبلغ الفعلي في يدك' }, { status: 400 });
      }

      const numActual = Number(actualBalance);
      const diff = numActual - expectedBalance;

      if (diff !== 0 && (!discrepancyReason || !discrepancyReason.trim())) {
        return NextResponse.json({ 
          error: `يوجد فارق قدره (${diff > 0 ? '+' : ''}${diff.toFixed(2)}) بين المتوقع والفعلي. برجاء توضيح سبب الاختلاف.` 
        }, { status: 400 });
      }

      let reviewStatus = 'تم المطابقة';
      if (diff !== 0) {
        if (item.wallet_type === 'محفظة' && diff <= -3 && diff >= -10) {
          reviewStatus = 'عجز طبيعي (رسوم)';
        } else if (item.wallet_type === 'ماكينة' && diff >= 20 && diff <= 30) {
          reviewStatus = 'زيادة طبيعية (عمولات)';
        } else {
          reviewStatus = 'الرجاء المراجعة';
        }
      }

      const updatedItem = await db.$transaction(async (tx: any) => {
        await tx.wallet_custody_handovers.create({
          data: {
            wallet_id: walletId,
            wallet_name: item.wallet_name,
            sender_id: item.custodian_id || undefined,
            sender_name: item.custodian_name || 'النظام',
            receiver_id: user.id,
            receiver_name: user.name,
            balance_at_time: expectedBalance,
            expected_balance: expectedBalance,
            actual_balance: numActual,
            difference: diff,
            status: 'ACCEPTED',
            review_status: reviewStatus,
            discrepancy_reason: discrepancyReason || undefined,
            responded_at: new Date()
          }
        });

        const isDrawer = item.wallet_type === 'درج كاشير' || item.wallet_name.includes('درج');
        if (isDrawer && numActual > 0) {
          await tx.users.update({
            where: { id: user.id },
            data: { wallet_balance: { increment: numActual } }
          });
        }

        return await tx.external_wallets.update({
          where: { id: walletId },
          data: {
            custodian_id: user.id,
            custodian_name: user.name,
            actual_balance: isDrawer ? 0 : numActual,
            current_balance: isDrawer ? 0 : numActual
          }
        });
      });

      return NextResponse.json({ 
        success: true, 
        message: `تم تحديث واستلام (${item.wallet_name}) بنجاح`,
        item: updatedItem 
      });
    }

    // --- Action: Deliver Custody to another employee or Maspero Center ---
    if (action === 'deliver') {
      if (item.custodian_id !== user.id && user.role !== 'manager') {
        return NextResponse.json({ error: 'أنت لست المرافق الحالي لهذه العهدة' }, { status: 403 });
      }

      if (!receiverId) {
        return NextResponse.json({ error: 'برجاء اختيار الموظف المستلم أو (ماسـبيرو)' }, { status: 400 });
      }

      const numActual = actualBalance !== undefined && actualBalance !== null && actualBalance !== '' ? Number(actualBalance) : expectedBalance;
      const diff = numActual - expectedBalance;

      let rId = receiverId;
      let rName = 'ماسـبيرو (المركز)';

      if (receiverId !== 'maspero') {
        const receiver = await db.users.findUnique({ where: { id: receiverId } });
        if (!receiver) return NextResponse.json({ error: 'الموظف المستلم غير موجود' }, { status: 404 });
        rId = receiver.id;
        rName = receiver.name;
      }

      // If delivered to Maspero Center directly, update item custodian to Maspero
      if (receiverId === 'maspero') {
        await db.$transaction(async (tx: any) => {
          await tx.wallet_custody_handovers.create({
            data: {
              wallet_id: walletId,
              wallet_name: item.wallet_name,
              sender_id: user.id,
              sender_name: user.name,
              receiver_id: null,
              receiver_name: 'ماسـبيرو (المركز)',
              balance_at_time: expectedBalance,
              expected_balance: expectedBalance,
              actual_balance: numActual,
              difference: diff,
              status: 'ACCEPTED',
              review_status: diff !== 0 ? 'الرجاء المراجعة' : 'تم مطابقة التسليم لماسبيرو',
              ...(notes ? { notes } : {})
            }
          });

          await tx.external_wallets.update({
            where: { id: walletId },
            data: {
              custodian_id: null,
              custodian_name: 'ماسـبيرو (المركز)',
              actual_balance: numActual,
              current_balance: numActual
            }
          });
        });

        return NextResponse.json({
          success: true,
          message: `تم تسليم (${item.wallet_name}) إلى (ماسـبيرو - المركز) بنجاح.`
        });
      }

      await db.wallet_custody_handovers.create({
        data: {
          wallet_id: walletId,
          wallet_name: item.wallet_name,
          sender_id: user.id,
          sender_name: user.name,
          receiver_id: rId,
          receiver_name: rName,
          balance_at_time: expectedBalance,
          expected_balance: expectedBalance,
          actual_balance: numActual,
          difference: diff,
          status: 'PENDING',
          review_status: diff !== 0 ? 'الرجاء المراجعة' : 'تم المطابقة',
          ...(notes ? { notes } : {})
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `تم إرسال طلب تسليم (${item.wallet_name}) إلى (${rName}).` 
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });

  } catch (error: any) {
    console.error('Custody POST Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في عملية العهدة' }, { status: 500 });
  }
}

// Manager Review / Confirm Handover
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { handoverId, reviewStatus, notes } = await req.json();
    if (!handoverId) return NextResponse.json({ error: 'معرف التسليم مطلوب' }, { status: 400 });

    const updated = await db.wallet_custody_handovers.update({
      where: { id: handoverId },
      data: {
        review_status: reviewStatus || 'تم المراجعة بواسطة المدير',
        ...(notes !== undefined ? { notes } : {})
      }
    });

    return NextResponse.json({ success: true, handover: updated });
  } catch (error: any) {
    console.error('Update Handover Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل/مراجعة التسليم' }, { status: 500 });
  }
}

// Manager Delete Handover Entry
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const handoverId = searchParams.get('id');

    if (!handoverId) return NextResponse.json({ error: 'معرف التسليم مطلوب' }, { status: 400 });

    await db.wallet_custody_handovers.delete({ where: { id: handoverId } });
    return NextResponse.json({ success: true, message: 'تم حذف سجل التسليم بنجاح' });
  } catch (error: any) {
    console.error('Delete Handover Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف سجل التسليم' }, { status: 500 });
  }
}
