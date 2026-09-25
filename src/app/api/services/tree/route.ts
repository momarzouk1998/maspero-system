import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const filterEmpId = searchParams.get('employeeId') || '';
  const serviceName = searchParams.get('serviceName') || '';
  const faceType = searchParams.get('faceType') || '';

  try {
    const andClauses: any[] = [];

    if (user.role === 'manager') {
      if (filterEmpId) andClauses.push({ employee_id: filterEmpId });
    } else {
      andClauses.push({ employee_id: user.id });
    }

    if (serviceName) andClauses.push({ service_name: { contains: serviceName, mode: 'insensitive' } });
    if (faceType) andClauses.push({ face_type: faceType });

    if (search) {
      andClauses.push({
        OR: [
          { service_name: { contains: search, mode: 'insensitive' } },
          { employee_name: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    const whereCondition: any = andClauses.length > 0 ? { AND: andClauses } : {};

    const entries = await db.service_entries.findMany({
      where: whereCondition,
      select: {
        id: true,
        amount: true,
        service_name: true,
        date: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    const monthsMap: Record<string, {
      month: string;
      totalSum: number;
      count: number;
      daysMap: Record<string, {
        day: string;
        totalSum: number;
        count: number;
        categoriesMap: Record<string, {
          category: string;
          totalSum: number;
          count: number;
        }>
      }>
    }> = {};

    let grandTotal = 0;
    let totalCount = 0;

    entries.forEach(entry => {
      const amt = Number(entry.amount || 0);
      grandTotal += amt;
      totalCount += 1;

      const dateObj = new Date(entry.timestamp || entry.date || Date.now());
      const yyyy = dateObj.getFullYear();
      const mm = dateObj.getMonth() + 1;
      const monthKey = `${yyyy} ${mm}`;

      const day = String(dateObj.getDate()).padStart(2, '0');
      const monthStr = String(mm).padStart(2, '0');
      const dayKey = `${day}/${monthStr}/${yyyy}`;

      const catKey = entry.service_name || 'خدمات العامة';

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { month: monthKey, totalSum: 0, count: 0, daysMap: {} };
      }
      monthsMap[monthKey].totalSum += amt;
      monthsMap[monthKey].count += 1;

      if (!monthsMap[monthKey].daysMap[dayKey]) {
        monthsMap[monthKey].daysMap[dayKey] = { day: dayKey, totalSum: 0, count: 0, categoriesMap: {} };
      }
      monthsMap[monthKey].daysMap[dayKey].totalSum += amt;
      monthsMap[monthKey].daysMap[dayKey].count += 1;

      if (!monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey]) {
        monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey] = { category: catKey, totalSum: 0, count: 0 };
      }
      monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey].totalSum += amt;
      monthsMap[monthKey].daysMap[dayKey].categoriesMap[catKey].count += 1;
    });

    const months = Object.values(monthsMap).map(m => ({
      month: m.month,
      totalSum: m.totalSum,
      count: m.count,
      days: Object.values(m.daysMap).map(d => ({
        day: d.day,
        totalSum: d.totalSum,
        count: d.count,
        categories: Object.values(d.categoriesMap).map(c => ({
          category: c.category,
          totalSum: c.totalSum,
          count: c.count
        }))
      }))
    }));

    return NextResponse.json({
      totalSum: grandTotal,
      totalCount,
      months
    });
  } catch (e: any) {
    console.error('Services tree error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
