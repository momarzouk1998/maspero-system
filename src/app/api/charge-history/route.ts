import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';

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
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.timestamp = {
        gte: start,
        lte: end
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

    const sortBy = searchParams.get('sortBy') || (search || searchParams.get('walletName') ? 'type' : 'date');

    const orderBy: any = sortBy === 'type'
      ? [{ transaction_type: 'asc' }, { timestamp: 'desc' }]
      : { timestamp: 'desc' };

    const [transactions, total] = await Promise.all([
      db.wallet_transactions.findMany({
        where,
        orderBy,
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

    const isShiftOpen = Boolean(activeShift);

    // If shift is CLOSED, only manager can delete, and balances are NOT altered
    if (!isShiftOpen) {
      if (user.role !== 'manager') {
        return NextResponse.json({ error: 'لا يمكن حذف عمليات الشفتات المغلقة إلا بواسطة المدير' }, { status: 403 });
      }

      await db.wallet_transactions.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'تم حذف العملية من السجل (شفت مغلق - دون تعديل الأرصدة)' });
    }

    // If shift is OPEN, verify user permissions (manager or the employee who made the tx)
    if (!hasPermission(user, 'charge_history', 'delete')) {
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف سجلات الشحن. تواصل مع المدير.' }, { status: 403 });
    }
    if (user.role !== 'manager' && user.id !== txItem.employee_id) {
      return NextResponse.json({ error: 'لا يمكن الحذف خارج الشفت المفتوح الخاص بك' }, { status: 403 });
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

// PUT: Manager or Employee (if shift is open) can edit transaction by ID
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id, amount, wallet_commission, description, transaction_type } = await req.json();
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  try {
    const txItem = await db.wallet_transactions.findUnique({ where: { id } });
    if (!txItem) return NextResponse.json({ error: 'العملية غير موجودة' }, { status: 404 });

    const activeShift = txItem.employee_id ? await db.shifts.findFirst({
      where: { employee_id: txItem.employee_id, end_time: null }
    }) : null;

    const isShiftOpen = Boolean(activeShift);

    if (user.role !== 'manager' && (!isShiftOpen || user.id !== txItem.employee_id)) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل هذه العملية' }, { status: 403 });
    }

    const numNewAmount = amount !== undefined ? Number(amount) : Number(txItem.amount || 0);
    const numNewCommission = wallet_commission !== undefined ? Number(wallet_commission) : Number(txItem.wallet_commission || 0);
    const targetTxType = transaction_type || txItem.transaction_type;

    await db.$transaction(async (tx) => {
      if (isShiftOpen) {
        const wallet = txItem.wallet_id ? await tx.external_wallets.findUnique({ where: { id: txItem.wallet_id } }) : null;

        const oldAmount = Number(txItem.amount || 0);
        const oldCommission = Number(txItem.wallet_commission || 0);

        const oldBalanceChange = txItem.transaction_type === 'إيداع' ? -oldAmount : oldAmount;
        const newBalanceChange = targetTxType === 'إيداع' ? -numNewAmount : numNewAmount;
        const diffExternal = newBalanceChange - oldBalanceChange;

        const isDrawer = wallet ? (wallet.wallet_type === 'درج كاشير' || wallet.wallet_name.includes('درج')) : false;
        const oldEmployeeCash = isDrawer
          ? (txItem.transaction_type === 'إيداع' ? -oldAmount : oldAmount)
          : (txItem.transaction_type === 'إيداع' ? (oldAmount + oldCommission) : -(oldAmount - oldCommission));

        const newEmployeeCash = isDrawer
          ? (targetTxType === 'إيداع' ? -numNewAmount : numNewAmount)
          : (targetTxType === 'إيداع' ? (numNewAmount + numNewCommission) : -(numNewAmount - numNewCommission));

        const diffEmployeeCash = newEmployeeCash - oldEmployeeCash;

        if (diffExternal !== 0 && txItem.wallet_id) {
          await tx.external_wallets.update({
            where: { id: txItem.wallet_id },
            data: {
              current_balance: { increment: diffExternal },
              actual_balance: { increment: diffExternal }
            }
          });
        }

        if (diffEmployeeCash !== 0 && txItem.employee_id) {
          await tx.users.update({
            where: { id: txItem.employee_id },
            data: { wallet_balance: { increment: diffEmployeeCash } }
          });
        }
      }

      await tx.wallet_transactions.update({
        where: { id },
        data: {
          amount: numNewAmount,
          wallet_commission: numNewCommission,
          transaction_type: targetTxType,
          description: description !== undefined ? description : undefined,
        }
      });
    });

    return NextResponse.json({ success: true, message: 'تم تعديل العملية وضبط الأرصدة بنجاح' });
  } catch (error: any) {
    console.error('Update charge transaction error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تعديل العملية' }, { status: 500 });
  }
}
