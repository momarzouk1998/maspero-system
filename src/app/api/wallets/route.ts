import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  // External Fawry / Machine wallets
  const externalWallets = await db.external_wallets.findMany({
    where: { is_active: true },
    orderBy: { sort: 'asc' }
  });

  // Employee Wallets list (For Manager view or transfer recipient selection)
  const employeeWallets = await db.users.findMany({
    where: { is_active: true },
    select: {
      id: true,
      name: true,
      role: true,
      job_title: true,
      wallet_balance: user.role === 'manager' || true, // Employees can see recipient names
    },
    orderBy: { name: 'asc' }
  });

  return NextResponse.json({ externalWallets, employeeWallets });
}

// Machine Deposit / Withdrawal transaction
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { walletId, transactionType, amount, commission, description } = await req.json();

    const wallet = await db.external_wallets.findUnique({
      where: { id: walletId }
    });

    if (!wallet) return NextResponse.json({ error: 'المحفظة/الماكينة غير موجودة' }, { status: 404 });

    const numAmount = Number(amount);
    const numCommission = Number(commission || 0);
    const today = new Date();
    const invoiceCode = Math.random().toString(36).substring(2, 10);

    const transaction = await db.$transaction(async (tx) => {
      // Create transaction log
      const log = await tx.wallet_transactions.create({
        data: {
          date: today,
          transaction_month: `${today.getFullYear()} ${today.getMonth() + 1}`,
          wallet_id: walletId,
          wallet_name: wallet.wallet_name,
          transaction_type: transactionType, // "سحب" or "إيداع"
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

      // Update external wallet balance
      const balanceChange = transactionType === 'إيداع' ? numAmount : -numAmount;
      await tx.external_wallets.update({
        where: { id: walletId },
        data: {
          current_balance: { increment: balanceChange }
        }
      });

      // If customer paid cash for machine deposit (+cash to employee), or withdrawal (-cash from employee)
      // Deposit: Customer gives employee cash -> employee cash increases
      // Withdrawal: Customer receives cash from employee -> employee cash decreases
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
    console.error('Wallet transaction error:', error);
    return NextResponse.json({ error: 'حدث خطأ في عملية الماكينة' }, { status: 500 });
  }
}
