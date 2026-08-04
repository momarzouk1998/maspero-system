import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WalletService } from '@/lib/wallet-service';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  const whereCondition = user.role === 'manager' ? {} : { employee_id: user.id };

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

  try {
    const { itemCount, ticketPrice, ticketCommission, notes } = await req.json();

    const price = Number(ticketPrice || 0);
    const commission = Number(ticketCommission || 0);
    const totalAmount = price + commission;
    const today = new Date();
    const invoiceCode = Math.random().toString(36).substring(2, 10);

    const booking = await db.$transaction(async (tx) => {
      const created = await tx.train_ticket_bookings.create({
        data: {
          date: today,
          month: `${today.getFullYear()} ${today.getMonth() + 1}`,
          service_name: 'قطار',
          item_count: parseInt(itemCount) || 1,
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
