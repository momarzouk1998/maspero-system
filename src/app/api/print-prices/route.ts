import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET — Public: returns all print prices (used by ServicesPage too)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const prices = await db.print_prices.findMany({
    orderBy: [{ print_type: 'asc' }, { face_type: 'asc' }]
  });

  return NextResponse.json({ prices });
}

// PUT — Manager only: update price for a specific row
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح — للمدير فقط' }, { status: 403 });
  }

  try {
    const { id, price } = await req.json();

    if (!id || price === undefined || Number(price) < 0) {
      return NextResponse.json({ error: 'يرجاء إدخال السعر بشكل صحيح' }, { status: 400 });
    }

    const updated = await db.print_prices.update({
      where: { id },
      data: { price: Number(price) }
    });

    return NextResponse.json({
      success: true,
      message: `✅ تم تحديث سعر الشريحة (${updated.key_name}) إلى ${price}`,
      price: updated
    });
  } catch (error: any) {
    console.error('Update print price error:', error);
    return NextResponse.json({ error: 'فشل تحديث السعر' }, { status: 500 });
  }
}
