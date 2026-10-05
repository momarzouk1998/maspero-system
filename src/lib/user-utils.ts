// Utility functions for user filtering
// Hide deleted/inactive users from all pages except user management

export function getActiveUsers(users: any[]): any[] {
  return users.filter(u => u.is_active !== false && u.is_active !== 'false');
}

export function isUserActive(user: any): boolean {
  return user?.is_active !== false && user?.is_active !== 'false';
}

// Format number to remove trailing zeros after decimal point
// Example: 10.00 -> 10, 10.50 -> 10.5, 10.123 -> 10.12 (if using toFixed(2))
export function formatNumber(num: number | string, decimals: number = 2): string {
  const numericValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numericValue)) return '0';
  
  const fixed = numericValue.toFixed(decimals);
  // Remove trailing zeros and decimal point if all zeros
  return fixed.replace(/\.?0+$/, '');
}

// Format number with locale and remove trailing zeros
// Example: 10.00 -> 10, 10.50 -> 10.5, 1000 -> 1,000
export function formatNumberLocale(num: number | string, locale: string = 'en-US', decimals: number = 2): string {
  const numericValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numericValue)) return '0';
  
  const formatted = numericValue.toLocaleString(locale, { 
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals 
  });
  
  return formatted;
}

// Format date into text month string e.g. "2026 7" (Cairo Timezone)
export function formatMonthText(d?: Date | string | number | null): string {
  const { monthKey } = getEgyptDateParts(d);
  return monthKey;
}

// Get Date parts in Cairo Timezone (Africa/Cairo)
export function getEgyptDateParts(d?: Date | string | number | null) {
  const dateObj = d ? new Date(d) : new Date();
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(validDate);
  let day = 1;
  let month = 1;
  let year = 2026;

  for (const p of parts) {
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'year') year = parseInt(p.value, 10);
  }

  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');

  return {
    day,
    month,
    year,
    dayStr,
    monthStr,
    dayKey: `${dayStr}/${monthStr}/${year}`,
    monthKey: `${year} ${month}`,
    isoDate: `${year}-${monthStr}-${dayStr}`
  };
}

// Compute UTC offset in ms for a given date in Africa/Cairo
export function getTimezoneOffsetMs(date: Date, timeZone: string = 'Africa/Cairo'): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}

// Get exact UTC Start & End dates for Cairo date strings (e.g. 'YYYY-MM-DD')
export function getCairoDateRange(startDateStr?: string | null, endDateStr?: string | null) {
  let start: Date | null = null;
  let end: Date | null = null;

  if (startDateStr) {
    const parts = startDateStr.split('-').map(Number);
    if (parts.length === 3) {
      const [sy, sm, sd] = parts;
      const startApprox = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
      const startOffsetMs = getTimezoneOffsetMs(startApprox, 'Africa/Cairo');
      start = new Date(startApprox.getTime() - startOffsetMs);
    } else {
      start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
    }
  }

  if (endDateStr) {
    const parts = endDateStr.split('-').map(Number);
    if (parts.length === 3) {
      const [ey, em, ed] = parts;
      const endApprox = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));
      const endOffsetMs = getTimezoneOffsetMs(endApprox, 'Africa/Cairo');
      end = new Date(endApprox.getTime() - endOffsetMs);
    } else {
      end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
    }
  }

  return { start, end };
}


// Value for @db.Date columns: the CAIRO calendar day of `d` stored as midnight UTC.
// (Passing a raw Date makes Prisma store the UTC day, which is the previous day for
// anything recorded between 00:00 and 03:00 Cairo time.)
export function cairoDayDate(d?: Date | string | number | null): Date {
  const { isoDate } = getEgyptDateParts(d);
  return new Date(`${isoDate}T00:00:00.000Z`);
}
