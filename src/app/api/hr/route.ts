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
  const statusFilter = searchParams.get('status'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const employeeId = searchParams.get('employeeId') || '';
  const search = searchParams.get('search') || '';

  const whereCondition: any = user.role === 'manager'
    ? (employeeId ? { employee_id: employeeId } : {})
    : {
        OR: [
          { employee_id: user.id },
          { created_by_id: user.id }
        ]
      };

  if (statusFilter && statusFilter !== 'ALL') {
    whereCondition.approval = statusFilter === 'PENDING' ? 'معلق' : statusFilter === 'APPROVED' ? 'موافقة' : 'مرفوض';
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    whereCondition.timestamp = {
      gte: start,
      lte: end
    };
  }

  if (search) {
    whereCondition.OR = [
      { employee_name: { contains: search, mode: 'insensitive' } },
      { e_hr_name: { contains: search, mode: 'insensitive' } },
      { hr_items: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } }
    ];
  }

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

    // Manager requests are APPROVED automatically ("موافقة"), Employee requests are PENDING ("معلق")
    const isManager = user.role === 'manager';
    const approvalStatus = isManager ? 'موافقة' : 'معلق';

    const hrEntry = await db.employee_hr.create({
      data: {
        date: reqDate,
        month: `${reqDate.getFullYear()} ${reqDate.getMonth() + 1}`,
        e_hr_name: employeeName,
        hr_items: requestType,
        hours: numHours,
        employee_id: employeeId,
        employee_name: employeeName,
        created_by_id: user.id,
        created_by_name: user.name,
        notes: notes || null,
        approval: approvalStatus,
        timestamp: reqDate,
      }
    });

    return NextResponse.json({
      success: true,
      hrEntry,
      message: isManager ? 'تم إضافة الطلب واعتماده بنجاح' : 'تم إرسال الطلب، وهو الآن معلق في انتظار موافقة المدير'
    });
  } catch (error: any) {
    console.error('HR Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تقديم طلب الحوافز/الإجازات' }, { status: 500 });
  }
}

// PUT: Manager can Approve, Reject, or Update HR Entry; Employee can edit only their PENDING request
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { id, approval, hours, notes, hrItems } = await req.json();
    if (!id) return NextResponse.json({ error: 'معرف الطلب مطلوب' }, { status: 400 });

    const existing = await db.employee_hr.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

    const isManager = user.role === 'manager';
    const isCreator = existing.created_by_id === user.id;
    const isPending = existing.approval === 'معلق';

    if (!isManager && (!isCreator || !isPending)) {
      return NextResponse.json({ error: 'عفواً، لا يمكن تعديل أي طلب تم اعتماده أو رفضه من المدير.' }, { status: 403 });
    }

    const updateData: any = {};
    if (isManager && approval) updateData.approval = approval; // 'موافقة' | 'مرفوض' | 'معلق'
    if (hours !== undefined) updateData.hours = Number(hours);
    if (notes !== undefined) updateData.notes = notes;
    if (hrItems) updateData.hr_items = hrItems;

    const updated = await db.employee_hr.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, hrEntry: updated });
  } catch (error: any) {
    console.error('Update HR Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحديث حالة الطلب' }, { status: 500 });
  }
}

// DELETE: Manager can delete any HR entry, or Employee can delete his own PENDING request
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  const existing = await db.employee_hr.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

  const isManager = user.role === 'manager';
  const isCreator = existing.created_by_id === user.id;
  const isPending = existing.approval === 'معلق';

  if (!isManager) {
    if (!isCreator) {
      return NextResponse.json({ error: 'غير مصرح لك بحذف هذا الطلب' }, { status: 403 });
    }
    if (!isPending) {
      return NextResponse.json({ error: 'عفواً، لا يمكن حذف أي طلب تم اعتماده أو رفضه من المدير.' }, { status: 403 });
    }
  }

  await db.employee_hr.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'تم حذف الطلب بنجاح' });
}
