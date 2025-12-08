-- Supabase Migration Script for WhatsAppBotReminder v2.1
-- Games & Digest Features
-- Run this in Supabase SQL Editor

-- ================================
-- 1. LEADERBOARD TABLE
-- ================================

CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  last_played TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, player_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_chat_id ON leaderboard(chat_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(total_points DESC);

-- ================================
-- 2. MENTIONS TABLE
-- ================================

CREATE TABLE IF NOT EXISTS mentions (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  mentioned_user TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  message_preview TEXT,
  message_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mentions_chat_user ON mentions(chat_id, mentioned_user);
CREATE INDEX IF NOT EXISTS idx_mentions_unread ON mentions(is_read) WHERE is_read = FALSE;

-- ================================
-- 3. CHAT ACTIVITY TABLE (for digest)
-- ================================

CREATE TABLE IF NOT EXISTS chat_activity (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  message_type TEXT DEFAULT 'chat',
  has_media BOOLEAN DEFAULT FALSE,
  has_link BOOLEAN DEFAULT FALSE,
  hour INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_activity_chat_id ON chat_activity(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_activity_created ON chat_activity(created_at);

-- Partition by date for performance (optional, for high volume)
-- CREATE INDEX IF NOT EXISTS idx_chat_activity_date ON chat_activity(DATE(created_at));

-- ================================
-- 4. ROW LEVEL SECURITY
-- ================================

-- Leaderboard RLS
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on leaderboard" ON leaderboard;
CREATE POLICY "Allow all on leaderboard" ON leaderboard FOR ALL USING (true) WITH CHECK (true);

-- Mentions RLS
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on mentions" ON mentions;
CREATE POLICY "Allow all on mentions" ON mentions FOR ALL USING (true) WITH CHECK (true);

-- Chat Activity RLS
ALTER TABLE chat_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on chat_activity" ON chat_activity;
CREATE POLICY "Allow all on chat_activity" ON chat_activity FOR ALL USING (true) WITH CHECK (true);

-- ================================
-- 5. CLEANUP OLD DATA (Optional)
-- ================================

-- Function to delete old chat_activity (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_chat_activity()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_activity WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Function to delete old mentions (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_mentions()
RETURNS void AS $$
BEGIN
  DELETE FROM mentions WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ================================
-- NOTES
-- ================================
-- 
-- Tabel yang dibuat:
-- 1. leaderboard - Skor game per pemain
-- 2. mentions - Tracking mention yang terlewat
-- 3. chat_activity - Aktivitas chat untuk digest
--
-- Untuk membersihkan data lama, jalankan:
-- SELECT cleanup_old_chat_activity();
-- SELECT cleanup_old_mentions();
