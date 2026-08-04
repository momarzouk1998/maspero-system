import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WalletService } from '@/lib/wallet-service';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  const whereCondition = user.role === 'manager' ? {} : { employee_id: user.id };

  const [expenses, total] = await Promise.all([
    db.expenses.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    db.expenses.count({ where: whereCondition })
  ]);

  return NextResponse.json({ expenses, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { mainType, expenseType, items, amount, notes } = await req.json();

    const numAmount = Number(amount);
    if (!mainType || numAmount <= 0) {
      return NextResponse.json({ error: 'برجاء ادخال النوع والمبلغ بشكل صحيح' }, { status: 400 });
    }

    const today = new Date();

    const expense = await db.$transaction(async (tx) => {
      const created = await tx.expenses.create({
        data: {
          date: today,
          month: `${today.getFullYear()} ${today.getMonth() + 1}`,
          main_type: mainType || 'مصروفات',
          expense_type: expenseType || 'مصروفات',
          items: items || null,
          notes: notes || null,
          amount: numAmount,
          employee_id: user.id,
          employee_name: user.name,
          timestamp: today,
        }
      });

      // Deduction from employee's personal wallet (if payout/expense/advance)
      // MainType 'مصروفات' decreases employee cash balance
      const cashChange = mainType === 'إيرادات' ? numAmount : -numAmount;
      await WalletService.adjustEmployeeWallet(user.id, cashChange, tx);

      return created;
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Expense error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ المصروف' }, { status: 500 });
  }
}
