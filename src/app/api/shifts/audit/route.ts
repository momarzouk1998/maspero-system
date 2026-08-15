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

    // Fetch all transactions during this shift period for this employee
    const [services, tickets, walletTx, expenses, handovers] = await Promise.all([
      db.service_entries.findMany({
        where: {
          employee_id: empId,
          timestamp: { gte: startTime, lte: endTime }
        },
        orderBy: { timestamp: 'desc' }
      }),
      db.train_ticket_bookings.findMany({
        where: {
          employee_id: empId,
          timestamp: { gte: startTime, lte: endTime }
        },
        orderBy: { timestamp: 'desc' }
      }),
      db.wallet_transactions.findMany({
        where: {
          employee_id: empId,
          timestamp: { gte: startTime, lte: endTime }
        },
        orderBy: { timestamp: 'desc' }
      }),
      db.expenses.findMany({
        where: {
          employee_id: empId,
          timestamp: { gte: startTime, lte: endTime }
        },
        orderBy: { timestamp: 'desc' }
      }),
      db.wallet_custody_handovers.findMany({
        where: {
          OR: [{ sender_id: empId }, { receiver_id: empId }],
          created_at: { gte: startTime, lte: endTime }
        },
        orderBy: { created_at: 'desc' }
      })
    ]);

    // Aggregate totals
    const totalServicesAmount = services.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const totalPaperCount = services.reduce((sum, s) => sum + Number(s.paper_count || s.page_count || 1), 0);

    const totalTicketsAmount = tickets.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalTicketCommission = tickets.reduce((sum, t) => sum + Number(t.employee_commission || 0), 0);
    const totalTicketsCount = tickets.reduce((sum, t) => sum + Number(t.item_count || 1), 0);

    const walletDeposits = walletTx.filter(w => w.transaction_type === 'إيداع').reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const walletWithdrawals = walletTx.filter(w => w.transaction_type === 'سحب').reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const walletCommissions = walletTx.reduce((sum, w) => sum + Number(w.wallet_commission || 0), 0);

    const totalExpenses = expenses.filter(e => e.main_type === 'مصروفات').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalAdvances = expenses.filter(e => e.main_type === 'سلفة' || e.expense_type === 'سلفة').reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Calculated expected cash drawer balance
    const totalCashSales = totalServicesAmount + totalTicketsAmount;
    const netWalletCashChange = walletDeposits - walletWithdrawals;
    const expectedCashDrawerBalance = totalCashSales + netWalletCashChange - (totalExpenses + totalAdvances);

    return NextResponse.json({
      shift,
      summary: {
        totalServicesAmount,
        totalPaperCount,
        totalTicketsAmount,
        totalTicketsCount,
        totalTicketCommission,
        walletDeposits,
        walletWithdrawals,
        walletCommissions,
        totalExpenses,
        totalAdvances,
        totalCashSales,
        expectedCashDrawerBalance
      },
      details: {
        services,
        tickets,
        walletTx,
        expenses,
        handovers
      }
    });

  } catch (error: any) {
    console.error('Error fetching shift audit:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء جلب تقرير الشفت' }, { status: 500 });
  }
}
