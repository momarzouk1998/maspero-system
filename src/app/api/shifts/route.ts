import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';

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
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.start_time = {
        gte: start,
        lte: end
      };
    }

    if (search) {
      where.OR = [
        { employee_name: { contains: search, mode: 'insensitive' } },
        { shift_note: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [shifts, total, myActiveShift] = await Promise.all([
      db.shifts.findMany({
        where,
        orderBy: { start_time: 'desc' },
        skip,
        take: limit,
      }),
      db.shifts.count({ where }),
      db.shifts.findFirst({
        where: { employee_id: user.id, end_time: null }
      })
    ]);

    return NextResponse.json({
      shifts,
      myActiveShift,
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

      // Rule 6: Cannot end shift if user has cash custody balance > 0 OR holds any wallets/machines
      const empUser = await db.users.findUnique({
        where: { id: user.id },
        select: { wallet_balance: true }
      });
      const userCashBal = Number(empUser?.wallet_balance || 0);

      if (userCashBal > 0) {
        return NextResponse.json({
          error: `عفواً، يمنع إنهاء الشفت في حالة وجود رصيد بعهدة الكاش (الرصيد الحالي: ${userCashBal}). برجاء تسليم العهدة النقدية لـ ماسـبيرو (المركز) أولاً.`
        }, { status: 400 });
      }

      const custodyItems = await db.external_wallets.findMany({
        where: { is_active: true, custodian_id: user.id }
      });

      // Filter out cash drawers ('درج كاشير') - Drawers are shared stations, only Wallets & Machines block shift end
      const heldWalletsAndMachines = custodyItems.filter(
        (i: any) => i.wallet_type !== 'درج كاشير' && !i.wallet_name.includes('درج')
      );

      if (heldWalletsAndMachines.length > 0) {
        const itemNames = heldWalletsAndMachines.map((i: any) => i.wallet_name).join('، ');
        return NextResponse.json({
          error: `عفواً، يمنع إنهاء الشفت لوجود عناصر مستلمة في عهدتك (${itemNames}). برجاء تسليم عهدة المحافظ والماكينات أولاً.`
        }, { status: 400 });
      }

      // Check open invoices ("قيد التنفيذ") that actually contain items
      const openInvoices = await db.invoices.findMany({
        where: { employee_id: user.id, status: 'قيد التنفيذ' },
        select: { invoice_number: true }
      });

      let trulyOpenInvoicesCount = 0;
      for (const inv of openInvoices) {
        const [servicesCount, ticketsCount, walletsCount] = await Promise.all([
          db.service_entries.count({ where: { invoice_code: inv.invoice_number } }),
          db.train_ticket_bookings.count({ where: { invoice_code: inv.invoice_number } }),
          db.wallet_transactions.count({ where: { invoice_code: inv.invoice_number } })
        ]);
        if (servicesCount + ticketsCount + walletsCount > 0) {
          trulyOpenInvoicesCount++;
        } else {
          // Clean up empty draft invoices with 0 items
          await db.invoices.updateMany({
            where: { invoice_number: inv.invoice_number },
            data: { status: 'مكتملة' }
          });
        }
      }

      if (trulyOpenInvoicesCount > 0) {
        return NextResponse.json({
          error: `عفواً، يمنع إنهاء الشفت لوجود عدد (${trulyOpenInvoicesCount}) فواتير مفتوحة تحتوي على بنود مبيعات لم تنتهِ بعد. برجاء إنهاء الفواتير المفتوحة أولاً.`
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
      if (!hasPermission(user, 'shifts', 'update')) {
        return NextResponse.json({ error: 'ليس لديك صلاحية تعديل سجل الشفتات' }, { status: 403 });
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

// DELETE: Delete shift record (Manager or Permitted Employee)
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, 'shifts', 'delete')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية حذف سجل الشفتات' }, { status: 403 });
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
