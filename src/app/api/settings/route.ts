import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const DEFAULTS: Record<string, { value: string; label: string; description: string }> = {
  fawry_purchase_deduction_rate: {
    value: '1.8',
    label: 'نسبة خصم ماكينة فوري (مشتريات)',
    description: 'النسبة المئوية التي تخصمها الماكينة من مبلغ عمليات المشتريات (كريدت). مثال: 1.8 تعني 1.8%',
  },
};

// GET: جلب إعداد واحد أو كل الإعدادات
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  try {
    if (key) {
      const row = await db.system_settings.findUnique({ where: { key } });
      const fallback = DEFAULTS[key];
      return NextResponse.json({
        key,
        value: row ? row.value : (fallback?.value ?? null),
        label: row?.label ?? fallback?.label ?? key,
        description: row?.label ?? fallback?.description ?? '',
      });
    }

    // كل الإعدادات
    const rows = await db.system_settings.findMany({ orderBy: { key: 'asc' } });

    // دمج القيم الافتراضية مع الموجود في DB
    const result: Record<string, any> = { ...DEFAULTS };
    rows.forEach((r) => {
      result[r.key] = {
        value: r.value,
        label: r.label ?? DEFAULTS[r.key]?.label ?? r.key,
        description: r.description ?? DEFAULTS[r.key]?.description ?? '',
      };
    });

    return NextResponse.json({ settings: result });
  } catch (err) {
    console.error('Settings GET error:', err);
    // لو الجدول مش موجود بعد (قبل الـ migration)، رجع القيم الافتراضية
    if (key) {
      const fallback = DEFAULTS[key];
      return NextResponse.json({
        key,
        value: fallback?.value ?? null,
        label: fallback?.label ?? key,
        description: fallback?.description ?? '',
      });
    }
    return NextResponse.json({ settings: DEFAULTS });
  }
}

// PUT: حفظ إعداد (upsert) — للمدير فقط
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح — للمدير فقط' }, { status: 403 });
  }

  try {
    const { key, value } = await req.json();
    if (!key || value === undefined || value === null) {
      return NextResponse.json({ error: 'key و value مطلوبان' }, { status: 400 });
    }

    const numVal = parseFloat(String(value));
    if (isNaN(numVal) || numVal < 0 || numVal > 100) {
      return NextResponse.json({ error: 'القيمة يجب أن تكون رقماً بين 0 و 100' }, { status: 400 });
    }

    const meta = DEFAULTS[key];
    const saved = await db.system_settings.upsert({
      where: { key },
      update: {
        value: String(numVal),
        updated_at: new Date(),
        updated_by: user.name,
      },
      create: {
        key,
        value: String(numVal),
        label: meta?.label ?? key,
        description: meta?.description ?? null,
        updated_by: user.name,
      },
    });

    return NextResponse.json({ success: true, setting: saved });
  } catch (err: any) {
    console.error('Settings PUT error:', err);
    // لو الجدول مش موجود بعد — أعد القيمة بدون حفظ (graceful)
    return NextResponse.json({ success: false, error: 'تعذّر الحفظ في قاعدة البيانات — سيتم تطبيق التغيير بعد تحديث قاعدة البيانات' }, { status: 500 });
  }
}
