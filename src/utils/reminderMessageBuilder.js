// src/utils/reminderMessageBuilder.js
// Build formatted reminder messages for WhatsApp group

/**
 * Build reminder message based on daily report status
 * @param {string[]} missingNames - Array of names who haven't filled daily log
 * @param {number} presentCount - Number of participants who were present
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} Formatted message
 */
function buildReminderMessage(missingNames, presentCount, date) {
  const formattedDate = formatDateIndonesian(date);
  
  // Case 1: No one present today
  if (presentCount === 0) {
    return `
📊 *LAPORAN HARIAN MAGANG*
📅 Tanggal: ${formattedDate}

ℹ️ Tidak ada peserta yang hadir hari ini.

Semoga istirahatnya menyenangkan! 🌟
    `.trim();
  }

  // Case 2: Everyone filled their report
  if (missingNames.length === 0) {
    return `
🎉 *LAPORAN HARIAN MAGANG*
📅 Tanggal: ${formattedDate}

✅ *SEMUA PESERTA SUDAH MENGISI LAPORAN!*

Terima kasih atas kedisiplinannya! 👏
Total hadir: ${presentCount} orang
    `.trim();
  }

  // Case 3: Some people haven't filled their report
  const nameList = missingNames.map((name, i) => `${i + 1}. ${name}`).join('\n');
  
  return `
⚠️ *REMINDER LAPORAN HARIAN*
📅 Tanggal: ${formattedDate}

❌ *YANG BELUM MENGISI LAPORAN:*
${nameList}

📝 Segera isi laporan harian kalian ya!
⏰ Deadline: Hari ini

Total hadir: ${presentCount} orang
Belum mengisi: ${missingNames.length} orang
  `.trim();
}

/**
 * Format date to Indonesian format
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {string} Formatted date like "Rabu, 29 Januari 2026"
 */
function formatDateIndonesian(date) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const d = new Date(date);
  const dayName = days[d.getDay()];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${dayName}, ${day} ${month} ${year}`;
}

/**
 * Build weekly summary message
 * @param {Object} weeklyData - Data from checkWeeklyReportStatus
 * @param {string} dateRange - Formatted date range string
 * @returns {string} Formatted weekly report message
 */
function buildWeeklySummaryMessage(weeklyData, dateRange) {
  let message = `📊 *RINGKASAN MINGGUAN LAPORAN*\n`;
  message += `📅 Periode: ${dateRange}\n\n`;

  const participants = Object.values(weeklyData);
  
  participants.forEach(p => {
    message += `👤 *${p.name}*\n`;
    
    // Day-by-day status
    const dayStatuses = Object.entries(p.days).map(([date, status]) => {
      const shortDate = date.split('-').slice(1).reverse().join('/'); // 30/01
      let icon = '⚪'; // Not present
      
      if (status.isForbidden) {
        icon = '🔒'; // Permission denied
      } else if (status.isPresent) {
        icon = status.hasDailyLog ? '🟢' : '🔴';
      } else if (status.error) {
        icon = '⚠️';
      }
      
      return `${shortDate}: ${icon}`;
    });

    message += dayStatuses.join('  ') + '\n\n';
  });

  message += `Keterangan:\n`;
  message += `🟢 Hadir & Isi Log\n`;
  message += `🔴 Hadir tapi Belum Isi\n`;
  message += `⚪ Tidak Hadir/Libur\n`;
  message += `🔒 Locked (Token hanya Anda)\n`;
  message += `⚠️ API Error`;

  return message.trim();
}

module.exports = {
  buildReminderMessage,
  buildWeeklySummaryMessage,
  formatDateIndonesian
};
