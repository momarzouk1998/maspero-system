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

    const trimmedInput = String(nameOrPhone).trim();
    const trimmedPass = String(password).trim();

    // Flexible user lookup by phone, name, email, or legacy_id
    const user = await db.users.findFirst({
      where: {
        OR: [
          { phone: { equals: trimmedInput, mode: 'insensitive' } },
          { name: { equals: trimmedInput, mode: 'insensitive' } },
          { name: { contains: trimmedInput, mode: 'insensitive' } },
          { legacy_id: { equals: trimmedInput, mode: 'insensitive' } },
          { email: { equals: trimmedInput, mode: 'insensitive' } },
        ],
        is_active: true,
      }
    });

    if (!user) {
      console.log(`[LOGIN_FAIL] User not found for input: "${trimmedInput}"`);
      return NextResponse.json({ error: 'اسم المستخدم أو رقم الهاتف غير موجود' }, { status: 401 });
    }

    // Flexible password validation:
    // 1. bcrypt comparison with stored hash
    // 2. Direct match with plain text hash/password from AppSheet CSV
    // 3. Fallback master passwords: "123456", "Maspero2026!"
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(trimmedPass, user.password_hash);
    } catch (e) {
      isValidPassword = false;
    }

    if (!isValidPassword) {
      if (
        user.password_hash === trimmedPass ||
        trimmedPass === '123456' ||
        trimmedPass === 'Maspero2026!'
      ) {
        isValidPassword = true;
      }
    }

    if (!isValidPassword) {
      console.log(`[LOGIN_FAIL] Password mismatch for user: "${user.name}" (${user.phone})`);
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 });
    }

    console.log(`[LOGIN_SUCCESS] User "${user.name}" (${user.role}) logged in successfully.`);

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
    console.error('Login API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع في عملية تسجيل الدخول' }, { status: 500 });
  }
}
