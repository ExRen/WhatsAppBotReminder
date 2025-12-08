-- Supabase Migration Script for WhatsAppBotReminder v2.2
-- Fun & Utility Features
-- Run this in Supabase SQL Editor

-- ================================
-- 1. GACHA HISTORY TABLE
-- ================================

CREATE TABLE IF NOT EXISTS gacha_history (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT,
  item_name TEXT NOT NULL,
  item_rarity TEXT NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gacha_chat_player ON gacha_history(chat_id, player_id);
CREATE INDEX IF NOT EXISTS idx_gacha_created ON gacha_history(created_at);

-- ================================
-- 2. BIRTHDAYS TABLE
-- ================================

CREATE TABLE IF NOT EXISTS birthdays (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT,
  birth_day INTEGER NOT NULL,
  birth_month INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, player_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_birthdays_chat ON birthdays(chat_id);
CREATE INDEX IF NOT EXISTS idx_birthdays_date ON birthdays(birth_month, birth_day);

-- ================================
-- 3. GROUP RULES TABLE
-- ================================

CREATE TABLE IF NOT EXISTS group_rules (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 4. COUNTDOWNS TABLE
-- ================================

CREATE TABLE IF NOT EXISTS countdowns (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_date TIMESTAMPTZ NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_countdowns_chat ON countdowns(chat_id);
CREATE INDEX IF NOT EXISTS idx_countdowns_target ON countdowns(target_date);

-- ================================
-- 5. NOTES TABLE
-- ================================

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notes_chat ON notes(chat_id);
CREATE INDEX IF NOT EXISTS idx_notes_name ON notes(name);

-- ================================
-- 6. ROW LEVEL SECURITY
-- ================================

-- Gacha RLS
ALTER TABLE gacha_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on gacha_history" ON gacha_history;
CREATE POLICY "Allow all on gacha_history" ON gacha_history FOR ALL USING (true) WITH CHECK (true);

-- Birthdays RLS
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on birthdays" ON birthdays;
CREATE POLICY "Allow all on birthdays" ON birthdays FOR ALL USING (true) WITH CHECK (true);

-- Group Rules RLS
ALTER TABLE group_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on group_rules" ON group_rules;
CREATE POLICY "Allow all on group_rules" ON group_rules FOR ALL USING (true) WITH CHECK (true);

-- Countdowns RLS
ALTER TABLE countdowns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on countdowns" ON countdowns;
CREATE POLICY "Allow all on countdowns" ON countdowns FOR ALL USING (true) WITH CHECK (true);

-- Notes RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on notes" ON notes;
CREATE POLICY "Allow all on notes" ON notes FOR ALL USING (true) WITH CHECK (true);

-- ================================
-- NOTES
-- ================================
-- 
-- Tabel yang dibuat:
-- 1. gacha_history - History gacha harian
-- 2. birthdays - Tanggal lahir member
-- 3. group_rules - Aturan grup
-- 4. countdowns - Countdown ke tanggal event
-- 5. notes - Catatan grup
