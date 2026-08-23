import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WalletService } from '@/lib/wallet-service';

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
          transaction_type: true,
          timestamp: true,
          employee_name: true,
          description: true
        },
        orderBy: { timestamp: 'desc' },
        take: 500
      })
    ]);

    // Aggregate by invoice_code
    const invoiceMap = new Map<string, any>();

    services.forEach((s) => {
      const code = s.invoice_code;
      if (!code) return;
      if (invoiceMap.has(code)) {
        const inv = invoiceMap.get(code)!;
        inv.itemCount += 1;
        inv.item_count += 1;
        inv.total += Number(s.amount);
        inv.total_amount += Number(s.amount);
      } else {
        invoiceMap.set(code, {
          code,
          invoice_code: code,
          itemCount: 1,
          item_count: 1,
          total: Number(s.amount),
          total_amount: Number(s.amount),
          employeeName: s.employee_name || 'غير محدد',
          employee_name: s.employee_name || 'غير محدد',
          timestamp: s.timestamp || new Date(),
          created_at: s.timestamp || new Date()
        });
      }
    });

    tickets.forEach((t) => {
      const code = t.invoice_code;
      if (!code) return;
      if (invoiceMap.has(code)) {
        const inv = invoiceMap.get(code)!;
        inv.itemCount += 1;
        inv.item_count += 1;
        inv.total += Number(t.amount);
        inv.total_amount += Number(t.amount);
      } else {
        invoiceMap.set(code, {
          code,
          invoice_code: code,
          itemCount: 1,
          item_count: 1,
          total: Number(t.amount),
          total_amount: Number(t.amount),
          employeeName: t.employee_name || 'غير محدد',
          employee_name: t.employee_name || 'غير محدد',
          timestamp: t.timestamp || new Date(),
          created_at: t.timestamp || new Date()
        });
      }
    });

    wallets.forEach((w) => {
      const code = w.invoice_code;
      if (!code) return;
      const amt = Number(w.amount || 0);
      const comm = Number(w.wallet_commission || 0);
      const totalCollected = w.transaction_type === 'إيداع' ? amt + comm : amt - comm;

      if (invoiceMap.has(code)) {
        const inv = invoiceMap.get(code)!;
        inv.itemCount += 1;
        inv.item_count += 1;
        inv.total += totalCollected;
        inv.total_amount += totalCollected;
      } else {
        invoiceMap.set(code, {
          code,
          invoice_code: code,
          itemCount: 1,
          item_count: 1,
          total: totalCollected,
          total_amount: totalCollected,
          employeeName: w.employee_name || 'غير محدد',
          employee_name: w.employee_name || 'غير محدد',
          timestamp: w.timestamp || new Date(),
          created_at: w.timestamp || new Date()
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

// DELETE: Manager ONLY - Deletes the invoice record from the invoice registry log ONLY (does not alter underlying transactions or financial reports)
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'حذف الفواتير متاح للمدير فقط' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'كود الفاتورة مطلوب' }, { status: 400 });

  try {
    await db.invoices.deleteMany({
      where: { invoice_number: code }
    });

    return NextResponse.json({ success: true, message: 'تم حذف الفاتورة من سجل الفواتير بنجاح (سجل فقط دون التأثير على المالية) 🗑️' });
  } catch (error: any) {
    console.error('Delete invoice error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حذف الفاتورة' }, { status: 500 });
  }
}
