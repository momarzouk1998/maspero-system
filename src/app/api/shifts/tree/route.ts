import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const shifts = await db.shifts.findMany({
      where: user.role !== 'manager' ? { employee_id: user.id } : {},
      select: {
        id: true,
        start_time: true,
        total_hours: true,
        shift_type: true
      },
      orderBy: {
        start_time: 'desc'
      }
    });

    const monthsMap: Record<string, {
      month: string;
      totalShifts: number;
      daysMap: Record<string, {
        day: string;
        shiftCount: number;
        categoriesMap: Record<string, {
          category: string;
          count: number;
        }>
      }>
    }> = {};

    let totalShiftsCount = 0;

    shifts.forEach(s => {
      totalShiftsCount += 1;

      const dateObj = new Date(s.start_time || Date.now());
      const yyyy = dateObj.getFullYear();
      const mm = dateObj.getMonth() + 1;
      const monthKey = `${yyyy} ${mm}`;

      const day = String(dateObj.getDate()).padStart(2, '0');
      const monthStr = String(mm).padStart(2, '0');
      const dayKey = `${day}/${monthStr}/${yyyy}`;

      const catKey = s.shift_type || 'صباحي';

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { month: monthKey, totalShifts: 0, daysMap: {} };
      }
      monthsMap[monthKey].totalShifts += 1;

      if (!monthsMap[monthKey].daysMap[dayKey]) {
        monthsMap[monthKey].daysMap[dayKey] = { day: dayKey, shiftCount: 0, categoriesMap: {} };
      }
      monthsMap[monthKey].daysMap[dayKey].shiftCount += 1;

      if (!monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey]) {
        monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey] = { category: catKey, count: 0 };
      }
      monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey].count += 1;
    });

    const months = Object.values(monthsMap).map(m => ({
      month: m.month,
      totalShifts: m.totalShifts,
      days: Object.values(m.daysMap).map(d => ({
        day: d.day,
        shiftCount: d.shiftCount,
        categories: Object.values(d.categoriesMap).map(c => ({
          category: c.category,
          count: c.count
        }))
      }))
    }));

    return NextResponse.json({
      totalShifts: totalShiftsCount,
      months
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
