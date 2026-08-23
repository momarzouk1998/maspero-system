import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { WalletService } from '@/lib/wallet-service';
import { checkSalesLock } from '@/lib/custody-lock';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const employeeId = searchParams.get('employeeId') || '';

  const skip = (page - 1) * limit;

  const whereCondition: any = user.role === 'manager' ? (employeeId ? { employee_id: employeeId } : {}) : { employee_id: user.id };

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
      { notes: { contains: search, mode: 'insensitive' } },
      { service_name: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [bookings, total] = await Promise.all([
    db.train_ticket_bookings.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    db.train_ticket_bookings.count({ where: whereCondition })
  ]);

  return NextResponse.json({
    bookings,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  if (!hasPermission(user, 'tickets', 'create')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إضافة تذاكر. تواصل مع المدير.' }, { status: 403 });
  }

  const lockStatus = await checkSalesLock(user.id, user.role);
  if (lockStatus.locked) {
    return NextResponse.json({ error: lockStatus.reason }, { status: 403 });
  }

  try {
    const { itemCount, ticketPrice, ticketCommission, notes, invoice_code, serviceName } = await req.json();

    const count = parseInt(itemCount) || 1;
    const price = Number(ticketPrice || 0);
    const commission = Number(ticketCommission || 0);
    const totalAmount = count * (price + commission);
    const today = new Date();
    const invoiceCode = invoice_code || Math.random().toString(36).substring(2, 10);

    const booking = await db.$transaction(async (tx: any) => {
      const created = await tx.train_ticket_bookings.create({
        data: {
          date: today,
          month: `${today.getFullYear()} ${today.getMonth() + 1}`,
          service_name: serviceName || 'قطار',
          item_count: count,
          amount: totalAmount,
          ticket_price: price,
          ticket_commission: commission,
          notes: notes || null,
          employee_id: user.id,
          employee_name: user.name,
          invoice_code: invoiceCode,
          timestamp: today,
        }
      });

      // Increment employee wallet with collected cash
      await WalletService.adjustEmployeeWallet(user.id, totalAmount, tx);

      return created;
    });

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error('Ticket booking error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حجز التذكرة' }, { status: 500 });
  }
}

// DELETE: Employee or Manager can delete ticket booking with balance reversal if shift is open
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  try {
    const ticket = await db.train_ticket_bookings.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'العنصر غير موجود' }, { status: 404 });

    const activeShift = ticket.employee_id ? await db.shifts.findFirst({
      where: { employee_id: ticket.employee_id, end_time: null }
    }) : null;

    const isShiftOpen = Boolean(activeShift);

    if (!hasPermission(user, 'tickets', 'delete')) {
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف التذاكر. تواصل مع المدير.' }, { status: 403 });
    }
    if (user.role !== 'manager' && (!isShiftOpen || user.id !== ticket.employee_id)) {
      return NextResponse.json({ error: 'لا يمكن الحذف خارج الشفت المفتوح الخاص بك' }, { status: 403 });
    }

    await db.$transaction(async (tx: any) => {
      if (isShiftOpen && ticket.employee_id) {
        await WalletService.adjustEmployeeWallet(ticket.employee_id, -Number(ticket.amount), tx);
      }
      await tx.train_ticket_bookings.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'تم حذف التذكرة وعكس التأثير المالي بنجاح' });
  } catch (error: any) {
    console.error('Delete ticket booking error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حذف التذكرة' }, { status: 500 });
  }
}

// PUT: Employee or Manager can edit ticket booking with balance adjustment if shift is open
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { id, itemCount, ticketPrice, ticketCommission, notes } = await req.json();
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const ticket = await db.train_ticket_bookings.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'العنصر غير موجود' }, { status: 404 });

    const activeShift = ticket.employee_id ? await db.shifts.findFirst({
      where: { employee_id: ticket.employee_id, end_time: null }
    }) : null;

    const isShiftOpen = Boolean(activeShift);

    if (!hasPermission(user, 'tickets', 'update')) {
      return NextResponse.json({ error: 'ليس لديك صلاحية تعديل التذاكر. تواصل مع المدير.' }, { status: 403 });
    }
    if (user.role !== 'manager' && (!isShiftOpen || user.id !== ticket.employee_id)) {
      return NextResponse.json({ error: 'لا يمكن التعديل خارج الشفت المفتوح الخاص بك' }, { status: 403 });
    }

    const cnt = itemCount !== undefined ? parseInt(itemCount) : (ticket.item_count || 1);
    const p = ticketPrice !== undefined ? Number(ticketPrice) : Number(ticket.ticket_price || 0);
    const c = ticketCommission !== undefined ? Number(ticketCommission) : Number(ticket.ticket_commission || 0);
    const newTotalAmount = cnt * (p + c);

    const updated = await db.$transaction(async (tx: any) => {
      if (isShiftOpen && ticket.employee_id) {
        const diff = newTotalAmount - Number(ticket.amount || 0);
        if (diff !== 0) {
          await WalletService.adjustEmployeeWallet(ticket.employee_id, diff, tx);
        }
      }

      return await tx.train_ticket_bookings.update({
        where: { id },
        data: {
          item_count: cnt,
          ticket_price: p,
          ticket_commission: c,
          amount: newTotalAmount,
          notes: notes !== undefined ? notes : undefined,
        }
      });
    });

    return NextResponse.json({ success: true, booking: updated, message: 'تم تعديل التذكرة وضبط العهدة بنجاح' });
  } catch (error: any) {
    console.error('Update ticket booking error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تعديل التذكرة' }, { status: 500 });
  }
}
