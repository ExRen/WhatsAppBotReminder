// src/services/database.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Save bot session status
 */
async function saveSession() {
  try {
    const { error } = await supabase
      .from('sessions')
      .upsert({
        id: 'bot-session',
        status: 'active',
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log('💾 Session tersimpan ke database');
    return true;
  } catch (err) {
    console.error('❌ Error saving session:', err);
    return false;
  }
}

/**
 * Get all active reminders
 */
async function getActiveReminders() {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('active', true);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error fetching reminders:', err);
    return [];
  }
}

/**
 * Get reminders for a specific chat
 */
async function getChatReminders(chatId) {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('chat_id', chatId)
      .eq('active', true)
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error fetching chat reminders:', err);
    return [];
  }
}

/**
 * Get a single reminder by ID
 */
async function getReminderById(id) {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ Error fetching reminder:', err);
    return null;
  }
}

/**
 * Create a new reminder
 */
async function createReminder(reminderData) {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminderData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('❌ Error creating reminder:', err);
    return { success: false, error: err };
  }
}

/**
 * Update a reminder
 */
async function updateReminder(id, updateData) {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('❌ Error updating reminder:', err);
    return { success: false, error: err };
  }
}

/**
 * Soft delete a reminder (set active = false)
 */
async function deleteReminder(id, chatId) {
  try {
    const { error } = await supabase
      .from('reminders')
      .update({ active: false })
      .eq('id', id)
      .eq('chat_id', chatId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error deleting reminder:', err);
    return { success: false, error: err };
  }
}

/**
 * Check if reminder is still active
 */
async function isReminderActive(id) {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('active')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data?.active === true;
  } catch (err) {
    console.error('❌ Error checking reminder status:', err);
    return false;
  }
}

/**
 * Save message template
 */
async function saveTemplate(chatId, name, message, createdBy) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .upsert({
        chat_id: chatId,
        name: name.toLowerCase(),
        message: message,
        created_by: createdBy,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('❌ Error saving template:', err);
    return { success: false, error: err };
  }
}

/**
 * Get template by name
 */
async function getTemplate(chatId, name) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('chat_id', chatId)
      .eq('name', name.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err) {
    console.error('❌ Error fetching template:', err);
    return null;
  }
}

/**
 * Get all templates for a chat
 */
async function getTemplates(chatId) {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('chat_id', chatId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error fetching templates:', err);
    return [];
  }
}

/**
 * Delete template
 */
async function deleteTemplate(chatId, name) {
  try {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('chat_id', chatId)
      .eq('name', name.toLowerCase());

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error deleting template:', err);
    return { success: false, error: err };
  }
}

/**
 * Get reminder statistics
 */
async function getReminderStats(chatId) {
  try {
    const { data: active, error: activeErr } = await supabase
      .from('reminders')
      .select('id', { count: 'exact' })
      .eq('chat_id', chatId)
      .eq('active', true);

    const { data: paused, error: pausedErr } = await supabase
      .from('reminders')
      .select('id', { count: 'exact' })
      .eq('chat_id', chatId)
      .eq('active', true)
      .eq('paused', true);

    const { data: total, error: totalErr } = await supabase
      .from('reminders')
      .select('id', { count: 'exact' })
      .eq('chat_id', chatId);

    if (activeErr || pausedErr || totalErr) throw activeErr || pausedErr || totalErr;

    return {
      active: active?.length || 0,
      paused: paused?.length || 0,
      total: total?.length || 0
    };
  } catch (err) {
    console.error('❌ Error fetching stats:', err);
    return { active: 0, paused: 0, total: 0 };
  }
}

module.exports = {
  supabase,
  saveSession,
  getActiveReminders,
  getChatReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  isReminderActive,
  saveTemplate,
  getTemplate,
  getTemplates,
  deleteTemplate,
  getReminderStats
};
