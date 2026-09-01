import { db } from '@/lib/db';

export async function checkSalesLock(userId: string, userRole: string): Promise<{ locked: boolean; reason: string }> {
  // 1. Check if user has an active shift
  const activeShift = await db.shifts.findFirst({
    where: { employee_id: userId, end_time: null }
  });

  if (!activeShift) {
    return { locked: true, reason: 'برجاء بدء الشفت أولاً من صفحة إدارة الشفتات قبل تسجيل أي مبيعات.' };
  }

  // Managers can start selling immediately after starting a shift without cashier drawer
  if (userRole === 'manager') {
    return { locked: false, reason: '' };
  }

  // Cashier only needs to have received his own drawer to open sales
  // (services & tickets). Wallets & machines remain locked individually
  // until they are claimed — by him or by any online colleague — after
  // which they show up for everyone active.
  const drawers = await db.external_wallets.findMany({
    where: { is_active: true, wallet_type: 'درج كاشير' }
  });

  const hasDrawer = drawers.some((d: any) => d.custodian_id === userId);
  if (!hasDrawer) {
    return { locked: true, reason: 'برجاء استلام عهدة درج الكاشير الخاص بك أولاً من صفحة إدارة الشفتات.' };
  }

  return { locked: false, reason: '' };
}
