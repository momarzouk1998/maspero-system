import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PUT - Update expense category (Manager only)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.role !== 'manager') return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });

  try {
    const body = await request.json();
    const { category_type, item_name, description, sort, is_active } = body;

    const category = await db.expense_categories.update({
      where: { id: params.id },
      data: {
        ...(category_type && { category_type }),
        ...(item_name && { item_name }),
        ...(description !== undefined && { description }),
        ...(sort !== undefined && { sort }),
        ...(is_active !== undefined && { is_active }),
      },
    });

    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في تحديث التصنيف' }, { status: 500 });
  }
}

// DELETE - Delete expense category (Manager only)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.role !== 'manager') return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });

  try {
    await db.expense_categories.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'تم حذف التصنيف بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في حذف التصنيف' }, { status: 500 });
  }
}
