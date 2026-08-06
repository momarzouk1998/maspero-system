import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'برجاء تمرير كود الفاتورة' }, { status: 400 });
  }

  try {
    // Fetch from all 3 tables
    const [services, tickets, wallets] = await Promise.all([
      db.service_entries.findMany({ where: { invoice_code: code } }),
      db.train_ticket_bookings.findMany({ where: { invoice_code: code } }),
      db.wallet_transactions.findMany({ where: { invoice_code: code } })
    ]);

    // Format all items into a unified array
    const items: Array<{
      id: string;
      type: 'service' | 'ticket' | 'wallet';
      name: string;
      price: number;
      count: number;
      total: number;
      timestamp: Date | null;
      employeeName: string | null;
    }> = [];

    services.forEach(s => {
      items.push({
        id: s.id,
        type: 'service',
        name: s.service_name + (s.face_type ? ` (${s.face_type})` : ''),
        price: Number(s.amount) / (s.paper_count || 1), // Assuming amount is total
        count: s.paper_count || 1,
        total: Number(s.amount),
        timestamp: s.timestamp,
        employeeName: s.employee_name
      });
    });

    tickets.forEach(t => {
      items.push({
        id: t.id,
        type: 'ticket',
        name: 'تذكرة قطار',
        price: Number(t.ticket_price) + Number(t.ticket_commission), // per ticket? Actually totalAmount = price + commission.
        count: t.item_count || 1,
        total: Number(t.amount),
        timestamp: t.timestamp,
        employeeName: t.employee_name
      });
    });

    wallets.forEach(w => {
      items.push({
        id: w.id,
        type: 'wallet',
        name: `${w.transaction_type} ${w.wallet_name} - ${w.notes || ''}`,
        price: Number(w.amount), // for wallet, price is the amount itself
        count: 1,
        total: Number(w.amount) + Number(w.commission), // Total collected from customer
        timestamp: w.timestamp,
        employeeName: w.employee_name
      });
    });

    // Sort by timestamp
    items.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    const employeeName = items.length > 0 ? items[0].employeeName : user.name;
    const timestamp = items.length > 0 ? items[items.length - 1].timestamp : new Date();

    return NextResponse.json({
      invoice_code: code,
      items,
      total: totalAmount,
      employeeName,
      timestamp
    });

  } catch (error) {
    console.error('Invoice GET Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الفاتورة' }, { status: 500 });
  }
}
