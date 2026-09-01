import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'كلمة المرور الحالية والجديدة مطلوبة' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'كلمة المرور الجديدة يجب أن تكون 4 خانات على الأقل' }, { status: 400 });
    }

    const fullUser = await db.users.findUnique({
      where: { id: user.id }
    });

    if (!fullUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Verify current password (bcrypt, plus legacy plaintext fallback for
    // AppSheet-imported users who have not yet rotated their password).
    let isCurrentValid = await bcrypt.compare(currentPassword, fullUser.password_hash);
    if (!isCurrentValid && fullUser.password_hash === currentPassword) {
      isCurrentValid = true;
    }

    if (!isCurrentValid) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await db.users.update({
      where: { id: user.id },
      data: { password_hash: newPasswordHash }
    });

    return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح 🎉' });

  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تغيير كلمة المرور' }, { status: 500 });
  }
}
