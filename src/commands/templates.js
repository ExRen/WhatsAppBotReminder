// src/commands/templates.js
const db = require('../services/database');

async function handleSaveTemplate(msg, chat) {
  try {
    // Format: !savetemplate [name] [message]
    const parts = msg.body.split(' ');

    if (parts.length < 3) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!savetemplate [nama] [pesan]\n\nContoh:\n!savetemplate pagi Selamat pagi semuanya! Semangat beraktivitas!');
      return;
    }

    const name = parts[1].toLowerCase();
    const message = parts.slice(2).join(' ');

    // Validate name
    if (!/^[a-z0-9_]+$/.test(name)) {
      await msg.reply('❌ Nama template hanya boleh huruf kecil, angka, dan underscore!\n\nContoh: pagi, meeting_harian, reminder_1');
      return;
    }

    if (name.length > 30) {
      await msg.reply('❌ Nama template terlalu panjang! Maksimal 30 karakter.');
      return;
    }

    if (message.length > 1000) {
      await msg.reply('❌ Pesan terlalu panjang! Maksimal 1000 karakter.');
      return;
    }

    // Save template
    const result = await db.saveTemplate(
      chat.id._serialized,
      name,
      message,
      msg.author || msg.from
    );

    if (!result.success) {
      throw result.error;
    }

    await msg.reply(`✅ *Template "${name}" berhasil disimpan!*\n\nGunakan !usetemplate ${name} untuk menggunakannya.`);
  } catch (err) {
    console.error('Error saving template:', err);
    await msg.reply('❌ Gagal menyimpan template. Coba lagi!');
  }
}

async function handleUseTemplate(msg, chat) {
  try {
    const parts = msg.body.split(' ');

    if (parts.length !== 2) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!usetemplate [nama]\n\nContoh:\n!usetemplate pagi');
      return;
    }

    const name = parts[1].toLowerCase();

    // Get template
    const template = await db.getTemplate(chat.id._serialized, name);

    if (!template) {
      await msg.reply(`❌ Template "${name}" tidak ditemukan!\n\nGunakan !listtemplates untuk melihat daftar template.`);
      return;
    }

    const participants = chat.participants.map(p => p.id._serialized);

    // Send template message
    await chat.sendMessage(template.message, {
      mentions: participants
    });

    console.log(`✅ Template "${name}" used in ${chat.id._serialized}`);
  } catch (err) {
    console.error('Error using template:', err);
    await msg.reply('❌ Gagal menggunakan template. Coba lagi!');
  }
}

async function handleListTemplates(msg, chat) {
  try {
    const templates = await db.getTemplates(chat.id._serialized);

    if (!templates || templates.length === 0) {
      await msg.reply('📭 Tidak ada template tersimpan di grup ini.\n\nGunakan !savetemplate [nama] [pesan] untuk membuat template.');
      return;
    }

    let list = '*📝 DAFTAR TEMPLATE*\n\n';

    templates.forEach((t, i) => {
      list += `${i + 1}. *${t.name}*\n`;
      list += `   💬 ${t.message.substring(0, 40)}${t.message.length > 40 ? '...' : ''}\n\n`;
    });

    list += '━━━━━━━━━━━━━━━━━\n';
    list += `Total: ${templates.length} template\n\n`;
    list += '_Gunakan !usetemplate [nama] untuk menggunakan_';

    await msg.reply(list);
  } catch (err) {
    console.error('Error listing templates:', err);
    await msg.reply('❌ Gagal mengambil daftar template');
  }
}

async function handleDeleteTemplate(msg, chat) {
  try {
    const parts = msg.body.split(' ');

    if (parts.length !== 2) {
      await msg.reply('❌ Format salah!\n\n✅ Format yang benar:\n!deletetemplate [nama]\n\nContoh:\n!deletetemplate pagi');
      return;
    }

    const name = parts[1].toLowerCase();

    // Check if template exists
    const template = await db.getTemplate(chat.id._serialized, name);

    if (!template) {
      await msg.reply(`❌ Template "${name}" tidak ditemukan!`);
      return;
    }

    // Delete template
    const result = await db.deleteTemplate(chat.id._serialized, name);

    if (!result.success) {
      throw result.error;
    }

    await msg.reply(`✅ Template "${name}" berhasil dihapus!`);
  } catch (err) {
    console.error('Error deleting template:', err);
    await msg.reply('❌ Gagal menghapus template. Coba lagi!');
  }
}

module.exports = {
  handleSaveTemplate,
  handleUseTemplate,
  handleListTemplates,
  handleDeleteTemplate
};
