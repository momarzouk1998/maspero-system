import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const employeeId = searchParams.get('employee_id');
  const date = searchParams.get('date');
  const invoiceNumber = searchParams.get('invoice_number');

  let where: any = {};
  
  if (user.role !== 'manager') {
    where.employee_id = user.id;
  } else if (employeeId) {
    where.employee_id = employeeId;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    where.date = {
      gte: startOfDay,
      lte: endOfDay
    };
  }

  if (invoiceNumber) {
    where.invoice_number = { contains: invoiceNumber };
  }

  try {
    const invoices = await db.invoices.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await db.invoices.count({ where });

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Invoices History API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب سجل الفواتير' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const body = await req.json();
    const { invoice_number, total_invoice, shift_id, shift_name, shift_cashier } = body;

    if (!invoice_number) return NextResponse.json({ error: 'كود الفاتورة مفقود' }, { status: 400 });

    // Check if it already exists
    const existing = await db.invoices.findFirst({ where: { invoice_number } });
    if (existing) {
      // Just update total if changed
      const updated = await db.invoices.update({
        where: { id: existing.id },
        data: { total_invoice: Number(total_invoice) }
      });
      return NextResponse.json({ success: true, invoice: updated });
    }

    const newInvoice = await db.invoices.create({
      data: {
        date: new Date(),
        month: new Date().toLocaleString('default', { month: 'long' }),
        invoice_number,
        total_invoice: Number(total_invoice),
        status: "مغلقة",
        shift_id,
        shift_name,
        shift_cashier,
        employee_id: user.id,
        employee_name: user.name,
      }
    });

    return NextResponse.json({ success: true, invoice: newInvoice });
  } catch (error: any) {
    console.error('Invoice Close Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء إغلاق الفاتورة' }, { status: 500 });
  }
}
