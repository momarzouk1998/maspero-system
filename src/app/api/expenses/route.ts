import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
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

    let allowAdvances = true;
    let targetPerms: any = {};
    if (typeof targetUser.permissions === 'string') {
      try { targetPerms = JSON.parse(targetUser.permissions); } catch { targetPerms = {}; }
    } else if (typeof targetUser.permissions === 'object' && targetUser.permissions !== null) {
      targetPerms = targetUser.permissions;
    }
    if (targetPerms.allow_advances === false) {
      allowAdvances = false;
    }

    return NextResponse.json({
      baseSalary,
      totalDrawnThisMonth,
      remainingSalary,
      allowAdvances
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

  const cleanedExpenses = expenses.map(exp => {
    let mType = (exp.main_type || 'مصروفات').trim().replace(/[\uFFFD\u0000-\u001F]/g, '');
    let eType = (exp.expense_type || exp.main_type || 'مصروفات').trim().replace(/[\uFFFD\u0000-\u001F]/g, '');
    
    if (mType.startsWith('مصروفا') && mType !== 'مصروفات') mType = 'مصروفات';
    if (eType.startsWith('مصروفا') && eType !== 'مصروفات') eType = 'مصروفات';

    if (mType === 'إيرادات') mType = 'مسحوبات';
    if (eType === 'إيرادات') eType = 'مسحوبات';

    return {
      ...exp,
      main_type: mType,
      expense_type: eType
    };
  });

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

    let txDate = new Date();
    if (date) {
      if (typeof date === 'string' && (date.includes('T') || date.includes(':'))) {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          txDate = d;
        }
      } else if (typeof date === 'string') {
        const parts = date.split('-');
        if (parts.length === 3) {
          const yr = parseInt(parts[0], 10);
          const mo = parseInt(parts[1], 10) - 1;
          const dy = parseInt(parts[2], 10);
          if (!isNaN(yr) && !isNaN(mo) && !isNaN(dy)) {
            txDate.setFullYear(yr, mo, dy);
          }
        }
      }
    }

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

        // Check if target employee is allowed to take advances ("مسموح بالسلف")
        if (mainType === 'سلفة' && user.role !== 'manager') {
          let targetPerms: any = {};
          if (typeof emp.permissions === 'string') {
            try { targetPerms = JSON.parse(emp.permissions); } catch { targetPerms = {}; }
          } else if (typeof emp.permissions === 'object' && emp.permissions !== null) {
            targetPerms = emp.permissions;
          }

          if (targetPerms.allow_advances === false) {
            return NextResponse.json({ error: 'عفواً، هذا الموظف غير مسموح له بسحب سُلفة. تواصل مع المدير.' }, { status: 403 });
          }

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

    // Check if user currently has an active open shift
    const activeShift = await db.shifts.findFirst({
      where: { employee_id: user.id, end_time: null }
    });

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
          created_by_id: user.id,
          created_by_name: user.name,
          shift_cashier: user.name,
          timestamp: txDate,
        }
      });

      // Adjust cash custody balance ONLY IF user is employee OR manager HAS an active open shift
      if (user.role !== 'manager' || activeShift) {
        if (mainType === 'دعم مالي') {
          await WalletService.adjustEmployeeWallet(user.id, numAmount, tx);
        } else {
          await WalletService.adjustEmployeeWallet(user.id, -numAmount, tx);
        }
      }

      return created;
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Expense Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ المعاملة المالية' }, { status: 500 });
  }
}

// DELETE: Employee or Manager can delete financial transaction by ID with balance reversal if shift is open
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  try {
    const exp = await db.expenses.findUnique({ where: { id } });
    if (!exp) return NextResponse.json({ error: 'المعاملة غير موجودة' }, { status: 404 });

    const activeShift = exp.employee_id ? await db.shifts.findFirst({
      where: { employee_id: exp.employee_id, end_time: null }
    }) : null;

    const isShiftOpen = Boolean(activeShift);

    if (!hasPermission(user, 'expenses', 'delete')) {
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف المصروفات. تواصل مع المدير.' }, { status: 403 });
    }
    if (user.role !== 'manager' && (!isShiftOpen || user.id !== exp.employee_id)) {
      return NextResponse.json({ error: 'لا يمكن الحذف خارج الشفت المفتوح الخاص بك' }, { status: 403 });
    }

    const numAmount = Number(exp.amount || 0);

    await db.$transaction(async (tx: any) => {
      if (isShiftOpen && exp.employee_id) {
        // Reverse expense cash impact:
        // 'دعم مالي' previously added cash -> reverse by subtracting
        // other expense types previously subtracted cash -> reverse by adding back
        if (exp.main_type === 'دعم مالي') {
          await WalletService.adjustEmployeeWallet(exp.employee_id, -numAmount, tx);
        } else {
          await WalletService.adjustEmployeeWallet(exp.employee_id, numAmount, tx);
        }
      }

      await tx.expenses.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'تم حذف المعاملة المالية وعكس عهدة الكاش بنجاح' });
  } catch (error: any) {
    console.error('Delete Expense Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حذف المعاملة' }, { status: 500 });
  }
}

// PUT: Employee or Manager can edit financial transaction by ID with balance adjustment if shift is open
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { id, mainType, items, amount, notes } = await req.json();
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const exp = await db.expenses.findUnique({ where: { id } });
    if (!exp) return NextResponse.json({ error: 'المعاملة غير موجودة' }, { status: 404 });

    const activeShift = exp.employee_id ? await db.shifts.findFirst({
      where: { employee_id: exp.employee_id, end_time: null }
    }) : null;

    const isShiftOpen = Boolean(activeShift);

    if (!hasPermission(user, 'expenses', 'update')) {
      return NextResponse.json({ error: 'ليس لديك صلاحية تعديل المصروفات. تواصل مع المدير.' }, { status: 403 });
    }
    if (user.role !== 'manager' && (!isShiftOpen || user.id !== exp.employee_id)) {
      return NextResponse.json({ error: 'لا يمكن التعديل خارج الشفت المفتوح الخاص بك' }, { status: 403 });
    }


    const numNewAmount = amount !== undefined ? Number(amount) : Number(exp.amount || 0);
    const targetMainType = mainType || exp.main_type;

    const updated = await db.$transaction(async (tx: any) => {
      if (isShiftOpen && exp.employee_id) {
        const oldAmount = Number(exp.amount || 0);
        const oldChange = exp.main_type === 'دعم مالي' ? oldAmount : -oldAmount;
        const newChange = targetMainType === 'دعم مالي' ? numNewAmount : -numNewAmount;
        const diff = newChange - oldChange;

        if (diff !== 0) {
          await WalletService.adjustEmployeeWallet(exp.employee_id, diff, tx);
        }
      }

      return await tx.expenses.update({
        where: { id },
        data: {
          main_type: targetMainType,
          expense_type: targetMainType,
          items: items !== undefined ? items : undefined,
          amount: numNewAmount,
          notes: notes !== undefined ? notes : undefined,
        }
      });
    });

    return NextResponse.json({ success: true, expense: updated, message: 'تم تعديل المعاملة وضبط العهدة بنجاح' });
  } catch (error: any) {
    console.error('Update Expense Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تعديل المعاملة المالية' }, { status: 500 });
  }
}
