// src/commands/index.js
// Export all command handlers

const handleHelp = require('./help');
const handleAddReminder = require('./addReminder');
const handleRemindOnce = require('./remindOnce');
const handleListReminders = require('./listReminders');
const handleEditReminder = require('./editReminder');
const { handlePauseReminder, handleResumeReminder } = require('./pauseReminder');
const handleDeleteReminder = require('./deleteReminder');
const handleTagAll = require('./tagAll');
const { handleSaveTemplate, handleUseTemplate, handleListTemplates, handleDeleteTemplate } = require('./templates');
const handleStats = require('./stats');
const { handleTebak, handleTrivia, handleJawab, handleSpin, handleLeaderboard } = require('./games');
const { handleMentions, handleDigest, trackMention, trackMessage } = require('./digest');

module.exports = {
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
  trackMessage
};
