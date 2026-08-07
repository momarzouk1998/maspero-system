import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  const whereCondition = user.role === 'manager' ? {} : { employee_id: user.id };

  const [hrItems, total] = await Promise.all([
    db.employee_hr.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    db.employee_hr.count({ where: whereCondition })
  ]);

  return NextResponse.json({ hrItems, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { targetEmployeeId, requestType, hours, notes, date } = await req.json();

    const numHours = Number(hours);
    if (!requestType || numHours <= 0) {
      return NextResponse.json({ error: 'برجاء اختيار نوع الطلب وعدد الساعات بشكل صحيح' }, { status: 400 });
    }

    const reqDate = date ? new Date(date) : new Date();

    let employeeId = user.id;
    let employeeName = user.name;

    if (targetEmployeeId) {
      const emp = await db.users.findUnique({ where: { id: targetEmployeeId } });
      if (emp) {
        employeeId = emp.id;
        employeeName = emp.name;
      }
    }

    const hrEntry = await db.employee_hr.create({
      data: {
        date: reqDate,
        month: `${reqDate.getFullYear()} ${reqDate.getMonth() + 1}`,
        e_hr_name: employeeName,
        hr_items: requestType,
        hours: numHours,
        employee_id: employeeId,
        employee_name: employeeName,
        notes: notes || null,
        approval: 'موافقة',
        timestamp: reqDate,
      }
    });

    return NextResponse.json({ success: true, hrEntry });
  } catch (error: any) {
    console.error('HR Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تقديم طلب الحوافز/الإجازات' }, { status: 500 });
  }
}

// DELETE: Manager can delete HR entry by ID
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  await db.employee_hr.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
