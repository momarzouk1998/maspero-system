import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET all external wallets & employee wallets
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  // External Fawry / Machine wallets & Cash Drawers
  const externalWallets = await db.external_wallets.findMany({
    where: { is_active: true },
    orderBy: { sort: 'asc' }
  });

  // Clean Employee Wallets list (excluding any invalid HTML entries)
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
    if (body.action === 'create') {
      if (user.role !== 'manager') {
        return NextResponse.json({ error: 'إضافة المحافظ والماكينات متاح للمدير فقط' }, { status: 403 });
      }

      const { walletName, walletType, walletNumber, initialBalance } = body;
      if (!walletName || !walletType) {
        return NextResponse.json({ error: 'اسم المحفظة ونوعها مطلوبان' }, { status: 400 });
      }

      const created = await db.external_wallets.create({
        data: {
          wallet_name: walletName,
          wallet_type: walletType, // "محفظة" | "ماكينة" | "درج كاش"
          wallet_number: walletNumber || null,
          current_balance: Number(initialBalance || 0),
          actual_balance: Number(initialBalance || 0),
          is_active: true,
        }
      });

      return NextResponse.json({
        success: true,
        message: `تم إضافة (${created.wallet_name}) بنجاح 🎉`,
        wallet: created
      });
    }

    // 2. Machine Deposit / Withdrawal transaction
    const { walletId, transactionType, amount, commission, description } = body;

    const wallet = await db.external_wallets.findUnique({
      where: { id: walletId }
    });

    if (!wallet) return NextResponse.json({ error: 'المحفظة/الماكينة غير موجودة' }, { status: 404 });

    const numAmount = Number(amount);
    const numCommission = Number(commission || 0);
    const today = new Date();
    const invoiceCode = Math.random().toString(36).substring(2, 10);

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

      const balanceChange = transactionType === 'إيداع' ? numAmount : -numAmount;
      await tx.external_wallets.update({
        where: { id: walletId },
        data: {
          current_balance: { increment: balanceChange }
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
    if (custodianName !== undefined) updateData.custodian_name = custodianName;

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
