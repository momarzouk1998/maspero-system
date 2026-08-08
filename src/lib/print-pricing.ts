// ========================================================
// Modern Dynamic Printing Pricing Engine
// Maspero Enterprise Cloud System © 2026
// Supports live DB dynamic quantity tiers from Manager dashboard
// ========================================================

export interface PrintPriceResult {
  unitPrice: number;
  totalAmount: number;
  tierLabel: string;
}

export interface DbPriceRow {
  id?: string;
  print_type: string;
  face_type: string;
  key_name: string;
  min_qty?: number;
  max_qty?: number | null;
  price: number | string;
}

// Fallback defaults if DB has no dynamic tiers configured
const DEFAULTS: Record<string, number> = {
  'طباعة أسود | وجه واحد | normal': 1.00,
  'طباعة أسود | وجه واحد | bulk':   0.75,
  'طباعة أسود | وجهين | normal':    1.50,
  'طباعة أسود | وجهين | bulk':      1.20,
  'طباعة ألوان | وجه واحد':         1.50,
  'طباعة ألوان | وجهين':            2.00,
};

/**
 * Calculate tiered print price dynamically.
 * 
 * Dynamic Range Logic:
 * Finds configured DB tier where: paperCount >= min_qty AND (max_qty == null OR paperCount <= max_qty)
 * Falls back to legacy default keys if no matching tier row is defined.
 */
export function calculatePrintPrice(
  serviceName: string,
  faceType: string = 'وجه واحد',
  paperCount: number = 1,
  dbPrices: DbPriceRow[] = []
): PrintPriceResult {
  const count = Math.max(1, Number(paperCount) || 1);
  const isColor = serviceName.includes('ألوان');
  const targetPrintType = isColor ? 'طباعة ألوان' : 'طباعة أسود';
  const targetFaceType = faceType === 'وجهين' ? 'وجهين' : 'وجه واحد';

  // 1. Try matching a dynamic quantity tier from DB rows
  const matchingTiers = dbPrices.filter(
    (row) => row.print_type === targetPrintType && row.face_type === targetFaceType
  );

  if (matchingTiers.length > 0) {
    const matchedTier = matchingTiers.find((tier) => {
      const min = tier.min_qty !== undefined && tier.min_qty !== null ? Number(tier.min_qty) : 1;
      const max = tier.max_qty !== undefined && tier.max_qty !== null ? Number(tier.max_qty) : null;

      if (count < min) return false;
      if (max !== null && count > max) return false;
      return true;
    });

    if (matchedTier) {
      const unitPrice = Number(matchedTier.price || 0);
      const label = matchedTier.key_name || (
        matchedTier.max_qty
          ? `${targetPrintType} ${targetFaceType} (شريحة ${matchedTier.min_qty} - ${matchedTier.max_qty} ورقة)`
          : `${targetPrintType} ${targetFaceType} (شريحة ${matchedTier.min_qty}+ ورقة)`
      );

      return {
        unitPrice,
        totalAmount: Number((count * unitPrice).toFixed(2)),
        tierLabel: `${label} — ${unitPrice} ج / ورقة`
      };
    }
  }

  // 2. Legacy / Fallback price evaluation
  const getPrice = (keyName: string, fallbackKey: string): number => {
    const found = dbPrices.find((r) => r.key_name === keyName);
    if (found) return Number(found.price);
    return DEFAULTS[fallbackKey] ?? 1.00;
  };

  if (isColor) {
    const keyName = targetFaceType === 'وجهين' ? 'طباعة ألوان وجهين' : 'طباعة ألوان وجه واحد';
    const fallbackKey = targetFaceType === 'وجهين' ? 'طباعة ألوان | وجهين' : 'طباعة ألوان | وجه واحد';
    const unitPrice = getPrice(keyName, fallbackKey);

    return {
      unitPrice,
      totalAmount: Number((count * unitPrice).toFixed(2)),
      tierLabel: `طباعة ألوان — ${targetFaceType} (${unitPrice} ج / ورقة)`
    };
  }

  if (targetFaceType === 'وجهين') {
    const isBulk = count > 15;
    const keyName = isBulk ? 'طباعة أسود وجهين فوق 30' : 'طباعة أسود وجهين أقل من أو يساوي 30';
    const fallbackKey = isBulk ? 'طباعة أسود | وجهين | bulk' : 'طباعة أسود | وجهين | normal';
    const unitPrice = getPrice(keyName, fallbackKey);

    return {
      unitPrice,
      totalAmount: Number((count * unitPrice).toFixed(2)),
      tierLabel: isBulk
        ? `طباعة أسود وجهين (>15 ورقة) — ${unitPrice} ج / ورقة`
        : `طباعة أسود وجهين (≤15 ورقة) — ${unitPrice} ج / ورقة`
    };
  } else {
    const isBulk = count > 30;
    const keyName = isBulk ? 'طباعة أسود وجه واحد فوق 30' : 'طباعة أسود وجه واحد أقل من أو يساوي 30';
    const fallbackKey = isBulk ? 'طباعة أسود | وجه واحد | bulk' : 'طباعة أسود | وجه واحد | normal';
    const unitPrice = getPrice(keyName, fallbackKey);

    return {
      unitPrice,
      totalAmount: Number((count * unitPrice).toFixed(2)),
      tierLabel: isBulk
        ? `طباعة أسود وجه واحد (>30 ورقة) — ${unitPrice} ج / ورقة`
        : `طباعة أسود وجه واحد (≤30 ورقة) — ${unitPrice} ج / ورقة`
    };
  }
}
