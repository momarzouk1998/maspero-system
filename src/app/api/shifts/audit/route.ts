import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const shiftId = searchParams.get('shiftId');

  if (!shiftId) {
    return NextResponse.json({ error: 'معرف الشفت مطلوب' }, { status: 400 });
  }

  try {
    const shift = await db.shifts.findUnique({ where: { id: shiftId } });
    if (!shift) return NextResponse.json({ error: 'الشفت غير موجود' }, { status: 404 });

    const startTime = shift.start_time || new Date();
    const endTime = shift.end_time || new Date();
    const empId = shift.employee_id;
    const shiftDate = shift.shift_date ? new Date(shift.shift_date) : startTime;

    // Expand search buffer by 5 minutes for start/end boundaries if timestamp slightly differs
    const bufStart = new Date(startTime.getTime() - 5 * 60 * 1000);
    const bufEnd = new Date(endTime.getTime() + 5 * 60 * 1000);

    // Fetch shift employee user to get current wallet balance
    const shiftEmployee = empId ? await db.users.findUnique({
      where: { id: empId },
      select: { id: true, name: true, wallet_balance: true }
    }) : null;

    // Fetch all transactions matching shift_id OR employee within shift time/date
    const [services, tickets, walletTx, expenses, handovers, receiptConfirms] = await Promise.all([
      db.service_entries.findMany({
        where: {
          OR: [
            { shift_id: shiftId },
            ...(empId ? [{ employee_id: empId, timestamp: { gte: bufStart, lte: bufEnd } }] : []),
            ...(empId ? [{ employee_id: empId, date: shiftDate }] : [])
          ]
        },
        orderBy: { timestamp: 'desc' }
      }),

      db.train_ticket_bookings.findMany({
        where: {
          OR: [
            { shift_id: shiftId },
            ...(empId ? [{ employee_id: empId, timestamp: { gte: bufStart, lte: bufEnd } }] : []),
            ...(empId ? [{ employee_id: empId, date: shiftDate }] : [])
          ]
        },
        orderBy: { timestamp: 'desc' }
      }),

      db.wallet_transactions.findMany({
        where: {
          OR: [
            { shift_id: shiftId },
            ...(empId ? [{ employee_id: empId, timestamp: { gte: bufStart, lte: bufEnd } }] : []),
            ...(empId ? [{ employee_id: empId, date: shiftDate }] : [])
          ]
        },
        orderBy: { timestamp: 'desc' }
      }),

      db.expenses.findMany({
        where: {
          OR: [
            { shift_id: shiftId },
            ...(empId ? [{ employee_id: empId, timestamp: { gte: bufStart, lte: bufEnd } }] : []),
            ...(empId ? [{ employee_id: empId, date: shiftDate }] : [])
          ]
        },
        orderBy: { timestamp: 'desc' }
      }),

      db.wallet_custody_handovers.findMany({
        where: {
          OR: [
            ...(empId ? [{ sender_id: empId }] : []),
            ...(empId ? [{ receiver_id: empId }] : [])
          ]
        },
        orderBy: { created_at: 'desc' }
      }),

      db.receipt_confirms.findMany({
        where: {
          OR: [
            { shift_id: shiftId },
            ...(empId ? [{ employee_id: empId, date: shiftDate }] : [])
          ]
        },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    // Aggregate totals
    const totalServicesAmount = services.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const totalPaperCount = services.reduce((sum, s) => sum + Number(s.paper_count || s.page_count || 1), 0);
    const totalServiceCommission = services.reduce((sum, s) => sum + Number(s.employee_commission || 0), 0);

    const totalTicketsAmount = tickets.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalTicketCommission = tickets.reduce((sum, t) => sum + Number((t as any).ticket_commission || 0), 0);
    const totalTicketsCount = tickets.reduce((sum, t) => sum + Number(t.item_count || 1), 0);

    const walletDeposits = walletTx.filter(w => w.transaction_type === 'إيداع').reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const walletWithdrawals = walletTx.filter(w => w.transaction_type === 'سحب').reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const walletCommissions = walletTx.reduce((sum, w) => sum + Number(w.wallet_commission || 0), 0);

    const totalExpenses = expenses.filter(e => e.main_type === 'مصروفات' || e.expense_type === 'مصروفات').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalAdvances = expenses.filter(e => e.main_type === 'سلفة' || e.expense_type === 'سلفة' || e.main_type === 'قبض' || e.expense_type === 'قبض').reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const currentCashCustody = Number(shiftEmployee?.wallet_balance || 0);

    return NextResponse.json({
      shift,
      employee: shiftEmployee,
      summary: {
        totalServicesAmount,
        totalPaperCount,
        totalServiceCommission,
        totalTicketsAmount,
        totalTicketsCount,
        totalTicketCommission,
        walletDeposits,
        walletWithdrawals,
        walletCommissions,
        totalExpenses,
        totalAdvances,
        currentCashCustody
      },
      details: {
        services,
        tickets,
        walletTx,
        expenses,
        handovers,
        receiptConfirms
      }
    });

  } catch (error: any) {
    console.error('Error fetching shift audit:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء جلب تقرير الشفت' }, { status: 500 });
  }
}
