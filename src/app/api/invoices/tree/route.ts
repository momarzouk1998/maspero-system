import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const userFilter = user.role === 'manager' ? {} : { employee_id: user.id };

    const [services, tickets, wallets] = await Promise.all([
      db.service_entries.findMany({
        where: { ...userFilter, invoice_code: { not: null } },
        select: { invoice_code: true, amount: true, timestamp: true },
        take: 1000
      }),
      db.train_ticket_bookings.findMany({
        where: { ...userFilter, invoice_code: { not: null } },
        select: { invoice_code: true, amount: true, timestamp: true },
        take: 1000
      }),
      db.wallet_transactions.findMany({
        where: { ...userFilter, invoice_code: { not: null } },
        select: { invoice_code: true, amount: true, timestamp: true },
        take: 1000
      })
    ]);

    const invoiceMap: Record<string, { code: string; total: number; timestamp: Date }> = {};

    [...services, ...tickets, ...wallets].forEach(item => {
      if (!item.invoice_code) return;
      if (!invoiceMap[item.invoice_code]) {
        invoiceMap[item.invoice_code] = {
          code: item.invoice_code,
          total: 0,
          timestamp: new Date(item.timestamp || Date.now())
        };
      }
      invoiceMap[item.invoice_code].total += Number(item.amount || 0);
    });

    const monthsMap: Record<string, {
      month: string;
      totalSum: number;
      daysMap: Record<string, {
        day: string;
        totalSum: number;
        invoiceCount: number;
      }>
    }> = {};

    let grandTotal = 0;

    Object.values(invoiceMap).forEach(inv => {
      const amt = inv.total;
      grandTotal += amt;

      const dateObj = inv.timestamp;
      const yyyy = dateObj.getFullYear();
      const mm = dateObj.getMonth() + 1;
      const monthKey = `${yyyy} ${mm}`;

      const day = String(dateObj.getDate()).padStart(2, '0');
      const monthStr = String(mm).padStart(2, '0');
      const dayKey = `${day}/${monthStr}/${yyyy}`;

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { month: monthKey, totalSum: 0, daysMap: {} };
      }
      monthsMap[monthKey].totalSum += amt;

      if (!monthsMap[monthKey].daysMap[dayKey]) {
        monthsMap[monthKey].daysMap[dayKey] = { day: dayKey, totalSum: 0, invoiceCount: 0 };
      }
      monthsMap[monthKey].daysMap[dayKey].totalSum += amt;
      monthsMap[monthKey].daysMap[dayKey].invoiceCount += 1;
    });

    const months = Object.values(monthsMap).map(m => ({
      month: m.month,
      totalSum: m.totalSum,
      days: Object.values(m.daysMap).map(d => ({
        day: d.day,
        totalSum: d.totalSum,
        invoiceCount: d.invoiceCount
      }))
    }));

    return NextResponse.json({
      totalSum: grandTotal,
      months
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
