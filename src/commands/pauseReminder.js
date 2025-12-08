// src/commands/pauseReminder.js
const db = require('../services/database');
const scheduler = require('../services/scheduler');

async function handlePauseReminder(msg, chat) {
  try {
    const parts = msg.body.split(' ');

    if (parts.length !== 2) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!pausereminder [id]\n\nContoh:\n!pausereminder 5');
      return;
    }

    const reminderId = parseInt(parts[1]);

    if (isNaN(reminderId)) {
      await msg.reply('❌ ID harus berupa angka!');
      return;
    }

    // Get existing reminder
    const reminder = await db.getReminderById(reminderId);

    if (!reminder) {
      await msg.reply('❌ Reminder tidak ditemukan!');
      return;
    }

    if (reminder.chat_id !== chat.id._serialized) {
      await msg.reply('❌ Reminder tidak ditemukan di grup ini!');
      return;
    }

    if (!reminder.active) {
      await msg.reply('❌ Reminder sudah tidak aktif!');
      return;
    }

    if (reminder.paused) {
      await msg.reply('⏸️ Reminder sudah dalam status pause!\n\nGunakan !resumereminder untuk melanjutkan.');
      return;
    }

    // Update in database
    const result = await db.updateReminder(reminderId, { paused: true });

    if (!result.success) {
      throw result.error;
    }

    // Stop the cron job
    scheduler.stopReminder(reminderId);

    await msg.reply(`⏸️ *Reminder ID ${reminderId} berhasil di-pause!*\n\nGunakan !resumereminder ${reminderId} untuk melanjutkan.`);
  } catch (err) {
    console.error('Error pausing reminder:', err);
    await msg.reply('❌ Gagal mem-pause reminder. Coba lagi!');
  }
}

async function handleResumeReminder(msg, chat, client) {
  try {
    const parts = msg.body.split(' ');

    if (parts.length !== 2) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!resumereminder [id]\n\nContoh:\n!resumereminder 5');
      return;
    }

    const reminderId = parseInt(parts[1]);

    if (isNaN(reminderId)) {
      await msg.reply('❌ ID harus berupa angka!');
      return;
    }

    // Get existing reminder
    const reminder = await db.getReminderById(reminderId);

    if (!reminder) {
      await msg.reply('❌ Reminder tidak ditemukan!');
      return;
    }

    if (reminder.chat_id !== chat.id._serialized) {
      await msg.reply('❌ Reminder tidak ditemukan di grup ini!');
      return;
    }

    if (!reminder.active) {
      await msg.reply('❌ Reminder sudah tidak aktif!');
      return;
    }

    if (!reminder.paused) {
      await msg.reply('▶️ Reminder sudah berjalan!');
      return;
    }

    // Update in database
    const result = await db.updateReminder(reminderId, { paused: false });

    if (!result.success) {
      throw result.error;
    }

    // Reschedule the reminder
    scheduler.rescheduleReminder(result.data, client);

    await msg.reply(`▶️ *Reminder ID ${reminderId} berhasil dilanjutkan!*`);
  } catch (err) {
    console.error('Error resuming reminder:', err);
    await msg.reply('❌ Gagal melanjutkan reminder. Coba lagi!');
  }
}

module.exports = { handlePauseReminder, handleResumeReminder };
