import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getFawryPurchaseRate, computeWalletDeltas } from '@/lib/fawry-utils';

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

  // Monthly Deposits & Withdrawals aggregation per wallet for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthlyTx = await db.wallet_transactions.groupBy({
    by: ['wallet_id', 'transaction_type'],
    where: {
      timestamp: { gte: startOfMonth, lte: endOfMonth }
    },
    _sum: {
      amount: true
    }
  });

  const depositMap: Record<string, number> = {};
  const withdrawalMap: Record<string, number> = {};

  monthlyTx.forEach(txGroup => {
    if (!txGroup.wallet_id) return;
    const sumAmt = Number(txGroup._sum.amount || 0);
    if (txGroup.transaction_type === 'إيداع') {
      depositMap[txGroup.wallet_id] = sumAmt;
    } else if (txGroup.transaction_type === 'سحب') {
      withdrawalMap[txGroup.wallet_id] = sumAmt;
    }
  });

  const externalWalletsWithTotals = externalWallets.map(w => ({
    ...w,
    monthly_deposit: depositMap[w.id] || 0,
    monthly_withdrawal: withdrawalMap[w.id] || 0
  }));

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

  return NextResponse.json({ externalWallets: externalWalletsWithTotals, employeeWallets });
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

      const { walletName, walletType, walletNumber, initialBalance, custodianName } = body;
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
    const { walletId, transactionType, amount, commission, description, invoice_code, comanda_type, fawry_type } = body;

    const wallet = await db.external_wallets.findUnique({
      where: { id: walletId }
    });

    if (!wallet) return NextResponse.json({ error: 'المحفظة/الماكينة غير موجودة' }, { status: 404 });

    const numAmount = Number(amount);
    const numCommission = Number(commission || 0);
    const today = new Date();
    const invoiceCode = invoice_code || Math.random().toString(36).substring(2, 10);

    // ── حساب موحد لتغيرات الرصيد (بيتعامل تلقائياً مع خصم مشتريات فوري) ──
    const fawryRate = await getFawryPurchaseRate();
    const deltas = computeWalletDeltas({
      amount: numAmount,
      commission: numCommission,
      transactionType,
      fawryType: fawry_type,
      walletType: wallet.wallet_type,
      walletName: wallet.wallet_name,
      fawryPurchaseRate: fawryRate,
    });
    const balanceChange = deltas.externalDelta;
    const currentBal = Number(wallet.current_balance || 0);
    const newBal = currentBal + balanceChange;

    const isExemptFromNegative = wallet.wallet_name.includes('الصياد') || wallet.wallet_name.includes('الكوماندا');

    // PREVENT NEGATIVE BALANCE CONSTRAINT FOR WALLETS, MACHINES & DRAWERS
    if (newBal < 0 && !isExemptFromNegative) {
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
          wallet_commission: deltas.realCommission,
          description: description || null,
          employee_id: user.id,
          employee_name: user.name,
          invoice_code: invoiceCode,
          comanda_type: comanda_type || null,
          fawry_type: fawry_type || null,
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

      // عهدة الكاشير تعتمد على العمولة الأصلية (ما دفعه العميل فعلاً)
      // وليس realCommission — الفرق هو تكلفة الماكينة التي تُطرح من رصيدها مباشرة
      await tx.users.update({
        where: { id: user.id },
        data: {
          wallet_balance: { increment: deltas.employeeCashDelta }
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
    const { walletId, walletName, walletType, walletNumber, initialBalance, custodianName } = await req.json();

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
