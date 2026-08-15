import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const TYPE_SORT_ORDER: Record<string, number> = {
  'محفظة': 1,
  'ماكينة': 2,
  'درج كاشير': 3,
};

// GET all external wallets & employee wallets
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  // External Fawry / Machine wallets & Cash Drawers
  const rawExternalWallets = await db.external_wallets.findMany({
    where: { is_active: true },
    orderBy: [{ sort: 'asc' }, { wallet_name: 'asc' }]
  });

  // Sort strictly by: 1. المحافظ -> 2. المكن -> 3. الأدراج
  const externalWallets = rawExternalWallets.sort((a, b) => {
    const orderA = TYPE_SORT_ORDER[a.wallet_type] || 4;
    const orderB = TYPE_SORT_ORDER[b.wallet_type] || 4;
    if (orderA !== orderB) return orderA - orderB;
    return a.sort - b.sort;
  });

  // Clean Employee Wallets list
  const employeeWallets = await db.users.findMany({
    where: {
      is_active: true,
      NOT: [
        { name: { contains: '<' } },
        { name: { contains: '>' } },
        { name: { contains: 'style=' } },
        { name: { contains: 'padding:' } },
        { name: { contains: 'tr>' } },
        { name: { contains: 'td>' } },
        { name: { contains: 'th>' } },
      ]
    },
    select: {
      id: true,
      name: true,
      role: true,
      job_title: true,
      wallet_balance: true,
    },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({ externalWallets, employeeWallets });
}

// Transaction Logging OR Wallet Creation (Manager)
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const body = await req.json();

    // 1. Manager Create New Wallet / Machine / Drawer
    if (body.action === 'create' || body.walletName) {
      if (user.role !== 'manager') {
        return NextResponse.json({ error: 'إضافة المحافظ والماكينات متاح للمدير فقط' }, { status: 403 });
      }

      const { walletName, walletType, walletNumber, initialBalance, custodianName, minDeposit, maxDeposit, minWithdraw, maxWithdraw } = body;
      if (!walletName || !walletType) {
        return NextResponse.json({ error: 'اسم المحفظة ونوعها مطلوبان' }, { status: 400 });
      }

      const created = await db.external_wallets.create({
        data: {
          wallet_name: walletName,
          wallet_type: walletType, // "محفظة" | "ماكينة" | "درج كاشير"
          wallet_number: walletNumber || null,
          current_balance: Number(initialBalance || 0),
          actual_balance: Number(initialBalance || 0),
          custodian_name: custodianName || 'ماسـبيرو (المركز)',
          min_deposit: minDeposit ? Number(minDeposit) : 0,
          max_deposit: maxDeposit ? Number(maxDeposit) : 0,
          min_withdraw: minWithdraw ? Number(minWithdraw) : 0,
          max_withdraw: maxWithdraw ? Number(maxWithdraw) : 0,
          is_active: true,
        }
      });

      return NextResponse.json({
        success: true,
        message: `تم إضافة (${created.wallet_name}) بنجاح 🎉`,
        wallet: created
      });
    }

    // 2. Machine / Wallet Deposit / Withdrawal transaction
    const { walletId, transactionType, amount, commission, description, invoice_code } = body;

    const wallet = await db.external_wallets.findUnique({
      where: { id: walletId }
    });

    if (!wallet) return NextResponse.json({ error: 'المحفظة/الماكينة غير موجودة' }, { status: 404 });

    const numAmount = Number(amount);
    const numCommission = Number(commission || 0);

    // Validate deposit / withdrawal limits
    if (transactionType === 'إيداع') {
      if (wallet.min_deposit && Number(wallet.min_deposit) > 0 && numAmount < Number(wallet.min_deposit)) {
        return NextResponse.json({ error: `مبلغ الإيداع أقل من الحد الأدنى المسموح به (${wallet.min_deposit})` }, { status: 400 });
      }
      if (wallet.max_deposit && Number(wallet.max_deposit) > 0 && numAmount > Number(wallet.max_deposit)) {
        return NextResponse.json({ error: `مبلغ الإيداع يتجاوز الحد الأقصى المسموح به (${wallet.max_deposit})` }, { status: 400 });
      }
    } else if (transactionType === 'سحب') {
      if (wallet.min_withdraw && Number(wallet.min_withdraw) > 0 && numAmount < Number(wallet.min_withdraw)) {
        return NextResponse.json({ error: `مبلغ السحب أقل من الحد الأدنى المسموح به (${wallet.min_withdraw})` }, { status: 400 });
      }
      if (wallet.max_withdraw && Number(wallet.max_withdraw) > 0 && numAmount > Number(wallet.max_withdraw)) {
        return NextResponse.json({ error: `مبلغ السحب يتجاوز الحد الأقصى المسموح به (${wallet.max_withdraw})` }, { status: 400 });
      }
    }
    const today = new Date();
    const invoiceCode = invoice_code || Math.random().toString(36).substring(2, 10);

    const balanceChange = transactionType === 'إيداع' ? -numAmount : numAmount;
    const currentBal = Number(wallet.current_balance || 0);
    const newBal = currentBal + balanceChange;

    // PREVENT NEGATIVE BALANCE CONSTRAINT FOR WALLETS, MACHINES & DRAWERS
    if (newBal < 0) {
      return NextResponse.json({
        error: `عذراً، رصيد (${wallet.wallet_name}) لا يكفي للعملية (الرصيد المتاح: ${currentBal.toLocaleString('en-US')}) ولا يمكن أن يصبح بالسالب!`
      }, { status: 400 });
    }

    const transaction = await db.$transaction(async (tx) => {
      const log = await tx.wallet_transactions.create({
        data: {
          date: today,
          transaction_month: `${today.getFullYear()} ${today.getMonth() + 1}`,
          wallet_id: walletId,
          wallet_name: wallet.wallet_name,
          transaction_type: transactionType,
          wallet_type: wallet.wallet_type,
          amount: numAmount,
          wallet_commission: numCommission,
          description: description || null,
          employee_id: user.id,
          employee_name: user.name,
          invoice_code: invoiceCode,
          timestamp: today,
        }
      });

      await tx.external_wallets.update({
        where: { id: walletId },
        data: {
          current_balance: { increment: balanceChange },
          actual_balance: { increment: balanceChange }
        }
      });

      const employeeCashChange = transactionType === 'إيداع' ? (numAmount + numCommission) : -(numAmount - numCommission);
      await tx.users.update({
        where: { id: user.id },
        data: {
          wallet_balance: { increment: employeeCashChange }
        }
      });

      return log;
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    console.error('Wallet POST error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في العملية' }, { status: 500 });
  }
}

// PUT: Manager Update Wallet / Machine / Drawer Details & Balance
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير بتعديل المحافظ' }, { status: 403 });
  }

  try {
    const { walletId, walletName, walletType, walletNumber, initialBalance, custodianName, minDeposit, maxDeposit, minWithdraw, maxWithdraw } = await req.json();

    if (!walletId) {
      return NextResponse.json({ error: 'معرف المحفظة مطلوب' }, { status: 400 });
    }

    const updateData: any = {};
    if (walletName !== undefined) updateData.wallet_name = walletName;
    if (walletType !== undefined) updateData.wallet_type = walletType;
    if (walletNumber !== undefined) updateData.wallet_number = walletNumber;
    if (initialBalance !== undefined) {
      updateData.current_balance = Number(initialBalance);
      updateData.actual_balance = Number(initialBalance);
    }
    if (custodianName !== undefined) updateData.custodian_name = custodianName || 'ماسـبيرو (المركز)';
    if (minDeposit !== undefined) updateData.min_deposit = Number(minDeposit || 0);
    if (maxDeposit !== undefined) updateData.max_deposit = Number(maxDeposit || 0);
    if (minWithdraw !== undefined) updateData.min_withdraw = Number(minWithdraw || 0);
    if (maxWithdraw !== undefined) updateData.max_withdraw = Number(maxWithdraw || 0);

    const updated = await db.external_wallets.update({
      where: { id: walletId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: `تم تعديل بيانات (${updated.wallet_name}) بنجاح 🎉`,
      wallet: updated
    });
  } catch (error: any) {
    console.error('Wallet update error:', error);
    return NextResponse.json({ error: error.message || 'فشل تعديل المحفظة' }, { status: 400 });
  }
}

// DELETE: Manager Delete / Deactivate Wallet, Machine, or Drawer
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير بحذف المحافظ والأدراج' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const walletId = searchParams.get('id');

    if (!walletId) {
      return NextResponse.json({ error: 'معرف المحفظة/الدرج مطلوب' }, { status: 400 });
    }

    const updated = await db.external_wallets.update({
      where: { id: walletId },
      data: { is_active: false }
    });

    return NextResponse.json({
      success: true,
      message: `تم حذف (${updated.wallet_name}) بنجاح`
    });
  } catch (error: any) {
    console.error('Wallet delete error:', error);
    return NextResponse.json({ error: error.message || 'فشل حذف المحفظة/الدرج' }, { status: 400 });
  }
}
