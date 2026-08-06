import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const skip = (page - 1) * limit;

  try {
    const userFilter = user.role === 'manager' ? {} : { employee_id: user.id };

    // Fetch entries from all 3 tables
    const [services, tickets, wallets] = await Promise.all([
      db.service_entries.findMany({
        where: {
          ...userFilter,
          invoice_code: { not: null },
          ...(startDate && endDate ? { date: { gte: new Date(startDate), lte: new Date(endDate) } } : {})
        },
        select: {
          invoice_code: true,
          amount: true,
          timestamp: true,
          employee_name: true,
          service_name: true
        },
        orderBy: { timestamp: 'desc' },
        take: 500
      }),
      db.train_ticket_bookings.findMany({
        where: {
          ...userFilter,
          invoice_code: { not: null },
          ...(startDate && endDate ? { date: { gte: new Date(startDate), lte: new Date(endDate) } } : {})
        },
        select: {
          invoice_code: true,
          amount: true,
          timestamp: true,
          employee_name: true,
          service_name: true
        },
        orderBy: { timestamp: 'desc' },
        take: 500
      }),
      db.wallet_transactions.findMany({
        where: {
          ...userFilter,
          invoice_code: { not: null },
          ...(startDate && endDate ? { date: { gte: new Date(startDate), lte: new Date(endDate) } } : {})
        },
        select: {
          invoice_code: true,
          amount: true,
          wallet_commission: true,
          timestamp: true,
          employee_name: true,
          transaction_type: true,
          wallet_name: true
        },
        orderBy: { timestamp: 'desc' },
        take: 500
      })
    ]);

    // Aggregate into a Map keyed by invoice_code
    const invoiceMap = new Map<string, {
      code: string;
      itemCount: number;
      total: number;
      employeeName: string;
      timestamp: Date;
    }>();

    services.forEach(s => {
      if (!s.invoice_code) return;
      const existing = invoiceMap.get(s.invoice_code);
      const amt = Number(s.amount || 0);
      if (existing) {
        existing.itemCount += 1;
        existing.total += amt;
      } else {
        invoiceMap.set(s.invoice_code, {
          code: s.invoice_code,
          itemCount: 1,
          total: amt,
          employeeName: s.employee_name || 'غير محدد',
          timestamp: s.timestamp || new Date()
        });
      }
    });

    tickets.forEach(t => {
      if (!t.invoice_code) return;
      const existing = invoiceMap.get(t.invoice_code);
      const amt = Number(t.amount || 0);
      if (existing) {
        existing.itemCount += 1;
        existing.total += amt;
      } else {
        invoiceMap.set(t.invoice_code, {
          code: t.invoice_code,
          itemCount: 1,
          total: amt,
          employeeName: t.employee_name || 'غير محدد',
          timestamp: t.timestamp || new Date()
        });
      }
    });

    wallets.forEach(w => {
      if (!w.invoice_code) return;
      const existing = invoiceMap.get(w.invoice_code);
      const amt = Number(w.amount || 0) + Number(w.wallet_commission || 0);
      if (existing) {
        existing.itemCount += 1;
        existing.total += amt;
      } else {
        invoiceMap.set(w.invoice_code, {
          code: w.invoice_code,
          itemCount: 1,
          total: amt,
          employeeName: w.employee_name || 'غير محدد',
          timestamp: w.timestamp || new Date()
        });
      }
    });

    // Convert map to array & sort by date descending
    let invoices = Array.from(invoiceMap.values()).sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Apply search filter if provided
    if (search) {
      const query = search.toLowerCase();
      invoices = invoices.filter(inv =>
        inv.code.toLowerCase().includes(query) ||
        inv.employeeName.toLowerCase().includes(query)
      );
    }

    const total = invoices.length;
    const paginatedInvoices = invoices.slice(skip, skip + limit);

    return NextResponse.json({
      invoices: paginatedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Invoices list Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب قائمة الفواتير' }, { status: 500 });
  }
}
