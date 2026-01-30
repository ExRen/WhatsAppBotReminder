// src/services/dailyInternReminder.js
// System-level daily reminder for intern daily report

const cron = require('node-cron');
const { checkDailyReportStatus, checkWeeklyReportStatus } = require('./dailyReportChecker');
const { buildReminderMessage, buildWeeklySummaryMessage } = require('../utils/reminderMessageBuilder');
const clientManager = require('../utils/clientManager');

const DRY_RUN = process.env.DRY_RUN === 'true';
const REMINDER_GROUP_ID = process.env.REMINDER_GROUP_ID || '';

/**
 * Get today's date in YYYY-MM-DD format (Asia/Jakarta timezone)
 */
function getTodayDate() {
  const now = new Date();
  // Adjust to Asia/Jakarta (UTC+7)
  const jakartaOffset = 7 * 60;
  const localOffset = now.getTimezoneOffset();
  const jakartaTime = new Date(now.getTime() + (jakartaOffset + localOffset) * 60 * 1000);
  
  return jakartaTime.toISOString().split('T')[0];
}

/**
 * Execute daily intern reminder check
 * This function is called by the cron job at 20:00 WIB
 */
async function executeDailyReminder() {
  const date = getTodayDate();
  
  console.log('='.repeat(50));
  console.log(`📢 DAILY INTERN REMINDER - ${date}`);
  console.log(`🔧 DRY_RUN: ${DRY_RUN}`);
  console.log('='.repeat(50));

  try {
    // Check daily report status for all participants
    const { missingNames, participantStatuses, presentCount, errors } = await checkDailyReportStatus(date);

    // Build the reminder message
    const message = buildReminderMessage(missingNames, presentCount, date);

    if (DRY_RUN) {
      // DRY RUN MODE - Log output without sending
      console.log('\n[DRY RUN] Detailed Status:');
      console.log('-'.repeat(60));
      console.log(`${'Name'.padEnd(25)} | ${'Presence'.padEnd(10)} | ${'Daily Log'.padEnd(10)} | ${'Error'}`);
      console.log('-'.repeat(60));
      
      participantStatuses.forEach(p => {
        const presence = p.isPresent ? 'PRESENT' : 'ABSENT';
        let log = p.hasDailyLog ? 'FILLED' : 'MISSING';
        if (p.isForbidden) log = 'LOCKED 🔒';
        const error = p.error || '-';
        console.log(`${p.name.padEnd(25)} | ${presence.padEnd(10)} | ${log.padEnd(10)} | ${error}`);
      });
      console.log('-'.repeat(60));

      console.log('\n[DRY RUN] Would send message:');
      console.log('-'.repeat(40));
      console.log(message);
      console.log('-'.repeat(40));
      console.log(`Present: ${presentCount}`);
      console.log(`Missing: ${missingNames.length}`);
      console.log(`Errors: ${errors}`);
      console.log('[DRY RUN] Message NOT sent');
    } else {
      // LIVE MODE - Send to WhatsApp group
      if (!REMINDER_GROUP_ID) {
        console.error('❌ REMINDER_GROUP_ID not set in .env');
        return;
      }

      // Check if client is ready
      if (!clientManager.isClientReady()) {
        console.log('⏳ Waiting for client to be ready...');
        try {
          await clientManager.waitForReady(15000);
        } catch (err) {
          console.error('❌ Client not ready, skipping reminder');
          return;
        }
      }

      // Get chat and send message
      try {
        const chat = await clientManager.safeGetChat(REMINDER_GROUP_ID);
        if (!chat) {
          console.error('❌ Could not get chat, group ID may be invalid');
          return;
        }

        await clientManager.safeSendMessage(chat, message);
        console.log('✅ Reminder sent successfully!');
      } catch (err) {
        console.error('❌ Failed to send reminder:', err.message);
      }
    }

  } catch (err) {
    console.error('❌ Error in daily reminder:', err.message);
  }

  console.log('='.repeat(50));
}
let cronJob = null;

/**
 * Initialize the daily reminder cron job
 * Schedule: Every day at 20:00 Asia/Jakarta
 */
function initDailyReminder() {
  // Guard: prevent duplicate initialization
  if (cronJob) {
    console.log('📅 Daily reminder already initialized, skipping...');
    return;
  }

  console.log('📅 Initializing daily intern reminder...');
  console.log(`   Schedule: 20:00 Asia/Jakarta`);
  console.log(`   DRY_RUN: ${DRY_RUN}`);
  console.log(`   Target Group: ${REMINDER_GROUP_ID || '(not set)'}`);

  // Schedule cron job - 20:00 every day
  cronJob = cron.schedule('0 20 * * *', async () => {
    console.log('⏰ Daily reminder triggered by cron');
    await executeDailyReminder();
  }, {
    timezone: 'Asia/Jakarta'
  });

  console.log('✅ Daily reminder cron job scheduled');
}


/**
 * Execute weekly summary check (last 7 days)
 */
async function executeWeeklyReport(msg) {
  const date = getTodayDate();
  
  if (msg) await msg.reply('⏳ Menyiapkan ringkasan mingguan (7 hari terakhir)...');
  
  console.log(`📊 Generating weekly report ending ${date}`);

  try {
    const { weeklyData, dateRange } = await checkWeeklyReportStatus(date);
    const message = buildWeeklySummaryMessage(weeklyData, dateRange);

    if (DRY_RUN) {
      console.log('\n[DRY RUN] Weekly Message:');
      console.log(message);
    } else {
      if (msg) {
        await msg.reply(message);
      } else {
        // System triggered (placeholder for future use)
        const chat = await clientManager.safeGetChat(REMINDER_GROUP_ID);
        if (chat) await clientManager.safeSendMessage(chat, message);
      }
    }
  } catch (err) {
    console.error('❌ Error in weekly report:', err.message);
    if (msg) await msg.reply('❌ Terjadi kesalahan saat membuat laporan mingguan.');
  }
}

module.exports = {
  initDailyReminder,
  executeDailyReminder,
  executeWeeklyReport
};
