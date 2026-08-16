import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const expenses = await db.expenses.findMany({
      select: {
        id: true,
        amount: true,
        main_type: true,
        date: true,
      },
      orderBy: {
        date: 'desc'
      }
    });

    const monthsMap: Record<string, {
      month: string;
      totalSum: number;
      daysMap: Record<string, {
        day: string;
        totalSum: number;
        categoriesMap: Record<string, {
          category: string;
          totalSum: number;
        }>
      }>
    }> = {};

    let grandTotal = 0;

    expenses.forEach(exp => {
      const amt = Number(exp.amount || 0);
      grandTotal += amt;

      const dateObj = new Date(exp.date);
      const yyyy = dateObj.getFullYear();
      const mm = dateObj.getMonth() + 1;
      const monthKey = `${yyyy} ${mm}`;

      const day = String(dateObj.getDate()).padStart(2, '0');
      const monthStr = String(mm).padStart(2, '0');
      const dayKey = `${day}/${monthStr}/${yyyy}`;

      const catKey = exp.main_type || 'أخرى';

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { month: monthKey, totalSum: 0, daysMap: {} };
      }
      monthsMap[monthKey].totalSum += amt;

      if (!monthsMap[monthKey].daysMap[dayKey]) {
        monthsMap[monthKey].daysMap[dayKey] = { day: dayKey, totalSum: 0, categoriesMap: {} };
      }
      monthsMap[monthKey].daysMap[dayKey].totalSum += amt;

      if (!monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey]) {
        monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey] = { category: catKey, totalSum: 0 };
      }
      monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey].totalSum += amt;
    });

    const months = Object.values(monthsMap).map(m => ({
      month: m.month,
      totalSum: m.totalSum,
      days: Object.values(m.daysMap).map(d => ({
        day: d.day,
        totalSum: d.totalSum,
        categories: Object.values(d.categoriesMap).map(c => ({
          category: c.category,
          totalSum: c.totalSum
        }))
      }))
    }));

    return NextResponse.json({
      totalSum: grandTotal,
      months
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
