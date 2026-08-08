import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET shifts with pagination & filtering
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const shiftType = searchParams.get('shiftType') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const employeeId = searchParams.get('employeeId') || '';

  const skip = (page - 1) * limit;

  try {
    const where: any = {};

    if (user.role !== 'manager') {
      where.employee_id = user.id;
    } else if (employeeId) {
      where.employee_id = employeeId;
    }

    if (shiftType) {
      where.shift_type = shiftType;
    }

    if (startDate && endDate) {
      where.start_time = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    if (search) {
      where.OR = [
        { employee_name: { contains: search, mode: 'insensitive' } },
        { shift_note: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [shifts, total] = await Promise.all([
      db.shifts.findMany({
        where,
        orderBy: { start_time: 'desc' },
        skip,
        take: limit,
      }),
      db.shifts.count({ where })
    ]);

    return NextResponse.json({
      shifts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Shifts GET Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب سجل الشفتات' }, { status: 500 });
  }
}

// POST start/end shift
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const body = await req.json();
    const { action, shiftType, shiftNote, shiftId } = body;
    const today = new Date();

    if (action === 'start') {
      const active = await db.shifts.findFirst({
        where: { employee_id: user.id, end_time: null }
      });
      if (active) {
        return NextResponse.json({ error: 'لديك شفت مفتوح بالفعل' }, { status: 400 });
      }

      const newShift = await db.shifts.create({
        data: {
          employee_id: user.id,
          employee_name: user.name,
          shift_date: today,
          start_time: today,
          shift_type: shiftType || 'صباحي',
          shift_note: shiftNote || null,
        }
      });

      return NextResponse.json({ success: true, shift: newShift });
    }

    if (action === 'end') {
      const shift = await db.shifts.findUnique({ where: { id: shiftId } });
      if (!shift) {
        return NextResponse.json({ error: 'الشفت غير موجود' }, { status: 404 });
      }

      // 1. Check active colleague shifts
      const activeColleaguesCount = await db.shifts.count({
        where: { end_time: null, NOT: { employee_id: user.id } }
      });
      const isLastEmployee = activeColleaguesCount === 0;

      // 2. Fetch custody items held by user
      const custodyItems = await db.external_wallets.findMany({
        where: { is_active: true, custodian_id: user.id }
      });

      const userDrawers = custodyItems.filter((i: any) => i.wallet_type === 'درج كاشير' || i.wallet_name.includes('درج'));
      const userWallets = custodyItems.filter((i: any) => i.wallet_type === 'محفظة' && !i.wallet_name.includes('درج'));
      const userMachines = custodyItems.filter((i: any) => i.wallet_type === 'ماكينة' && !i.wallet_name.includes('درج'));

      // Requirement: User cannot end shift without handing over their Cash Drawer
      if (userDrawers.length > 0) {
        return NextResponse.json({ 
          error: 'عفواً، يجب تسليم عهدة درج الكاشير الخاص بك أولاً قبل إنهاء الشفت.' 
        }, { status: 400 });
      }

      // Requirement: Last employee closing day must hand over ALL wallets & machines
      if (isLastEmployee && (userWallets.length > 0 || userMachines.length > 0)) {
        return NextResponse.json({ 
          error: 'عفواً، أنت آخر موظف في اليوم (إغلاق اليوم). يجب تسليم وتأكيد أرصدة جميع المحافظ والماكينات لضمان دقة الأرصدة للشفت الصباحي التالي.' 
        }, { status: 400 });
      }

      const startTime = shift.start_time || today;
      const hours = Math.max(0.1, (today.getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60));

      const updated = await db.shifts.update({
        where: { id: shiftId },
        data: {
          end_time: today,
          total_hours: hours,
          shift_note: shiftNote || shift.shift_note,
        }
      });
      return NextResponse.json({ success: true, shift: updated });
    }

    if (action === 'edit') {
      if (user.role !== 'manager') {
        return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
      }

      const { totalHours } = body;
      const updated = await db.shifts.update({
        where: { id: shiftId },
        data: {
          shift_type: shiftType !== undefined ? shiftType : undefined,
          shift_note: shiftNote !== undefined ? shiftNote : undefined,
          total_hours: totalHours !== undefined ? Number(totalHours) : undefined,
        }
      });
      return NextResponse.json({ success: true, shift: updated });
    }

    return NextResponse.json({ error: 'إجراء غير معرف' }, { status: 400 });
  } catch (error: any) {
    console.error('Shift error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إدارة الشفت' }, { status: 500 });
  }
}

// DELETE: Manager can delete shift record
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  const shiftToDelete = await db.shifts.findUnique({ where: { id } });
  if (shiftToDelete && shiftToDelete.end_time === null) {
    // Check if employee has any remaining active shift
    const remainingActiveShifts = await db.shifts.count({
      where: { employee_id: shiftToDelete.employee_id, end_time: null, NOT: { id } }
    });

    if (remainingActiveShifts === 0) {
      // Release any custody items held by this employee
      await db.external_wallets.updateMany({
        where: { custodian_id: shiftToDelete.employee_id },
        data: { custodian_id: null, custodian_name: null }
      });
    }
  }

  await db.shifts.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
