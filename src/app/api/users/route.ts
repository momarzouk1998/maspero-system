import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET all users/employees with aggregate statistics for Manager
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const users = await db.users.findMany({
    where: {
      NOT: [
        { name: { contains: '<' } },
        { name: { contains: 'style=' } },
      ]
    },
    select: {
      id: true,
      legacy_id: true,
      name: true,
      phone: true,
      role: true,
      job_title: true,
      salary: true,
      wallet_balance: true,
      is_active: true,
      created_at: true,
      _count: {
        select: {
          service_entries: true,
          expenses: true,
          shifts: true,
        }
      }
    },
    orderBy: [{ is_active: 'desc' }, { name: 'asc' }]
  });

  return NextResponse.json({ users });
}

// Manager Create New User / Employee
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { name, phone, password, role, jobTitle, salary } = await req.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'الاسم وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const legacyId = `user-manual-${Date.now()}`;

    const created = await db.users.create({
      data: {
        legacy_id: legacyId,
        name: trimmedName,
        phone: phone ? String(phone).trim() : null,
        password_hash: passwordHash,
        role: role || 'user', // "manager" | "user"
        job_title: jobTitle || 'كاشير مبيعات',
        salary: Number(salary || 0),
        wallet_balance: 0,
        is_active: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: `تم إضافة الموظف/المستخدم (${created.name}) بنجاح 🎉`,
      user: created
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: error.message || 'فشل إضافة الموظف' }, { status: 400 });
  }
}

// Manager Update User Profile / Password / Status
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { userId, name, phone, password, role, jobTitle, salary, isActive, resetWalletBalance } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'معرف الموظف مطلوب' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (role !== undefined) updateData.role = role;
    if (jobTitle !== undefined) updateData.job_title = jobTitle;
    if (salary !== undefined) updateData.salary = Number(salary);
    if (isActive !== undefined) updateData.is_active = Boolean(isActive);
    if (resetWalletBalance) updateData.wallet_balance = 0;

    if (password && password.trim().length > 0) {
      updateData.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await db.users.update({
      where: { id: userId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: `تم تعديل بيانات الموظف (${updated.name}) بنجاح 🎉`,
      user: updated
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: error.message || 'فشل تعديل الموظف' }, { status: 400 });
  }
}
