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

// Format date into text month string e.g. "2026 7"
export function formatMonthText(d?: Date | string | null): string {
  const dateObj = d ? new Date(d) : new Date();
  if (isNaN(dateObj.getTime())) {
    const now = new Date();
    return `${now.getFullYear()} ${now.getMonth() + 1}`;
  }
  return `${dateObj.getFullYear()} ${dateObj.getMonth() + 1}`;
}
