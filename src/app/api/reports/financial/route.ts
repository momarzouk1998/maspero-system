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
    // External Wallets List
    db.external_wallets.findMany({
      select: { id: true, wallet_name: true, wallet_type: true, current_balance: true }
    }),
    // All Employees List (Active & Inactive)
    db.users.findMany({
      select: { id: true, name: true, phone: true, salary: true, role: true, job_title: true, is_active: true }
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
    employeePayrolls,
    monthlyReports: Object.values(monthlyMap),
    categoryReports: Object.values(categoryMap),
    allExpenses: allExpensesList
  });
}
