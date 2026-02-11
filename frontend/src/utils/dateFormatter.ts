/**
 * Centralized date/time formatting utilities
 * Ensures consistent formatting across the application
 *
 * All formatters use Vietnam timezone (Asia/Ho_Chi_Minh, UTC+7)
 * to correctly display timestamps stored in UTC by the backend.
 */

/**
 * Vietnamese timezone offset (UTC+7)
 */
const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Vietnamese locale date/time formatter options
 */
const VI_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: VIETNAM_TIMEZONE,
};

const VI_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: VIETNAM_TIMEZONE,
};

const VI_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: VIETNAM_TIMEZONE,
};

/**
 * Format date/time in Vietnamese locale
 * Used for: BulkCheckPage, HistoryPage
 *
 * @param date - Date object or ISO string
 * @returns Formatted string: "dd/MM/yyyy HH:mm:ss"
 *
 * @example
 * formatVietnameseDateTime(new Date())
 * // => "09/02/2026 22:45:30"
 */
export function formatVietnameseDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('vi-VN', VI_DATETIME_OPTIONS);
}

/**
 * Format date only (no time) in Vietnamese locale
 *
 * @param date - Date object or ISO string
 * @returns Formatted string: "dd/MM/yyyy"
 *
 * @example
 * formatVietnameseDate(new Date())
 * // => "09/02/2026"
 */
export function formatVietnameseDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('vi-VN', VI_DATE_OPTIONS);
}

/**
 * Format time only (no date) in Vietnamese locale
 *
 * @param date - Date object or ISO string
 * @returns Formatted string: "HH:mm:ss"
 *
 * @example
 * formatVietnameseTime(new Date())
 * // => "22:45:30"
 */
export function formatVietnameseTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('vi-VN', VI_TIME_OPTIONS);
}

/**
 * Format date/time for HistoryPage sessions (no seconds)
 *
 * @param date - Date object or ISO string
 * @returns Formatted string: "dd/MM/yyyy HH:mm"
 *
 * @example
 * formatSessionDateTime(new Date())
 * // => "09/02/2026 22:45"
 */
export function formatSessionDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: VIETNAM_TIMEZONE,
  });
}

/**
 * Get current timestamp in Vietnamese format
 * Used for: BulkCheckPage copy functionality
 *
 * @returns Current datetime string: "dd/MM/yyyy HH:mm:ss"
 */
export function getCurrentVietnameseTimestamp(): string {
  return formatVietnameseDateTime(new Date());
}

/**
 * Format relative time (e.g., "2 hours ago", "just now")
 * Useful for showing "last checked" times
 *
 * @param date - Date object or ISO string
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000))
 * // => "1 hour ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

  // Fallback to absolute date for older dates
  return formatVietnameseDate(d);
}

/**
 * Parse ISO string to Date object with validation
 *
 * @param isoString - ISO date string
 * @returns Date object or null if invalid
 */
export function parseISODate(isoString: string): Date | null {
  try {
    const date = new Date(isoString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Check if date is today
 *
 * @param date - Date object or ISO string
 * @returns true if date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}
