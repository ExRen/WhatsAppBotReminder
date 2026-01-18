// src/commands/tagAll.js
const { formatDateTime } = require('../utils/helpers');
const clientManager = require('../utils/clientManager');

async function handleTagAll(msg, chat) {
  try {
    const text = msg.body.replace('!tagall', '').trim();

    if (!text) {
      await clientManager.safeReply(msg, '❌ Format salah!\n\n✅ Format yang benar:\n!tagall [pesan]\n\nContoh:\n!tagall Pengumuman penting untuk semua!');
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

    await clientManager.safeSendMessage(chat, announcement, {
      mentions: participants
    });

    console.log(`✅ Tag all executed in ${chat.id._serialized}`);
  } catch (err) {
    console.error('Error in tagall:', err);
    await clientManager.safeReply(msg, '❌ Gagal mention semua orang');
  }
}

module.exports = handleTagAll;
