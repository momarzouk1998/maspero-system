import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSessionToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { nameOrPhone, password } = await req.json();

    if (!nameOrPhone || !password) {
      return NextResponse.json({ error: 'برجاء ادخال اسم المستخدم/الهاتف وكلمة المرور' }, { status: 400 });
    }

    const user = await db.users.findFirst({
      where: {
        OR: [
          { name: { equals: nameOrPhone, mode: 'insensitive' } },
          { phone: nameOrPhone },
          { legacy_id: nameOrPhone }
        ],
        is_active: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    const token = await createSessionToken({
      userId: user.id,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        walletBalance: user.wallet_balance,
      }
    });

    response.cookies.set('maspero_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تسجيل الدخول' }, { status: 500 });
  }
}
