// src/commands/editReminder.js
const db = require('../services/database');
const scheduler = require('../services/scheduler');
const { isValidTime, isValidDays, daysToNames } = require('../utils/helpers');

async function handleEditReminder(msg, chat, client) {
  try {
    // Format: !editreminder [id] [field] [value]
    const parts = msg.body.split(' ');

    if (parts.length < 4) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!editreminder [id] [field] [value]\n\nField yang tersedia:\n• time - Ubah waktu (HH:MM)\n• message - Ubah pesan\n• days - Ubah hari (1,2,3,4,5)\n\nContoh:\n!editreminder 5 time 10:30\n!editreminder 5 message Pesan baru\n!editreminder 5 days 1,2,3');
      return;
    }

    const reminderId = parseInt(parts[1]);
    const field = parts[2].toLowerCase();
    const value = parts.slice(3).join(' ');

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

    // Prepare update data
    let updateData = {};
    let successMessage = '';

    switch (field) {
      case 'time':
        if (!isValidTime(value)) {
          await msg.reply('❌ Format jam harus HH:MM\nContoh: 09:00, 14:30, 20:15');
          return;
        }
        updateData.time = value;
        successMessage = `⏰ Waktu diubah menjadi: ${value}`;
        break;

      case 'message':
        if (value.length === 0) {
          await msg.reply('❌ Pesan tidak boleh kosong!');
          return;
        }
        if (value.length > 1000) {
          await msg.reply('❌ Pesan terlalu panjang! Maksimal 1000 karakter.');
          return;
        }
        updateData.message = value;
        successMessage = `💬 Pesan diubah menjadi: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`;
        break;

      case 'days':
        if (reminder.is_one_time) {
          await msg.reply('❌ Tidak bisa mengubah hari untuk reminder sekali jalan!');
          return;
        }
        const days = value.split(',').map(Number);
        if (!isValidDays(days)) {
          await msg.reply('❌ Hari harus berupa angka 0-6\n\n0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu');
          return;
        }
        updateData.days = days;
        successMessage = `📅 Hari diubah menjadi: ${daysToNames(days)}`;
        break;

      default:
        await msg.reply('❌ Field tidak valid!\n\nField yang tersedia: time, message, days');
        return;
    }

    // Update in database
    const result = await db.updateReminder(reminderId, updateData);
    
    if (!result.success) {
      throw result.error;
    }

    // Reschedule the reminder
    scheduler.rescheduleReminder(result.data, client);

    await msg.reply(`✅ *Reminder ID ${reminderId} berhasil diupdate!*\n\n${successMessage}`);
  } catch (err) {
    console.error('Error editing reminder:', err);
    await msg.reply('❌ Gagal mengedit reminder. Coba lagi!');
  }
}

module.exports = handleEditReminder;
