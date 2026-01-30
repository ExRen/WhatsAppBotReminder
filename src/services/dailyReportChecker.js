// src/services/dailyReportChecker.js
// Core logic for checking daily report status

const path = require('path');
const fs = require('fs');
const internApi = require('./internApi');

// Load participants from JSON file
function loadParticipants() {
  try {
    const participantsPath = path.join(__dirname, '../../data/participants.json');
    const data = fs.readFileSync(participantsPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ Error loading participants:', err.message);
    return [];
  }
}

/**
 * Check daily report status for all active participants
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<{missingNames: string[], presentCount: number, errors: number}>}
 */
async function checkDailyReportStatus(date) {
  const participants = loadParticipants();
  const activeParticipants = participants.filter(p => p.active);

  const missingNames = [];
  const participantStatuses = [];
  let presentCount = 0;
  let errors = 0;

  console.log(`📋 Checking daily reports for ${activeParticipants.length} participants on ${date}`);

  for (const participant of activeParticipants) {
    const status = {
      name: participant.name,
      isPresent: false,
      hasDailyLog: false,
      error: null
    };

    try {
      // Step 1: Check attendance
      const attendance = await internApi.getAttendance(participant.participant_id, date);

      if (attendance.error) {
        errors++;
        status.error = `Attendance: ${attendance.error}`;
        console.warn(`⚠️ Skipping ${participant.name} due to attendance API error`);
        participantStatuses.push(status);
        continue;
      }

      status.isPresent = attendance.isPresent;

      // Step 2: If not present, skip (no need to check daily log)
      if (!attendance.isPresent) {
        console.log(`📭 ${participant.name} tidak hadir, skip pengecekan`);
        participantStatuses.push(status);
        continue;
      }

      presentCount++;

      // Step 3: Check daily log for present participants
      const dailyLog = await internApi.getDailyLog(participant.participant_id, date);

      if (dailyLog.error) {
        if (dailyLog.status === 403) {
          status.error = 'Forbidden';
          status.isForbidden = true;
          console.warn(`🔒 Permission denied for ${participant.name}'s daily log`);
        } else {
          errors++;
          status.error = `DailyLog: ${dailyLog.error}`;
          console.warn(`⚠️ Daily log API error for ${participant.name}, assuming not filled`);
          missingNames.push(participant.name);
        }
        participantStatuses.push(status);
        continue;
      }

      status.hasDailyLog = dailyLog.hasDailyLog;

      // Step 4: If present but no daily log, add to missing list
      if (!dailyLog.hasDailyLog) {
        console.log(`❌ ${participant.name} hadir tapi belum mengisi laporan`);
        missingNames.push(participant.name);
      } else {
        console.log(`✅ ${participant.name} sudah mengisi laporan`);
      }
      
      participantStatuses.push(status);

    } catch (err) {
      errors++;
      status.error = err.message;
      console.error(`❌ Error checking ${participant.name}:`, err.message);
      participantStatuses.push(status);
    }
  }

  console.log(`📊 Result: ${missingNames.length} belum mengisi, ${presentCount} hadir, ${errors} errors`);

  return {
    missingNames,
    participantStatuses,
    presentCount,
    errors
  };
}

/**
 * Check weekly report status (last 7 days)
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<{weeklyData: Object, dateRange: string}>}
 */
async function checkWeeklyReportStatus(endDate) {
  const participants = loadParticipants();
  const activeParticipants = participants.filter(p => p.active);
  const weeklyData = {}; // participantId -> { name, days: { date -> { isPresent, hasDailyLog, isForbidden } } }

  // Calculate last 7 days
  const dates = [];
  const end = new Date(endDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  dates.reverse(); // Chronological order

  console.log(`📋 Checking weekly reports for ${activeParticipants.length} participants from ${dates[0]} to ${dates[6]}`);

  // Initialize weeklyData
  activeParticipants.forEach(p => {
    weeklyData[p.participant_id] = {
      name: p.name,
      days: {}
    };
  });

  // Batch check (sequential dates, but loop participants)
  for (const date of dates) {
    console.log(`🔍 Checking date: ${date}`);
    for (const participant of activeParticipants) {
      try {
        const attendance = await internApi.getAttendance(participant.participant_id, date);
        const hasAttendance = !attendance.error && attendance.isPresent;
        
        let hasLog = false;
        let isForbidden = false;
        if (hasAttendance) {
          const dailyLog = await internApi.getDailyLog(participant.participant_id, date);
          if (dailyLog.status === 403) {
            isForbidden = true;
          } else {
            hasLog = !dailyLog.error && dailyLog.hasDailyLog;
          }
        }

        weeklyData[participant.participant_id].days[date] = {
          isPresent: hasAttendance,
          hasDailyLog: hasLog,
          isForbidden: isForbidden
        };
      } catch (err) {
        console.error(`❌ Error in weekly check for ${participant.name} on ${date}:`, err.message);
        weeklyData[participant.participant_id].days[date] = { 
          isPresent: false, 
          hasDailyLog: false, 
          error: err.message,
          isForbidden: false
        };
      }
    }
  }

  return {
    weeklyData,
    dateRange: `${dates[0]} s/d ${dates[6]}`
  };
}

module.exports = {
  checkDailyReportStatus,
  checkWeeklyReportStatus,
  loadParticipants
};
