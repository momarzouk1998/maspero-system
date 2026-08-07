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
    const targetDrawerNames = ['درج كاش 1', 'درج كاش 2', 'درج كاش 3'];
    for (let idx = 0; idx < 3; idx++) {
      const name = targetDrawerNames[idx];
      const existing = await db.external_wallets.findFirst({
        where: {
          OR: [
            { wallet_name: name },
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

    // 5. Pending handover requests sent to user
    const pendingHandovers = await db.wallet_custody_handovers.findMany({
      where: { receiver_id: user.id, status: 'PENDING' },
      orderBy: { created_at: 'desc' }
    });

    // 6. Check if sales are locked
    const hasReceivedDrawer = drawers.some((d: any) => d.custodian_id === user.id);
    const hasReceivedAllWallets = wallets.every((w: any) => w.custodian_id === user.id);
    const hasReceivedAllMachines = machines.every((m: any) => m.custodian_id === user.id);

    let isSalesLocked = false;
    let lockReason = '';

    if (!isUserShiftActive) {
      isSalesLocked = true;
      lockReason = 'برجاء بدء الشفت أولاً من صفحة إدارة الشفتات قبل البدء في المبيعات.';
    } else if (!hasReceivedDrawer) {
      isSalesLocked = true;
      lockReason = 'برجاء استلام عهدة درج الكاشير الخاص بك أولاً.';
    } else if (isMorningOrSoloShift && (!hasReceivedAllWallets || !hasReceivedAllMachines)) {
      isSalesLocked = true;
      lockReason = 'شفت صباحي/منفرد: برجاء استلام جميع أرصدة المحافظ والماكينات للبدء.';
    }

    return NextResponse.json({
      isUserShiftActive,
      isMorningOrSoloShift,
      activeColleaguesCount,
      isSalesLocked,
      lockReason,
      wallets,
      machines,
      drawers,
      itemsInUserCustody,
      pendingHandovers
    });

  } catch (error: any) {
    console.error('Custody GET Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء جلب العهدة' }, { status: 500 });
  }
}

// POST: Receive, Fast Confirm (Like 👍), Deliver, or Deposit to Drawer
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const body = await req.json();
    const { action, walletId, actualBalance, discrepancyReason, receiverId, amount } = body;

    // --- Action: Deposit Cash from Employee Custody into Cash Drawer ---
    if (action === 'deposit_to_drawer') {
      const drawerId = walletId;
      const depositAmount = Number(amount || 0);

      if (!drawerId || depositAmount <= 0) {
        return NextResponse.json({ error: 'برجاء تحديد الدرج والمبلغ المراد إيداعه' }, { status: 400 });
      }

      const drawer = await db.external_wallets.findUnique({ where: { id: drawerId } });
      if (!drawer || (drawer.wallet_type !== 'درج كاشير' && !drawer.wallet_name.includes('درج'))) {
        return NextResponse.json({ error: 'درج الكاشير غير موجود' }, { status: 404 });
      }

      const today = new Date();

      await db.$transaction(async (tx: any) => {
        // 1. Deduct amount from employee cash custody
        await tx.users.update({
          where: { id: user.id },
          data: { wallet_balance: { decrement: depositAmount } }
        });

        // 2. Increase drawer balance
        await tx.external_wallets.update({
          where: { id: drawerId },
          data: {
            current_balance: { increment: depositAmount },
            actual_balance: { increment: depositAmount }
          }
        });

        // 3. Log transaction
        await tx.wallet_transactions.create({
          data: {
            date: today,
            transaction_type: 'إيداع في درج كاشير',
            wallet_id: drawerId,
            wallet_name: drawer.wallet_name,
            amount: depositAmount,
            employee_id: user.id,
            employee_name: user.name,
            description: `إيداع نقدية من عهدة الموظف إلى ${drawer.wallet_name}`,
            timestamp: today
          }
        });
      });

      return NextResponse.json({
        success: true,
        message: `تم إيداع مبلغ ${depositAmount} بنجاح في ${drawer.wallet_name}`
      });
    }

    if (!walletId) {
      return NextResponse.json({ error: 'معرف العهدة/المحفظة مطلوب' }, { status: 400 });
    }

    const item = await db.external_wallets.findUnique({ where: { id: walletId } });
    if (!item) return NextResponse.json({ error: 'العنصر غير موجود' }, { status: 404 });

    const expectedBalance = Number(item.actual_balance || item.current_balance || 0);

    // --- Action: Fast Like 👍 Confirm (Receive with exact balance in 1 click) ---
    if (action === 'fast_receive') {
      const numActual = expectedBalance;

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
            difference: 0,
            status: 'ACCEPTED',
            review_status: 'تم المطابقة',
            responded_at: new Date()
          }
        });

        return await tx.external_wallets.update({
          where: { id: walletId },
          data: {
            custodian_id: user.id,
            custodian_name: user.name,
            actual_balance: numActual,
            current_balance: numActual
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

        return await tx.external_wallets.update({
          where: { id: walletId },
          data: {
            custodian_id: user.id,
            custodian_name: user.name,
            actual_balance: numActual,
            current_balance: numActual
          }
        });
      });

      return NextResponse.json({ 
        success: true, 
        message: `تم تحديث واستلام (${item.wallet_name}) بنجاح`,
        item: updatedItem 
      });
    }

    // --- Action: Deliver Custody to another employee ---
    if (action === 'deliver') {
      if (item.custodian_id !== user.id && user.role !== 'manager') {
        return NextResponse.json({ error: 'أنت لست المرافق الحالي لهذه العهدة' }, { status: 403 });
      }

      if (!receiverId) {
        return NextResponse.json({ error: 'برجاء اختيار الموظف المستلم' }, { status: 400 });
      }

      const receiver = await db.users.findUnique({ where: { id: receiverId } });
      if (!receiver) return NextResponse.json({ error: 'الموظف المستلم غير موجود' }, { status: 404 });

      await db.wallet_custody_handovers.create({
        data: {
          wallet_id: walletId,
          wallet_name: item.wallet_name,
          sender_id: user.id,
          sender_name: user.name,
          receiver_id: receiver.id,
          receiver_name: receiver.name,
          balance_at_time: expectedBalance,
          expected_balance: expectedBalance,
          actual_balance: expectedBalance,
          difference: 0,
          status: 'PENDING',
          review_status: 'تم المطابقة'
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: `تم إرسال طلب تسليم (${item.wallet_name}) إلى (${receiver.name}).` 
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });

  } catch (error: any) {
    console.error('Custody POST Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في عملية العهدة' }, { status: 500 });
  }
}
