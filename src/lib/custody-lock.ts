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

  // 2. Check active shifts of colleagues
  const colleagueShiftsCount = await db.shifts.count({
    where: { end_time: null, NOT: { employee_id: userId } }
  });

  const isMorningOrSoloShift = colleagueShiftsCount === 0;

  // 3. Fetch all active custody items
  const items = await db.external_wallets.findMany({
    where: { is_active: true }
  });

  const drawers = items.filter((i: any) => i.wallet_type === 'درج كاشير');
  const wallets = items.filter((i: any) => i.wallet_type === 'محفظة');
  const machines = items.filter((i: any) => i.wallet_type === 'ماكينة');

  const hasDrawer = drawers.some((d: any) => d.custodian_id === userId);
  if (!hasDrawer) {
    return { locked: true, reason: 'برجاء استلام عهدة درج الكاشير الخاص بك أولاً من صفحة إدارة الشفتات.' };
  }

  if (isMorningOrSoloShift) {
    const hasAllWallets = wallets.every((w: any) => w.custodian_id === userId);
    const hasAllMachines = machines.every((m: any) => m.custodian_id === userId);

    if (!hasAllWallets || !hasAllMachines) {
      return { 
        locked: true, 
        reason: 'شفت صباحي/منفرد: يرجى استلام وتأكيد أرصدة جميع المحافظ والماكينات من صفحة إدارة الشفتات للبدء.' 
      };
    }
  }

  return { locked: false, reason: '' };
}
