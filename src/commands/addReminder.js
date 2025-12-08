// src/commands/addReminder.js
const db = require('../services/database');
const scheduler = require('../services/scheduler');
const { isValidTime, isValidDays, daysToNames } = require('../utils/helpers');

async function handleAddReminder(msg, chat, client) {
  try {
    // Format: !addreminder [days] [time] [message]
    const parts = msg.body.split(' ');

    if (parts.length < 4) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!addreminder [hari] [jam] [pesan]\n\nContoh:\n!addreminder 1,2,3,4,5 09:00 Selamat pagi semua!');
      return;
    }

    const days = parts[1].split(',').map(Number);
    const time = parts[2];
    const message = parts.slice(3).join(' ');

    // Validate days
    if (!isValidDays(days)) {
      await msg.reply('❌ Hari harus berupa angka 0-6\n\n0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu');
      return;
    }

    // Validate time format
    if (!isValidTime(time)) {
      await msg.reply('❌ Format jam harus HH:MM\nContoh: 09:00, 14:30, 20:15\n\nJam: 00-23, Menit: 00-59');
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
      days: days,
      time: time,
      message: message,
      active: true,
      paused: false,
      is_one_time: false,
      created_by: msg.author || msg.from
    });

    if (!result.success) {
      throw result.error;
    }

    // Schedule the reminder
    scheduler.scheduleReminder(result.data, client);

    const dayList = daysToNames(days);

    await msg.reply(`✅ *Reminder berhasil ditambahkan!*\n\n📅 Hari: ${dayList}\n⏰ Jam: ${time}\n💬 Pesan: ${message}\n🆔 ID: ${result.data.id}`);
  } catch (err) {
    console.error('Error adding reminder:', err);
    await msg.reply('❌ Gagal menambahkan reminder. Coba lagi!');
  }
}

module.exports = handleAddReminder;
