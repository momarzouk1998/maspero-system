import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET active users list
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const isManager = user.role === 'manager';

  const users = await db.users.findMany({
    where: isManager ? {} : { is_active: true },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      job_title: true,
      is_active: true,
      wallet_balance: true,
      permissions: true,
      createdAt: true,
      ...(isManager ? { salary: true } : {})
    },
    orderBy: { createdAt: 'desc' }
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
    const { name, phone, password, role, jobTitle, salary, permissions } = await req.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'الاسم وكلمة المرور مطلوبان' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existing = await db.users.findFirst({ where: { name: trimmedName } });
    if (existing) {
      return NextResponse.json({ error: 'يوجد موظف بنفس هذا الاسم بالفعل' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.users.create({
      data: {
        name: trimmedName,
        phone: phone || null,
        password_hash: passwordHash,
        role: role || 'employee',
        job_title: jobTitle || 'كاشير',
        salary: salary ? parseFloat(salary) : 0,
        permissions: permissions || {},
        is_active: true,
      }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Create User Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء إضافة الموظف' }, { status: 500 });
  }
}

// Manager Edit User / Update Permissions
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { userId, name, phone, password, role, jobTitle, salary, permissions, isActive } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'معرف الموظف مطلوب' }, { status: 400 });
    }

    const updateData: any = {};

    if (name) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone || null;
    if (password) updateData.password_hash = await bcrypt.hash(password, 10);
    if (role) updateData.role = role;
    if (jobTitle !== undefined) updateData.job_title = jobTitle;
    if (salary !== undefined) updateData.salary = parseFloat(salary);
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.is_active = isActive;

    const updatedUser = await db.users.update({
      where: { id: userId },
      data: updateData
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Update User Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تحديث بيانات الموظف' }, { status: 500 });
  }
}
