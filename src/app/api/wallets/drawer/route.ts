import { NextResponse } from 'next/server';
import { WalletService } from '@/lib/wallet-service';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { drawerId, action, amount, notes } = await req.json();
    const numAmount = Number(amount);

    if (!drawerId || !action || !numAmount || numAmount <= 0) {
      return NextResponse.json({ error: 'بيانات العملية غير مكتملة' }, { status: 400 });
    }

    // Ensure drawers exist in database
    await WalletService.ensureCashDrawers();

    if (action === 'deposit') {
      const drawer = await WalletService.depositToDrawer(
        user.id,
        user.name,
        drawerId,
        numAmount,
        notes
      );
      return NextResponse.json({ success: true, message: 'تم إيداع المبلغ في الدرج بنجاح', drawer });
    } else if (action === 'claim') {
      const drawer = await WalletService.claimFromDrawer(
        user.id,
        user.name,
        drawerId,
        numAmount,
        notes
      );
      return NextResponse.json({ success: true, message: 'تم استلام المبلغ من الدرج بنجاح', drawer });
    } else {
      return NextResponse.json({ error: 'نوع الإجراء غير صالح' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Drawer transaction error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في عملية الدرج' }, { status: 400 });
  }
}
