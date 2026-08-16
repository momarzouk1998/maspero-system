import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { WalletService } from '@/lib/wallet-service';
import { checkSalesLock } from '@/lib/custody-lock';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const search = searchParams.get('search') || '';
  const serviceName = searchParams.get('serviceName') || '';
  const faceType = searchParams.get('faceType') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const employeeId = searchParams.get('employeeId') || '';

  const skip = (page - 1) * limit;

  // Filter: Manager sees all (or filtered by employeeId); Employee sees only their own entries
  const whereCondition: any = user.role === 'manager' ? (employeeId ? { employee_id: employeeId } : {}) : { employee_id: user.id };

  if (serviceName) whereCondition.service_name = { contains: serviceName, mode: 'insensitive' };
  if (faceType) whereCondition.face_type = faceType;

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    whereCondition.timestamp = {
      gte: start,
      lte: end
    };
  }

  if (search) {
    whereCondition.OR = [
      { service_name: { contains: search, mode: 'insensitive' } },
      { employee_name: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } }
    ];
  }

  const [entries, total] = await Promise.all([
    db.service_entries.findMany({
      where: whereCondition,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
    db.service_entries.count({ where: whereCondition })
  ]);

  return NextResponse.json({
    entries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const lockStatus = await checkSalesLock(user.id, user.role);
  if (lockStatus.locked) {
    return NextResponse.json({ error: lockStatus.reason }, { status: 403 });
  }

  try {
    const { serviceId, serviceName, paperCount, pageCount, faceType, amount, notes, invoice_code } = await req.json();

    if (!serviceName || amount === undefined) {
      return NextResponse.json({ error: 'برجاء استكمال البيانات المطلوبة' }, { status: 400 });
    }

    const numAmount = Number(amount);
    const invoiceCode = invoice_code || Math.random().toString(36).substring(2, 10);
    const today = new Date();

    let validServiceId: string | null = null;
    if (serviceId) {
      const existingService = await db.services.findUnique({ where: { id: serviceId } });
      if (existingService) {
        validServiceId = serviceId;
      }
    }

    const parsedPaper = paperCount !== undefined && paperCount !== null ? parseInt(String(paperCount)) : 0;
    const finalPaper = isNaN(parsedPaper) ? 0 : Math.max(0, parsedPaper);

    const result = await db.$transaction(async (tx: any) => {
      // 1. Create Service Entry record
      const entry = await tx.service_entries.create({
        data: {
          date: today,
          month: `${today.getFullYear()} ${today.getMonth() + 1}`,
          service_id: validServiceId,
          service_name: serviceName,
          paper_count: finalPaper,
          page_count: parseInt(String(pageCount)) || 1,
          face_type: faceType || 'وجه واحد',
          amount: numAmount,
          notes: notes || null,
          employee_id: user.id,
          employee_name: user.name,
          invoice_code: invoiceCode,
          timestamp: today,
        }
      });

      // 2. Add cash to Employee's personal wallet balance
      await WalletService.adjustEmployeeWallet(user.id, numAmount, tx);

      return entry;
    });

    return NextResponse.json({ success: true, entry: result });
  } catch (error: any) {
    console.error('Service entry creation error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء حفظ العملية' }, { status: 500 });
  }
}

// DELETE: Manager can delete record
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  await db.service_entries.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// PUT: Manager can edit record
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'manager') {
    return NextResponse.json({ error: 'غير مصرح لغير المدير' }, { status: 403 });
  }

  const { id, amount, notes, paper_count, face_type } = await req.json();

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  const updated = await db.service_entries.update({
    where: { id },
    data: {
      amount: amount !== undefined ? Number(amount) : undefined,
      notes: notes !== undefined ? notes : undefined,
      paper_count: paper_count !== undefined ? parseInt(paper_count) : undefined,
      face_type: face_type !== undefined ? face_type : undefined,
    }
  });

  return NextResponse.json({ success: true, entry: updated });
}
