import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET: Fetch all archived monthly financial reports
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 401 });
  }

  try {
    const reports = await db.monthly_financial_reports.findMany({
      orderBy: { month: 'desc' }
    });

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

// DELETE: Delete an archived report snapshot
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: 'اسم الشهر مطلوب للحذف' }, { status: 400 });
    }

    await db.monthly_financial_reports.delete({ where: { month } });

    return NextResponse.json({
      success: true,
      message: `تم حذف تقرير شهر (${month}) من الأرشيف بنجاح 🗑️`
    });
  } catch (error: any) {
    console.error('Error deleting archived report:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حذف تقرير الشهر' }, { status: 500 });
  }
}
