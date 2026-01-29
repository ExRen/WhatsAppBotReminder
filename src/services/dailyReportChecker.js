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
  let presentCount = 0;
  let errors = 0;

  console.log(`📋 Checking daily reports for ${activeParticipants.length} participants on ${date}`);

  for (const participant of activeParticipants) {
    try {
      // Step 1: Check attendance
      const attendance = await internApi.getAttendance(participant.participant_id, date);

      if (attendance.error) {
        errors++;
        console.warn(`⚠️ Skipping ${participant.name} due to attendance API error`);
        continue; // Skip this participant, don't fail the whole check
      }

      // Step 2: If not present, skip (no need to check daily log)
      if (!attendance.isPresent) {
        console.log(`📭 ${participant.name} tidak hadir, skip pengecekan`);
        continue;
      }

      presentCount++;

      // Step 3: Check daily log for present participants
      const dailyLog = await internApi.getDailyLog(participant.participant_id, date);

      if (dailyLog.error) {
        errors++;
        console.warn(`⚠️ Daily log API error for ${participant.name}, assuming not filled`);
        missingNames.push(participant.name);
        continue;
      }

      // Step 4: If present but no daily log, add to missing list
      if (!dailyLog.hasDailyLog) {
        console.log(`❌ ${participant.name} hadir tapi belum mengisi laporan`);
        missingNames.push(participant.name);
      } else {
        console.log(`✅ ${participant.name} sudah mengisi laporan`);
      }

    } catch (err) {
      errors++;
      console.error(`❌ Error checking ${participant.name}:`, err.message);
      // Continue with next participant
    }
  }

  console.log(`📊 Result: ${missingNames.length} belum mengisi, ${presentCount} hadir, ${errors} errors`);

  return {
    missingNames,
    presentCount,
    errors
  };
}

module.exports = {
  checkDailyReportStatus,
  loadParticipants
};
