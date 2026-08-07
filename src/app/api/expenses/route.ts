import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WalletService } from '@/lib/wallet-service';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);

  // If requesting stats for an employee
  const statsEmployeeId = searchParams.get('employeeId');
  if (statsEmployeeId) {
    const targetUser = await db.users.findUnique({ where: { id: statsEmployeeId } });
    if (!targetUser) return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthExpenses = await db.expenses.findMany({
      where: {
        employee_id: statsEmployeeId,
        main_type: { in: ['سلفة', 'قبض'] },
        date: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const totalDrawnThisMonth = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const baseSalary = Number(targetUser.salary || 0);
    const remainingSalary = Math.max(0, baseSalary - totalDrawnThisMonth);

    return NextResponse.json({
      baseSalary,
      totalDrawnThisMonth,
      remainingSalary
    });
  }

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
    const { mainType, paymentMethod, amount, notes, targetEmployeeId, date } = await req.json();

    const numAmount = Number(amount);
    if (!mainType || numAmount <= 0) {
      return NextResponse.json({ error: 'برجاء ادخال النوع والمبلغ بشكل صحيح' }, { status: 400 });
    }

    const txDate = date ? new Date(date) : new Date();

    // Determine target employee
    let employeeId = user.id;
    let employeeName = user.name;

    if (targetEmployeeId && user.role === 'manager') {
      const emp = await db.users.findUnique({ where: { id: targetEmployeeId } });
      if (emp) {
        employeeId = emp.id;
        employeeName = emp.name;
      }
    }

    const expense = await db.$transaction(async (tx) => {
      const created = await tx.expenses.create({
        data: {
          date: txDate,
          month: `${txDate.getFullYear()} ${txDate.getMonth() + 1}`,
          main_type: mainType,
          expense_type: paymentMethod || 'نقدي',
          notes: notes || null,
          amount: numAmount,
          employee_id: employeeId,
          employee_name: employeeName,
          timestamp: txDate,
        }
      });

      // If it's a cash payout from employee's custody
      if (paymentMethod === 'نقدي' && ['مصروفات', 'سلفة', 'قبض', 'مشتريات'].includes(mainType)) {
        await WalletService.adjustEmployeeWallet(user.id, -numAmount, tx);
      }

      return created;
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Expense Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ المعاملة المالية' }, { status: 500 });
  }
}

// DELETE: Manager can delete financial transaction by ID
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  await db.expenses.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
