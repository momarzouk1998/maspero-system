// ========================================================
// Modern & High-Performance Printing Pricing Engine
// Maspero Enterprise Cloud System © 2026
// Supports live DB price overrides from Manager dashboard
// ========================================================

export interface PrintPriceResult {
  unitPrice: number;
  totalAmount: number;
  tierLabel: string;
}

// Default prices (fallback if DB has no data)
const DEFAULTS: Record<string, number> = {
  'طباعة أسود | وجه واحد | normal': 1.00,
  'طباعة أسود | وجه واحد | bulk':   0.75,
  'طباعة أسود | وجهين | normal':    1.50,
  'طباعة أسود | وجهين | bulk':      1.20,
  'طباعة ألوان | وجه واحد':         1.50,
  'طباعة ألوان | وجهين':            2.00,
};

/**
 * Calculate tiered print price.
 * 
 * Priority: Live DB prices → fallback to hard-coded defaults.
 * 
 * Logic:
 * - طباعة ألوان: flat price per sheet by face type (no volume tier)
 * - طباعة أسود وجه واحد:  ≤30 normal price | >30 bulk discount
 * - طباعة أسود وجهين:     ≤15 normal price | >15 bulk discount
 */
export function calculatePrintPrice(
  serviceName: string,
  faceType: string = 'وجه واحد',
  paperCount: number = 1,
  dbPrices: Array<{ print_type: string; face_type: string; key_name: string; price: number | string }> = []
): PrintPriceResult {
  const count = Math.max(1, Number(paperCount) || 1);
  const isColor = serviceName.includes('ألوان');
  const isDouble = faceType === 'وجهين';

  /**
   * Helper: find live price from DB rows or fall back to default
   */
  const getPrice = (keyName: string, fallbackKey: string): number => {
    const found = dbPrices.find((r) => r.key_name === keyName);
    if (found) return Number(found.price);
    return DEFAULTS[fallbackKey] ?? 1.00;
  };

  // ─── طباعة ألوان (Color) ───────────────────────────────────────
  if (isColor) {
    const keyName = isDouble ? 'طباعة ألوان وجهين' : 'طباعة ألوان وجه واحد';
    const fallbackKey = isDouble ? 'طباعة ألوان | وجهين' : 'طباعة ألوان | وجه واحد';
    const unitPrice = getPrice(keyName, fallbackKey);

    return {
      unitPrice,
      totalAmount: Number((count * unitPrice).toFixed(2)),
      tierLabel: `طباعة ألوان — ${faceType} (${unitPrice} ج.م / ورقة)`
    };
  }

  // ─── طباعة أسود (Black & White — Tiered) ──────────────────────
  if (isDouble) {
    const isBulk = count > 15;
    const keyName = isBulk
      ? 'طباعة أسود وجهين فوق 30'
      : 'طباعة أسود وجهين أقل من أو يساوي 30';
    const fallbackKey = isBulk ? 'طباعة أسود | وجهين | bulk' : 'طباعة أسود | وجهين | normal';
    const unitPrice = getPrice(keyName, fallbackKey);

    return {
      unitPrice,
      totalAmount: Number((count * unitPrice).toFixed(2)),
      tierLabel: isBulk
        ? `طباعة أسود وجهين — خصم كميات (>15 ورقة) — ${unitPrice} ج.م / ورقة`
        : `طباعة أسود وجهين — سعر عادي (≤15 ورقة) — ${unitPrice} ج.م / ورقة`
    };
  } else {
    const isBulk = count > 30;
    const keyName = isBulk
      ? 'طباعة أسود وجه واحد فوق 30'
      : 'طباعة أسود وجه واحد أقل من أو يساوي 30';
    const fallbackKey = isBulk ? 'طباعة أسود | وجه واحد | bulk' : 'طباعة أسود | وجه واحد | normal';
    const unitPrice = getPrice(keyName, fallbackKey);

    return {
      unitPrice,
      totalAmount: Number((count * unitPrice).toFixed(2)),
      tierLabel: isBulk
        ? `طباعة أسود وجه واحد — خصم كميات (>30 ورقة) — ${unitPrice} ج.م / ورقة`
        : `طباعة أسود وجه واحد — سعر عادي (≤30 ورقة) — ${unitPrice} ج.م / ورقة`
    };
  }
}
