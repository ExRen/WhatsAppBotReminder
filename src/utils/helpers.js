// src/utils/helpers.js
const dayjs = require('dayjs');
require('dayjs/locale/id');
dayjs.locale('id');

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Build cron expression from reminder config
 */
function buildCronExpression(reminder) {
  const [hour, minute] = reminder.time.split(':');
  const days = reminder.days.join(',');
  return `${minute} ${hour} * * ${days}`;
}

/**
 * Convert day numbers to day names
 */
function daysToNames(days) {
  return days.map(d => DAY_NAMES[d]).join(', ');
}

/**
 * Format date for display
 */
function formatDateTime(date = new Date()) {
  return dayjs(date).format('DD MMM YYYY, HH:mm');
}

/**
 * Validate time format (HH:MM)
 */
function isValidTime(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [hour, minute] = time.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/**
 * Validate days array (0-6)
 */
function isValidDays(days) {
  return Array.isArray(days) && 
    days.length > 0 && 
    days.every(d => !isNaN(d) && d >= 0 && d <= 6);
}

/**
 * Parse date string (YYYY-MM-DD or DD-MM-YYYY)
 */
function parseDate(dateStr) {
  // Try YYYY-MM-DD format
  let parsed = dayjs(dateStr, 'YYYY-MM-DD');
  if (parsed.isValid()) return parsed;
  
  // Try DD-MM-YYYY format
  parsed = dayjs(dateStr, 'DD-MM-YYYY');
  if (parsed.isValid()) return parsed;
  
  return null;
}

/**
 * Truncate message for preview
 */
function truncateMessage(message, maxLength = 50) {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '...';
}

module.exports = {
  DAY_NAMES,
  buildCronExpression,
  daysToNames,
  formatDateTime,
  isValidTime,
  isValidDays,
  parseDate,
  truncateMessage
};
