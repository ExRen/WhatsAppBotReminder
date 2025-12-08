// src/commands/listReminders.js
const db = require('../services/database');
const { daysToNames, formatDateTime } = require('../utils/helpers');

async function handleListReminders(msg, chat) {
  try {
    const reminders = await db.getChatReminders(chat.id._serialized);

    if (!reminders || reminders.length === 0) {
      await msg.reply('📭 Tidak ada reminder aktif di grup ini');
      return;
    }

    let list = '*📋 DAFTAR REMINDER AKTIF*\n\n';

    reminders.forEach((r, i) => {
      const statusIcon = r.paused ? '⏸️' : '✅';
      const statusText = r.paused ? ' (PAUSED)' : '';
      
      list += `${i + 1}. ${statusIcon} ID: *${r.id}*${statusText}\n`;
      
      if (r.is_one_time && r.target_date) {
        list += `   📅 Tanggal: ${formatDateTime(r.target_date)}\n`;
        list += `   🔄 Tipe: Sekali jalan\n`;
      } else {
        const days = daysToNames(r.days);
        list += `   📅 Hari: ${days}\n`;
        list += `   ⏰ Jam: ${r.time}\n`;
        list += `   🔄 Tipe: Berulang\n`;
      }
      
      list += `   💬 Pesan: ${r.message.substring(0, 50)}${r.message.length > 50 ? '...' : ''}\n\n`;
    });

    list += '━━━━━━━━━━━━━━━━━\n';
    list += `Total: ${reminders.length} reminder`;

    await msg.reply(list);
  } catch (err) {
    console.error('Error listing reminders:', err);
    await msg.reply('❌ Gagal mengambil daftar reminder');
  }
}

module.exports = handleListReminders;
