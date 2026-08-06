// ========================================================
// Modern & High-Performance Printing Pricing Engine
// Maspero Enterprise Cloud System © 2026
// ========================================================

export interface PrintPriceResult {
  unitPrice: number;
  totalAmount: number;
  tierLabel: string;
}

/**
 * Modern Clean Price Calculation Engine
 * 
 * Logic Summary:
 * 1. طباعة ألوان:
 *    - وجه واحد: 1.50 ج.م للورقة
 *    - وجهين: 2.00 ج.م للورقة
 * 
 * 2. طباعة أسود (شرائح الكمية):
 *    - وجه واحد: <= 30 ورقة (1.00 ج.م) | > 30 ورقة (0.75 ج.م - خصم كميات)
 *    - وجهين:    <= 15 ورقة (1.50 ج.م) | > 15 ورقة (1.20 ج.م - خصم كميات)
 */
export function calculatePrintPrice(
  serviceName: string,
  faceType: string = 'وجه واحد',
  paperCount: number = 1
): PrintPriceResult {
  const count = Math.max(1, Number(paperCount) || 1);
  const isColor = serviceName.includes('ألوان');
  const isDoubleFace = faceType === 'وجهين';

  // 1. طباعة ألوان (Color Printing)
  if (isColor) {
    const unitPrice = isDoubleFace ? 2.00 : 1.50;
    return {
      unitPrice,
      totalAmount: Number((count * unitPrice).toFixed(2)),
      tierLabel: isDoubleFace ? 'طباعة ألوان (وجهين)' : 'طباعة ألوان (وجه واحد)'
    };
  }

  // 2. طباعة أسود (Black & White Tiered Pricing)
  if (isDoubleFace) {
    // وجهين: الشريحة العادية <= 15 ورقة (1.50 ج.م) / شريحة الجملة > 15 ورقة (1.20 ج.م)
    const isBulk = count > 15;
    const unitPrice = isBulk ? 1.20 : 1.50;
    return {
      unitPrice,
      totalAmount: Number((count * unitPrice).toFixed(2)),
      tierLabel: isBulk ? 'طباعة أسود - وجهين (خصم كميات: فوق 15 ورقة)' : 'طباعة أسود - وجهين (عادي: 15 ورقة فأقل)'
    };
  } else {
    // وجه واحد: الشريحة العادية <= 30 ورقة (1.00 ج.م) / شريحة الجملة > 30 ورقة (0.75 ج.م)
    const isBulk = count > 30;
    const unitPrice = isBulk ? 0.75 : 1.00;
    return {
      unitPrice,
      totalAmount: Number((count * unitPrice).toFixed(2)),
      tierLabel: isBulk ? 'طباعة أسود - وجه واحد (خصم كميات: فوق 30 ورقة)' : 'طباعة أسود - وجه واحد (عادي: 30 ورقة فأقل)'
    };
  }
}
