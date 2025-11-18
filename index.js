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
    args: ['--no-sandbox']
  }
});

// Store active cron jobs
const activeCrons = new Map();

// Generate QR Code
client.on('qr', (qr) => {
  console.log('Scan QR code ini:');
  qrcode.generate(qr, { small: true });
});

// Bot ready
client.on('ready', async () => {
  console.log('Bot siap!');
  await saveSession();
  await loadReminders();
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
    
    if (error) console.error('Error saving session:', error);
  } catch (err) {
    console.error('Error:', err);
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

    console.log(`Loaded ${reminders?.length || 0} reminders`);
  } catch (err) {
    console.error('Error loading reminders:', err);
  }
}

// Schedule reminder with cron
function scheduleReminder(reminder) {
  const cronExpression = buildCronExpression(reminder);
  
  const job = cron.schedule(cronExpression, async () => {
    await sendReminder(reminder);
  });

  activeCrons.set(reminder.id, job);
  console.log(`Scheduled reminder ${reminder.id}: ${cronExpression}`);
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

// Send reminder with invisible mentions
async function sendReminder(reminder) {
  try {
    const chat = await client.getChatById(reminder.chat_id);
    const participants = chat.participants.map(p => p.id._serialized);
    
    // Create invisible mentions
    const mentions = participants.map(id => ({
      id: id,
      type: 'contact'
    }));

    await chat.sendMessage(reminder.message, {
      mentions: participants
    });

    console.log(`Reminder sent to ${reminder.chat_id}`);
  } catch (err) {
    console.error('Error sending reminder:', err);
  }
}

// Handle commands
client.on('message', async (msg) => {
  const chat = await msg.getChat();
  
  // Only process commands from group admin
  if (!chat.isGroup) return;
  
  const sender = await msg.getContact();
  const participant = chat.participants.find(p => p.id._serialized === sender.id._serialized);
  
  if (!participant?.isAdmin && !participant?.isSuperAdmin) return;

  // Command: !addreminder
  if (msg.body.startsWith('!addreminder')) {
    await handleAddReminder(msg, chat);
  }
  
  // Command: !listreminders
  if (msg.body === '!listreminders') {
    await handleListReminders(msg, chat);
  }
  
  // Command: !deletereminder
  if (msg.body.startsWith('!deletereminder')) {
    await handleDeleteReminder(msg, chat);
  }
});

// Add new reminder
async function handleAddReminder(msg, chat) {
  try {
    // Format: !addreminder [days] [time] [message]
    // Example: !addreminder 1,2,3,4,5 09:00 Selamat pagi semua!
    const parts = msg.body.split(' ');
    
    if (parts.length < 4) {
      await msg.reply('Format: !addreminder [hari] [jam] [pesan]\nContoh: !addreminder 1,2,3,4,5 09:00 Selamat pagi!');
      return;
    }

    const days = parts[1].split(',').map(Number);
    const time = parts[2];
    const message = parts.slice(3).join(' ');

    // Validate
    if (days.some(d => d < 0 || d > 6)) {
      await msg.reply('Hari harus 0-6 (0=Minggu, 1=Senin, ..., 6=Sabtu)');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(time)) {
      await msg.reply('Format jam harus HH:MM (contoh: 09:00)');
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
    
    await msg.reply(`✅ Reminder berhasil ditambahkan!\nHari: ${dayList}\nJam: ${time}\nPesan: ${message}`);
  } catch (err) {
    console.error('Error adding reminder:', err);
    await msg.reply('❌ Gagal menambahkan reminder');
  }
}

// List all reminders
async function handleListReminders(msg, chat) {
  try {
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('chat_id', chat.id._serialized)
      .eq('active', true);

    if (error) throw error;

    if (!reminders || reminders.length === 0) {
      await msg.reply('Tidak ada reminder aktif');
      return;
    }

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    let list = '*📋 Daftar Reminder:*\n\n';
    
    reminders.forEach((r, i) => {
      const days = r.days.map(d => dayNames[d]).join(', ');
      list += `${i + 1}. ID: ${r.id}\n`;
      list += `   Hari: ${days}\n`;
      list += `   Jam: ${r.time}\n`;
      list += `   Pesan: ${r.message}\n\n`;
    });

    await msg.reply(list);
  } catch (err) {
    console.error('Error listing reminders:', err);
    await msg.reply('❌ Gagal mengambil daftar reminder');
  }
}

// Delete reminder
async function handleDeleteReminder(msg, chat) {
  try {
    // Format: !deletereminder [id]
    const parts = msg.body.split(' ');
    
    if (parts.length !== 2) {
      await msg.reply('Format: !deletereminder [id]');
      return;
    }

    const reminderId = parseInt(parts[1]);

    // Stop cron job
    if (activeCrons.has(reminderId)) {
      activeCrons.get(reminderId).stop();
      activeCrons.delete(reminderId);
    }

    // Delete from database
    const { error } = await supabase
      .from('reminders')
      .update({ active: false })
      .eq('id', reminderId)
      .eq('chat_id', chat.id._serialized);

    if (error) throw error;

    await msg.reply('✅ Reminder berhasil dihapus');
  } catch (err) {
    console.error('Error deleting reminder:', err);
    await msg.reply('❌ Gagal menghapus reminder');
  }
}

// Initialize bot
client.initialize();