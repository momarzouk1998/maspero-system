import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح - للمدراء فقط' }, { status: 403 });
  }

  // Summary Metrics calculation across database tables
  const [
    totalServiceEntries,
    serviceRevenueSum,
    totalTicketBookings,
    ticketRevenueSum,
    ticketCommissionSum,
    totalExpensesSum,
    machineTransactionsCount,
    wallets
  ] = await Promise.all([
    db.service_entries.count(),
    db.service_entries.aggregate({ _sum: { amount: true } }),
    db.train_ticket_bookings.count(),
    db.train_ticket_bookings.aggregate({ _sum: { amount: true } }),
    db.train_ticket_bookings.aggregate({ _sum: { ticket_commission: true } }),
    db.expenses.aggregate({ _sum: { amount: true } }),
    db.wallet_transactions.count(),
    db.external_wallets.findMany({ select: { wallet_name: true, current_balance: true } })
  ]);

  const serviceValue = Number(serviceRevenueSum._sum.amount || 0);
  const ticketValue = Number(ticketRevenueSum._sum.amount || 0);
  const ticketCommission = Number(ticketCommissionSum._sum.ticket_commission || 0);
  const expensesValue = Number(totalExpensesSum._sum.amount || 0);
  const totalRevenue = serviceValue + ticketCommission;
  const netProfit = totalRevenue - expensesValue;

  return NextResponse.json({
    metrics: {
      serviceValue,
      totalServiceEntries,
      ticketValue,
      ticketCommission,
      totalTicketBookings,
      expensesValue,
      totalRevenue,
      netProfit,
      machineTransactionsCount,
    },
    wallets
  });
}
