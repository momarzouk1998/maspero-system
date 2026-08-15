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
    // All Financial Transactions for Monthly & Category Reports
    db.expenses.findMany({
      orderBy: { timestamp: 'desc' },
      take: 500
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
  const machineDepositsCommission = (machineDeposits * 7) / 1000; // 0.7% commission

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

  // 2. Employee Payroll Report Calculations ("كشف حساب ومستحقات جميع الموظفين")
  const employeePayrolls = await Promise.all(
    allEmployees.map(async (emp) => {
      const empId = emp.id;

      // Aggregates per employee in date range
      const [shiftsAgg, hrBonusAgg, hrDeductAgg, serviceCommAgg, advancesAgg, salaryPaidAgg] = await Promise.all([
        db.shifts.aggregate({
          where: { employee_id: empId, shift_date: { gte: startDate, lte: endDate } },
          _sum: { total_hours: true }
        }),
        db.employee_hr.aggregate({
          where: { employee_id: empId, approval: 'موافقة', hr_items: { not: 'خصم' }, date: { gte: startDate, lte: endDate } },
          _sum: { hours: true }
        }),
        db.employee_hr.aggregate({
          where: { employee_id: empId, approval: 'موافقة', hr_items: 'خصم', date: { gte: startDate, lte: endDate } },
          _sum: { hours: true }
        }),
        db.service_entries.aggregate({
          where: { employee_id: empId, date: { gte: startDate, lte: endDate } },
          _sum: { employee_commission: true }
        }),
        db.expenses.aggregate({
          where: { employee_id: empId, main_type: 'سلفة', date: { gte: startDate, lte: endDate } },
          _sum: { amount: true }
        }),
        db.expenses.aggregate({
          where: { employee_id: empId, main_type: 'قبض', date: { gte: startDate, lte: endDate } },
          _sum: { amount: true }
        })
      ]);

      const monthlySalary = Number(emp.salary || 0);
      const dayOff = 'الجمعة';
      const workDays = 26; // Standard 26 work days
      const requiredHours = workDays * 8; // 208 hours
      const hourlyRate = requiredHours > 0 ? monthlySalary / requiredHours : 0;

      const achievedHours = Number(shiftsAgg._sum.total_hours || 0);
      const bonusHours = Number(hrBonusAgg._sum.hours || 0);
      const deductedHours = Number(hrDeductAgg._sum.hours || 0);
      const finalHours = (achievedHours + bonusHours) - deductedHours;
      const hoursValue = hourlyRate * finalHours;

      const employeeCommission = Number(serviceCommAgg._sum.employee_commission || 0);
      const totalAdvances = Number(advancesAgg._sum.amount || 0);
      const totalSalaryPaid = Number(salaryPaidAgg._sum.amount || 0);

      const netAccountDue = (hoursValue + employeeCommission) - (totalAdvances + totalSalaryPaid);

      return {
        employeeId: empId,
        name: emp.name,
        phone: emp.phone,
        jobTitle: emp.job_title || (emp.role === 'manager' ? 'مدير نظام' : 'كاشير'),
        isActive: emp.is_active,
        monthlySalary,
        dayOff,
        workDays,
        requiredHours,
        hourlyRate: Number(hourlyRate.toFixed(2)),
        achievedHours: Number(achievedHours.toFixed(2)),
        bonusHours: Number(bonusHours.toFixed(2)),
        deductedHours: Number(deductedHours.toFixed(2)),
        finalHours: Number(finalHours.toFixed(2)),
        hoursValue: Number(hoursValue.toFixed(2)),
        employeeCommission: Number(employeeCommission.toFixed(2)),
        totalAdvances: Number(totalAdvances.toFixed(2)),
        totalSalaryPaid: Number(totalSalaryPaid.toFixed(2)),
        netAccountDue: Number(netAccountDue.toFixed(2))
      };
    })
  );

  // Monthly Grouped Calculation
  const monthlyMap: Record<string, { month: string; totalSum: number; count: number; items: any[] }> = {};
  // Category Grouped Calculation
  const categoryMap: Record<string, { category: string; totalSum: number; count: number; items: any[] }> = {
    'إيرادات': { category: 'إيرادات', totalSum: 0, count: 0, items: [] },
    'سلفة': { category: 'سلفة', totalSum: 0, count: 0, items: [] },
    'قبض': { category: 'قبض', totalSum: 0, count: 0, items: [] },
    'مصروفات': { category: 'مصروفات', totalSum: 0, count: 0, items: [] },
    'دعم مالي': { category: 'دعم مالي', totalSum: 0, count: 0, items: [] },
    'مشتريات': { category: 'مشتريات', totalSum: 0, count: 0, items: [] },
    'مسحوبات': { category: 'مسحوبات', totalSum: 0, count: 0, items: [] },
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

  // Check if requested action is saved_list
  if (searchParams.get('action') === 'saved_list') {
    const savedList = await db.financial_reports.findMany({
      orderBy: { start_date: 'desc' }
    });
    return NextResponse.json({ savedReports: savedList });
  }

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

  let savedReportsList = await db.financial_reports.findMany({
    orderBy: { start_date: 'desc' },
    take: 50
  });

  if (savedReportsList.length === 0) {
    try {
      const LEGACY_LOGS = [
        { legacy_id: '02c41b48', start_date: new Date('2025-12-01'), end_date: new Date('2025-12-31'), wallet_commission: 22073, tickets_commission: 1850, machine_withdrawal_commission: 1377, machine_deposits_commission: 3404, machine_deposits: 486322, service_value: 111780, total_revenue: 111780, opening_balance: 0, purchase_value: 33125, closing_balance: 0, purchases_cost: 33125, machine_withdrawal: 173266, purchases_cost_percent: 29.6, total_profit: 78655, total_commissions: 28704, other_expenses: 16378, salaries: 19403, net_profit: 71578, withdrawn_revenue: 653089, ticket_count: 105, paper_count: 64317 },
        { legacy_id: '3c6461c1', start_date: new Date('2026-01-01'), end_date: new Date('2026-01-31'), wallet_commission: 24611, tickets_commission: 1985, machine_withdrawal_commission: 2408, machine_deposits_commission: 4085, machine_deposits: 583628, service_value: 98725, total_revenue: 98725, opening_balance: 0, purchase_value: 25140, closing_balance: 0, purchases_cost: 25140, machine_withdrawal: 198258, purchases_cost_percent: 25.5, total_profit: 73585, total_commissions: 33089, other_expenses: 18246, salaries: 18154, net_profit: 70274, withdrawn_revenue: 842506, ticket_count: 113, paper_count: 57450 },
        { legacy_id: 'af25d2b3', start_date: new Date('2026-02-01'), end_date: new Date('2026-02-28'), wallet_commission: 18992, tickets_commission: 987, machine_withdrawal_commission: 1947, machine_deposits_commission: 4085, machine_deposits: 453859, service_value: 75183, total_revenue: 75183, opening_balance: 0, purchase_value: 11415, closing_balance: 0, purchases_cost: 11415, machine_withdrawal: 131574, purchases_cost_percent: 15.2, total_profit: 63768, total_commissions: 26011, other_expenses: 14379, salaries: 16837, net_profit: 58563, withdrawn_revenue: 702255, ticket_count: 61, paper_count: 42882 },
        { legacy_id: '06d3b560', start_date: new Date('2026-03-01'), end_date: new Date('2026-03-31'), wallet_commission: 17607, tickets_commission: 754, machine_withdrawal_commission: 1482, machine_deposits_commission: 2882, machine_deposits: 411746, service_value: 68297, total_revenue: 68297, opening_balance: 0, purchase_value: 17250, closing_balance: 0, purchases_cost: 17250, machine_withdrawal: 113221, purchases_cost_percent: 25.3, total_profit: 51047, total_commissions: 22725, other_expenses: 9557, salaries: 10616, net_profit: 53599, withdrawn_revenue: 501372, ticket_count: 41, paper_count: 44367 },
        { legacy_id: '7dde2545', start_date: new Date('2026-04-01'), end_date: new Date('2026-04-30'), wallet_commission: 16510, tickets_commission: 1057, machine_withdrawal_commission: 2063, machine_deposits_commission: 2739, machine_deposits: 391226, service_value: 72501, total_revenue: 72501, opening_balance: 7697, purchase_value: 18100, closing_balance: 5605, purchases_cost: 20192, machine_withdrawal: 119364, purchases_cost_percent: 27.9, total_profit: 52309, total_commissions: 22369, other_expenses: 9339, salaries: 15260, net_profit: 50079, withdrawn_revenue: 384253, ticket_count: 52, paper_count: 43188 },
        { legacy_id: 'a847c1aa', start_date: new Date('2026-05-01'), end_date: new Date('2026-05-31'), wallet_commission: 17795, tickets_commission: 828, machine_withdrawal_commission: 2172, machine_deposits_commission: 2295, machine_deposits: 327870, service_value: 84591, total_revenue: 84591, opening_balance: 5605, purchase_value: 26045, closing_balance: 5760, purchases_cost: 25890, machine_withdrawal: 146836, purchases_cost_percent: 30.6, total_profit: 58701, total_commissions: 23090, other_expenses: 26935, salaries: 19163, net_profit: 35693, withdrawn_revenue: 411359, ticket_count: 39, paper_count: 60592 },
        { legacy_id: '80ef2c33', start_date: new Date('2026-06-01'), end_date: new Date('2026-06-30'), wallet_commission: 19095, tickets_commission: 1962, machine_withdrawal_commission: 1672, machine_deposits_commission: 2610, machine_deposits: 372896, service_value: 68081, total_revenue: 68081, opening_balance: 5760, purchase_value: 13310, closing_balance: 2818, purchases_cost: 16252, machine_withdrawal: 122965, purchases_cost_percent: 23.9, total_profit: 51829, total_commissions: 25339, other_expenses: 7915, salaries: 18707, net_profit: 50546, withdrawn_revenue: 297521, ticket_count: 98, paper_count: 34619 }
      ];
      await db.financial_reports.createMany({ data: LEGACY_LOGS });
      savedReportsList = await db.financial_reports.findMany({ orderBy: { start_date: 'desc' }, take: 50 });
    } catch (e) {
      console.error('Legacy seed error:', e);
    }
  }

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
    allExpenses: allExpensesList,
    savedReports: savedReportsList
  });
}

// POST: Save Financial Report Snapshot into Archive
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      startDate, endDate, walletCommission, ticketsCommission,
      machineWithdrawalCommission, machineDepositsCommission, machineDeposits,
      serviceValue, totalRevenue, openingBalance, purchaseValue, closingBalance,
      purchasesCost, machineWithdrawal, purchasesCostPercent, totalProfit,
      totalCommissions, otherExpenses, salaries, netProfit, withdrawnRevenue,
      ticketCount, paperCount
    } = body;

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'تاريخ البداية والنهاية مطلوبان' }, { status: 400 });
    }

    const report = await db.financial_reports.create({
      data: {
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        wallet_commission: Number(walletCommission || 0),
        tickets_commission: Number(ticketsCommission || 0),
        machine_withdrawal_commission: Number(machineWithdrawalCommission || 0),
        machine_deposits_commission: Number(machineDepositsCommission || 0),
        machine_deposits: Number(machineDeposits || 0),
        service_value: Number(serviceValue || 0),
        total_revenue: Number(totalRevenue || 0),
        opening_balance: Number(openingBalance || 0),
        purchase_value: Number(purchaseValue || 0),
        closing_balance: Number(closingBalance || 0),
        purchases_cost: Number(purchasesCost || 0),
        machine_withdrawal: Number(machineWithdrawal || 0),
        purchases_cost_percent: Number(purchasesCostPercent || 0),
        total_profit: Number(totalProfit || 0),
        total_commissions: Number(totalCommissions || 0),
        other_expenses: Number(otherExpenses || 0),
        salaries: Number(salaries || 0),
        net_profit: Number(netProfit || 0),
        withdrawn_revenue: Number(withdrawnRevenue || 0),
        ticket_count: parseInt(String(ticketCount || 0)),
        paper_count: parseInt(String(paperCount || 0))
      }
    });

    return NextResponse.json({ success: true, message: 'تم توثيق وحفظ التقرير في الأرشيف بنجاح 🎉', report });
  } catch (error: any) {
    console.error('Financial Report Save Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حفظ التقرير' }, { status: 500 });
  }
}

// PUT: Edit Saved Financial Report Snapshot
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, openingBalance, closingBalance, purchaseValue, notes } = body;

    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const existing = await db.financial_reports.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'التقرير غير موجود' }, { status: 404 });

    const openBal = openingBalance !== undefined ? Number(openingBalance) : Number(existing.opening_balance);
    const closeBal = closingBalance !== undefined ? Number(closingBalance) : Number(existing.closing_balance);
    const purVal = purchaseValue !== undefined ? Number(purchaseValue) : Number(existing.purchase_value);

    // Recalculate purchases cost & profit
    const purchasesCost = (openBal + purVal) - closeBal;
    const totalRev = Number(existing.total_revenue);
    const purchasesCostPercent = totalRev > 0 ? (purchasesCost / totalRev) * 100 : 0;
    const totalProfit = totalRev - purchasesCost;
    const totalComm = Number(existing.total_commissions);
    const othExp = Number(existing.other_expenses);
    const sals = Number(existing.salaries);
    const netProfit = totalProfit + totalComm - othExp - sals;

    const updated = await db.financial_reports.update({
      where: { id },
      data: {
        opening_balance: openBal,
        closing_balance: closeBal,
        purchase_value: purVal,
        purchases_cost: purchasesCost,
        purchases_cost_percent: purchasesCostPercent,
        total_profit: totalProfit,
        net_profit: netProfit
      }
    });

    return NextResponse.json({ success: true, message: 'تم تعديل بيانات التقرير المحفوظ بنجاح 🎉', report: updated });
  } catch (error: any) {
    console.error('Financial Report Edit Error:', error);
    return NextResponse.json({ error: error.message || 'فشل التعديل' }, { status: 500 });
  }
}

// DELETE: Delete Saved Financial Report Snapshot
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    await db.financial_reports.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'تم حذف التقرير الأرشيفي بنجاح' });
  } catch (error: any) {
    console.error('Financial Report Delete Error:', error);
    return NextResponse.json({ error: error.message || 'فشل الحذف' }, { status: 500 });
  }
}
