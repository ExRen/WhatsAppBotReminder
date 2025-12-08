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

// ================== GAME FUNCTIONS ==================

/**
 * Update or create leaderboard entry
 */
async function updateLeaderboard(chatId, playerId, playerName, gameType, points) {
  try {
    // Get current score
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('chat_id', chatId)
      .eq('player_id', playerId)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('leaderboard')
        .update({
          player_name: playerName,
          total_points: existing.total_points + points,
          games_won: existing.games_won + 1,
          last_played: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Create new entry
      const { error } = await supabase
        .from('leaderboard')
        .insert({
          chat_id: chatId,
          player_id: playerId,
          player_name: playerName,
          total_points: points,
          games_won: 1,
          last_played: new Date().toISOString()
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (err) {
    console.error('❌ Error updating leaderboard:', err);
    return { success: false, error: err };
  }
}

/**
 * Get leaderboard for a chat
 */
async function getLeaderboard(chatId) {
  try {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('chat_id', chatId)
      .order('total_points', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error fetching leaderboard:', err);
    return [];
  }
}

// ================== MENTION FUNCTIONS ==================

/**
 * Save a mention
 */
async function saveMention(mentionData) {
  try {
    const { error } = await supabase
      .from('mentions')
      .insert({
        ...mentionData,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error saving mention:', err);
    return { success: false, error: err };
  }
}

/**
 * Get unread mentions for a user
 */
async function getUnreadMentions(chatId, userId) {
  try {
    const { data, error } = await supabase
      .from('mentions')
      .select('*')
      .eq('chat_id', chatId)
      .eq('mentioned_user', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error fetching mentions:', err);
    return [];
  }
}

/**
 * Mark mentions as read
 */
async function markMentionsRead(chatId, userId) {
  try {
    const { error } = await supabase
      .from('mentions')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .eq('mentioned_user', userId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error marking mentions read:', err);
    return { success: false };
  }
}

// ================== DIGEST FUNCTIONS ==================

/**
 * Track a chat message for digest
 */
async function trackChatMessage(messageData) {
  try {
    const { error } = await supabase
      .from('chat_activity')
      .insert({
        ...messageData,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    // Silently fail to not disrupt chat
    return { success: false };
  }
}

/**
 * Get chat digest for last N hours
 */
async function getChatDigest(chatId, hours = 24) {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('chat_activity')
      .select('*')
      .eq('chat_id', chatId)
      .gte('created_at', since);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { totalMessages: 0 };
    }

    // Calculate stats
    const senderCounts = {};
    let mediaCount = 0;
    let linkCount = 0;
    const hourCounts = {};

    data.forEach(msg => {
      // Count by sender
      if (!senderCounts[msg.sender_name]) {
        senderCounts[msg.sender_name] = 0;
      }
      senderCounts[msg.sender_name]++;

      // Count media
      if (msg.has_media) mediaCount++;
      if (msg.has_link) linkCount++;

      // Count by hour
      if (!hourCounts[msg.hour]) hourCounts[msg.hour] = 0;
      hourCounts[msg.hour]++;
    });

    // Top chatters
    const topChatters = Object.entries(senderCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Peak hour
    let peakHour = 0;
    let peakCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > peakCount) {
        peakHour = parseInt(hour);
        peakCount = count;
      }
    });

    return {
      totalMessages: data.length,
      activeParticipants: Object.keys(senderCounts).length,
      mediaCount,
      linkCount,
      topChatters,
      peakHour
    };
  } catch (err) {
    console.error('❌ Error getting chat digest:', err);
    return { totalMessages: 0 };
  }
}

// ================== FUN FUNCTIONS ==================

/**
 * Check gacha cooldown (once per day)
 */
async function checkGachaCooldown(chatId, playerId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('gacha_history')
      .select('*')
      .eq('chat_id', chatId)
      .eq('player_id', playerId)
      .gte('created_at', today)
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return { allowed: false, nextRollTime: tomorrow.toISOString() };
    }

    return { allowed: true };
  } catch (err) {
    console.error('❌ Error checking gacha cooldown:', err);
    return { allowed: true }; // Allow on error
  }
}

/**
 * Save gacha result
 */
async function saveGachaResult(chatId, playerId, playerName, item) {
  try {
    const { error } = await supabase
      .from('gacha_history')
      .insert({
        chat_id: chatId,
        player_id: playerId,
        player_name: playerName,
        item_name: item.name,
        item_rarity: item.rarity,
        points_earned: item.points,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error saving gacha result:', err);
    return { success: false };
  }
}

/**
 * Get user stats for profile
 */
async function getUserStats(chatId, playerId) {
  try {
    // Get leaderboard stats
    const { data: leaderboard } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('chat_id', chatId)
      .eq('player_id', playerId)
      .single();

    // Get gacha stats
    const { data: gachaHistory } = await supabase
      .from('gacha_history')
      .select('*')
      .eq('chat_id', chatId)
      .eq('player_id', playerId);

    const gachaRolls = gachaHistory?.length || 0;
    const rareItems = gachaHistory?.filter(g => 
      g.item_rarity === 'rare' || g.item_rarity === 'legendary'
    ).length || 0;

    return {
      totalPoints: leaderboard?.total_points || 0,
      gamesWon: leaderboard?.games_won || 0,
      gachaRolls,
      rareItems
    };
  } catch (err) {
    console.error('❌ Error getting user stats:', err);
    return { totalPoints: 0, gamesWon: 0, gachaRolls: 0, rareItems: 0 };
  }
}

/**
 * Set user birthday
 */
async function setBirthday(chatId, playerId, playerName, day, month) {
  try {
    const { error } = await supabase
      .from('birthdays')
      .upsert({
        chat_id: chatId,
        player_id: playerId,
        player_name: playerName,
        birth_day: day,
        birth_month: month,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chat_id,player_id' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error setting birthday:', err);
    return { success: false };
  }
}

/**
 * Get today's birthdays
 */
async function getTodayBirthdays(chatId) {
  try {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;

    const { data, error } = await supabase
      .from('birthdays')
      .select('*')
      .eq('chat_id', chatId)
      .eq('birth_day', day)
      .eq('birth_month', month);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error getting today birthdays:', err);
    return [];
  }
}

/**
 * Get all birthdays
 */
async function getAllBirthdays(chatId) {
  try {
    const { data, error } = await supabase
      .from('birthdays')
      .select('*')
      .eq('chat_id', chatId)
      .order('birth_month', { ascending: true })
      .order('birth_day', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error getting all birthdays:', err);
    return [];
  }
}

// ================== UTILITY FUNCTIONS ==================

/**
 * Get group rules
 */
async function getGroupRules(chatId) {
  try {
    const { data, error } = await supabase
      .from('group_rules')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err) {
    console.error('❌ Error getting rules:', err);
    return null;
  }
}

/**
 * Set group rules
 */
async function setGroupRules(chatId, content) {
  try {
    const { error } = await supabase
      .from('group_rules')
      .upsert({
        chat_id: chatId,
        content: content,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chat_id' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error setting rules:', err);
    return { success: false };
  }
}

/**
 * Delete group rules
 */
async function deleteGroupRules(chatId) {
  try {
    const { error } = await supabase
      .from('group_rules')
      .delete()
      .eq('chat_id', chatId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error deleting rules:', err);
    return { success: false };
  }
}

/**
 * Get active countdowns
 */
async function getActiveCountdowns(chatId) {
  try {
    const { data, error } = await supabase
      .from('countdowns')
      .select('*')
      .eq('chat_id', chatId)
      .gte('target_date', new Date().toISOString())
      .order('target_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error getting countdowns:', err);
    return [];
  }
}

/**
 * Create countdown
 */
async function createCountdown(countdownData) {
  try {
    const { error } = await supabase
      .from('countdowns')
      .insert({
        ...countdownData,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error creating countdown:', err);
    return { success: false };
  }
}

/**
 * Get notes list
 */
async function getNotes(chatId) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('name, updated_at')
      .eq('chat_id', chatId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ Error getting notes:', err);
    return [];
  }
}

/**
 * Get single note
 */
async function getNote(chatId, name) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('chat_id', chatId)
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err) {
    console.error('❌ Error getting note:', err);
    return null;
  }
}

/**
 * Save note
 */
async function saveNote(chatId, name, content, createdBy) {
  try {
    const { error } = await supabase
      .from('notes')
      .upsert({
        chat_id: chatId,
        name: name,
        content: content,
        created_by: createdBy,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chat_id,name' });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error saving note:', err);
    return { success: false };
  }
}

/**
 * Delete note
 */
async function deleteNote(chatId, name) {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('chat_id', chatId)
      .eq('name', name);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('❌ Error deleting note:', err);
    return { success: false };
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
  getReminderStats,
  // Game functions
  updateLeaderboard,
  getLeaderboard,
  // Mention functions
  saveMention,
  getUnreadMentions,
  markMentionsRead,
  // Digest functions
  trackChatMessage,
  getChatDigest,
  // Fun functions
  checkGachaCooldown,
  saveGachaResult,
  getUserStats,
  setBirthday,
  getTodayBirthdays,
  getAllBirthdays,
  // Utility functions
  getGroupRules,
  setGroupRules,
  deleteGroupRules,
  getActiveCountdowns,
  createCountdown,
  getNotes,
  getNote,
  saveNote,
  deleteNote
};
