import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hasPermission } from '@/lib/auth';
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

  if (!hasPermission(user, 'services', 'create')) {
    return NextResponse.json({ error: 'ليس لديك صلاحية إضافة خدمات. تواصل مع المدير.' }, { status: 403 });
  }

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

// DELETE: Employee or Manager can delete record with balance reversal if shift is open
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

  try {
    const entry = await db.service_entries.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: 'العنصر غير موجود' }, { status: 404 });

    const activeShift = entry.employee_id ? await db.shifts.findFirst({
      where: { employee_id: entry.employee_id, end_time: null }
    }) : null;

    const isShiftOpen = Boolean(activeShift);

    if (!hasPermission(user, 'services', 'delete')) {
      return NextResponse.json({ error: 'ليس لديك صلاحية حذف الخدمات. تواصل مع المدير.' }, { status: 403 });
    }
    if (user.role !== 'manager' && (!isShiftOpen || user.id !== entry.employee_id)) {
      return NextResponse.json({ error: 'لا يمكن الحذف خارج الشفت المفتوح الخاص بك' }, { status: 403 });
    }

    await db.$transaction(async (tx: any) => {
      if (isShiftOpen && entry.employee_id) {
        await WalletService.adjustEmployeeWallet(entry.employee_id, -Number(entry.amount), tx);
      }
      await tx.service_entries.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'تم حذف العملية وعكس التأثير المالي بنجاح' });
  } catch (error: any) {
    console.error('Delete service entry error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حذف العملية' }, { status: 500 });
  }
}

// PUT: Employee or Manager can edit record with balance adjustment if shift is open
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  try {
    const { id, amount, notes, paper_count, face_type } = await req.json();
    if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });

    const entry = await db.service_entries.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: 'العنصر غير موجود' }, { status: 404 });

    const activeShift = entry.employee_id ? await db.shifts.findFirst({
      where: { employee_id: entry.employee_id, end_time: null }
    }) : null;

    const isShiftOpen = Boolean(activeShift);

    if (!hasPermission(user, 'services', 'update')) {
      return NextResponse.json({ error: 'ليس لديك صلاحية تعديل الخدمات. تواصل مع المدير.' }, { status: 403 });
    }
    if (user.role !== 'manager' && (!isShiftOpen || user.id !== entry.employee_id)) {
      return NextResponse.json({ error: 'لا يمكن التعديل خارج الشفت المفتوح الخاص بك' }, { status: 403 });
    }

    const numNewAmount = amount !== undefined ? Number(amount) : Number(entry.amount || 0);

    const updated = await db.$transaction(async (tx: any) => {
      if (isShiftOpen && entry.employee_id) {
        const diff = numNewAmount - Number(entry.amount || 0);
        if (diff !== 0) {
          await WalletService.adjustEmployeeWallet(entry.employee_id, diff, tx);
        }
      }

      return await tx.service_entries.update({
        where: { id },
        data: {
          amount: numNewAmount,
          notes: notes !== undefined ? notes : undefined,
          paper_count: paper_count !== undefined ? parseInt(paper_count) : undefined,
          face_type: face_type !== undefined ? face_type : undefined,
        }
      });
    });

    return NextResponse.json({ success: true, entry: updated, message: 'تم تعديل الخدمة وضبط العهدة بنجاح' });
  } catch (error: any) {
    console.error('Update service entry error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء تعديل العملية' }, { status: 500 });
  }
}
