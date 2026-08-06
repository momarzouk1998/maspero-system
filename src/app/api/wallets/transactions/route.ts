import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const employeeId = searchParams.get('employee_id');
  const date = searchParams.get('date');
  const search = searchParams.get('search');

  let where: any = {};

  if (user.role !== 'manager') {
    where.employee_id = user.id;
  } else if (employeeId) {
    where.employee_id = employeeId;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    where.date = {
      gte: startOfDay,
      lte: endOfDay
    };
  }

  if (search) {
    where.OR = [
      { wallet_name: { contains: search } },
      { description: { contains: search } },
      { invoice_code: { contains: search } }
    ];
  }

  try {
    const transactions = await db.wallet_transactions.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        wallet: { select: { wallet_name: true, wallet_type: true } }
      }
    });

    const total = await db.wallet_transactions.count({ where });

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Wallet Transactions History Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب سجل المحافظ' }, { status: 500 });
  }
}
