// src/commands/stats.js
const db = require('../services/database');
const scheduler = require('../services/scheduler');
const clientManager = require('../utils/clientManager');

async function handleStats(msg, chat) {
  try {
    const stats = await db.getReminderStats(chat.id._serialized);
    const activeJobs = scheduler.getActiveJobsCount();
    const templates = await db.getTemplates(chat.id._serialized);

    const statsMessage = `
📊 *STATISTIK REMINDER*

━━━━ *Reminder* ━━━━
✅ Aktif: ${stats.active}
⏸️ Paused: ${stats.paused}
📦 Total (termasuk dihapus): ${stats.total}

━━━━ *Template* ━━━━
📝 Template tersimpan: ${templates.length}

━━━━ *Sistem* ━━━━
⚙️ Scheduled jobs: ${activeJobs}

━━━━━━━━━━━━━━━━━
    `.trim();

    await clientManager.safeReply(msg, statsMessage);
  } catch (err) {
    console.error('Error fetching stats:', err);
    await clientManager.safeReply(msg, '❌ Gagal mengambil statistik');
  }
}

module.exports = handleStats;
