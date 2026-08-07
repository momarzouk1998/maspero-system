import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const INITIAL_ARCHIVE_NOTES = [
  {
    title: 'ايبسون Ebson',
    category: 'عدادات وطابعات',
    color: 'blue',
    content: `من ابرام
تم شراء ايبسون (A4)
11-2024=22000

تم شراء ايبسون (A3)
11-5-2026=45000
عداد=33918
اسود=10942
الوان=22976`
  },
  {
    title: 'شارب Sharp',
    category: 'عدادات وطابعات',
    color: 'purple',
    content: `تم تبديل الشارب بمكنة جديدة بدون سداد اي شىء خلاف أجرة التروسيكل 250ج
بتاريخ:
20-12-2025
عداد اسود=421761
عداد الوان=548476
اجمالي=970252

تم رفع المكنة بتاريخ 10-5-2026 لكثرة المشاكل
عداد اسود=492394
عداد الوان=565713
اجمالي=1058122`
  },
  {
    title: 'اسعار مشتريات الحباك',
    category: 'أسعار المشتريات',
    color: 'emerald',
    content: `(مشتريات الحباك)
دباسة كبيرة=845ج
فايلات=140ج...1.30
حافظة كبسولة عادية=38ج...3.16
حافظة كبسولة متوسطة=48ج...3.75
حافظة كبسولة ممتاز=54ج...4.50
جلوسي200جرام=45ج...2.25
جلوسي230جرام=50ج...2.50
ستيكر ايبسون 135جرام=59ج...2.95
cd=345ج
dvd=395ج`
  },
  {
    title: 'اسعار الورق',
    category: 'أسعار المشتريات',
    color: 'emerald',
    content: `80جرام
A4=140
A3=290

**************
75جرام
A4=125`
  },
  {
    title: 'اسعار حبر كيوسيرا',
    category: 'أسعار المشتريات',
    color: 'emerald',
    content: `كيس حبر=300ج`
  },
  {
    title: 'رصيد اول واخر المدة',
    category: 'أرصدة وحسابات',
    color: 'amber',
    content: `رصيد اول المدة(تقريبي): 12-2025= -10669
رصيد اخر المدة: 12-2025=14390
------------------------------------------------------
رصيد اول المدة: 1-2026=14390
رصيد اخر المدة: 1-2026=13460
------------------------------------------------------
رصيد اول المدة:2-2026=13460
رصيد اخر المدة:2-2026=10888
------------------------------------------------------
رصيد اول المدة:3-2026=10888
رصيد اخر المدة:3-2026=7697
------------------------------------------------------
بدون مكن فوري او بساطة
رصيد اول المدة:4-2026=7697
رصيد اخر المدة:4-2026=5605
------------------------------------------------------
رصيد اول المدة:5-2026=5605
رصيد اخر المدة:5-2026=5760
------------------------------------------------------
رصيد اول المدة:6-2026=5760
رصيد اخر المدة:6-2026=2818
------------------------------------------------------
رصيد اول المدة:7-2026=2818
رصيد اخر المدة:7-2026=1300
------------------------------------------------------
رصيد اول المدة:8-2026=1300`
  },
  {
    title: 'عداد ورق البرنترات',
    category: 'عدادات وطابعات',
    color: 'blue',
    content: `كيوسيرا2 31-1-2026=526348
كيوسيرا3 31-1-2026=953504
شارب 31-1-2026=1012599
ايبسون صغيرة 31-1-2026=316309
----------------------------------------------------
كيوسيرا2 30-4-2026=588100
كيوسيرا3 30-4-2026=999031
شارب 30-4-2026=1053096
ايبسون صغيرة 30-4-2026=361209
----------------------------------------------------
كيوسيرا2 30-6-2026=630897
كيوسيرا3 30-6-2026=1032197
ايبسون صغيرة 30-6-2026=392904
ايبسون الكبيرة 30-6-2026=63876
----------------------------------------------------
كيوسيرا2 31-7-2026=640846
كيوسيرا3 31-7-2026=1039919
ايبسون صغيرة 31-7-2026=405408
ايبسون الكبيرة 31-7-2026=79692`
  },
  {
    title: 'عداد الايبسون',
    category: 'عدادات وطابعات',
    color: 'blue',
    content: `20-2-2026
العداد=327503

27-2-2026
العداد=331390

30-4-2026
العداد=361209`
  },
  {
    title: 'شبكات و عناوين IP',
    category: 'شبكة وIP',
    color: 'rose',
    content: `Laser = 38
1 = 37
2 = 135
3 = 39
EBSON A4 = 114
Ebson A3 = 222
Casher = 87`
  }
];

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    let count = await db.manager_notes.count();
    
    // Auto-seed if empty
    if (count === 0) {
      for (const item of INITIAL_ARCHIVE_NOTES) {
        await db.manager_notes.create({
          data: {
            title: item.title,
            category: item.category,
            color: item.color,
            content: item.content,
            date: new Date()
          }
        });
      }
    }

    const notes = await db.manager_notes.findMany({
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error('Notes GET error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب الملاحظات' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { title, content, category, color } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: 'العنوان والمحتوى مطلوبان' }, { status: 400 });
    }

    const note = await db.manager_notes.create({
      data: {
        title,
        content,
        category: category || 'عام',
        color: color || 'blue',
        date: new Date()
      }
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error('Notes POST error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء إضافة الملاحظة' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  try {
    const { id, title, content, category, color } = await req.json();
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const note = await db.manager_notes.update({
      where: { id },
      data: {
        title: title || undefined,
        content: content || undefined,
        category: category || undefined,
        color: color || undefined,
        updated_at: new Date()
      }
    });

    return NextResponse.json({ success: true, note });
  } catch (error: any) {
    console.error('Notes PUT error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء تعديل الملاحظة' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  await db.manager_notes.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
