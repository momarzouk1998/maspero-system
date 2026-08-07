import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET active users/employees
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  // Managers get full user details, employees get active users list for dropdowns
  const isManager = user.role === 'manager';

  const users = await db.users.findMany({
    where: {
      is_active: true,
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
      salary: isManager,
      wallet_balance: true,
      is_active: true,
      permissions: isManager,
      created_at: true,
    },
    orderBy: [{ name: 'asc' }]
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
        permissions: permissions || [],
        is_active: true,
      }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error('Create User Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء إضافة الموظف' }, { status: 500 });
  }
}
