// src/commands/help.js

async function handleHelp(msg) {
  const helpText = `
📚 *DAFTAR COMMAND BOT*

━━━━ *📌 REMINDER* ━━━━

1️⃣ *!addreminder [hari] [jam] [pesan]*
   Tambah reminder berulang
   Contoh: !addreminder 1,2,3,4,5 09:00 Selamat pagi!
   
   Kode hari:
   0 = Minggu | 1 = Senin | 2 = Selasa
   3 = Rabu | 4 = Kamis | 5 = Jumat | 6 = Sabtu

2️⃣ *!remindonce [tanggal] [jam] [pesan]*
   Reminder sekali jalan
   Contoh: !remindonce 2024-12-25 09:00 Selamat Natal!

3️⃣ *!listreminders* - Lihat reminder aktif
4️⃣ *!editreminder [id] [field] [value]* - Edit reminder
5️⃣ *!pausereminder [id]* - Pause sementara
6️⃣ *!resumereminder [id]* - Lanjutkan
7️⃣ *!deletereminder [id]* - Hapus reminder

━━━━ *📝 TEMPLATE* ━━━━

▪️ *!savetemplate [nama] [pesan]* - Simpan template
▪️ *!usetemplate [nama]* - Gunakan template
▪️ *!listtemplates* - Lihat daftar
▪️ *!deletetemplate [nama]* - Hapus template

━━━━ *🎮 MINI GAMES* ━━━━

▪️ *!tebak* - Tebak angka (1-100)
▪️ *!tebak [angka]* - Tebak jawabannya
▪️ *!trivia* - Quiz random
▪️ *!jawab [jawaban]* - Jawab trivia
▪️ *!spin [item1, item2, ...]* - Random picker
▪️ *!leaderboard* - Skor game

━━━━ *📊 DIGEST* ━━━━

▪️ *!mentions* - Lihat mention terlewat
▪️ *!digest* - Summary chat 24 jam

━━━━ *📢 LAINNYA* ━━━━

▪️ *!tagall [pesan]* - Mention semua member
▪️ *!stats* - Statistik reminder
▪️ *!help* - Bantuan ini
▪️ *!debug* - Info debugging

⚠️ *Catatan:* Hanya admin grup yang bisa menggunakan command
  `.trim();

  await msg.reply(helpText);
}

module.exports = handleHelp;

