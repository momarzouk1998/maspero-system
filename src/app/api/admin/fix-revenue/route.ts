import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const mainTypeResult = await db.expenses.updateMany({
      where: { main_type: 'إيرادات' },
      data: { main_type: 'مسحوبات' }
    });

    const expenseTypeResult = await db.expenses.updateMany({
      where: { expense_type: 'إيرادات' },
      data: { expense_type: 'مسحوبات' }
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث جميع السجلات في قاعدة البيانات بنجاح',
      mainTypeUpdated: mainTypeResult.count,
      expenseTypeUpdated: expenseTypeResult.count
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
