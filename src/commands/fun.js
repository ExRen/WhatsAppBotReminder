// src/commands/fun.js
const db = require('../services/database');
const { formatDateTime, DAY_NAMES } = require('../utils/helpers');

// Gacha items with rarity
const GACHA_ITEMS = [
  // Common (60%)
  { name: '🪙 Koin Biasa', rarity: 'common', points: 5 },
  { name: '⭐ Bintang Kecil', rarity: 'common', points: 5 },
  { name: '🍀 Daun Semanggi', rarity: 'common', points: 5 },
  { name: '🎈 Balon', rarity: 'common', points: 5 },
  { name: '🍬 Permen', rarity: 'common', points: 5 },
  // Uncommon (25%)
  { name: '💎 Berlian Kecil', rarity: 'uncommon', points: 15 },
  { name: '🌟 Bintang Emas', rarity: 'uncommon', points: 15 },
  { name: '🎁 Kotak Hadiah', rarity: 'uncommon', points: 15 },
  { name: '🏆 Piala Mini', rarity: 'uncommon', points: 15 },
  // Rare (12%)
  { name: '👑 Mahkota', rarity: 'rare', points: 30 },
  { name: '💰 Kantong Emas', rarity: 'rare', points: 30 },
  { name: '🔮 Bola Kristal', rarity: 'rare', points: 30 },
  // Legendary (3%)
  { name: '🐉 Naga Legendaris', rarity: 'legendary', points: 100 },
  { name: '🦄 Unicorn', rarity: 'legendary', points: 100 },
  { name: '⚡ Petir Zeus', rarity: 'legendary', points: 100 }
];

const RARITY_COLORS = {
  common: '⚪',
  uncommon: '🟢',
  rare: '🔵',
  legendary: '🟡'
};

/**
 * Get random gacha item based on rarity
 */
function rollGacha() {
  const roll = Math.random() * 100;
  let rarity;
  
  if (roll < 3) rarity = 'legendary';
  else if (roll < 15) rarity = 'rare';
  else if (roll < 40) rarity = 'uncommon';
  else rarity = 'common';
  
  const items = GACHA_ITEMS.filter(i => i.rarity === rarity);
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Handle !gacha command - Daily gacha roll
 */
async function handleGacha(msg, chat) {
  try {
    const playerId = msg.author || msg.from;
    const playerName = playerId.split('@')[0].replace(/[^0-9]/g, '') || 'Player';

    // Check cooldown (once per day)
    const canRoll = await db.checkGachaCooldown(chat.id._serialized, playerId);
    
    if (!canRoll.allowed) {
      const nextRoll = new Date(canRoll.nextRollTime);
      const hours = Math.ceil((nextRoll - new Date()) / (1000 * 60 * 60));
      await msg.reply(`⏳ Gacha harian sudah digunakan!\n\nCoba lagi dalam *${hours} jam*.\n\n💡 Gacha reset setiap hari jam 00:00`);
      return;
    }

    // Roll gacha
    const item = rollGacha();
    
    // Save result and update points
    await db.saveGachaResult(chat.id._serialized, playerId, playerName, item);
    await db.updateLeaderboard(chat.id._serialized, playerId, playerName, 'gacha', item.points);

    const rarityText = {
      common: 'Common',
      uncommon: 'Uncommon ✨',
      rare: 'RARE! 💎',
      legendary: '⚡ LEGENDARY!! ⚡'
    };

    await chat.sendMessage(`
🎰 *GACHA HARIAN*

${RARITY_COLORS[item.rarity]} *${rarityText[item.rarity]}*

🎁 Anda mendapat:
*${item.name}*

💰 +${item.points} poin!

━━━━━━━━━━━━━━━━━━
_Gacha berikutnya: besok_
    `.trim());

  } catch (err) {
    console.error('Error in gacha:', err);
    await msg.reply('❌ Terjadi error dalam gacha');
  }
}

/**
 * Handle !profile command - Show user profile
 */
async function handleProfile(msg, chat) {
  try {
    const playerId = msg.author || msg.from;
    const playerName = playerId.split('@')[0].replace(/[^0-9]/g, '') || 'Player';

    // Get user stats
    const stats = await db.getUserStats(chat.id._serialized, playerId);
    
    // Get leaderboard position
    const leaderboard = await db.getLeaderboard(chat.id._serialized);
    const position = leaderboard.findIndex(l => l.player_id === playerId) + 1;

    const rankEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🏅';

    await msg.reply(`
👤 *PROFIL PLAYER*

━━━━ *Info* ━━━━
📱 ID: ${playerName}
${rankEmoji} Rank: #${position || 'Belum ada'}

━━━━ *Statistik* ━━━━
🏆 Total Poin: ${stats.totalPoints || 0}
🎮 Game Menang: ${stats.gamesWon || 0}
🎰 Gacha Roll: ${stats.gachaRolls || 0}
💎 Item Langka: ${stats.rareItems || 0}

━━━━ *Achievement* ━━━━
${stats.gamesWon >= 10 ? '✅' : '⬜'} Master Gamer (10 menang)
${stats.totalPoints >= 100 ? '✅' : '⬜'} Kolektor Poin (100 poin)
${stats.gachaRolls >= 7 ? '✅' : '⬜'} Gacha Addict (7 roll)
${stats.rareItems >= 1 ? '✅' : '⬜'} Lucky One (1 rare+)
    `.trim());

  } catch (err) {
    console.error('Error in profile:', err);
    await msg.reply('❌ Gagal mengambil profil');
  }
}

/**
 * Handle !birthday command - Set or check birthdays
 */
async function handleBirthday(msg, chat) {
  try {
    const parts = msg.body.split(' ');
    const playerId = msg.author || msg.from;

    // !birthday - show today's birthdays
    if (parts.length === 1) {
      const birthdays = await db.getTodayBirthdays(chat.id._serialized);
      
      if (!birthdays || birthdays.length === 0) {
        await msg.reply('🎂 Tidak ada yang berulang tahun hari ini.\n\nGunakan !birthday set DD-MM untuk set tanggal lahir Anda.');
        return;
      }

      let message = '🎂 *ULANG TAHUN HARI INI!*\n\n';
      birthdays.forEach(b => {
        message += `🎉 *${b.player_name}*\n`;
      });
      message += '\n🎊 Selamat ulang tahun!';
      
      await chat.sendMessage(message);
      return;
    }

    // !birthday set DD-MM
    if (parts[1] === 'set' && parts[2]) {
      const dateStr = parts[2];
      const match = dateStr.match(/^(\d{1,2})-(\d{1,2})$/);
      
      if (!match) {
        await msg.reply('❌ Format salah!\n\nGunakan: !birthday set DD-MM\nContoh: !birthday set 25-12');
        return;
      }

      const day = parseInt(match[1]);
      const month = parseInt(match[2]);

      if (day < 1 || day > 31 || month < 1 || month > 12) {
        await msg.reply('❌ Tanggal tidak valid!');
        return;
      }

      const playerName = playerId.split('@')[0].replace(/[^0-9]/g, '') || 'Player';
      
      await db.setBirthday(chat.id._serialized, playerId, playerName, day, month);
      
      const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      
      await msg.reply(`✅ Tanggal lahir berhasil disimpan!\n\n🎂 ${day} ${monthNames[month]}\n\nBot akan mengucapkan selamat ulang tahun di hari spesialmu!`);
      return;
    }

    // !birthday list
    if (parts[1] === 'list') {
      const birthdays = await db.getAllBirthdays(chat.id._serialized);
      
      if (!birthdays || birthdays.length === 0) {
        await msg.reply('📭 Belum ada yang set tanggal lahir.\n\nGunakan !birthday set DD-MM');
        return;
      }

      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
                          'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      
      let list = '*🎂 DAFTAR ULANG TAHUN*\n\n';
      birthdays.forEach(b => {
        list += `📅 ${b.birth_day} ${monthNames[b.birth_month]} - *${b.player_name}*\n`;
      });
      
      await msg.reply(list);
      return;
    }

    await msg.reply('❌ Format salah!\n\nPenggunaan:\n• !birthday - Lihat ulang tahun hari ini\n• !birthday set DD-MM - Set tanggal lahir\n• !birthday list - Lihat semua tanggal lahir');

  } catch (err) {
    console.error('Error in birthday:', err);
    await msg.reply('❌ Terjadi error');
  }
}

module.exports = {
  handleGacha,
  handleProfile,
  handleBirthday
};
