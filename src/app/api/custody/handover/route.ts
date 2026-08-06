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

    const isUserShiftActive = activeShifts.some(s => s.employee_id === user.id);
    const activeColleaguesCount = activeShifts.filter(s => s.employee_id !== user.id).length;
    const isMorningOrSoloShift = activeColleaguesCount === 0;

    // 2. Fetch external wallets, machines & cash drawers
    const allCustodyItems = await db.external_wallets.findMany({
      where: { is_active: true },
      orderBy: [{ wallet_type: 'asc' }, { sort: 'asc' }]
    });

    // Group items into Wallets, Machines, Cash Drawers
    const wallets = allCustodyItems.filter(i => i.wallet_type === 'محفظة');
    const machines = allCustodyItems.filter(i => i.wallet_type === 'ماكينة');
    const drawers = allCustodyItems.filter(i => i.wallet_type === 'درج كاشير');

    // 3. Check items in current user's custody
    const itemsInUserCustody = allCustodyItems.filter(i => i.custodian_id === user.id);

    // 4. Pending handover requests sent to user
    const pendingHandovers = await db.wallet_custody_handovers.findMany({
      where: { receiver_id: user.id, status: 'PENDING' },
      orderBy: { created_at: 'desc' }
    });

    // 5. Check if sales are locked
    // Morning/Solo shift requires drawer + all active wallets + all machines
    // Overlapping shift requires drawer only
    const hasReceivedDrawer = drawers.some(d => d.custodian_id === user.id);
    const hasReceivedAllWallets = wallets.every(w => w.custodian_id === user.id);
    const hasReceivedAllMachines = machines.every(m => m.custodian_id === user.id);

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

// POST: Receive or Deliver custody item
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const body = await req.json();
    const { action, walletId, actualBalance, discrepancyReason, receiverId } = body;

    if (!walletId) {
      return NextResponse.json({ error: 'معرف العهدة/المحفظة مطلوب' }, { status: 400 });
    }

    const item = await db.external_wallets.findUnique({ where: { id: walletId } });
    if (!item) return NextResponse.json({ error: 'الجرام/المحفظة غير موجودة' }, { status: 404 });

    const expectedBalance = Number(item.actual_balance || item.current_balance || 0);

    // --- Action 1: Receive Custody (استلام) ---
    if (action === 'receive') {
      if (actualBalance === undefined || actualBalance === null) {
        return NextResponse.json({ error: 'برجاء كتابة المبلغ الفعلي في يدك' }, { status: 400 });
      }

      const numActual = Number(actualBalance);
      const diff = numActual - expectedBalance;

      // Mandate reason if there is a discrepancy
      if (diff !== 0 && (!discrepancyReason || !discrepancyReason.trim())) {
        return NextResponse.json({ 
          error: `يوجد فارق قدره (${diff > 0 ? '+' : ''}${diff.toFixed(2)} ج.م) بين المتوقع والفعلي. برجاء توضيح سبب الاختلاف.` 
        }, { status: 400 });
      }

      // Automated Review Status Evaluation:
      // - Wallet shortage 3 to 10 EGP -> Normal fee shortage
      // - Machine surplus 20 to 30 EGP -> Normal company commission surplus
      // - No diff -> Matched
      // - Else -> Needs Review
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

      const updatedItem = await db.$transaction(async (tx) => {
        // 1. Log handover
        await tx.wallet_custody_handovers.create({
          data: {
            wallet_id: walletId,
            wallet_name: item.wallet_name,
            sender_id: item.custodian_id || null,
            sender_name: item.custodian_name || 'النظام',
            receiver_id: user.id,
            receiver_name: user.name,
            balance_at_time: expectedBalance,
            expected_balance: expectedBalance,
            actual_balance: numActual,
            difference: diff,
            status: 'ACCEPTED',
            review_status: reviewStatus,
            discrepancy_reason: discrepancyReason || null,
            responded_at: new Date()
          }
        });

        // 2. Update custody & balance on external_wallets
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
        message: `تم استلام (${item.wallet_name}) بنجاح 🎉`,
        item: updatedItem 
      });
    }

    // --- Action 2: Deliver Custody to another employee (تسليم) ---
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
        message: `تم إرسال طلب تسليم (${item.wallet_name}) إلى (${receiver.name}) بانتظار استلامه.` 
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });

  } catch (error: any) {
    console.error('Custody POST Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في عملية العهدة' }, { status: 500 });
  }
}
