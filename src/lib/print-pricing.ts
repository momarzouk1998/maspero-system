// ========================================================
// AppSheet Tiered Printing Pricing Engine for Maspero System
// ========================================================

export interface PrintPriceRule {
  print_type: string;
  face_type: string;
  key_name: string;
  price: number;
}

// Default Fallback Rules if database is empty
export const DEFAULT_PRINT_PRICES: PrintPriceRule[] = [
  {
    print_type: 'طباعة أسود',
    face_type: 'وجه واحد',
    key_name: 'طباعة أسود وجه واحد أقل من أو يساوي 30',
    price: 1.00,
  },
  {
    print_type: 'طباعة أسود',
    face_type: 'وجه واحد',
    key_name: 'طباعة أسود وجه واحد فوق 30',
    price: 0.75,
  },
  {
    print_type: 'طباعة أسود',
    face_type: 'وجهين',
    key_name: 'طباعة أسود وجهين أقل من أو يساوي 30',
    price: 1.50,
  },
  {
    print_type: 'طباعة أسود',
    face_type: 'وجهين',
    key_name: 'طباعة أسود وجهين فوق 30',
    price: 1.20,
  },
  {
    print_type: 'طباعة ألوان',
    face_type: 'وجه واحد',
    key_name: 'طباعة ألوان وجه واحد',
    price: 1.50,
  },
  {
    print_type: 'طباعة ألوان',
    face_type: 'وجهين',
    key_name: 'طباعة ألوان وجهين',
    price: 2.00,
  },
];

/**
 * Computes the exact AppSheet Key for print price lookup
 */
export function getPrintPriceKey(serviceName: string, faceType: string, paperCount: number): string {
  const isColor = serviceName.includes('ألوان');

  if (isColor) {
    return `طباعة ألوان ${faceType}`;
  }

  // Black & White (طباعة أسود)
  if (faceType === 'وجه واحد') {
    if (paperCount <= 30) {
      return 'طباعة أسود وجه واحد أقل من أو يساوي 30';
    } else {
      return 'طباعة أسود وجه واحد فوق 30';
    }
  } else {
    // Face type "وجهين"
    // AppSheet logic: <= 15 sheets (30 pages)
    if (paperCount <= 15) {
      return 'طباعة أسود وجهين أقل من أو يساوي 30';
    } else {
      return 'طباعة أسود وجهين فوق 30';
    }
  }
}

/**
 * Calculates unit price and total amount based on AppSheet tiered rules
 */
export function calculatePrintPrice(
  serviceName: string,
  faceType: string,
  paperCount: number,
  customRules?: PrintPriceRule[]
): { keyName: string; unitPrice: number; totalAmount: number } {
  const count = Math.max(1, Number(paperCount) || 1);
  const rules = customRules && customRules.length > 0 ? customRules : DEFAULT_PRINT_PRICES;

  const keyName = getPrintPriceKey(serviceName, faceType, count);
  const foundRule = rules.find((r) => r.key_name === keyName);

  const unitPrice = foundRule ? Number(foundRule.price) : (serviceName.includes('ألوان') ? 1.50 : 1.00);
  const totalAmount = Number((count * unitPrice).toFixed(2));

  return {
    keyName,
    unitPrice,
    totalAmount,
  };
}
