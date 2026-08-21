import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const activeOnly = searchParams.get('active');

  // If requesting all open invoices for current employee
  if (activeOnly === 'true') {
    try {
      const openInvoices = await db.invoices.findMany({
        where: {
          employee_id: user.id,
          status: 'قيد التنفيذ'
        },
        orderBy: { timestamp: 'asc' }
      });
      return NextResponse.json({ openInvoices });
    } catch (err) {
      console.error('Fetch active invoices error:', err);
      return NextResponse.json({ openInvoices: [] });
    }
  }

  if (!code) {
    return NextResponse.json({ error: 'برجاء تمرير كود الفاتورة' }, { status: 400 });
  }

  try {
    // Fetch invoice status
    const invRecord = await db.invoices.findFirst({
      where: { invoice_number: code }
    });

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
      rawServiceName?: string;
      faceType?: string | null;
      notes?: string | null;
      amount?: number;
      commission?: number;
      description?: string | null;
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
        rawServiceName: s.service_name,
        faceType: s.face_type,
        notes: s.notes,
        price: Number(s.amount) / (s.paper_count || 1),
        count: s.paper_count || 1,
        total: Number(s.amount),
        timestamp: s.timestamp,
        employeeName: s.employee_name
      });
    });

    tickets.forEach(t => {
      const cnt = t.item_count || 1;
      const tot = Number(t.amount);
      const unitPrice = cnt > 0 ? (tot / cnt) : tot;
      items.push({
        id: t.id,
        type: 'ticket',
        name: `تذكرة ${t.service_name || 'قطار'}`,
        price: unitPrice,
        count: cnt,
        total: tot,
        timestamp: t.timestamp,
        employeeName: t.employee_name
      });
    });

    wallets.forEach(w => {
      const isWithdrawal = w.transaction_type === 'سحب';
      const amt = Number(w.amount);
      const comm = Number(w.wallet_commission || 0);
      const netTotal = isWithdrawal ? -(amt - comm) : +(amt + comm);

      items.push({
        id: w.id,
        type: 'wallet',
        name: `${w.transaction_type} ${w.wallet_name} - ${w.description || ''}`,
        amount: amt,
        commission: comm,
        description: w.description,
        price: amt,
        count: 1,
        total: netTotal,
        timestamp: w.timestamp,
        employeeName: w.employee_name
      });
    });

    // Sort by timestamp
    items.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    const rawTotal = items.reduce((sum, item) => sum + item.total, 0);
    const roundedTotal = rawTotal > 0 ? Math.ceil(rawTotal) : -Math.ceil(Math.abs(rawTotal));
    const employeeName = items.length > 0 ? items[0].employeeName : user.name;
    const timestamp = items.length > 0 ? items[items.length - 1].timestamp : new Date();

    return NextResponse.json({
      invoice_code: code,
      status: invRecord?.status || 'قيد التنفيذ',
      items,
      total: roundedTotal,
      rawTotal,
      employeeName,
      timestamp
    });

  } catch (error) {
    console.error('Invoice GET Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الفاتورة' }, { status: 500 });
  }
}

// POST: Create or Register Invoice with status "قيد التنفيذ"
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { code, label } = await req.json();
    if (!code) return NextResponse.json({ error: 'كود الفاتورة مطلوب' }, { status: 400 });

    const existing = await db.invoices.findFirst({
      where: { invoice_number: code }
    });

    if (!existing) {
      const activeShift = await db.shifts.findFirst({
        where: { employee_id: user.id, end_time: null }
      });

      const newInv = await db.invoices.create({
        data: {
          invoice_number: code,
          status: 'قيد التنفيذ',
          employee_id: user.id,
          employee_name: user.name,
          date: new Date(),
          shift_id: activeShift?.id || undefined,
          shift_name: activeShift?.shift_type || undefined,
          shift_cashier: user.name
        }
      });
      return NextResponse.json({ success: true, invoice: newInv });
    }

    return NextResponse.json({ success: true, invoice: existing });
  } catch (error: any) {
    console.error('Invoice POST Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حفظ الفاتورة' }, { status: 500 });
  }
}

// PATCH: Complete Invoice (Set status to "مكتملة")
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { code, total } = await req.json();
    if (!code) return NextResponse.json({ error: 'كود الفاتورة مطلوب' }, { status: 400 });

    const updated = await db.invoices.updateMany({
      where: { invoice_number: code },
      data: {
        status: 'مكتملة',
        total_invoice: total !== undefined ? Number(total) : undefined
      }
    });

    return NextResponse.json({ success: true, updatedCount: updated.count, status: 'مكتملة' });
  } catch (error: any) {
    console.error('Invoice PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء إنهاء الفاتورة' }, { status: 500 });
  }
}
