// src/commands/digest.js
const db = require('../services/database');
const { formatDateTime } = require('../utils/helpers');

/**
 * Handle !mentions command - Show missed mentions for user
 */
async function handleMentions(msg, chat) {
  try {
    const userId = msg.author || msg.from;
    
    // Get unread mentions for this user
    const mentions = await db.getUnreadMentions(chat.id._serialized, userId);

    if (!mentions || mentions.length === 0) {
      await msg.reply('✅ Tidak ada mention yang terlewat!\n\nSemua mention sudah terbaca.');
      return;
    }

    let response = `*📢 MENTION YANG TERLEWAT*\n\n`;
    response += `Anda di-mention ${mentions.length} kali:\n\n`;

    mentions.slice(0, 10).forEach((m, i) => {
      const time = formatDateTime(m.created_at);
      const preview = m.message_preview?.substring(0, 50) || '(pesan)';
      response += `${i + 1}. *${m.sender_name}* (${time})\n`;
      response += `   💬 "${preview}${m.message_preview?.length > 50 ? '...' : ''}"\n\n`;
    });

    if (mentions.length > 10) {
      response += `_...dan ${mentions.length - 10} mention lainnya_\n\n`;
    }

    response += '━━━━━━━━━━━━━━━━━━\n';
    response += '_Ketik !mentions clear untuk menandai sudah dibaca_';

    // Mark as read
    await db.markMentionsRead(chat.id._serialized, userId);

    await msg.reply(response);

  } catch (err) {
    console.error('Error in mentions:', err);
    await msg.reply('❌ Gagal mengambil mentions');
  }
}

/**
 * Handle !digest command - Show chat summary
 */
async function handleDigest(msg, chat) {
  try {
    const hours = 24;
    const digest = await db.getChatDigest(chat.id._serialized, hours);

    if (!digest || digest.totalMessages === 0) {
      await msg.reply(`📭 Tidak ada aktivitas dalam ${hours} jam terakhir.`);
      return;
    }

    let response = `*📊 DIGEST CHAT ${hours} JAM TERAKHIR*\n\n`;
    
    // Stats
    response += `━━━━ *Statistik* ━━━━\n`;
    response += `💬 Total pesan: ${digest.totalMessages}\n`;
    response += `👥 Partisipan aktif: ${digest.activeParticipants}\n`;
    response += `📸 Media: ${digest.mediaCount}\n`;
    response += `🔗 Link: ${digest.linkCount}\n\n`;

    // Top chatters
    if (digest.topChatters && digest.topChatters.length > 0) {
      response += `━━━━ *Paling Aktif* ━━━━\n`;
      digest.topChatters.slice(0, 5).forEach((chatter, i) => {
        response += `${i + 1}. ${chatter.name} (${chatter.count} pesan)\n`;
      });
      response += '\n';
    }

    // Peak hours
    if (digest.peakHour !== undefined) {
      response += `━━━━ *Info Lainnya* ━━━━\n`;
      response += `⏰ Jam tersibuk: ${digest.peakHour}:00\n`;
    }

    // Keywords/topics if available
    if (digest.keywords && digest.keywords.length > 0) {
      response += `🔑 Topik: ${digest.keywords.slice(0, 5).join(', ')}\n`;
    }

    response += `\n━━━━━━━━━━━━━━━━━━\n`;
    response += `_Diambil: ${formatDateTime()}_`;

    await msg.reply(response);

  } catch (err) {
    console.error('Error in digest:', err);
    await msg.reply('❌ Gagal mengambil digest chat');
  }
}

/**
 * Track mentions in messages (to be called from message handler)
 */
async function trackMention(msg, chat) {
  try {
    // Check if message contains mentions
    if (!msg.mentionedIds || msg.mentionedIds.length === 0) return;

    const senderId = msg.author || msg.from;
    // Safe sender name extraction without getContact
    const senderName = senderId.split('@')[0].replace(/[^0-9]/g, '') || 'User';

    // Save each mention
    for (const mentionedId of msg.mentionedIds) {
      // Don't track self-mentions
      if (mentionedId === senderId) continue;

      await db.saveMention({
        chat_id: chat.id._serialized,
        mentioned_user: mentionedId,
        sender_id: senderId,
        sender_name: senderName,
        message_preview: msg.body.substring(0, 100),
        message_id: msg.id._serialized
      });
    }
  } catch (err) {
    console.error('Error tracking mention:', err);
  }
}

/**
 * Track message for digest (to be called from message handler)
 */
async function trackMessage(msg, chat) {
  try {
    const senderId = msg.author || msg.from;
    // Safe sender name extraction without getContact
    const senderName = senderId.split('@')[0].replace(/[^0-9]/g, '') || 'User';

    await db.trackChatMessage({
      chat_id: chat.id._serialized,
      sender_id: senderId,
      sender_name: senderName,
      message_type: msg.type,
      has_media: msg.hasMedia,
      has_link: msg.body.includes('http'),
      hour: new Date().getHours()
    });
  } catch (err) {
    console.error('Error tracking message:', err);
  }
}

module.exports = {
  handleMentions,
  handleDigest,
  trackMention,
  trackMessage
};
