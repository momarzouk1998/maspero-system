import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const DEFAULT_CATEGORIES = [
  // مصروفات
  { type: 'مصروفات', item_name: 'فكة', sort: 1 },
  { type: 'مصروفات', item_name: 'باقي زبون', sort: 2 },
  { type: 'مصروفات', item_name: 'شحن كهرباء ماسبيرو', sort: 3 },
  { type: 'مصروفات', item_name: 'شحن انترنت ماسبيرو', sort: 4 },
  { type: 'مصروفات', item_name: 'سداد ارضي ماسبيرو', sort: 5 },
  { type: 'مصروفات', item_name: 'صيانة (كيوسيرا)', sort: 6 },
  { type: 'مصروفات', item_name: 'صيانة (EPSON)', sort: 7 },
  { type: 'مصروفات', item_name: 'صيانة اجهزة', sort: 8 },
  { type: 'مصروفات', item_name: 'ATM', sort: 9 },
  { type: 'مصروفات', item_name: 'تامينات ماسبيرو', sort: 10 },
  { type: 'مصروفات', item_name: 'استضافة', sort: 11 },
  { type: 'مصروفات', item_name: 'زبالة', sort: 12 },
  { type: 'مصروفات', item_name: 'نظافة', sort: 13 },
  { type: 'مصروفات', item_name: 'أخرى', sort: 14 },

  // مشتريات
  { type: 'مشتريات', item_name: 'ورق', sort: 1 },
  { type: 'مشتريات', item_name: 'فايلات', sort: 2 },
  { type: 'مشتريات', item_name: 'احبار (EPSON)', sort: 3 },
  { type: 'مشتريات', item_name: 'احبار(كيوسيرا)', sort: 4 },

  // دعم مالي
  { type: 'دعم مالي', item_name: 'الكوماندا', sort: 1 },
  { type: 'دعم مالي', item_name: 'فكة', sort: 2 },
  { type: 'دعم مالي', item_name: 'فوري كاش اوت', sort: 3 },
  { type: 'دعم مالي', item_name: 'أخرى', sort: 4 },

  // مسحوبات (كانت إيرادات في الشفت)
  { type: 'مسحوبات', item_name: 'الكوماندا', sort: 1 },
  { type: 'مسحوبات', item_name: 'البيت', sort: 2 },
  { type: 'مسحوبات', item_name: 'فكة', sort: 3 },
  { type: 'مسحوبات', item_name: 'نقدي فوري', sort: 4 },
  { type: 'مسحوبات', item_name: 'نقدي بساطة', sort: 5 },
  { type: 'مسحوبات', item_name: 'أخرى', sort: 6 },

  // سلفة
  { type: 'سلفة', item_name: 'نقدي', sort: 1 },

  // قبض
  { type: 'قبض', item_name: 'نقدي', sort: 1 },
];

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get('type');

  try {
    let categories = await db.expense_categories.findMany({
      where: {
        is_active: true,
        ...(typeFilter ? { type: typeFilter } : {})
      },
      orderBy: [{ type: 'asc' }, { sort: 'asc' }]
    });

    // Seed defaults if table is empty
    if (categories.length === 0 && !typeFilter) {
      await db.expense_categories.createMany({
        data: DEFAULT_CATEGORIES
      });

      categories = await db.expense_categories.findMany({
        where: { is_active: true },
        orderBy: [{ type: 'asc' }, { sort: 'asc' }]
      });
    }

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Fetch categories error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تحميل التصنيفات' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'صلاحيات المدير مطلوبة' }, { status: 403 });
  }

  try {
    const { type, itemName, sort } = await req.json();

    if (!type || !itemName) {
      return NextResponse.json({ error: 'برجاء إدخال نوع البند واسمه' }, { status: 400 });
    }

    const category = await db.expense_categories.create({
      data: {
        type: type.trim(),
        item_name: itemName.trim(),
        sort: sort ? parseInt(sort) : 0,
        is_active: true,
      }
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إضافة التصنيف' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'صلاحيات المدير مطلوبة' }, { status: 403 });
  }

  try {
    const { id, type, itemName, sort, isActive } = await req.json();

    if (!id) return NextResponse.json({ error: 'معرف التصنيف مطلوب' }, { status: 400 });

    const category = await db.expense_categories.update({
      where: { id },
      data: {
        ...(type ? { type: type.trim() } : {}),
        ...(itemName ? { item_name: itemName.trim() } : {}),
        ...(sort !== undefined ? { sort: parseInt(sort) } : {}),
        ...(isActive !== undefined ? { is_active: Boolean(isActive) } : {}),
      }
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل التصنيف' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'صلاحيات المدير مطلوبة' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'معرف التصنيف مطلوب' }, { status: 400 });

  try {
    await db.expense_categories.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حذف التصنيف' }, { status: 500 });
  }
}
