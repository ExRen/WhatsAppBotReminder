// index.js
require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'bot-session'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  },
  qrMaxRetries: 5
});

// Store active cron jobs
const activeCrons = new Map();

// Generate QR Code
client.on('qr', (qr) => {
  console.log('='.repeat(50));
  console.log('SCAN QR CODE INI:');
  console.log('='.repeat(50));
  qrcode.generate(qr, { small: true });
  console.log('='.repeat(50));
});

// Bot ready
client.on('ready', async () => {
  console.log('✅ Bot siap digunakan!');
  console.log('📱 Koneksi WhatsApp berhasil');
  
  // Add delay before database operations
  setTimeout(async () => {
    await saveSession();
    await loadReminders();
  }, 2000);
});

// Authentication failure
client.on('auth_failure', (msg) => {
  console.error('❌ Authentication gagal:', msg);
});

// Disconnected
client.on('disconnected', (reason) => {
  console.log('⚠️ Bot terputus:', reason);
});

// Save session to Supabase
async function saveSession() {
  try {
    const { error } = await supabase
      .from('sessions')
      .upsert({
        id: 'bot-session',
        status: 'active',
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ Error saving session:', error);
    } else {
      console.log('💾 Session tersimpan ke database');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

// Load reminders from database and schedule them
async function loadReminders() {
  try {
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('active', true);

    if (error) throw error;

    reminders?.forEach(reminder => {
      scheduleReminder(reminder);
    });

    console.log(`📅 Loaded ${reminders?.length || 0} reminders`);
  } catch (err) {
    console.error('❌ Error loading reminders:', err);
  }
}

// Schedule reminder with cron
function scheduleReminder(reminder) {
  const cronExpression = buildCronExpression(reminder);
  
  const job = cron.schedule(cronExpression, async () => {
    await sendReminder(reminder);
  }, {
    timezone: "Asia/Jakarta"
  });

  activeCrons.set(reminder.id, job);
  console.log(`⏰ Scheduled reminder ${reminder.id}: ${cronExpression}`);
}

// Build cron expression from reminder config
function buildCronExpression(reminder) {
  // reminder.days: array [1,2,3,4,5] untuk Senin-Jumat
  // reminder.time: "09:00"
  const [hour, minute] = reminder.time.split(':');
  const days = reminder.days.join(',');
  
  // Format: minute hour * * day-of-week
  return `${minute} ${hour} * * ${days}`;
}

// Send reminder with mentions
async function sendReminder(reminder) {
  try {
    const chat = await client.getChatById(reminder.chat_id);
    const participants = chat.participants.map(p => p.id._serialized);
    
    // Create message with proper emoji encoding
    const reminderMessage = `
🔔━━━━━━━━━━━━━━━━━━🔔
⚠️ *REMINDER PENTING!* ⚠️
🔔━━━━━━━━━━━━━━━━━━🔔

${reminder.message}

⏰ Waktu: ${reminder.time}
📢 PERHATIAN SEMUA!

🔔━━━━━━━━━━━━━━━━━━🔔
    `.trim();

    // Send the reminder with mentions
    await chat.sendMessage(reminderMessage, {
      mentions: participants
    });

    console.log(`✅ Reminder sent to ${reminder.chat_id}`);
  } catch (err) {
    console.error('❌ Error sending reminder:', err);
  }
}

// Handle commands
client.on('message', async (msg) => {
  try {
    // Skip if not a command
    if (!msg.body.startsWith('!')) return;
    
    // Log untuk debugging
    console.log(`📨 Pesan diterima: ${msg.body}`);
    console.log(`📱 From: ${msg.from}`);
    console.log(`👤 Author: ${msg.author}`);
    console.log(`🤖 From Me: ${msg.fromMe}`);
    
    const chat = await msg.getChat();
    
    // Only process commands from group
    if (!chat.isGroup) {
      console.log('⚠️ Bukan pesan grup, skip');
      return;
    }
    
    console.log(`👥 Total participants: ${chat.participants.length}`);
    console.log(`📋 Chat ID: ${chat.id._serialized}`);
    
    // CRITICAL FIX: For linked devices, we need different approach
    let participant = null;
    let isAdmin = false;
    
    // Check if bypass is enabled
    const bypassAdminCheck = process.env.BYPASS_ADMIN_CHECK === 'true';
    
    if (bypassAdminCheck) {
      console.log('✅ BYPASS MODE - Admin check disabled');
      isAdmin = true;
      participant = { isAdmin: true, isSuperAdmin: true };
    } else {
      // Try to find participant
      let senderId = null;
      
      // Method 1: Try author
      if (msg.author) {
        senderId = msg.author;
        participant = chat.participants.find(p => p.id._serialized === senderId);
        console.log(`Method 1 - Author: ${senderId}, Found: ${!!participant}`);
      }
      
      // Method 2: If fromMe, use bot's ID
      if (!participant && msg.fromMe) {
        senderId = client.info.wid._serialized;
        participant = chat.participants.find(p => p.id._serialized === senderId);
        console.log(`Method 2 - Bot ID: ${senderId}, Found: ${!!participant}`);
        
        if (!participant) {
          participant = { isAdmin: true, isSuperAdmin: true };
        }
      }
      
      // Method 3: Extract from group ID format (6282371416026-1543125536@g.us)
      if (!participant && msg.from && msg.from.includes('@g.us')) {
        const groupPhone = msg.from.split('-')[0];
        const possibleId = `${groupPhone}@c.us`;
        participant = chat.participants.find(p => p.id._serialized === possibleId);
        console.log(`Method 3 - From group ID: ${possibleId}, Found: ${!!participant}`);
      }
      
      if (!participant) {
        console.log('❌ Participant tidak ditemukan');
        console.log('Available participants:');
        chat.participants.forEach(p => {
          console.log(`  - ${p.id._serialized} (Admin: ${p.isAdmin})`);
        });
        
        await msg.reply('❌ Tidak dapat memverifikasi identitas Anda.\n\nSolusi:\n1. Pastikan Anda mengirim dari nomor yang terdaftar di grup\n2. Atau minta developer untuk enable BYPASS_ADMIN_CHECK=true di .env');
        return;
      }
      
      isAdmin = participant.isAdmin || participant.isSuperAdmin;
      console.log(`✅ Found participant`);
      console.log(`🔑 Is Admin: ${isAdmin}`);
      
      if (!isAdmin) {
        console.log('⚠️ Bukan admin, skip command');
        await msg.reply('❌ Command hanya bisa digunakan oleh admin grup');
        return;
      }
    }

    // Execute commands
    if (msg.body.startsWith('!addreminder')) {
      console.log('➕ Executing addreminder...');
      await handleAddReminder(msg, chat);
    }
    else if (msg.body === '!listreminders') {
      console.log('📋 Executing listreminders...');
      await handleListReminders(msg, chat);
    }
    else if (msg.body.startsWith('!deletereminder')) {
      console.log('🗑️ Executing deletereminder...');
      await handleDeleteReminder(msg, chat);
    }
    else if (msg.body.startsWith('!tagall')) {
      console.log('👥 Executing tagall...');
      await handleTagAll(msg, chat);
    }
    else if (msg.body === '!help') {
      console.log('ℹ️ Executing help...');
      await handleHelp(msg);
    }
    else if (msg.body === '!debug') {
      console.log('🔍 Executing debug...');
      const debugInfo = `
🔍 *DEBUG INFO*

📱 From: ${msg.from}
👤 Author: ${msg.author || 'N/A'}
🤖 From Me: ${msg.fromMe}
👥 Participants: ${chat.participants.length}
🔓 Bypass Mode: ${bypassAdminCheck ? 'ON' : 'OFF'}

Participant Details:
${chat.participants.map((p, i) => `${i+1}. ${p.id._serialized}\n   Admin: ${p.isAdmin}`).join('\n')}
      `.trim();
      
      await msg.reply(debugInfo);
    }
  } catch (err) {
    console.error('❌ Error handling message:', err);
    try {
      await msg.reply('❌ Terjadi error saat memproses command');
    } catch (replyErr) {
      console.error('Failed to send error message:', replyErr);
    }
  }
});

// Help command
async function handleHelp(msg) {
  const helpText = `
📚 *DAFTAR COMMAND BOT*

1️⃣ *!addreminder [hari] [jam] [pesan]*
   Tambah reminder baru
   Contoh: !addreminder 1,2,3,4,5 09:00 Selamat pagi!
   
   Kode hari:
   0 = Minggu
   1 = Senin
   2 = Selasa
   3 = Rabu
   4 = Kamis
   5 = Jumat
   6 = Sabtu

2️⃣ *!listreminders*
   Lihat semua reminder aktif

3️⃣ *!deletereminder [id]*
   Hapus reminder berdasarkan ID
   Contoh: !deletereminder 5

4️⃣ *!tagall [pesan]*
   Mention semua member grup
   Contoh: !tagall Pengumuman penting!

5️⃣ *!help*
   Tampilkan bantuan ini

⚠️ *Catatan:* Hanya admin grup yang bisa menggunakan command
  `.trim();

  await msg.reply(helpText);
}

// Add new reminder
async function handleAddReminder(msg, chat) {
  try {
    // Format: !addreminder [days] [time] [message]
    const parts = msg.body.split(' ');
    
    if (parts.length < 4) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!addreminder [hari] [jam] [pesan]\n\nContoh:\n!addreminder 1,2,3,4,5 09:00 Selamat pagi semua!');
      return;
    }

    const days = parts[1].split(',').map(Number);
    const time = parts[2];
    const message = parts.slice(3).join(' ');

    // Validate days
    if (days.some(d => d < 0 || d > 6 || isNaN(d))) {
      await msg.reply('❌ Hari harus berupa angka 0-6\n\n0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu');
      return;
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(time)) {
      await msg.reply('❌ Format jam harus HH:MM\nContoh: 09:00, 14:30, 20:15');
      return;
    }

    // Validate time values
    const [hour, minute] = time.split(':').map(Number);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      await msg.reply('❌ Jam tidak valid!\nJam: 00-23, Menit: 00-59');
      return;
    }

    // Save to database
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        chat_id: chat.id._serialized,
        days: days,
        time: time,
        message: message,
        active: true,
        created_by: msg.author || msg.from
      })
      .select()
      .single();

    if (error) throw error;

    // Schedule the reminder
    scheduleReminder(data);

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayList = days.map(d => dayNames[d]).join(', ');
    
    await msg.reply(`✅ *Reminder berhasil ditambahkan!*\n\n📅 Hari: ${dayList}\n⏰ Jam: ${time}\n💬 Pesan: ${message}\n🆔 ID: ${data.id}`);
  } catch (err) {
    console.error('Error adding reminder:', err);
    await msg.reply('❌ Gagal menambahkan reminder. Coba lagi!');
  }
}

// List all reminders
async function handleListReminders(msg, chat) {
  try {
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('chat_id', chat.id._serialized)
      .eq('active', true)
      .order('id', { ascending: true });

    if (error) throw error;

    if (!reminders || reminders.length === 0) {
      await msg.reply('📭 Tidak ada reminder aktif di grup ini');
      return;
    }

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    let list = '*📋 DAFTAR REMINDER AKTIF*\n\n';
    
    reminders.forEach((r, i) => {
      const days = r.days.map(d => dayNames[d]).join(', ');
      list += `${i + 1}. 🆔 ID: *${r.id}*\n`;
      list += `   📅 Hari: ${days}\n`;
      list += `   ⏰ Jam: ${r.time}\n`;
      list += `   💬 Pesan: ${r.message}\n\n`;
    });
    
    list += '━━━━━━━━━━━━━━━━━\n';
    list += `Total: ${reminders.length} reminder`;

    await msg.reply(list);
  } catch (err) {
    console.error('Error listing reminders:', err);
    await msg.reply('❌ Gagal mengambil daftar reminder');
  }
}

// Delete reminder
async function handleDeleteReminder(msg, chat) {
  try {
    const parts = msg.body.split(' ');
    
    if (parts.length !== 2) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!deletereminder [id]\n\nContoh:\n!deletereminder 5');
      return;
    }

    const reminderId = parseInt(parts[1]);
    
    if (isNaN(reminderId)) {
      await msg.reply('❌ ID harus berupa angka!');
      return;
    }

    // Stop cron job
    if (activeCrons.has(reminderId)) {
      activeCrons.get(reminderId).stop();
      activeCrons.delete(reminderId);
      console.log(`🛑 Stopped cron job for reminder ${reminderId}`);
    }

    // Delete from database
    const { error } = await supabase
      .from('reminders')
      .update({ active: false })
      .eq('id', reminderId)
      .eq('chat_id', chat.id._serialized);

    if (error) throw error;

    await msg.reply(`✅ Reminder ID ${reminderId} berhasil dihapus!`);
  } catch (err) {
    console.error('Error deleting reminder:', err);
    await msg.reply('❌ Gagal menghapus reminder. Pastikan ID benar!');
  }
}

// Tag all members manually
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

👥 Tag: Semua member grup
⏰ ${new Date().toLocaleString('id-ID', { 
  hour: '2-digit', 
  minute: '2-digit',
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})}

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

// Initialize bot
console.log('🚀 Starting WhatsApp Bot...');

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit, let it continue
});

client.initialize();