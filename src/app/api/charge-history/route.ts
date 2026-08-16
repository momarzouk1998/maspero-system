import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const search = searchParams.get('search') || '';
  const transactionType = searchParams.get('transactionType') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const skip = (page - 1) * limit;

  try {
    const where: any = user.role === 'manager' ? {} : { employee_id: user.id };

    if (transactionType) {
      where.transaction_type = transactionType;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (search) {
      where.OR = [
        { wallet_name: { contains: search, mode: 'insensitive' } },
        { employee_name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { invoice_code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      db.wallet_transactions.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      db.wallet_transactions.count({ where })
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Charge history error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب سجل العمليات' }, { status: 500 });
  }
}

// DELETE: Delete transaction with balance reversal if shift is active, or manager-only deletion for past shifts
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  try {
    const txItem = await db.wallet_transactions.findUnique({ where: { id } });
    if (!txItem) return NextResponse.json({ error: 'العملية غير موجودة' }, { status: 404 });

    // Check if the employee who created the transaction has an active open shift
    const activeShift = txItem.employee_id ? await db.shifts.findFirst({
      where: { employee_id: txItem.employee_id, end_time: null }
    }) : null;

    const isShiftOpen = Boolean(
      activeShift &&
      txItem.timestamp &&
      activeShift.start_time &&
      new Date(txItem.timestamp) >= new Date(activeShift.start_time)
    );

    // If shift is CLOSED, only manager can delete, and balances are NOT altered
    if (!isShiftOpen) {
      if (user.role !== 'manager') {
        return NextResponse.json({ error: 'لا يمكن حذف عمليات الشفتات المغلقة إلا بواسطة المدير' }, { status: 403 });
      }

      await db.wallet_transactions.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'تم حذف العملية من السجل (شفت مغلق - دون تعديل الأرصدة)' });
    }

    // If shift is OPEN, verify user permissions (manager or the employee who made the tx)
    if (user.role !== 'manager' && user.id !== txItem.employee_id) {
      return NextResponse.json({ error: 'غير مصرح لك بحذف هذه العملية' }, { status: 403 });
    }

    // Perform balance reversal for open shift deletion
    const wallet = txItem.wallet_id ? await db.external_wallets.findUnique({ where: { id: txItem.wallet_id } }) : null;
    const numAmount = Number(txItem.amount || 0);
    const numCommission = Number(txItem.wallet_commission || 0);

    const balanceChange = txItem.transaction_type === 'إيداع' ? -numAmount : numAmount;

    const isDrawer = wallet ? (wallet.wallet_type === 'درج كاشير' || wallet.wallet_name.includes('درج')) : false;
    const employeeCashChange = isDrawer
      ? (txItem.transaction_type === 'إيداع' ? -numAmount : numAmount)
      : (txItem.transaction_type === 'إيداع' ? (numAmount + numCommission) : -(numAmount - numCommission));

    await db.$transaction(async (tx) => {
      // 1. Reverse external wallet / machine balance
      if (txItem.wallet_id) {
        await tx.external_wallets.update({
          where: { id: txItem.wallet_id },
          data: {
            current_balance: { increment: -balanceChange },
            actual_balance: { increment: -balanceChange }
          }
        });
      }

      // 2. Reverse employee personal cash custody balance (عهدة الكاش)
      if (txItem.employee_id) {
        await tx.users.update({
          where: { id: txItem.employee_id },
          data: {
            wallet_balance: { increment: -employeeCashChange }
          }
        });
      }

      // 3. Delete transaction record
      await tx.wallet_transactions.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف العملية وإعادة رصيد المحفظة وعهدة الدرج/الكاش بنجاح 🔄'
    });

  } catch (error: any) {
    console.error('Delete charge transaction error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حذف العملية' }, { status: 500 });
  }
}

// PUT: Manager can edit transaction by ID
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const { id, amount, wallet_commission, description } = await req.json();
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  const updated = await db.wallet_transactions.update({
    where: { id },
    data: {
      amount: amount !== undefined ? Number(amount) : undefined,
      wallet_commission: wallet_commission !== undefined ? Number(wallet_commission) : undefined,
      description: description !== undefined ? description : undefined,
    }
  });

  return NextResponse.json({ success: true, transaction: updated });
}
