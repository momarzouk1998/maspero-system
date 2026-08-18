import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const search = searchParams.get('search') || '';
  const reviewStatus = searchParams.get('reviewStatus') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const employeeId = searchParams.get('employeeId') || '';
  const senderId = searchParams.get('senderId') || '';
  const receiverId = searchParams.get('receiverId') || '';
  const walletName = searchParams.get('walletName') || '';

  const skip = (page - 1) * limit;

  try {
    const isManager = user.role === 'manager';

    // Construct filter for wallet_custody_handovers
    const where: any = {};

    if (!isManager) {
      where.OR = [
        { sender_id: user.id },
        { receiver_id: user.id }
      ];
    } else if (employeeId) {
      where.OR = [
        { sender_id: employeeId },
        { receiver_id: employeeId }
      ];
    }

    if (senderId) where.sender_id = senderId;
    if (receiverId) where.receiver_id = receiverId;
    if (walletName) where.wallet_name = { contains: walletName, mode: 'insensitive' };

    if (reviewStatus === 'NEEDS_REVIEW' || reviewStatus === 'الرجاء المراجعة') {
      where.OR = [
        { review_status: 'الرجاء المراجعة' },
        { review_status: 'NEEDS_REVIEW' },
        { NOT: { difference: 0 } }
      ];
    } else if (reviewStatus) {
      where.review_status = reviewStatus;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.created_at = {
        gte: start,
        lte: end
      };
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { wallet_name: { contains: search, mode: 'insensitive' } },
            { sender_name: { contains: search, mode: 'insensitive' } },
            { receiver_name: { contains: search, mode: 'insensitive' } },
            { discrepancy_reason: { contains: search, mode: 'insensitive' } },
          ]
        }
      ];
    }

    const [handovers, total] = await Promise.all([
      db.wallet_custody_handovers.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      db.wallet_custody_handovers.count({ where })
    ]);

    return NextResponse.json({
      handovers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Handover history error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب سجل التسليم والتسلم' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });
  }

  try {
    const { ids, review_status } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'برجاء تحديد عناصر للمراجعة' }, { status: 400 });
    }

    await db.wallet_custody_handovers.updateMany({
      where: { id: { in: ids } },
      data: { review_status: review_status || 'REVIEWED' }
    });

    return NextResponse.json({ success: true, message: `تم اعتماد مراجعة ${ids.length} عنصر بنجاح` });
  } catch (error: any) {
    console.error('Handover PUT error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تعديل مراجعة التسليمات' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح للمدير فقط' }, { status: 403 });
  }

  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'برجاء تحديد عناصر للحذف' }, { status: 400 });
    }

    await db.wallet_custody_handovers.deleteMany({
      where: { id: { in: ids } }
    });

    return NextResponse.json({ success: true, message: `تم حذف ${ids.length} عنصر بنجاح` });
  } catch (error: any) {
    console.error('Handover DELETE error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حذف التسليمات' }, { status: 500 });
  }
}
