import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Fetch all expense categories (Manager only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.role !== 'manager') return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });

  const categories = await db.expense_categories.findMany({
    where: { is_active: true },
    orderBy: { category_type: 'asc' },
  });

  return NextResponse.json({ categories });
}

// POST - Create new expense category (Manager only)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.role !== 'manager') return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });

  try {
    const body = await request.json();
    const { category_type, item_name, description, sort } = body;

    if (!category_type || !item_name) {
      return NextResponse.json({ error: 'البيانات ناقصة' }, { status: 400 });
    }

    const category = await db.expense_categories.create({
      data: {
        category_type,
        item_name,
        description: description || null,
        sort: sort || 0,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في إنشاء التصنيف' }, { status: 500 });
  }
}
