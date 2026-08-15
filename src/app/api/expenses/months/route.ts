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

    // استخدام distinct لجلب الأشهر الفريدة مباشرة بدون تحميل كل السجلات
    const distinctMonthRecords = await db.expenses.findMany({
      where: whereCondition,
      select: { month: true, date: true },
      distinct: ['month'],
      orderBy: { date: 'desc' }
    });

    // بناء قائمة الأشهر المرتبة بدون تكرار
    const monthsMap = new Map<string, Date>();
    distinctMonthRecords.forEach(r => {
      const key = r.month
        ? r.month.trim()
        : r.date
        ? `${new Date(r.date).getFullYear()} ${new Date(r.date).getMonth() + 1}`
        : null;
      if (key && !monthsMap.has(key)) {
        monthsMap.set(key, r.date ? new Date(r.date) : new Date(0));
      }
    });

    // ترتيب تنازلي بالتاريخ (الأحدث أولاً)
    const months = Array.from(monthsMap.entries())
      .sort((a, b) => b[1].getTime() - a[1].getTime())
      .map(([month]) => month);

    return NextResponse.json({ months });
  } catch (error: any) {
    console.error('Error fetching expense months:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء جلب الأشهر' }, { status: 500 });
  }
}
