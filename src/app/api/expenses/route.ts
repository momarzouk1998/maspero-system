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
  const search = searchParams.get('search') || '';
  const mainType = searchParams.get('mainType') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const filterEmpId = searchParams.get('employeeId') || '';

  const skip = (page - 1) * limit;

  const whereCondition: any = user.role === 'manager'
    ? (filterEmpId ? { employee_id: filterEmpId } : {})
    : { employee_id: user.id };

  if (mainType) {
    const targetType = mainType === 'مسحوبات' ? ['مسحوبات', 'إيرادات'] : [mainType];
    if (['قبض', 'سلفة'].includes(mainType)) {
      whereCondition.OR = [
        { main_type: mainType },
        { expense_type: mainType }
      ];
    } else {
      whereCondition.OR = targetType.flatMap(t => [
        { main_type: { contains: t, mode: 'insensitive' } },
        { expense_type: { contains: t, mode: 'insensitive' } },
        { items: { contains: t, mode: 'insensitive' } }
      ]);
    }
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    whereCondition.timestamp = {
      gte: start,
      lte: end
    };
  }

  if (search) {
    whereCondition.AND = [
      ...(whereCondition.AND || []),
      {
        OR: [
          { notes: { contains: search, mode: 'insensitive' } },
          { employee_name: { contains: search, mode: 'insensitive' } },
          { main_type: { contains: search, mode: 'insensitive' } },
          { expense_type: { contains: search, mode: 'insensitive' } },
        ]
      }
    ];
  }

  const [expenses, total] = await Promise.all([
    db.expenses.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    db.expenses.count({ where: whereCondition })
  ]);

  const cleanedExpenses = expenses.map(exp => ({
    ...exp,
    main_type: exp.main_type === 'إيرادات' ? 'مسحوبات' : exp.main_type,
    expense_type: exp.expense_type === 'إيرادات' ? 'مسحوبات' : exp.expense_type
  }));

  return NextResponse.json({ expenses: cleanedExpenses, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { mainType, items, paymentMethod, amount, notes, targetEmployeeId, date } = await req.json();

    const numAmount = Number(amount);
    if (!mainType || numAmount <= 0) {
      return NextResponse.json({ error: 'برجاء ادخال النوع والمبلغ بشكل صحيح' }, { status: 400 });
    }

    const txDate = date ? new Date(date) : new Date();

    // Target employee is ONLY relevant for advances & salary
    let employeeId = user.id;
    let employeeName = user.name;
    let isPendingApproval = false;
    let pendingNoteExtension = '';

    if (['سلفة', 'قبض'].includes(mainType) && targetEmployeeId) {
      const emp = await db.users.findUnique({ where: { id: targetEmployeeId } });
      if (emp) {
        employeeId = emp.id;
        employeeName = emp.name;

        // Check if non-manager advance exceeds target employee's remaining salary
        if (mainType === 'سلفة' && user.role !== 'manager') {
          const baseSalary = Number(emp.salary || 0);
          const startOfMonth = new Date(txDate.getFullYear(), txDate.getMonth(), 1);
          const endOfMonth = new Date(txDate.getFullYear(), txDate.getMonth() + 1, 0, 23, 59, 59);

          const drawnSum = await db.expenses.aggregate({
            where: {
              employee_id: targetEmployeeId,
              main_type: { in: ['سلفة', 'قبض'] },
              date: { gte: startOfMonth, lte: endOfMonth }
            },
            _sum: { amount: true }
          });

          const totalDrawn = Number(drawnSum._sum.amount || 0);
          const remainingSalary = baseSalary - totalDrawn;

          if (numAmount > remainingSalary) {
            isPendingApproval = true;
            pendingNoteExtension = ` ⚠️ [معلق: سلفة تتجاوز المتبقي من الراتب (${remainingSalary.toFixed(2)})]`;
          }
        }
      }
    }

    const expense = await db.$transaction(async (tx) => {
      const created = await tx.expenses.create({
        data: {
          date: txDate,
          month: `${txDate.getFullYear()} ${txDate.getMonth() + 1}`,
          main_type: mainType,
          expense_type: mainType, // e.g. "مصروفات", "دعم مالي", "مسحوبات"
          items: items || null,
          notes: (notes || '') + pendingNoteExtension,
          amount: numAmount,
          employee_id: employeeId,
          employee_name: employeeName,
          timestamp: txDate,
        }
      });

      // Adjust cash custody balance of the active employee creating the entry
      // "دعم مالي" = Manager gave cash to employee -> INCREMENT employee custody (+)
      // "مسحوبات", "مصروفات", "مشتريات", "سلفة", "قبض" = Cash paid out -> DECREMENT employee custody (-)
      if (mainType === 'دعم مالي') {
        await WalletService.adjustEmployeeWallet(user.id, numAmount, tx);
      } else {
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

// PUT: Manager can edit financial transaction by ID
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { id, mainType, items, amount, notes } = await req.json();
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const updated = await db.expenses.update({
      where: { id },
      data: {
        main_type: mainType || undefined,
        items: items !== undefined ? items : undefined,
        amount: amount !== undefined ? Number(amount) : undefined,
        notes: notes !== undefined ? notes : undefined,
      }
    });

    return NextResponse.json({ success: true, expense: updated });
  } catch (error: any) {
    console.error('Update Expense Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل المعاملة المالية' }, { status: 500 });
  }
}
