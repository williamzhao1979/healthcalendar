/**
 * Date utility functions to handle timezone issues properly
 */

/**
 * Get local date string in YYYY-MM-DD format without timezone conversion
 * This prevents timezone issues where dates shift when converted to UTC
 */
export function getLocalDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Check if the date is valid
  if (!d || isNaN(d.getTime())) {
    console.warn('Invalid date passed to getLocalDateString:', date)
    return new Date().toISOString().slice(0, 10) // Return today's date as fallback
  }
  
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
  // Handle undefined/null dates gracefully
  if (!date1 || !date2) {
    return false
  }
  return getLocalDateString(date1) === getLocalDateString(date2)
}

/**
 * Get local date-time string for display purposes
 */
export function getLocalDateTimeString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Check if the date is valid
  if (!d || isNaN(d.getTime())) {
    console.warn('Invalid date passed to getLocalDateTimeString:', date)
    const now = new Date()
    return now.toISOString().slice(0, 16).replace('T', ' ') // Return current datetime as fallback
  }
  
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
  
  // Check if the date is valid
  if (!d || isNaN(d.getTime())) {
    console.warn('Invalid date passed to getStartOfLocalDay:', date)
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Get the end of the day in local timezone
 */
export function getEndOfLocalDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Check if the date is valid
  if (!d || isNaN(d.getTime())) {
    console.warn('Invalid date passed to getEndOfLocalDay:', date)
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  }
  
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/**
 * Check if a record's dateTime falls on a specific local date
 * This is the main function to use for calendar date matching
 */
export function isRecordOnLocalDate(recordDateTime: string, calendarDate: Date): boolean {
  // Handle undefined/null record dates gracefully
  if (!recordDateTime || !calendarDate) {
    return false
  }
  return isSameLocalDay(recordDateTime, calendarDate)
}

/**
 * Get timezone-safe "today" date that works consistently across different server environments
 * This solves the issue where Vercel (UTC) and local development (local timezone) show different "today"
 */
export function getSafeToday(): Date {
  if (typeof window === 'undefined') {
    // Server-side: just return new Date, will be corrected on client
    return new Date()
  }
  
  // Client-side: use user's timezone to determine today
  const now = new Date()
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  
  try {
    // Get today's date in user's timezone
    const todayString = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now)
    
    // Parse and create local date object
    const [year, month, day] = todayString.split('-').map(num => parseInt(num, 10))
    return new Date(year, month - 1, day) // month is 0-indexed
  } catch (error) {
    console.warn('Failed to get timezone-safe today, falling back to simple method:', error)
    // Fallback to simple local date creation
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
}

/**
 * Compare if a date is "today" in user's local timezone
 * This prevents server-client timezone mismatches
 */
export function isToday(date: Date): boolean {
  const today = getSafeToday()
  return date.getFullYear() === today.getFullYear() &&
         date.getMonth() === today.getMonth() &&
         date.getDate() === today.getDate()
}