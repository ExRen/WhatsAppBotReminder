// src/services/dailyInternReminder.js
// System-level daily reminder for intern daily report

const cron = require('node-cron');
const { checkDailyReportStatus } = require('./dailyReportChecker');
const { buildReminderMessage } = require('../utils/reminderMessageBuilder');
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
    const { missingNames, presentCount, errors } = await checkDailyReportStatus(date);

    // Build the reminder message
    const message = buildReminderMessage(missingNames, presentCount, date);

    if (DRY_RUN) {
      // DRY RUN MODE - Log output without sending
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

/**
 * Initialize the daily reminder cron job
 * Schedule: Every day at 20:00 Asia/Jakarta
 */
function initDailyReminder() {
  console.log('📅 Initializing daily intern reminder...');
  console.log(`   Schedule: 20:00 Asia/Jakarta`);
  console.log(`   DRY_RUN: ${DRY_RUN}`);
  console.log(`   Target Group: ${REMINDER_GROUP_ID || '(not set)'}`);

  // Schedule cron job - 20:00 every day
  cron.schedule('0 20 * * *', async () => {
    console.log('⏰ Daily reminder triggered by cron');
    await executeDailyReminder();
  }, {
    timezone: 'Asia/Jakarta'
  });

  console.log('✅ Daily reminder cron job scheduled');
}

module.exports = {
  initDailyReminder,
  executeDailyReminder
};
