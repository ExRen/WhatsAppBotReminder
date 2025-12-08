// src/commands/remindOnce.js
const db = require('../services/database');
const scheduler = require('../services/scheduler');
const { isValidTime, parseDate, formatDateTime } = require('../utils/helpers');
const dayjs = require('dayjs');

async function handleRemindOnce(msg, chat, client) {
  try {
    // Format: !remindonce [date] [time] [message]
    const parts = msg.body.split(' ');

    if (parts.length < 4) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!remindonce [tanggal] [jam] [pesan]\n\nContoh:\n!remindonce 2024-12-25 09:00 Selamat Natal!\n!remindonce 25-12-2024 14:30 Meeting sore');
      return;
    }

    const dateStr = parts[1];
    const time = parts[2];
    const message = parts.slice(3).join(' ');

    // Validate time format
    if (!isValidTime(time)) {
      await msg.reply('❌ Format jam harus HH:MM\nContoh: 09:00, 14:30, 20:15\n\nJam: 00-23, Menit: 00-59');
      return;
    }

    // Parse date
    const parsedDate = parseDate(dateStr);
    if (!parsedDate) {
      await msg.reply('❌ Format tanggal tidak valid!\n\nFormat yang didukung:\n• YYYY-MM-DD (2024-12-25)\n• DD-MM-YYYY (25-12-2024)');
      return;
    }

    // Combine date and time
    const [hour, minute] = time.split(':').map(Number);
    const targetDate = parsedDate.hour(hour).minute(minute).second(0);

    // Check if date is in the past
    if (targetDate.isBefore(dayjs())) {
      await msg.reply('❌ Tanggal dan waktu sudah lewat!\n\nMasukkan tanggal dan waktu di masa depan.');
      return;
    }

    // Validate message length
    if (message.length > 1000) {
      await msg.reply('❌ Pesan terlalu panjang! Maksimal 1000 karakter.');
      return;
    }

    // Save to database
    const result = await db.createReminder({
      chat_id: chat.id._serialized,
      days: [],
      time: time,
      message: message,
      active: true,
      paused: false,
      is_one_time: true,
      target_date: targetDate.toISOString(),
      created_by: msg.author || msg.from
    });

    if (!result.success) {
      throw result.error;
    }

    // Schedule the one-time reminder
    scheduler.scheduleOneTimeReminder(result.data, client);

    await msg.reply(`✅ *Reminder sekali jalan berhasil ditambahkan!*\n\n📅 Tanggal: ${formatDateTime(targetDate)}\n💬 Pesan: ${message}\n🆔 ID: ${result.data.id}\n\n⚠️ Reminder akan otomatis terhapus setelah terkirim.`);
  } catch (err) {
    console.error('Error adding one-time reminder:', err);
    await msg.reply('❌ Gagal menambahkan reminder. Coba lagi!');
  }
}

module.exports = handleRemindOnce;
