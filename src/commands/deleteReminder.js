// src/commands/deleteReminder.js
const db = require('../services/database');
const scheduler = require('../services/scheduler');

async function handleDeleteReminder(msg, chat) {
  try {
    const parts = msg.body.split(' ');

    if (parts.length !== 2) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!deletereminder [id]\n\nContoh:\n!deletereminder 5');
      return;
    }

    const reminderId = parseInt(parts[1]);

    if (isNaN(reminderId)) {
      await msg.reply('❌ ID harus berupa angka!');
      return;
    }

    // Check if reminder exists
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
      await msg.reply('❌ Reminder sudah dihapus sebelumnya!');
      return;
    }

    // Stop cron job
    scheduler.stopReminder(reminderId);

    // Delete from database (soft delete)
    const result = await db.deleteReminder(reminderId, chat.id._serialized);

    if (!result.success) {
      throw result.error;
    }

    await msg.reply(`✅ Reminder ID ${reminderId} berhasil dihapus!`);
  } catch (err) {
    console.error('Error deleting reminder:', err);
    await msg.reply('❌ Gagal menghapus reminder. Pastikan ID benar!');
  }
}

module.exports = handleDeleteReminder;
