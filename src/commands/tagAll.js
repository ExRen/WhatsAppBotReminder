// src/commands/tagAll.js
const { formatDateTime } = require('../utils/helpers');

async function handleTagAll(msg, chat) {
  try {
    const text = msg.body.replace('!tagall', '').trim();

    if (!text) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!tagall [pesan]\n\nContoh:\n!tagall Pengumuman penting untuk semua!');
      return;
    }

    const participants = chat.participants.map(p => p.id._serialized);

    // Create announcement message
    const announcement = `
📢━━━━━━━━━━━━━━━━━━📢
📣 *PENGUMUMAN PENTING!* 📣
📢━━━━━━━━━━━━━━━━━━📢

${text}

👥 Tag: Semua member grup (${participants.length} orang)
⏰ ${formatDateTime()}

📢━━━━━━━━━━━━━━━━━━📢
    `.trim();

    await chat.sendMessage(announcement, {
      mentions: participants
    });

    console.log(`✅ Tag all executed in ${chat.id._serialized}`);
  } catch (err) {
    console.error('Error in tagall:', err);
    await msg.reply('❌ Gagal mention semua orang');
  }
}

module.exports = handleTagAll;
