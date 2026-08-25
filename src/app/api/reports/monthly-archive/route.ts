import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

// GET: Fetch all archived monthly financial reports (Auto-seed from CSV if empty)
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 401 });
  }

  try {
    let reports = await db.monthly_financial_reports.findMany({
      orderBy: { month: 'desc' }
    });

    // Auto-seed from CSV file if database table is currently empty
    if (reports.length === 0) {
      try {
        const csvPath = path.join(process.cwd(), 'archive', 'Financial Report Maspero - log Financial Report.csv');
        if (fs.existsSync(csvPath)) {
          const content = fs.readFileSync(csvPath, 'utf-8');
          const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const dataRows = lines.slice(1);

          for (const row of dataRows) {
            const cols = row.split(',').map(c => c.trim());
            if (cols.length < 24) continue;

            const startDateStr = cols[1];
            const startDate = new Date(startDateStr);
            const month = `${startDate.getFullYear()} ${startDate.getMonth() + 1}`;

            const endDate = new Date(cols[2]);
            const wallet_commission = parseFloat(cols[3]) || 0;
            const tickets_commission = parseFloat(cols[4]) || 0;
            const machine_withdrawal_commission = parseFloat(cols[5]) || 0;
            const machine_deposit_commission = parseFloat(cols[6]) || 0;
            const machine_deposits = parseFloat(cols[7]) || 0;
            const service_revenue = parseFloat(cols[8]) || 0;
            const total_revenue = parseFloat(cols[9]) || 0;
            const opening_balance = parseFloat(cols[10]) || 0;
            const closing_balance = parseFloat(cols[12]) || 0;
            const purchases_cost = parseFloat(cols[13]) || 0;
            const purchases_cost_percent = parseFloat(cols[15].replace('%', '')) || 0;
            const total_profit = parseFloat(cols[16]) || 0;
            const total_commissions = parseFloat(cols[17]) || 0;
            const other_expenses = parseFloat(cols[18]) || 0;
            const salaries = parseFloat(cols[19]) || 0;
            const net_profit = parseFloat(cols[20]) || 0;
            const withdrawn_revenue = parseFloat(cols[21]) || 0;
            const ticket_count = parseInt(cols[22]) || 0;
            const paper_count = parseInt(cols[23]) || 0;

            await db.monthly_financial_reports.upsert({
              where: { month },
              update: {},
              create: {
                month,
                start_date: startDate,
                end_date: endDate,
                wallet_commission,
                tickets_commission,
                machine_withdrawal_commission,
                machine_deposit_commission,
                machine_deposits,
                service_revenue,
                total_revenue,
                opening_balance,
                closing_balance,
                purchases_cost,
                purchases_cost_percent,
                total_profit,
                total_commissions,
                other_expenses,
                salaries,
                net_profit,
                withdrawn_revenue,
                ticket_count,
                paper_count
              }
            });
          }

          reports = await db.monthly_financial_reports.findMany({
            orderBy: { month: 'desc' }
          });
        }
      } catch (seedErr) {
        console.error('Auto-seed CSV error:', seedErr);
      }
    }

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Error fetching monthly archived reports:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء جلب الأرشيف الشهري' }, { status: 500 });
  }
}

// POST: Save/Archive a monthly report snapshot
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      month, startDate, endDate,
      wallet_commission, tickets_commission, machine_withdrawal_commission, machine_deposit_commission,
      machine_deposits, service_revenue, total_revenue, opening_balance, closing_balance,
      purchases_cost, purchases_cost_percent, total_profit, total_commissions, other_expenses,
      salaries, net_profit, withdrawn_revenue, ticket_count, paper_count, notes
    } = body;

    if (!month) {
      return NextResponse.json({ error: 'برجاء تحديد الشهر (مثال 2026 7)' }, { status: 400 });
    }

    const existing = await db.monthly_financial_reports.findUnique({ where: { month } });

    const reportData = {
      month,
      start_date: startDate ? new Date(startDate) : undefined,
      end_date: endDate ? new Date(endDate) : undefined,
      wallet_commission: Number(wallet_commission || 0),
      tickets_commission: Number(tickets_commission || 0),
      machine_withdrawal_commission: Number(machine_withdrawal_commission || 0),
      machine_deposit_commission: Number(machine_deposit_commission || 0),
      machine_deposits: Number(machine_deposits || 0),
      service_revenue: Number(service_revenue || 0),
      total_revenue: Number(total_revenue || 0),
      opening_balance: Number(opening_balance || 0),
      closing_balance: Number(closing_balance || 0),
      purchases_cost: Number(purchases_cost || 0),
      purchases_cost_percent: Number(purchases_cost_percent || 0),
      total_profit: Number(total_profit || 0),
      total_commissions: Number(total_commissions || 0),
      other_expenses: Number(other_expenses || 0),
      salaries: Number(salaries || 0),
      net_profit: Number(net_profit || 0),
      withdrawn_revenue: Number(withdrawn_revenue || 0),
      ticket_count: Number(ticket_count || 0),
      paper_count: Number(paper_count || 0),
      notes: notes || '',
      updated_at: new Date()
    };

    let savedReport;
    if (existing) {
      savedReport = await db.monthly_financial_reports.update({
        where: { month },
        data: reportData
      });
    } else {
      savedReport = await db.monthly_financial_reports.create({
        data: reportData
      });
    }

    return NextResponse.json({
      success: true,
      message: `تم أرشفة وتقييد تقرير شهر (${month}) بنجاح في السجلات 💾`,
      report: savedReport
    });
  } catch (error: any) {
    console.error('Error archiving monthly report:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حفظ تقرير الشهر الأرشيفي' }, { status: 500 });
  }
}

// PUT: Edit an existing archived monthly report
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id, month, opening_balance, closing_balance, purchases_cost,
      service_revenue, wallet_commission, tickets_commission,
      machine_deposit_commission, machine_withdrawal_commission,
      salaries, other_expenses, paper_count, ticket_count, notes
    } = body;

    if (!id && !month) {
      return NextResponse.json({ error: 'المعرف أو الشهر مطلوب للتعديل' }, { status: 400 });
    }

    const report = id
      ? await db.monthly_financial_reports.findUnique({ where: { id } })
      : await db.monthly_financial_reports.findUnique({ where: { month } });

    if (!report) {
      return NextResponse.json({ error: 'التقرير غير موجود' }, { status: 404 });
    }

    const openBal = opening_balance !== undefined ? Number(opening_balance) : Number(report.opening_balance);
    const closeBal = closing_balance !== undefined ? Number(closing_balance) : Number(report.closing_balance);
    const purchCost = purchases_cost !== undefined ? Number(purchases_cost) : Number(report.purchases_cost);
    const srvRev = service_revenue !== undefined ? Number(service_revenue) : Number(report.service_revenue);

    const wComm = wallet_commission !== undefined ? Number(wallet_commission) : Number(report.wallet_commission);
    const tComm = tickets_commission !== undefined ? Number(tickets_commission) : Number(report.tickets_commission);
    const mDepComm = machine_deposit_commission !== undefined ? Number(machine_deposit_commission) : Number(report.machine_deposit_commission);
    const mWtdComm = machine_withdrawal_commission !== undefined ? Number(machine_withdrawal_commission) : Number(report.machine_withdrawal_commission);

    const sal = salaries !== undefined ? Number(salaries) : Number(report.salaries);
    const othExp = other_expenses !== undefined ? Number(other_expenses) : Number(report.other_expenses);
    const pCount = paper_count !== undefined ? Number(paper_count) : Number(report.paper_count);
    const tCount = ticket_count !== undefined ? Number(ticket_count) : Number(report.ticket_count);

    const calcPurchasesCost = openBal + purchCost - closeBal;
    const calcPurchasesCostPercent = srvRev > 0 ? (calcPurchasesCost / srvRev) * 100 : 0;
    const totProf = srvRev - calcPurchasesCost;
    const totComm = wComm + tComm + mDepComm + mWtdComm;
    const netProf = totProf + totComm - sal - othExp;

    const updated = await db.monthly_financial_reports.update({
      where: { id: report.id },
      data: {
        month: month || report.month,
        opening_balance: openBal,
        closing_balance: closeBal,
        purchases_cost: purchCost,
        purchases_cost_percent: Number(calcPurchasesCostPercent.toFixed(2)),
        service_revenue: srvRev,
        total_revenue: srvRev,
        wallet_commission: wComm,
        tickets_commission: tComm,
        machine_deposit_commission: mDepComm,
        machine_withdrawal_commission: mWtdComm,
        total_commissions: totComm,
        salaries: sal,
        other_expenses: othExp,
        total_profit: totProf,
        net_profit: netProf,
        paper_count: pCount,
        ticket_count: tCount,
        notes: notes !== undefined ? notes : report.notes,
        updated_at: new Date()
      }
    });

    return NextResponse.json({ success: true, report: updated, message: 'تم تحديث التقرير بنجاح' });
  } catch (error: any) {
    console.error('Error updating monthly report:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تعديل التقرير' }, { status: 500 });
  }
}

// DELETE: Delete an archived report snapshot
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const id = searchParams.get('id');

    if (!month && !id) {
      return NextResponse.json({ error: 'اسم الشهر أو المعرف مطلوب للحذف' }, { status: 400 });
    }

    if (id) {
      await db.monthly_financial_reports.delete({ where: { id } });
    } else if (month) {
      await db.monthly_financial_reports.delete({ where: { month } });
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف تقرير الشهر من الأرشيف بنجاح 🗑️'
    });
  } catch (error: any) {
    console.error('Error deleting archived report:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حذف تقرير الشهر' }, { status: 500 });
  }
}
