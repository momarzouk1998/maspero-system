import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// PUT - Update note (Manager only)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.role !== 'manager') return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });

  try {
    const body = await request.json();
    const { title, content, category, priority, is_active } = body;

    const note = await db.notes.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(category && { category }),
        ...(priority && { priority }),
        ...(is_active !== undefined && { is_active }),
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في تحديث الملاحظة' }, { status: 500 });
  }
}

// DELETE - Delete note (Manager only)
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.role !== 'manager') return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });

  try {
    await db.notes.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'تم حذف الملاحظة بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في حذف الملاحظة' }, { status: 500 });
  }
}
