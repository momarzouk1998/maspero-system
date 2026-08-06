import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET - Fetch all notes (Manager only)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.role !== 'manager') return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });

  const notes = await db.notes.findMany({
    where: { is_active: true },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json({ notes });
}

// POST - Create new note (Manager only)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (user.role !== 'manager') return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });

  try {
    const body = await request.json();
    const { title, content, category, priority } = body;

    if (!title) {
      return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 });
    }

    const note = await db.notes.create({
      data: {
        title,
        content: content || null,
        category: category || 'عام',
        priority: priority || 'متوسط',
        created_by: user.id,
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في إنشاء الملاحظة' }, { status: 500 });
  }
}
