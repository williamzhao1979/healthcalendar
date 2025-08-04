/**
 * Date utility functions to handle timezone issues properly
 */

/**
 * Get local date string in YYYY-MM-DD format without timezone conversion
 * This prevents timezone issues where dates shift when converted to UTC
 */
export function getLocalDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Use local date components to avoid timezone shifts
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Compare if two dates are on the same local day
 * This prevents timezone issues when comparing dates
 */
export function isSameLocalDay(date1: Date | string, date2: Date | string): boolean {
  return getLocalDateString(date1) === getLocalDateString(date2)
}

/**
 * Get local date-time string for display purposes
 */
export function getLocalDateTimeString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * Create a new Date object from a date string that preserves the local date
 * This is useful when you want to ensure a date string like "2024-08-03" 
 * creates a Date that represents August 3rd in local time, not UTC
 */
export function createLocalDate(dateString: string): Date {
  // If it's already a full ISO string with time, return as-is
  if (dateString.includes('T') || dateString.includes(' ')) {
    return new Date(dateString)
  }
  
  // For date-only strings like "2024-08-03", ensure it's treated as local date
  const parts = dateString.split('-')
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
    const day = parseInt(parts[2], 10)
    return new Date(year, month, day)
  }
  
  return new Date(dateString)
}

/**
 * Format a date for display in the local timezone
 */
export function formatLocalDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options
  }
  
  return d.toLocaleDateString('zh-CN', defaultOptions)
}

/**
 * Format a date-time for display in the local timezone
 */
export function formatLocalDateTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }
  
  return d.toLocaleString('zh-CN', defaultOptions)
}

/**
 * Get the start of the day in local timezone
 */
export function getStartOfLocalDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Get the end of the day in local timezone
 */
export function getEndOfLocalDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/**
 * Check if a record's dateTime falls on a specific local date
 * This is the main function to use for calendar date matching
 */
export function isRecordOnLocalDate(recordDateTime: string, calendarDate: Date): boolean {
  return isSameLocalDay(recordDateTime, calendarDate)
}