import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
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

// DELETE: Manager can delete ticket booking
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  await db.train_ticket_bookings.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// PUT: Manager can edit ticket booking
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const { id, itemCount, ticketPrice, ticketCommission, notes } = await req.json();

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  const price = ticketPrice !== undefined ? Number(ticketPrice) : undefined;
  const commission = ticketCommission !== undefined ? Number(ticketCommission) : undefined;
  let totalAmount = undefined;
  if (price !== undefined || commission !== undefined) {
    const existing = await db.train_ticket_bookings.findUnique({ where: { id } });
    if (existing) {
      const p = price !== undefined ? price : Number(existing.ticket_price);
      const c = commission !== undefined ? commission : Number(existing.ticket_commission);
      totalAmount = p + c;
    }
  }

  const updated = await db.train_ticket_bookings.update({
    where: { id },
    data: {
      item_count: itemCount !== undefined ? parseInt(itemCount) : undefined,
      ticket_price: price,
      ticket_commission: commission,
      amount: totalAmount,
      notes: notes !== undefined ? notes : undefined,
    }
  });

  return NextResponse.json({ success: true, booking: updated });
}
