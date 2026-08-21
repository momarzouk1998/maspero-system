import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح - للمدراء فقط' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const startDateStr = searchParams.get('startDate');
  const endDateStr = searchParams.get('endDate');
  // نسبة عمولة إيداع المكن — قابلة للتعديل من الواجهة (default: 7 لكل 1000)
  const machineCommissionRateStr = searchParams.get('machineCommissionRate');
  const machineCommissionRate = machineCommissionRateStr
    ? Math.max(0, Math.min(100, parseFloat(machineCommissionRateStr)))
    : 7;

  const now = new Date();
  const startDate = startDateStr ? new Date(startDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = endDateStr ? new Date(endDateStr) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // 1. Fetch Financial Metrics via Prisma Aggregations
  const [
    serviceAggregate,
    ticketAggregate,
    paperAggregate,
    ticketCountAggregate,
    walletCommissions,
    machineWithdrawlCommissions,
    machineDepositsAggregate,
    machineWithdrawlsAggregate,
    purchasesAggregate,
    salariesAggregate,
    otherExpensesAggregate,
    withdrawnRevenueAggregate,
    walletsList,
    allEmployees,
    allExpensesList
  ] = await Promise.all([
    // Service Revenue & Paper Count
    db.service_entries.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true, paper_count: true }
    }),
    // Ticket Bookings & Commissions
    db.train_ticket_bookings.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true, ticket_commission: true, item_count: true }
    }),
    // Total Paper Count from services
    db.service_entries.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { paper_count: true }
    }),
    // Ticket count sum
    db.train_ticket_bookings.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { item_count: true }
    }),
    // Wallet Commissions (wallet_type = "محفظة")
    db.wallet_transactions.aggregate({
      where: { wallet_type: 'محفظة', date: { gte: startDate, lte: endDate } },
      _sum: { wallet_commission: true }
    }),
    // Machine Withdrawal Commissions (wallet_type = "ماكينة", transaction_type = "سحب")
    db.wallet_transactions.aggregate({
      where: { wallet_type: 'ماكينة', transaction_type: 'سحب', date: { gte: startDate, lte: endDate } },
      _sum: { wallet_commission: true }
    }),
    // Machine Deposits (wallet_type = "ماكينة", transaction_type = "إيداع")
    db.wallet_transactions.aggregate({
      where: { wallet_type: 'ماكينة', transaction_type: 'إيداع', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    }),
    // Machine Withdrawals (wallet_type = "ماكينة", transaction_type = "سحب")
    db.wallet_transactions.aggregate({
      where: { wallet_type: 'ماكينة', transaction_type: 'سحب', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    }),
    // Purchases (main_type = "مشتريات")
    db.expenses.aggregate({
      where: { main_type: 'مشتريات', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    }),
    // Salaries & Advances (main_type in ["سلفة", "قبض"])
    db.expenses.aggregate({
      where: { main_type: { in: ['سلفة', 'قبض'] }, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    }),
    // Other Expenses (main_type = "مصروفات" excluding purchases, salary, advances, support)
    db.expenses.aggregate({
      where: { main_type: 'مصروفات', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    }),
    // Withdrawn Revenue (main_type = "مسحوبات")
    db.expenses.aggregate({
      where: { main_type: 'مسحوبات', date: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    }),
    // External Wallets List (All active — محافظ + ماكينات + أدراج)
    db.external_wallets.findMany({
      where: { is_active: true },
      select: { id: true, wallet_name: true, wallet_type: true, current_balance: true, actual_balance: true, custodian_name: true, sort: true },
      orderBy: [{ sort: 'asc' }, { wallet_name: 'asc' }]
    }),
    // All Employees List (Active & Inactive) + wallet_balance for custody
    db.users.findMany({
      select: { id: true, name: true, phone: true, salary: true, role: true, job_title: true, is_active: true, wallet_balance: true }
    }),
    // Lean financial expenses list for grouping
    db.expenses.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { id: true, main_type: true, amount: true, date: true, month: true },
      orderBy: { timestamp: 'desc' }
    })
  ]);

  // Financial Calculations based on AppSheet Formulas
  const serviceValue = Number(serviceRevenueSum(serviceAggregate._sum.amount));
  const ticketValue = Number(serviceRevenueSum(ticketAggregate._sum.amount));
  const ticketCommission = Number(serviceRevenueSum(ticketAggregate._sum.ticket_commission));
  const paperCount = Number(paperAggregate._sum.paper_count || 0);
  const ticketCount = Number(ticketCountAggregate._sum.item_count || 0);

  const walletCommission = Number(walletCommissions._sum.wallet_commission || 0);
  const machineWithdrawlCommission = Number(machineWithdrawlCommissions._sum.wallet_commission || 0);
  const machineDeposits = Number(machineDepositsAggregate._sum.amount || 0);
  const machineWithdrawl = Number(machineWithdrawlsAggregate._sum.amount || 0);
  const machineDepositsCommission = (machineDeposits * machineCommissionRate) / 1000; // نسبة قابلة للتعديل

  const totalCommissions = walletCommission + ticketCommission + machineWithdrawlCommission + machineDepositsCommission;
  const totalRevenue = serviceValue;
  const purchaseValue = Number(purchasesAggregate._sum.amount || 0);
  const purchasesCost = purchaseValue; // Opening balance + purchases - closing balance
  const purchasesCostPercent = totalRevenue > 0 ? (purchasesCost / totalRevenue) * 100 : 0;
  const totalProfit = totalRevenue - purchasesCost;

  const salaries = Number(salariesAggregate._sum.amount || 0);
  const otherExpenses = Number(otherExpensesAggregate._sum.amount || 0);
  const netProfit = totalProfit + totalCommissions - otherExpenses - salaries;
  const withdrawnRevenue = Number(withdrawnRevenueAggregate._sum.amount || 0);

  // Helper for safe decimal fallback
  function serviceRevenueSum(val: any) {
    return val || 0;
  }

  const employeePayrolls: any[] = [];

  // Monthly Grouped Calculation
  const monthlyMap: Record<string, { month: string; totalSum: number; count: number; items: any[] }> = {};
  // Category Grouped Calculation
  const categoryMap: Record<string, { category: string; totalSum: number; count: number; items: any[] }> = {
    'مسحوبات': { category: 'مسحوبات', totalSum: 0, count: 0, items: [] },
    'سلفة': { category: 'سلفة', totalSum: 0, count: 0, items: [] },
    'قبض': { category: 'قبض', totalSum: 0, count: 0, items: [] },
    'مصروفات': { category: 'مصروفات', totalSum: 0, count: 0, items: [] },
    'دعم مالي': { category: 'دعم مالي', totalSum: 0, count: 0, items: [] },
    'مشتريات': { category: 'مشتريات', totalSum: 0, count: 0, items: [] },
  };

  allExpensesList.forEach((exp: any) => {
    const amt = Number(exp.amount || 0);
    const m = exp.month || (exp.date ? `${new Date(exp.date).getFullYear()} ${new Date(exp.date).getMonth() + 1}` : 'غير محدد');
    const cat = exp.main_type || 'مصروفات';

    if (!monthlyMap[m]) {
      monthlyMap[m] = { month: m, totalSum: 0, count: 0, items: [] };
    }
    monthlyMap[m].totalSum += amt;
    monthlyMap[m].count += 1;
    monthlyMap[m].items.push(exp);

    if (!categoryMap[cat]) {
      categoryMap[cat] = { category: cat, totalSum: 0, count: 0, items: [] };
    }
    categoryMap[cat].totalSum += amt;
    categoryMap[cat].count += 1;
    categoryMap[cat].items.push(exp);
  });

  // Split wallets by type
  const walletsByType = {
    محافظ: walletsList.filter((w: any) => w.wallet_type === 'محفظة'),
    ماكينات: walletsList.filter((w: any) => w.wallet_type === 'ماكينة'),
    أدراج: walletsList.filter((w: any) => w.wallet_type === 'درج كاشير'),
  };

  // Summary totals per type
  const walletsTotals = {
    محافظ: walletsByType.محافظ.reduce((s: number, w: any) => s + Number(w.current_balance || 0), 0),
    ماكينات: walletsByType.ماكينات.reduce((s: number, w: any) => s + Number(w.current_balance || 0), 0),
    أدراج: walletsByType.أدراج.reduce((s: number, w: any) => s + Number(w.current_balance || 0), 0),
  };

  // Employee custody (wallet_balance) — active employees only
  const employeeCustody = allEmployees
    .filter((e: any) => e.is_active)
    .map((e: any) => ({
      id: e.id,
      name: e.name,
      jobTitle: e.job_title || (e.role === 'manager' ? 'مدير نظام' : 'كاشير'),
      walletBalance: Number(e.wallet_balance || 0),
    }));

  const totalEmployeeCustody = employeeCustody.reduce((s: number, e: any) => s + e.walletBalance, 0);

  return NextResponse.json({
    metrics: {
      serviceValue,
      ticketValue,
      ticketCommission,
      paperCount,
      ticketCount,
      walletCommission,
      machineWithdrawlCommission,
      machineDeposits,
      machineWithdrawl,
      machineDepositsCommission,
      machineCommissionRate,
      totalCommissions,
      totalRevenue,
      purchaseValue,
      purchasesCost,
      purchasesCostPercent: Number(purchasesCostPercent.toFixed(2)),
      totalProfit,
      salaries,
      otherExpenses,
      netProfit,
      withdrawnRevenue
    },
    wallets: walletsList,
    walletsByType,
    walletsTotals,
    employeeCustody,
    totalEmployeeCustody,
    employeePayrolls,
    monthlyReports: Object.values(monthlyMap),
    categoryReports: Object.values(categoryMap),
    allExpenses: allExpensesList
  });
}
