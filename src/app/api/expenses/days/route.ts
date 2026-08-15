import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mainType = searchParams.get('mainType') || '';
  const month = searchParams.get('month') || '';
  const filterEmpId = searchParams.get('employeeId') || '';

  try {
    const whereCondition: any = user.role === 'manager'
      ? (filterEmpId ? { employee_id: filterEmpId } : {})
      : { employee_id: user.id };

    const andConditions: any[] = [];

    if (mainType) {
      if (['قبض', 'سلفة'].includes(mainType)) {
        andConditions.push({
          OR: [
            { main_type: mainType },
            { expense_type: mainType }
          ]
        });
      } else {
        andConditions.push({
          OR: [
            { main_type: { contains: mainType, mode: 'insensitive' } },
            { expense_type: { contains: mainType, mode: 'insensitive' } },
            { items: { contains: mainType, mode: 'insensitive' } }
          ]
        });
      }
    }

    if (month) {
      // فلتر الشهر بناءً على حقل month أو من خلال حساب التاريخ
      const parts = month.split(' ');
      if (parts.length === 2) {
        const yyyy = parseInt(parts[0]);
        const mm = parseInt(parts[1]);
        const startOfMonth = new Date(yyyy, mm - 1, 1);
        const endOfMonth = new Date(yyyy, mm, 0, 23, 59, 59);
        andConditions.push({
          OR: [
            { month: month },
            { date: { gte: startOfMonth, lte: endOfMonth } }
          ]
        });
      } else {
        andConditions.push({ month: month });
      }
    }

    if (andConditions.length > 0) {
      whereCondition.AND = [
        ...(whereCondition.AND || []),
        ...andConditions
      ];
    }

    const records = await db.expenses.findMany({
      where: whereCondition,
      select: { date: true },
      orderBy: { date: 'desc' }
    });

    const daysSet = new Set<string>();
    records.forEach(r => {
      if (r.date) {
        const d = new Date(r.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        daysSet.add(`${yyyy}-${mm}-${dd}`);
      }
    });

    return NextResponse.json({ days: Array.from(daysSet) });
  } catch (error: any) {
    console.error('Error fetching expense days:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء جلب الأيام' }, { status: 500 });
  }
}
