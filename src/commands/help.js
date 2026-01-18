// src/commands/help.js
const clientManager = require('../utils/clientManager');

async function handleHelp(msg) {
  const helpText = `
📚 *DAFTAR COMMAND BOT*

━━━━ *📌 REMINDER* ━━━━
▪️ *!addreminder [hari] [jam] [pesan]*
▪️ *!remindonce [tanggal] [jam] [pesan]*
▪️ *!listreminders* | *!editreminder* | *!deletereminder*
▪️ *!pausereminder* | *!resumereminder*

━━━━ *📝 TEMPLATE* ━━━━
▪️ *!savetemplate* | *!usetemplate* | *!listtemplates*

━━━━ *🎮 GAMES* ━━━━
▪️ *!tebak* - Tebak angka (+10 poin)
▪️ *!trivia* - Quiz (+15 poin)
▪️ *!jawab [jawaban]* - Jawab trivia
▪️ *!spin [a, b, c]* - Random picker
▪️ *!leaderboard* - Skor game

━━━━ *🎉 FUN* ━━━━
▪️ *!gacha* - Gacha harian
▪️ *!profile* - Profil & achievement
▪️ *!birthday set DD-MM* - Set ulang tahun
▪️ *!birthday list* - Lihat daftar

━━━━ *🔧 UTILITY* ━━━━
▪️ *!splitbill [jumlah]* - Bagi tagihan
▪️ *!rules* - Aturan grup
▪️ *!countdown YYYY-MM-DD [nama]* - Countdown
▪️ *!note save [nama] [isi]* - Simpan catatan
▪️ *!note [nama]* - Lihat catatan

━━━━ *📊 DIGEST* ━━━━
▪️ *!mentions* - Mention terlewat
▪️ *!digest* - Summary 24 jam

━━━━ *📢 LAINNYA* ━━━━
▪️ *!tagall* | *!stats* | *!help* | *!debug*

_Total: 28+ commands_
  `.trim();

  await clientManager.safeReply(msg, helpText);
}

module.exports = handleHelp;
