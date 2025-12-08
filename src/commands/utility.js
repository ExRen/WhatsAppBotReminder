// src/commands/utility.js
const db = require('../services/database');
const { formatDateTime } = require('../utils/helpers');
const dayjs = require('dayjs');

/**
 * Handle !splitbill command - Calculate and assign bill splits
 */
async function handleSplitBill(msg, chat) {
  try {
    // Format: !splitbill [amount] @user1 @user2 or just amount for all
    const text = msg.body.replace('!splitbill', '').trim();
    
    if (!text) {
      await msg.reply('❌ Format salah!\n\n✅ Penggunaan:\n!splitbill [jumlah]\n!splitbill [jumlah] @user1 @user2\n\nContoh:\n!splitbill 150000\n!splitbill 300000 @6281234567890 @6289876543210');
      return;
    }

    // Extract amount
    const amountMatch = text.match(/^(\d+)/);
    if (!amountMatch) {
      await msg.reply('❌ Masukkan jumlah yang valid!\n\nContoh: !splitbill 150000');
      return;
    }

    const totalAmount = parseInt(amountMatch[1]);
    
    // Get mentioned users or all participants
    let participants = [];
    
    if (msg.mentionedIds && msg.mentionedIds.length > 0) {
      participants = msg.mentionedIds;
    } else {
      // Use all non-admin participants
      participants = chat.participants
        .filter(p => !p.isAdmin)
        .map(p => p.id._serialized);
    }

    if (participants.length === 0) {
      await msg.reply('❌ Tidak ada peserta untuk dibagi!');
      return;
    }

    const perPerson = Math.ceil(totalAmount / participants.length);
    
    // Format currency
    const formatRupiah = (num) => {
      return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    };

    let message = `
💰 *SPLIT BILL*

━━━━━━━━━━━━━━━━━━
💵 Total: *${formatRupiah(totalAmount)}*
👥 Jumlah orang: *${participants.length}*
━━━━━━━━━━━━━━━━━━

💸 Masing-masing bayar:
*${formatRupiah(perPerson)}*

👤 Peserta:
${participants.map((p, i) => `${i + 1}. ${p.split('@')[0]}`).join('\n')}

━━━━━━━━━━━━━━━━━━
    `.trim();

    await chat.sendMessage(message, {
      mentions: participants
    });

  } catch (err) {
    console.error('Error in splitbill:', err);
    await msg.reply('❌ Terjadi error dalam split bill');
  }
}

/**
 * Handle !rules command - Show or set group rules
 */
async function handleRules(msg, chat) {
  try {
    const text = msg.body.replace('!rules', '').trim();

    // !rules - show rules
    if (!text) {
      const rules = await db.getGroupRules(chat.id._serialized);
      
      if (!rules) {
        await msg.reply('📜 Belum ada aturan grup yang ditetapkan.\n\nAdmin dapat set dengan:\n!rules set [aturan]');
        return;
      }

      await msg.reply(`
📜 *ATURAN GRUP*

━━━━━━━━━━━━━━━━━━

${rules.content}

━━━━━━━━━━━━━━━━━━
_Terakhir update: ${formatDateTime(rules.updated_at)}_
      `.trim());
      return;
    }

    // !rules set [content] - set rules (admin only)
    if (text.startsWith('set ')) {
      const content = text.replace('set ', '').trim();
      
      if (content.length < 10) {
        await msg.reply('❌ Aturan terlalu pendek! Minimal 10 karakter.');
        return;
      }

      if (content.length > 2000) {
        await msg.reply('❌ Aturan terlalu panjang! Maksimal 2000 karakter.');
        return;
      }

      await db.setGroupRules(chat.id._serialized, content);
      
      await msg.reply('✅ Aturan grup berhasil disimpan!\n\nKetik !rules untuk melihat.');
      return;
    }

    // !rules clear - clear rules
    if (text === 'clear') {
      await db.deleteGroupRules(chat.id._serialized);
      await msg.reply('✅ Aturan grup berhasil dihapus.');
      return;
    }

    await msg.reply('❌ Format salah!\n\nPenggunaan:\n• !rules - Lihat aturan\n• !rules set [aturan] - Set aturan\n• !rules clear - Hapus aturan');

  } catch (err) {
    console.error('Error in rules:', err);
    await msg.reply('❌ Terjadi error');
  }
}

/**
 * Handle !countdown command - Create countdown to a date
 */
async function handleCountdown(msg, chat) {
  try {
    const text = msg.body.replace('!countdown', '').trim();

    // !countdown - show active countdowns
    if (!text) {
      const countdowns = await db.getActiveCountdowns(chat.id._serialized);
      
      if (!countdowns || countdowns.length === 0) {
        await msg.reply('⏰ Tidak ada countdown aktif.\n\nBuat dengan:\n!countdown YYYY-MM-DD [nama event]\n\nContoh:\n!countdown 2024-12-31 Tahun Baru 2025!');
        return;
      }

      let message = '*⏰ COUNTDOWN AKTIF*\n\n';
      
      countdowns.forEach((c, i) => {
        const targetDate = dayjs(c.target_date);
        const now = dayjs();
        const diff = targetDate.diff(now);
        
        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          
          message += `${i + 1}. *${c.name}*\n`;
          message += `   📅 ${formatDateTime(c.target_date)}\n`;
          message += `   ⏳ ${days} hari ${hours} jam lagi\n\n`;
        }
      });

      await msg.reply(message.trim());
      return;
    }

    // !countdown YYYY-MM-DD [name] - create countdown
    const match = text.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    
    if (!match) {
      // Try DD-MM-YYYY format
      const match2 = text.match(/^(\d{2}-\d{2}-\d{4})\s+(.+)$/);
      if (match2) {
        const [, dateStr, name] = match2;
        const parts = dateStr.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        await createCountdown(msg, chat, formattedDate, name);
        return;
      }
      
      await msg.reply('❌ Format salah!\n\nPenggunaan:\n!countdown YYYY-MM-DD [nama event]\n\nContoh:\n!countdown 2024-12-31 Tahun Baru!');
      return;
    }

    const [, dateStr, name] = match;
    await createCountdown(msg, chat, dateStr, name);

  } catch (err) {
    console.error('Error in countdown:', err);
    await msg.reply('❌ Terjadi error');
  }
}

async function createCountdown(msg, chat, dateStr, name) {
  const targetDate = dayjs(dateStr);
  
  if (!targetDate.isValid()) {
    await msg.reply('❌ Tanggal tidak valid!');
    return;
  }

  if (targetDate.isBefore(dayjs())) {
    await msg.reply('❌ Tanggal sudah lewat!');
    return;
  }

  const playerId = msg.author || msg.from;
  
  await db.createCountdown({
    chat_id: chat.id._serialized,
    name: name,
    target_date: targetDate.toISOString(),
    created_by: playerId
  });

  const days = targetDate.diff(dayjs(), 'day');
  
  await msg.reply(`
✅ *Countdown berhasil dibuat!*

📅 Event: *${name}*
🎯 Tanggal: ${formatDateTime(targetDate)}
⏳ ${days} hari lagi

Ketik !countdown untuk melihat semua countdown.
  `.trim());
}

/**
 * Handle !note command - Save and retrieve notes
 */
async function handleNote(msg, chat) {
  try {
    const text = msg.body.replace('!note', '').trim();

    // !note - list all notes
    if (!text) {
      const notes = await db.getNotes(chat.id._serialized);
      
      if (!notes || notes.length === 0) {
        await msg.reply('📝 Belum ada catatan.\n\nBuat dengan:\n!note save [nama] [isi]');
        return;
      }

      let list = '*📝 DAFTAR CATATAN*\n\n';
      notes.forEach((n, i) => {
        list += `${i + 1}. *${n.name}*\n`;
      });
      list += '\n_Ketik !note [nama] untuk melihat isi_';
      
      await msg.reply(list);
      return;
    }

    // !note save [name] [content]
    if (text.startsWith('save ')) {
      const parts = text.replace('save ', '').split(' ');
      const name = parts[0];
      const content = parts.slice(1).join(' ');

      if (!name || !content) {
        await msg.reply('❌ Format salah!\n\nGunakan: !note save [nama] [isi]\nContoh: !note save rekening BCA 1234567890 a.n. Budi');
        return;
      }

      const playerId = msg.author || msg.from;
      await db.saveNote(chat.id._serialized, name.toLowerCase(), content, playerId);
      
      await msg.reply(`✅ Catatan "*${name}*" berhasil disimpan!\n\nKetik !note ${name} untuk melihat.`);
      return;
    }

    // !note delete [name]
    if (text.startsWith('delete ')) {
      const name = text.replace('delete ', '').trim();
      await db.deleteNote(chat.id._serialized, name.toLowerCase());
      await msg.reply(`✅ Catatan "*${name}*" berhasil dihapus.`);
      return;
    }

    // !note [name] - get specific note
    const note = await db.getNote(chat.id._serialized, text.toLowerCase());
    
    if (!note) {
      await msg.reply(`❌ Catatan "${text}" tidak ditemukan.\n\nKetik !note untuk melihat daftar.`);
      return;
    }

    await msg.reply(`
📝 *${note.name.toUpperCase()}*

${note.content}

━━━━━━━━━━━━━━━━━━
_Terakhir update: ${formatDateTime(note.updated_at)}_
    `.trim());

  } catch (err) {
    console.error('Error in note:', err);
    await msg.reply('❌ Terjadi error');
  }
}

module.exports = {
  handleSplitBill,
  handleRules,
  handleCountdown,
  handleNote
};
