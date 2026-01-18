// src/utils/clientManager.js
// Centralized client state management with safe message sending

class ClientManager {
  constructor() {
    this.isReady = false;
    this.client = null;
    this.retryAttempts = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  /**
   * Set the WhatsApp client instance
   */
  setClient(client) {
    this.client = client;
  }

  /**
   * Mark client as ready
   */
  setReady(ready) {
    this.isReady = ready;
    console.log(`🔒 Client is now ${ready ? 'ready' : 'not ready'}`);
  }

  /**
   * Check if client is ready for operations
   */
  isClientReady() {
    return this.isReady && this.client !== null;
  }

  /**
   * Wait for client to be ready with timeout
   */
  async waitForReady(timeoutMs = 10000) {
    const startTime = Date.now();
    while (!this.isReady) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Client not ready timeout');
      }
      await this.sleep(500);
    }
    return true;
  }

  /**
   * Helper sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safe message sending with retry logic
   * This handles "Execution context was destroyed" errors
   */
  async safeSendMessage(chat, message, options = {}) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // Check if client is ready before sending
        if (!this.isClientReady()) {
          console.log(`⏳ Waiting for client to be ready (attempt ${attempt}/${this.retryAttempts})...`);
          await this.waitForReady(5000);
        }

        // Attempt to send message
        const result = await chat.sendMessage(message, options);
        return result;
      } catch (err) {
        lastError = err;
        const errorMessage = err.message || '';

        // Check for known Puppeteer/context errors
        if (
          errorMessage.includes('Execution context was destroyed') ||
          errorMessage.includes('Protocol error') ||
          errorMessage.includes('Target closed') ||
          errorMessage.includes('Session closed') ||
          errorMessage.includes('Navigation')
        ) {
          console.log(`⚠️ Context error on attempt ${attempt}/${this.retryAttempts}: ${errorMessage}`);

          // Mark client as not ready to trigger reconnect if needed
          if (attempt >= 2) {
            this.setReady(false);
          }

          // Wait before retry with exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        } else {
          // Non-recoverable error, throw immediately
          throw err;
        }
      }
    }

    // All retries exhausted
    console.error(`❌ Failed to send message after ${this.retryAttempts} attempts`);
    throw lastError;
  }

  /**
   * Safe reply with retry logic
   * Drop-in replacement for msg.reply()
   */
  async safeReply(msg, content, options = {}) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        // Check if client is ready before sending
        if (!this.isClientReady()) {
          console.log(`⏳ Waiting for client (reply attempt ${attempt}/${this.retryAttempts})...`);
          await this.waitForReady(5000);
        }

        // Attempt to reply
        const result = await msg.reply(content, undefined, options);
        return result;
      } catch (err) {
        lastError = err;
        const errorMessage = err.message || '';

        // Check for known Puppeteer/context errors
        if (this.isRecoverableError(errorMessage)) {
          console.log(`⚠️ Reply context error on attempt ${attempt}/${this.retryAttempts}: ${errorMessage.substring(0, 100)}`);

          // Mark client as not ready to trigger reconnect if needed
          if (attempt >= 2) {
            this.setReady(false);
          }

          // Wait before retry with exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        } else {
          // Non-recoverable error, throw immediately
          throw err;
        }
      }
    }

    // All retries exhausted - just log, don't throw to avoid crashing
    console.error(`❌ Failed to reply after ${this.retryAttempts} attempts`);
    return null;
  }

  /**
   * Check if error is recoverable (Puppeteer context errors)
   */
  isRecoverableError(errorMessage) {
    const recoverablePatterns = [
      'Execution context was destroyed',
      'Protocol error',
      'Target closed',
      'Session closed',
      'Navigation',
      'markedUnread',
      'Cannot read properties of undefined'
    ];
    return recoverablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Safe get chat with retry
   */
  async safeGetChat(chatId) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        if (!this.isClientReady()) {
          await this.waitForReady(5000);
        }

        const chat = await this.client.getChatById(chatId);
        return chat;
      } catch (err) {
        lastError = err;
        const errorMessage = err.message || '';

        if (
          errorMessage.includes('Execution context was destroyed') ||
          errorMessage.includes('Protocol error') ||
          errorMessage.includes('Target closed')
        ) {
          console.log(`⚠️ Error getting chat on attempt ${attempt}: ${errorMessage}`);
          await this.sleep(this.retryDelay * attempt);
        } else {
          throw err;
        }
      }
    }

    throw lastError;
  }

  /**
   * Perform health check on client
   */
  async healthCheck() {
    try {
      if (!this.client) {
        return { healthy: false, reason: 'No client instance' };
      }

      // Try to get client info
      const state = await this.client.getState();
      
      if (state === 'CONNECTED') {
        return { healthy: true, state };
      } else {
        return { healthy: false, state, reason: `State is ${state}` };
      }
    } catch (err) {
      return { healthy: false, reason: err.message };
    }
  }
}

// Singleton instance
const clientManager = new ClientManager();

module.exports = clientManager;
