import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const DEFAULT_SERVICES = [
  { id: 'def-1', service_name: 'خدمات أونلاين', is_commissionable: true, commission_percent: 20, sort: 1 },
  { id: 'def-2', service_name: 'طباعة أسود', is_commissionable: false, commission_percent: 0, sort: 1 },
  { id: 'def-3', service_name: 'طباعة ألوان', is_commissionable: false, commission_percent: 0, sort: 2 },
  { id: 'def-4', service_name: 'كتابة', is_commissionable: true, commission_percent: 20, sort: 2 },
  { id: 'def-5', service_name: 'حجز أجهزة', is_commissionable: false, commission_percent: 0, sort: 3 },
  { id: 'def-6', service_name: 'سكانر', is_commissionable: false, commission_percent: 0, sort: 4 },
  { id: 'def-7', service_name: 'ابحاث', is_commissionable: true, commission_percent: 20, sort: 4 },
  { id: 'def-8', service_name: 'نسخ CD', is_commissionable: false, commission_percent: 0, sort: 5 },
  { id: 'def-9', service_name: 'ترجمة معتمدة', is_commissionable: false, commission_percent: 0, sort: 6 },
  { id: 'def-10', service_name: 'إرسال واستقبال الفاكس', is_commissionable: false, commission_percent: 0, sort: 7 },
  { id: 'def-11', service_name: 'صيانة موبايل', is_commissionable: true, commission_percent: 30, sort: 8 },
  { id: 'def-12', service_name: 'صيانة كمبيوتر', is_commissionable: true, commission_percent: 30, sort: 9 },
  { id: 'def-13', service_name: 'اخرى', is_commissionable: false, commission_percent: 0, sort: 8 },
];

export async function GET() {
  try {
    let services: any[] = [];
    try {
      services = await db.services_catalog.findMany({
        orderBy: { sort: 'asc' }
      });

      if (services.length === 0) {
        try {
          await db.services_catalog.createMany({
            data: DEFAULT_SERVICES.map(({ id, ...rest }) => rest)
          });
          services = await db.services_catalog.findMany({
            orderBy: { sort: 'asc' }
          });
        } catch (e) {
          // ignore duplicate errors
        }
      }
    } catch (catError) {
      console.warn('services_catalog query failed, trying legacy services table:', catError);
      try {
        services = await db.services.findMany({
          orderBy: { sort: 'asc' }
        });
      } catch (legError) {
        console.warn('services legacy query failed, returning DEFAULT_SERVICES:', legError);
        services = DEFAULT_SERVICES;
      }
    }

    if (!services || services.length === 0) {
      services = DEFAULT_SERVICES;
    }

    return NextResponse.json({ services });
  } catch (error: any) {
    console.error('Services GET Error:', error);
    return NextResponse.json({ services: DEFAULT_SERVICES });
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

    let service: any = null;
    try {
      service = await db.services_catalog.create({
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
    } catch (e) {
      service = await db.services.create({
        data: {
          service_name,
          is_commissionable: Boolean(is_commissionable),
          commission_percent: Number(commission_percent || 0),
          description: description || null,
          sort: Number(sort || 0),
          is_active: true
        }
      });
    }

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

    let service: any = null;
    try {
      service = await db.services_catalog.update({
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
    } catch (e) {
      service = await db.services.update({
        where: { id },
        data: {
          service_name: service_name || undefined,
          is_commissionable: is_commissionable !== undefined ? Boolean(is_commissionable) : undefined,
          commission_percent: commission_percent !== undefined ? Number(commission_percent) : undefined,
          description: description !== undefined ? description : undefined,
          sort: sort !== undefined ? Number(sort) : undefined,
          is_active: is_active !== undefined ? Boolean(is_active) : undefined,
        }
      });
    }

    // Auto-update past service entries for this service if commission settings were changed
    if (service && (is_commissionable !== undefined || commission_percent !== undefined || service_name !== undefined)) {
      const isComm = Boolean(service.is_commissionable);
      const pct = Number(service.commission_percent || 0);

      const matchingEntries = await db.service_entries.findMany({
        where: {
          OR: [
            { service_id: service.id },
            { service_name: { equals: service.service_name, mode: 'insensitive' } },
            { service_name: { contains: service.service_name, mode: 'insensitive' } }
          ]
        }
      });

      for (const entry of matchingEntries) {
        const amt = Number(entry.amount || 0);
        const newComm = (isComm && amt > 0) ? (amt * (pct / 100)) : 0;
        const newCommStr = isComm ? 'نعم' : 'لا';

        await db.service_entries.update({
          where: { id: entry.id },
          data: {
            employee_commission: newComm,
            is_commissionable: newCommStr,
            service_id: service.id
          }
        });
      }
    }

    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    console.error('Services PUT Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل الخدمة' }, { status: 500 });
  }
}

// PATCH: Recalculate commissions for ALL past recorded transactions against current services_catalog
export async function PATCH() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    let catalog: any[] = [];
    try {
      catalog = await db.services_catalog.findMany({ where: { is_active: true } });
    } catch (e) {
      catalog = await db.services.findMany({ where: { is_active: true } }).catch(() => DEFAULT_SERVICES);
    }
    if (!catalog || catalog.length === 0) catalog = DEFAULT_SERVICES;

    const allEntries = await db.service_entries.findMany();
    let updatedCount = 0;

    for (const entry of allEntries) {
      const amount = Number(entry.amount || 0);
      if (amount <= 0) continue;

      let matched: any = null;
      if (entry.service_id) {
        matched = catalog.find(c => c.id === entry.service_id);
      }
      if (!matched && entry.service_name) {
        const cleanName = entry.service_name.trim().toLowerCase();
        matched = catalog.find(c => c.service_name && c.service_name.trim().toLowerCase() === cleanName);
        if (!matched) {
          matched = catalog.find(c => c.service_name && cleanName.includes(c.service_name.toLowerCase()));
        }
      }

      if (matched && (matched.is_commissionable === true || String(matched.is_commissionable) === 'true' || String(matched.is_commissionable) === 'نعم')) {
        const pct = Number(matched.commission_percent || 0);
        const expectedComm = amount * (pct / 100);

        await db.service_entries.update({
          where: { id: entry.id },
          data: {
            employee_commission: expectedComm,
            is_commissionable: 'نعم',
            service_id: matched.id
          }
        });
        updatedCount++;
      } else {
        await db.service_entries.update({
          where: { id: entry.id },
          data: {
            employee_commission: 0,
            is_commissionable: 'لا'
          }
        });
      }
    }

    return NextResponse.json({ success: true, updatedCount, message: `تم إعادة حساب عمولات ${updatedCount} معاملة سابقة بنجاح` });
  } catch (error: any) {
    console.error('Services PATCH Recalculate Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إعادة حساب العمليات' }, { status: 500 });
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

    try {
      await db.services_catalog.delete({ where: { id } });
    } catch (e) {
      await db.services.delete({ where: { id } }).catch(() => null);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Services DELETE Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف الخدمة' }, { status: 500 });
  }
}
