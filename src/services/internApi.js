// src/services/internApi.js
// API Client for Intern Attendance & Daily Log System (Read-Only)
// API: https://monev.maganghub.kemnaker.go.id/api

const API_BASE_URL = process.env.INTERN_API_BASE_URL || 'https://monev.maganghub.kemnaker.go.id/api';
const TIMEOUT_MS = 15000;

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get attendance status for a participant on a specific date
 * API: /attendances?participant_id=xxx&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 * @param {string} participantId - UUID of the participant
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<{isPresent: boolean, error?: string}>}
 */
async function getAttendance(participantId, date) {
  try {
    // API uses start_date and end_date, we use same date for single day check
    const url = `${API_BASE_URL}/attendances?participant_id=${participantId}&start_date=${date}&end_date=${date}`;
    console.log(`📡 Fetching attendance: ${url}`);
    
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.error(`❌ Attendance API error for ${participantId}: ${response.status}`);
      return { isPresent: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    console.log(`📋 Attendance response for ${participantId}:`, JSON.stringify(data).substring(0, 200));
    
    // Check if there's attendance data for this date
    // Possible structures: { data: [...] } or direct array or { attendance: {...} }
    let isPresent = false;
    
    if (Array.isArray(data) && data.length > 0) {
      // Direct array response
      isPresent = data.some(a => a.status === 'PRESENT' || a.status === 'hadir' || a.is_present === true);
    } else if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      // Wrapped in { data: [...] }
      isPresent = data.data.some(a => a.status === 'PRESENT' || a.status === 'hadir' || a.is_present === true);
    } else if (data.status) {
      // Single record { status: "PRESENT" }
      isPresent = data.status === 'PRESENT' || data.status === 'hadir';
    } else if (data.is_present !== undefined) {
      isPresent = data.is_present === true;
    }

    return { isPresent };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`⏱️ Attendance API timeout for ${participantId}`);
      return { isPresent: false, error: 'Timeout' };
    }
    console.error(`❌ Attendance API error for ${participantId}:`, err.message);
    return { isPresent: false, error: err.message };
  }
}

/**
 * Get daily log status for a participant on a specific date
 * API: /daily-logs?date=YYYY-MM-DD
 * Note: This API might return all logs for all participants on that date
 * @param {string} participantId - UUID of the participant
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<{hasDailyLog: boolean, error?: string}>}
 */
async function getDailyLog(participantId, date) {
  try {
    // Daily logs API uses date parameter
    const url = `${API_BASE_URL}/daily-logs?date=${date}&participant_id=${participantId}`;
    console.log(`📡 Fetching daily log: ${url}`);
    
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      // 404 might mean no log found, which is valid
      if (response.status === 404) {
        return { hasDailyLog: false };
      }
      console.error(`❌ Daily log API error for ${participantId}: ${response.status}`);
      return { hasDailyLog: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    console.log(`📋 Daily log response for ${participantId}:`, JSON.stringify(data).substring(0, 200));
    
    // Check if there's daily log data for this participant
    let hasDailyLog = false;
    
    if (Array.isArray(data)) {
      // Direct array - check if any log belongs to this participant
      hasDailyLog = data.some(log => log.participant_id === participantId);
    } else if (data.data && Array.isArray(data.data)) {
      // Wrapped in { data: [...] }
      hasDailyLog = data.data.some(log => log.participant_id === participantId);
    } else if (data.participant_id) {
      // Single record
      hasDailyLog = data.participant_id === participantId;
    } else if (data.exists !== undefined) {
      hasDailyLog = data.exists === true;
    } else if (data.id || data.content || data.log) {
      // Has some log data
      hasDailyLog = true;
    }

    return { hasDailyLog };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`⏱️ Daily log API timeout for ${participantId}`);
      return { hasDailyLog: false, error: 'Timeout' };
    }
    console.error(`❌ Daily log API error for ${participantId}:`, err.message);
    return { hasDailyLog: false, error: err.message };
  }
}

module.exports = {
  getAttendance,
  getDailyLog
};
