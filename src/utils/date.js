/**
 * Date Utils
 */

/**
 * Formats date into readable string (e.g. 1 Jul 2026).
 * @param {string|Date} dateString
 * @returns {string}
 */
export function formatDate(dateString, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateString) return '';
  const parts = String(dateString).split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day).toLocaleDateString('en-IN', options);
  }
  return new Date(dateString).toLocaleDateString('en-IN', options);
}

/**
 * Formats date and time into readable string (e.g. 1 Jul 2026, 10:30 AM).
 * @param {string|Date} dateTimeString
 * @returns {string}
 */
export function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '';
  return new Date(dateTimeString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get current ISO YYYY-MM-DD date representation.
 * @returns {string}
 */
export function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formats a 24-hour "HH:MM" time string into 12-hour format with AM/PM
 * (e.g. "14:30" -> "2:30 PM", "09:05" -> "9:05 AM").
 * @param {string} timeString
 * @returns {string}
 */
export function formatTime(timeString) {
  if (!timeString) return '';
  const parts = String(timeString).split(':');
  let hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(hour)) return timeString;
  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${period}`;
}
