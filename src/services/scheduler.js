// src/services/scheduler.js
const cron = require('node-cron');
const { buildCronExpression, formatDateTime } = require('../utils/helpers');
const db = require('./database');

// Store active cron jobs
const activeCrons = new Map();

// Store one-time reminders (setTimeout IDs)
const oneTimeReminders = new Map();

/**
 * Schedule a recurring reminder
 */
function scheduleReminder(reminder, client) {
  // Skip if paused
  if (reminder.paused) {
    console.log(`⏸️ Reminder ${reminder.id} is paused, skipping schedule`);
    return;
  }

  const cronExpression = buildCronExpression(reminder);

  const job = cron.schedule(cronExpression, async () => {
    await sendReminder(reminder, client);
  }, {
    timezone: "Asia/Jakarta"
  });

  activeCrons.set(reminder.id, job);
  console.log(`⏰ Scheduled reminder ${reminder.id}: ${cronExpression}`);
}

/**
 * Schedule a one-time reminder
 */
function scheduleOneTimeReminder(reminder, client) {
  const targetDate = new Date(reminder.target_date);
  const now = new Date();
  const delay = targetDate.getTime() - now.getTime();

  if (delay <= 0) {
    console.log(`⚠️ One-time reminder ${reminder.id} is in the past, skipping`);
    return;
  }

  const timeoutId = setTimeout(async () => {
    await sendReminder(reminder, client);
    // Auto-deactivate after sending
    await db.updateReminder(reminder.id, { active: false });
    oneTimeReminders.delete(reminder.id);
  }, delay);

  oneTimeReminders.set(reminder.id, timeoutId);
  console.log(`📅 Scheduled one-time reminder ${reminder.id} for ${formatDateTime(targetDate)}`);
}

/**
 * Send reminder message
 */
async function sendReminder(reminder, client) {
  try {
    // Check if reminder is still active
    const isActive = await db.isReminderActive(reminder.id);
    if (!isActive) {
      console.log(`⏭️ Reminder ${reminder.id} is no longer active, skipping`);
      return;
    }

    // Check if reminder is paused
    const currentReminder = await db.getReminderById(reminder.id);
    if (currentReminder?.paused) {
      console.log(`⏸️ Reminder ${reminder.id} is paused, skipping`);
      return;
    }

    // Get chat
    let chat;
    try {
      chat = await client.getChatById(reminder.chat_id);
    } catch (chatErr) {
      console.error(`❌ Chat ${reminder.chat_id} not found, deactivating reminder`);
      await db.updateReminder(reminder.id, { active: false });
      return;
    }

    if (!chat) {
      console.error(`❌ Chat ${reminder.chat_id} is null, deactivating reminder`);
      await db.updateReminder(reminder.id, { active: false });
      return;
    }

    const participants = chat.participants?.map(p => p.id._serialized) || [];

    // Create message with proper emoji encoding
    const isOneTime = reminder.is_one_time || reminder.target_date;
    const timeDisplay = isOneTime 
      ? formatDateTime(reminder.target_date)
      : reminder.time;

    const reminderMessage = `
🔔━━━━━━━━━━━━━━━━━━🔔
⚠️ *REMINDER PENTING!* ⚠️
🔔━━━━━━━━━━━━━━━━━━🔔

${reminder.message}

⏰ Waktu: ${timeDisplay}
📢 PERHATIAN SEMUA!

🔔━━━━━━━━━━━━━━━━━━🔔
    `.trim();

    // Send the reminder with mentions
    await chat.sendMessage(reminderMessage, {
      mentions: participants
    });

    console.log(`✅ Reminder sent to ${reminder.chat_id}`);
  } catch (err) {
    console.error('❌ Error sending reminder:', err);
  }
}

/**
 * Stop a scheduled reminder
 */
function stopReminder(reminderId) {
  // Check recurring cron jobs
  if (activeCrons.has(reminderId)) {
    activeCrons.get(reminderId).stop();
    activeCrons.delete(reminderId);
    console.log(`🛑 Stopped cron job for reminder ${reminderId}`);
    return true;
  }

  // Check one-time reminders
  if (oneTimeReminders.has(reminderId)) {
    clearTimeout(oneTimeReminders.get(reminderId));
    oneTimeReminders.delete(reminderId);
    console.log(`🛑 Stopped one-time reminder ${reminderId}`);
    return true;
  }

  return false;
}

/**
 * Reschedule an existing reminder
 */
function rescheduleReminder(reminder, client) {
  stopReminder(reminder.id);
  
  if (reminder.is_one_time || reminder.target_date) {
    scheduleOneTimeReminder(reminder, client);
  } else {
    scheduleReminder(reminder, client);
  }
}

/**
 * Load and schedule all active reminders
 */
async function loadAllReminders(client) {
  try {
    const reminders = await db.getActiveReminders();

    reminders.forEach(reminder => {
      if (reminder.is_one_time || reminder.target_date) {
        scheduleOneTimeReminder(reminder, client);
      } else {
        scheduleReminder(reminder, client);
      }
    });

    console.log(`📅 Loaded ${reminders.length} reminders`);
    return reminders.length;
  } catch (err) {
    console.error('❌ Error loading reminders:', err);
    return 0;
  }
}

/**
 * Get active cron jobs count
 */
function getActiveJobsCount() {
  return activeCrons.size + oneTimeReminders.size;
}

module.exports = {
  scheduleReminder,
  scheduleOneTimeReminder,
  sendReminder,
  stopReminder,
  rescheduleReminder,
  loadAllReminders,
  getActiveJobsCount
};
