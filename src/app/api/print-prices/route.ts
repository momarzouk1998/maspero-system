import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET — Public / Authenticated: returns all print prices sorted by type and min_qty
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const prices = await (db.print_prices as any).findMany({
      orderBy: [
        { print_type: 'asc' },
        { face_type: 'asc' },
        { min_qty: 'asc' }
      ]
    });

    return NextResponse.json({ prices });
  } catch (error) {
    console.error('Fetch print prices error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب أسعار الطباعة' }, { status: 500 });
  }
}

// POST — Manager only: create a new dynamic quantity tier ("إضافة شريحة سعرية جديدة")
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح — للمدير فقط' }, { status: 403 });
  }

  try {
    const { printType, faceType, minQty, maxQty, price, keyName } = await req.json();

    if (!printType || !faceType || price === undefined || Number(price) < 0) {
      return NextResponse.json({ error: 'برجاء استكمال كافة بيانات الشريحة المطلوبة' }, { status: 400 });
    }

    const min = Math.max(1, parseInt(String(minQty)) || 1);
    const max = maxQty !== undefined && maxQty !== null && String(maxQty).trim() !== '' ? parseInt(String(maxQty)) : null;
    const numPrice = Number(price);

    const autoKeyName = keyName || (
      max ? `${printType} ${faceType} (من ${min} إلى ${max} ورقة)` : `${printType} ${faceType} (${min} ورقة وأكثر)`
    );

    const newTier = await (db.print_prices as any).create({
      data: {
        print_type: printType,
        face_type: faceType,
        key_name: autoKeyName,
        min_qty: min,
        max_qty: max,
        price: numPrice
      }
    });

    return NextResponse.json({
      success: true,
      message: `✅ تم إضافة الشريحة السعرية الجديدة (${autoKeyName}) بنجاح`,
      price: newTier
    });
  } catch (error: any) {
    console.error('Create print price tier error:', error);
    return NextResponse.json({ error: 'فشل إضافة الشريحة السعرية الجديدة' }, { status: 500 });
  }
}

// PUT — Manager only: update price or tier range for a specific row
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح — للمدير فقط' }, { status: 403 });
  }

  try {
    const { id, price, minQty, maxQty, keyName } = await req.json();

    if (!id || price === undefined || Number(price) < 0) {
      return NextResponse.json({ error: 'يرجاء إدخال السعر بشكل صحيح' }, { status: 400 });
    }

    const updateData: any = {
      price: Number(price)
    };

    if (minQty !== undefined) updateData.min_qty = Math.max(1, parseInt(String(minQty)) || 1);
    if (maxQty !== undefined) {
      updateData.max_qty = maxQty !== null && String(maxQty).trim() !== '' ? parseInt(String(maxQty)) : null;
    }
    if (keyName !== undefined) updateData.key_name = keyName;

    const updated = await (db.print_prices as any).update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: `✅ تم تحديث الشريحة السعرية (${updated.key_name}) بنجاح`,
      price: updated
    });
  } catch (error: any) {
    console.error('Update print price error:', error);
    return NextResponse.json({ error: 'فشل تحديث السعر' }, { status: 500 });
  }
}

// DELETE — Manager only: delete a custom print price tier
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح — للمدير فقط' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
    }

    await db.print_prices.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: '✅ تم حذف الشريحة السعرية بنجاح'
    });
  } catch (error: any) {
    console.error('Delete print price tier error:', error);
    return NextResponse.json({ error: 'فشل حذف الشريحة السعرية' }, { status: 500 });
  }
}
