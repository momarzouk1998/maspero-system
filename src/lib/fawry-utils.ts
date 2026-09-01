import { db } from '@/lib/db';

/**
 * نسبة الخصم اللي بتاخدها ماكينة سحب فوري على عمليات المشتريات (كريدت كارد).
 * القيمة الافتراضية 1.8% ما لم يتم تعديلها في system_settings.fawry_purchase_deduction_rate
 */
export async function getFawryPurchaseRate(txClient?: any): Promise<number> {
  const client = txClient || db;
  try {
    const row = await client.system_settings.findUnique({
      where: { key: 'fawry_purchase_deduction_rate' },
    });
    if (row) {
      const parsed = parseFloat(row.value);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed / 100;
    }
  } catch {
    // ignore & fall back
  }
  return 0.018; // 1.8%
}

export function isFawryPurchase(fawryType?: string | null, transactionType?: string | null): boolean {
  return fawryType === 'مشتريات' && transactionType === 'سحب';
}

/**
 * التغيرات المالية الناتجة عن عملية محفظة/ماكينة/درج واحدة.
 *  - externalDelta: التغير المطلوب على رصيد المحفظة/الماكينة/الدرج الخارجي
 *  - employeeCashDelta: التغير المطلوب على عهدة الكاشير
 *
 * موحّد بين POST/DELETE/PUT علشان الحسابات ما تتلخبطش.
 */
export function computeWalletDeltas(params: {
  amount: number;
  commission: number;
  transactionType: string;      // 'إيداع' | 'سحب'
  fawryType?: string | null;    // 'مشتريات' | 'عادية' | null
  walletType: string;           // 'محفظة' | 'ماكينة' | 'درج كاشير'
  walletName?: string | null;
  fawryPurchaseRate: number;    // ex 0.018 (from getFawryPurchaseRate)
}): { externalDelta: number; employeeCashDelta: number; actualMachineAmount: number; realCommission: number } {
  const {
    amount,
    commission,
    transactionType,
    fawryType,
    walletType,
    walletName,
    fawryPurchaseRate,
  } = params;

  const isPurchase = isFawryPurchase(fawryType, transactionType);
  const machineCost = isPurchase ? amount * fawryPurchaseRate : 0;
  const actualMachineAmount = amount - machineCost; // ex 982 for a 1000 purchase
  const realCommission = Math.max(commission - machineCost, 0);

  // External wallet: withdrawal adds to fawry balance, deposit removes
  const externalDelta =
    transactionType === 'إيداع' ? -actualMachineAmount : +actualMachineAmount;

  // Employee cash change
  const isDrawer = walletType === 'درج كاشير' || (walletName ? walletName.includes('درج') : false);
  const employeeCashDelta = isDrawer
    ? (transactionType === 'إيداع' ? -amount : +amount)
    : (transactionType === 'إيداع' ? +(amount + commission) : -(amount - commission));

  return { externalDelta, employeeCashDelta, actualMachineAmount, realCommission };
}
