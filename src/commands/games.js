// src/commands/games.js
const gameState = require('../services/gameState');
const db = require('../services/database');

/**
 * Handle !tebak command - Start or play number guessing game
 */
async function handleTebak(msg, chat) {
  try {
    const parts = msg.body.split(' ');
    const playerId = msg.author || msg.from;
    // Safe player name extraction without getContact
    const playerName = playerId.split('@')[0].replace(/[^0-9]/g, '') || 'Player';

    // If just "!tebak", start new game
    if (parts.length === 1) {
      // Check if game already active
      if (gameState.isGameActive(chat.id._serialized, 'tebak')) {
        await msg.reply('🎮 Game tebak angka sudah berjalan!\n\nKetik !tebak [angka] untuk menebak.\nContoh: !tebak 50');
        return;
      }

      const game = gameState.startTebakAngka(chat.id._serialized);
      
      await msg.reply(`
🎲 *GAME TEBAK ANGKA DIMULAI!*

Aku sudah memilih angka antara 1-100.
Coba tebak dalam ${game.maxAttempts} kesempatan!

💡 *Cara bermain:*
Ketik !tebak [angka]
Contoh: !tebak 50

🏁 Siapa tercepat menebak dengan benar menang!
      `.trim());
      return;
    }

    // Player is making a guess
    const guess = parseInt(parts[1]);
    
    if (isNaN(guess) || guess < 1 || guess > 100) {
      await msg.reply('❌ Masukkan angka antara 1-100!\n\nContoh: !tebak 50');
      return;
    }

    const result = gameState.guessTebakAngka(chat.id._serialized, playerId, playerName, guess);

    if (result.error) {
      await msg.reply(`❌ ${result.error}\n\nKetik !tebak untuk mulai game baru.`);
      return;
    }

    if (result.won) {
      // Update leaderboard
      await db.updateLeaderboard(chat.id._serialized, result.winnerId, playerName, 'tebak', 10);
      
      await chat.sendMessage(`
🎉 *SELAMAT!* 🎉

👤 Pemenang: *${result.winner}*
🔢 Angka: *${result.number}*
🎯 Total tebakan: ${result.attempts}x
🏆 +10 poin!

Ketik !tebak untuk main lagi!
      `.trim());
      return;
    }

    if (result.lost) {
      await chat.sendMessage(`
😢 *GAME OVER!*

Kesempatan habis! 
🔢 Jawabannya adalah: *${result.number}*

Ketik !tebak untuk main lagi!
      `.trim());
      return;
    }

    // Still playing
    await msg.reply(`
${guess} → Angkanya *${result.hint}*!

⏳ Sisa kesempatan: ${result.attemptsLeft}
    `.trim());

  } catch (err) {
    console.error('Error in tebak game:', err);
    await msg.reply('❌ Terjadi error dalam game');
  }
}

/**
 * Handle !trivia command - Start trivia quiz
 */
async function handleTrivia(msg, chat) {
  try {
    // Check if trivia already active
    if (gameState.isGameActive(chat.id._serialized, 'trivia')) {
      const game = gameState.getActiveTrivia(chat.id._serialized);
      await msg.reply(`
🧠 *TRIVIA SEDANG BERJALAN!*

📝 ${game.question}

💡 Jawab dengan: !jawab [jawaban]
⏱️ Waktu: 60 detik
      `.trim());
      return;
    }

    const question = gameState.startTrivia(chat.id._serialized);

    await chat.sendMessage(`
🧠 *TRIVIA TIME!*

📁 Kategori: *${question.category}*
━━━━━━━━━━━━━━━━━━

📝 ${question.question}

━━━━━━━━━━━━━━━━━━
💡 Jawab dengan: *!jawab [jawaban]*
⏱️ Waktu: 60 detik
🏆 Poin: +15
    `.trim());

    // Auto-end after 60 seconds
    setTimeout(async () => {
      const result = gameState.endTrivia(chat.id._serialized);
      if (result) {
        try {
          await chat.sendMessage(`
⏰ *WAKTU HABIS!*

Tidak ada yang menjawab dengan benar.
✅ Jawaban: *${result.answer}*

Ketik !trivia untuk pertanyaan baru!
          `.trim());
        } catch (e) {
          console.error('Error sending timeout message:', e);
        }
      }
    }, 60000);

  } catch (err) {
    console.error('Error in trivia:', err);
    await msg.reply('❌ Terjadi error dalam trivia');
  }
}

/**
 * Handle !jawab command - Answer trivia
 */
async function handleJawab(msg, chat) {
  try {
    const answer = msg.body.replace('!jawab', '').trim();
    
    if (!answer) {
      await msg.reply('❌ Format: !jawab [jawaban]\n\nContoh: !jawab Jakarta');
      return;
    }

    const playerId = msg.author || msg.from;
    // Safe player name extraction without getContact
    const playerName = playerId.split('@')[0].replace(/[^0-9]/g, '') || 'Player';

    const result = gameState.answerTrivia(chat.id._serialized, playerId, playerName, answer);

    if (result.error) {
      await msg.reply(`❌ ${result.error}\n\nKetik !trivia untuk mulai trivia baru.`);
      return;
    }

    if (result.timeout) {
      await msg.reply(`⏰ Waktu sudah habis!\n\n✅ Jawaban: *${result.correctAnswer}*`);
      return;
    }

    if (result.correct) {
      // Update leaderboard
      await db.updateLeaderboard(chat.id._serialized, result.winnerId, playerName, 'trivia', 15);
      
      const timeSeconds = (result.timeMs / 1000).toFixed(1);
      
      await chat.sendMessage(`
🎉 *BENAR!* 🎉

👤 Pemenang: *${result.winner}*
✅ Jawaban: *${result.answer}*
⏱️ Waktu: ${timeSeconds} detik
🏆 +15 poin!

Ketik !trivia untuk pertanyaan baru!
      `.trim());
      return;
    }

    // Wrong answer
    await msg.reply('❌ Jawaban salah! Coba lagi...');

  } catch (err) {
    console.error('Error in jawab:', err);
    await msg.reply('❌ Terjadi error');
  }
}

/**
 * Handle !spin command - Random picker
 */
async function handleSpin(msg, chat) {
  try {
    const text = msg.body.replace('!spin', '').trim();

    // If no items, pick random participant
    if (!text) {
      const participants = chat.participants.filter(p => !p.isAdmin);
      
      if (participants.length === 0) {
        await msg.reply('❌ Tidak ada member untuk dipilih!');
        return;
      }

      const result = gameState.spin(participants);
      const selectedId = result.selected.id._serialized;
      
      // Get contact name safely
      let selectedName = selectedId.split('@')[0].replace(/[^0-9]/g, '') || 'Member';

      await chat.sendMessage(`
🎰 *SPIN THE WHEEL!*

━━━━━━━━━━━━━━━━━━
🎯 Terpilih: *${selectedName}*
━━━━━━━━━━━━━━━━━━

📊 Dari ${result.total} member
      `.trim(), {
        mentions: [selectedId]
      });
      return;
    }

    // Parse comma-separated items
    const items = text.split(',').map(i => i.trim()).filter(i => i);
    
    if (items.length < 2) {
      await msg.reply('❌ Minimal 2 pilihan!\n\nFormat: !spin pilihan1, pilihan2, pilihan3\n\nAtau ketik !spin saja untuk pilih random member.');
      return;
    }

    const result = gameState.spin(items);

    // Animation effect
    const spinEmojis = ['🎰', '🎲', '🎯', '🎪', '🎡'];
    
    await chat.sendMessage(`
${spinEmojis[Math.floor(Math.random() * spinEmojis.length)]} *SPIN THE WHEEL!*

━━━━━━━━━━━━━━━━━━
🎯 Terpilih: *${result.selected}*
━━━━━━━━━━━━━━━━━━

📊 Dari ${result.total} pilihan:
${items.map((item, i) => `${i === result.index ? '👉' : '  '} ${item}`).join('\n')}
    `.trim());

  } catch (err) {
    console.error('Error in spin:', err);
    await msg.reply('❌ Terjadi error dalam spin');
  }
}

/**
 * Handle !leaderboard command - Show game leaderboard
 */
async function handleLeaderboard(msg, chat) {
  try {
    const scores = await db.getLeaderboard(chat.id._serialized);

    if (!scores || scores.length === 0) {
      await msg.reply('📊 Belum ada skor di grup ini.\n\nMain game untuk mengumpulkan poin!\n• !tebak - Tebak angka (+10 poin)\n• !trivia - Quiz (+15 poin)');
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    let board = '*🏆 LEADERBOARD GAME*\n\n';

    scores.slice(0, 10).forEach((score, i) => {
      const medal = i < 3 ? medals[i] : `${i + 1}.`;
      board += `${medal} *${score.player_name}*\n`;
      board += `   📊 ${score.total_points} poin | 🎮 ${score.games_won} menang\n\n`;
    });

    board += '━━━━━━━━━━━━━━━━━━\n';
    board += `_Total ${scores.length} pemain_`;

    await msg.reply(board);

  } catch (err) {
    console.error('Error in leaderboard:', err);
    await msg.reply('❌ Gagal mengambil leaderboard');
  }
}

module.exports = {
  handleTebak,
  handleTrivia,
  handleJawab,
  handleSpin,
  handleLeaderboard
};
