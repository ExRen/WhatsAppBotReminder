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

3️⃣ *!listreminders*
   Lihat semua reminder aktif

4️⃣ *!editreminder [id] [field] [value]*
   Edit reminder
   Field: time, message, days
   Contoh: !editreminder 5 time 10:30

5️⃣ *!pausereminder [id]*
   Pause reminder sementara

6️⃣ *!resumereminder [id]*
   Lanjutkan reminder yang dipause

7️⃣ *!deletereminder [id]*
   Hapus reminder

━━━━ *📝 TEMPLATE* ━━━━

8️⃣ *!savetemplate [nama] [pesan]*
   Simpan template pesan
   Contoh: !savetemplate pagi Selamat pagi semuanya!

9️⃣ *!usetemplate [nama]*
   Gunakan template tersimpan

🔟 *!listtemplates*
   Lihat daftar template

1️⃣1️⃣ *!deletetemplate [nama]*
   Hapus template

━━━━ *📢 LAINNYA* ━━━━

▪️ *!tagall [pesan]* - Mention semua member
▪️ *!stats* - Lihat statistik reminder
▪️ *!help* - Tampilkan bantuan ini
▪️ *!debug* - Info debugging

⚠️ *Catatan:* Hanya admin grup yang bisa menggunakan command
  `.trim();

  await msg.reply(helpText);
}

module.exports = handleHelp;
