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

    if (reviewStatus) {
      where.review_status = reviewStatus;
    }

    if (startDate && endDate) {
      where.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate)
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
