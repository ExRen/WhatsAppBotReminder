// index.js - Main Entry Point
require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Import services
const db = require('./src/services/database');
const scheduler = require('./src/services/scheduler');

// Import utilities
const RateLimiter = require('./src/utils/rateLimiter');
const clientManager = require('./src/utils/clientManager');

// Import command handlers
const {
  handleHelp,
  handleAddReminder,
  handleRemindOnce,
  handleListReminders,
  handleEditReminder,
  handlePauseReminder,
  handleResumeReminder,
  handleDeleteReminder,
  handleTagAll,
  handleSaveTemplate,
  handleUseTemplate,
  handleListTemplates,
  handleDeleteTemplate,
  handleStats,
  // Games
  handleTebak,
  handleTrivia,
  handleJawab,
  handleSpin,
  handleLeaderboard,
  // Digest
  handleMentions,
  handleDigest,
  trackMention,
  trackMessage,
  // Fun
  handleGacha,
  handleProfile,
  handleBirthday,
  // Utility
  handleSplitBill,
  handleRules,
  handleCountdown,
  handleNote
} = require('./src/commands');

// Initialize rate limiter (3 seconds cooldown)
const rateLimiter = new RateLimiter(3000);

// Initialize WhatsApp client
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

// Reconnection settings
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;
let healthCheckInterval = null;

// ================== EVENT HANDLERS ==================

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
  reconnectAttempts = 0; // Reset on successful connection
  
  // Mark client as ready in clientManager
  clientManager.setClient(client);
  clientManager.setReady(true);

  // Add delay before database operations
  setTimeout(async () => {
    try {
      await db.saveSession();
      await scheduler.loadAllReminders(client);
    } catch (err) {
      console.error('❌ Error during initialization:', err.message);
    }
  }, 2000);
  
  // Start health check interval (every 5 minutes)
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  healthCheckInterval = setInterval(async () => {
    const health = await clientManager.healthCheck();
    if (health.healthy) {
      console.log('✅ Health check: Client is healthy');
    } else {
      console.warn(`⚠️ Health check failed: ${health.reason}`);
      // Attempt to reinitialize if unhealthy
      if (!clientManager.isClientReady()) {
        console.log('🔄 Triggering reconnection due to unhealthy state...');
        clientManager.setReady(false);
      }
    }
  }, 5 * 60 * 1000); // 5 minutes
});

// Authentication failure
client.on('auth_failure', (msg) => {
  console.error('❌ Authentication gagal:', msg);
});

// Disconnected - with auto-reconnect
client.on('disconnected', async (reason) => {
  console.log('⚠️ Bot terputus:', reason);
  
  // Mark client as not ready immediately
  clientManager.setReady(false);
  
  // Clear health check interval
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1); // Exponential backoff
    console.log(`🔄 Mencoba reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) dalam ${delay/1000}s...`);

    setTimeout(async () => {
      try {
        await client.initialize();
      } catch (err) {
        console.error('❌ Reconnect failed:', err.message);
      }
    }, delay);
  } else {
    console.error('❌ Maksimum reconnect attempts tercapai. Silakan restart bot manual.');
  }
});

// Client state change (important for tracking Puppeteer issues)
client.on('change_state', (state) => {
  console.log(`📊 Client state changed: ${state}`);
  
  if (state === 'CONNECTED') {
    clientManager.setReady(true);
  } else if (state === 'UNPAIRED' || state === 'UNLAUNCHED') {
    clientManager.setReady(false);
  }
});

// Loading screen (WhatsApp Web is refreshing)
client.on('loading_screen', (percent, message) => {
  console.log(`⏳ Loading: ${percent}% - ${message}`);
  
  // Mark as not ready during loading
  if (percent < 100) {
    clientManager.setReady(false);
  }
});

// ================== MESSAGE HANDLER ==================

client.on('message', async (msg) => {
  try {
    // Skip if not a command
    if (!msg.body.startsWith('!')) return;

    // Get user ID for rate limiting
    const userId = msg.author || msg.from;

    // Check rate limit
    if (!rateLimiter.isAllowed(userId)) {
      const remaining = rateLimiter.getRemainingTime(userId);
      console.log(`⏳ Rate limited: ${userId} (${remaining}s remaining)`);
      return; // Silently ignore
    }

    // Log for debugging
    console.log(`📨 Pesan diterima: ${msg.body}`);
    console.log(`📱 From: ${msg.from}`);
    console.log(`👤 Author: ${msg.author}`);

    const chat = await msg.getChat();

    // Only process commands from group
    if (!chat.isGroup) {
      console.log('⚠️ Bukan pesan grup, skip');
      return;
    }

    console.log(`👥 Total participants: ${chat.participants.length}`);
    console.log(`📋 Chat ID: ${chat.id._serialized}`);

    // Check admin permission
    const bypassAdminCheck = process.env.BYPASS_ADMIN_CHECK === 'true';
    let isAdmin = false;

    if (bypassAdminCheck) {
      console.log('✅ BYPASS MODE - Admin check disabled');
      isAdmin = true;
    } else {
      // Find participant
      let participant = null;
      let senderId = msg.author;

      if (senderId) {
        participant = chat.participants.find(p => p.id._serialized === senderId);
      }

      // If fromMe, use bot's ID
      if (!participant && msg.fromMe) {
        senderId = client.info.wid._serialized;
        participant = chat.participants.find(p => p.id._serialized === senderId);
        if (!participant) {
          participant = { isAdmin: true, isSuperAdmin: true };
        }
      }

      if (!participant) {
        console.log('❌ Participant tidak ditemukan');
        await msg.reply('❌ Tidak dapat memverifikasi identitas Anda.\n\nSolusi:\n1. Pastikan Anda mengirim dari nomor yang terdaftar di grup\n2. Atau minta developer untuk enable BYPASS_ADMIN_CHECK=true di .env');
        return;
      }

      isAdmin = participant.isAdmin || participant.isSuperAdmin;

      if (!isAdmin) {
        console.log('⚠️ Bukan admin, skip command');
        await msg.reply('❌ Command hanya bisa digunakan oleh admin grup');
        return;
      }
    }

    // ================== COMMAND ROUTING ==================

    const command = msg.body.split(' ')[0].toLowerCase();

    switch (command) {
      // Help
      case '!help':
        console.log('ℹ️ Executing help...');
        await handleHelp(msg);
        break;

      // Reminder CRUD
      case '!addreminder':
        console.log('➕ Executing addreminder...');
        await handleAddReminder(msg, chat, client);
        break;

      case '!remindonce':
        console.log('📅 Executing remindonce...');
        await handleRemindOnce(msg, chat, client);
        break;

      case '!listreminders':
        console.log('📋 Executing listreminders...');
        await handleListReminders(msg, chat);
        break;

      case '!editreminder':
        console.log('✏️ Executing editreminder...');
        await handleEditReminder(msg, chat, client);
        break;

      case '!pausereminder':
        console.log('⏸️ Executing pausereminder...');
        await handlePauseReminder(msg, chat);
        break;

      case '!resumereminder':
        console.log('▶️ Executing resumereminder...');
        await handleResumeReminder(msg, chat, client);
        break;

      case '!deletereminder':
        console.log('🗑️ Executing deletereminder...');
        await handleDeleteReminder(msg, chat);
        break;

      // Templates
      case '!savetemplate':
        console.log('💾 Executing savetemplate...');
        await handleSaveTemplate(msg, chat);
        break;

      case '!usetemplate':
        console.log('📝 Executing usetemplate...');
        await handleUseTemplate(msg, chat);
        break;

      case '!listtemplates':
        console.log('📋 Executing listtemplates...');
        await handleListTemplates(msg, chat);
        break;

      case '!deletetemplate':
        console.log('🗑️ Executing deletetemplate...');
        await handleDeleteTemplate(msg, chat);
        break;

      // Others
      case '!tagall':
        console.log('👥 Executing tagall...');
        await handleTagAll(msg, chat);
        break;

      case '!stats':
        console.log('📊 Executing stats...');
        await handleStats(msg, chat);
        break;

      case '!debug':
        console.log('🔍 Executing debug...');
        const debugInfo = `
🔍 *DEBUG INFO*

📱 From: ${msg.from}
👤 Author: ${msg.author || 'N/A'}
🤖 From Me: ${msg.fromMe}
👥 Participants: ${chat.participants.length}
🔓 Bypass Mode: ${bypassAdminCheck ? 'ON' : 'OFF'}
⏰ Active Jobs: ${scheduler.getActiveJobsCount()}

Participant Details:
${chat.participants.slice(0, 10).map((p, i) => `${i + 1}. ${p.id._serialized}\n   Admin: ${p.isAdmin}`).join('\n')}
${chat.participants.length > 10 ? `\n... dan ${chat.participants.length - 10} lainnya` : ''}
        `.trim();

        await msg.reply(debugInfo);
        break;

      // Games
      case '!tebak':
        console.log('🎲 Executing tebak...');
        await handleTebak(msg, chat);
        break;

      case '!trivia':
        console.log('🧠 Executing trivia...');
        await handleTrivia(msg, chat);
        break;

      case '!jawab':
        console.log('💬 Executing jawab...');
        await handleJawab(msg, chat);
        break;

      case '!spin':
        console.log('🎰 Executing spin...');
        await handleSpin(msg, chat);
        break;

      case '!leaderboard':
        console.log('🏆 Executing leaderboard...');
        await handleLeaderboard(msg, chat);
        break;

      // Digest
      case '!mentions':
        console.log('📢 Executing mentions...');
        await handleMentions(msg, chat);
        break;

      case '!digest':
        console.log('📊 Executing digest...');
        await handleDigest(msg, chat);
        break;

      // Fun
      case '!gacha':
        console.log('🎰 Executing gacha...');
        await handleGacha(msg, chat);
        break;

      case '!profile':
        console.log('👤 Executing profile...');
        await handleProfile(msg, chat);
        break;

      case '!birthday':
        console.log('🎂 Executing birthday...');
        await handleBirthday(msg, chat);
        break;

      // Utility
      case '!splitbill':
        console.log('💰 Executing splitbill...');
        await handleSplitBill(msg, chat);
        break;

      case '!rules':
        console.log('📜 Executing rules...');
        await handleRules(msg, chat);
        break;

      case '!countdown':
        console.log('⏰ Executing countdown...');
        await handleCountdown(msg, chat);
        break;

      case '!note':
        console.log('📝 Executing note...');
        await handleNote(msg, chat);
        break;

      default:
        // Unknown command - do nothing
        break;
    }

    // Track mentions and messages for digest (non-blocking)
    if (chat.isGroup) {
      trackMention(msg, chat).catch(() => {});
      trackMessage(msg, chat).catch(() => {});
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

// ================== PROCESS HANDLERS ==================

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit, let it continue
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await client.destroy();
    console.log('✅ Client destroyed');
  } catch (err) {
    console.error('Error destroying client:', err);
  }
  process.exit(0);
});

// ================== INITIALIZE ==================

console.log('🚀 Starting WhatsApp Bot...');
console.log('📁 Modular structure loaded');
client.initialize();