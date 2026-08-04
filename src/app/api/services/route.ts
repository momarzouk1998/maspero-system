import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const services = await db.services.findMany({
    where: { is_active: true },
    orderBy: { sort: 'asc' }
  });

  const printPrices = await db.print_prices.findMany();

  return NextResponse.json({ services, printPrices });
}
