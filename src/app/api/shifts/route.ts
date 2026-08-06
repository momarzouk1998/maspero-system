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

  const [shifts, total] = await Promise.all([
    db.shifts.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    db.shifts.count({ where: whereCondition })
  ]);

  return NextResponse.json({ shifts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { action, shiftType, shiftNote, shiftId } = await req.json();
    const today = new Date();

    if (action === 'start') {
      const shift = await db.shifts.create({
        data: {
          shift_date: today,
          shift_month: `${today.getFullYear()} ${today.getMonth() + 1}`,
          shift_type: shiftType || 'صباحي',
          shift_name: `${shiftType || 'صباحي'} ${today.toLocaleDateString('ar-EG')}`,
          employee_id: user.id,
          employee_name: user.name,
          start_time: today,
          shift_note: shiftNote || null,
          timestamp: today,
        }
      });
      return NextResponse.json({ success: true, shift });
    }

    if (action === 'end') {
      const shift = await db.shifts.findUnique({ where: { id: shiftId } });
      if (!shift) return NextResponse.json({ error: 'الشفت غير موجود' }, { status: 404 });

      // 1. Check active colleagues
      const activeColleaguesCount = await db.shifts.count({
        where: { end_time: null, NOT: { employee_id: user.id } }
      });
      const isLastEmployee = activeColleaguesCount === 0;

      // 2. Fetch custody items held by user
      const custodyItems = await db.external_wallets.findMany({
        where: { is_active: true, custodian_id: user.id }
      });

      const userDrawers = custodyItems.filter((i: any) => i.wallet_type === 'درج كاشير');
      const userWallets = custodyItems.filter((i: any) => i.wallet_type === 'محفظة');
      const userMachines = custodyItems.filter((i: any) => i.wallet_type === 'ماكينة');

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

    return NextResponse.json({ error: 'إجراء غير معرف' }, { status: 400 });
  } catch (error: any) {
    console.error('Shift error:', error);
    return NextResponse.json({ error: 'حدث خطأ في إدارة الشفت' }, { status: 500 });
  }
}
