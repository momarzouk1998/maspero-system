import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });
  }

  try {
    const { employeeId, walletBalance, reason } = await req.json();

    if (!employeeId || walletBalance === undefined) {
      return NextResponse.json({ error: 'معرف الموظف والرصيد الجديد مطلوبان' }, { status: 400 });
    }

    const emp = await db.users.findUnique({ where: { id: employeeId } });
    if (!emp) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    const numBalance = Number(walletBalance);

    const updatedUser = await db.users.update({
      where: { id: employeeId },
      data: {
        wallet_balance: numBalance,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `تم تعديل رصيد عهدة الكاش للموظف (${emp.name}) إلى (${numBalance}) بنجاح 💰`,
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Adjust Wallet API Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تعديل رصيد العهدة' }, { status: 500 });
  }
}
