import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const DEFAULT_SERVICES = [
  { service_name: 'خدمات أونلاين', is_commissionable: true, commission_percent: 20, sort: 1 },
  { service_name: 'طباعة أسود', is_commissionable: false, commission_percent: 0, sort: 1 },
  { service_name: 'طباعة ألوان', is_commissionable: false, commission_percent: 0, sort: 2 },
  { service_name: 'كتابة', is_commissionable: true, commission_percent: 20, sort: 2 },
  { service_name: 'حجز أجهزة', is_commissionable: false, commission_percent: 0, sort: 3 },
  { service_name: 'سكانر', is_commissionable: false, commission_percent: 0, sort: 4 },
  { service_name: 'ابحاث', is_commissionable: true, commission_percent: 20, sort: 4 },
  { service_name: 'نسخ CD', is_commissionable: false, commission_percent: 0, sort: 5 },
  { service_name: 'ترجمة معتمدة', is_commissionable: false, commission_percent: 0, sort: 6 },
  { service_name: 'إرسال واستقبال الفاكس', is_commissionable: false, commission_percent: 0, sort: 7 },
  { service_name: 'صيانة موبايل', is_commissionable: true, commission_percent: 30, sort: 8 },
  { service_name: 'صيانة كمبيوتر', is_commissionable: true, commission_percent: 30, sort: 9 },
  { service_name: 'اخرى', is_commissionable: false, commission_percent: 0, sort: 8 },
];

export async function GET() {
  try {
    let services = await db.services_catalog.findMany({
      orderBy: { sort: 'asc' }
    });

    if (services.length === 0) {
      await db.services_catalog.createMany({
        data: DEFAULT_SERVICES
      });
      services = await db.services_catalog.findMany({
        orderBy: { sort: 'asc' }
      });
    }

    return NextResponse.json({ services });
  } catch (error: any) {
    console.error('Services GET Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الخدمات' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { service_name, is_commissionable, commission_percent, price, description, sort } = await req.json();

    if (!service_name) {
      return NextResponse.json({ error: 'اسم الخدمة مطلوب' }, { status: 400 });
    }

    const service = await db.services_catalog.create({
      data: {
        service_name,
        is_commissionable: Boolean(is_commissionable),
        commission_percent: Number(commission_percent || 0),
        price: Number(price || 0),
        description: description || null,
        sort: Number(sort || 0),
        is_active: true
      }
    });

    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    console.error('Services POST Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إضافة الخدمة' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { id, service_name, is_commissionable, commission_percent, price, description, sort, is_active } = await req.json();

    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const service = await db.services_catalog.update({
      where: { id },
      data: {
        service_name: service_name || undefined,
        is_commissionable: is_commissionable !== undefined ? Boolean(is_commissionable) : undefined,
        commission_percent: commission_percent !== undefined ? Number(commission_percent) : undefined,
        price: price !== undefined ? Number(price) : undefined,
        description: description !== undefined ? description : undefined,
        sort: sort !== undefined ? Number(sort) : undefined,
        is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      }
    });

    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    console.error('Services PUT Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل الخدمة' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    await db.services_catalog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Services DELETE Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف الخدمة' }, { status: 500 });
  }
}
