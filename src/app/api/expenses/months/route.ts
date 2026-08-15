import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mainType = searchParams.get('mainType') || '';
  const filterEmpId = searchParams.get('employeeId') || '';

  try {
    const whereCondition: any = user.role === 'manager'
      ? (filterEmpId ? { employee_id: filterEmpId } : {})
      : { employee_id: user.id };

    if (mainType) {
      if (['قبض', 'سلفة'].includes(mainType)) {
        whereCondition.OR = [
          { main_type: mainType },
          { expense_type: mainType }
        ];
      } else {
        whereCondition.OR = [
          { main_type: { contains: mainType, mode: 'insensitive' } },
          { expense_type: { contains: mainType, mode: 'insensitive' } },
          { items: { contains: mainType, mode: 'insensitive' } }
        ];
      }
    }

    const records = await db.expenses.findMany({
      where: whereCondition,
      select: { month: true, date: true },
      orderBy: { date: 'desc' }
    });

    const monthsSet = new Set<string>();
    records.forEach(r => {
      if (r.month) {
        monthsSet.add(r.month);
      } else if (r.date) {
        const d = new Date(r.date);
        monthsSet.add(`${d.getFullYear()} ${d.getMonth() + 1}`);
      }
    });

    return NextResponse.json({ months: Array.from(monthsSet) });
  } catch (error: any) {
    console.error('Error fetching expense months:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء جلب الأشهر' }, { status: 500 });
  }
}
