-- Supabase Migration Script for WhatsAppBotReminder v2.0
-- Run this in Supabase SQL Editor

-- ================================
-- 1. UPDATE REMINDERS TABLE
-- ================================

-- Add 'paused' column if not exists
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT FALSE;

-- Add 'is_one_time' column if not exists
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS is_one_time BOOLEAN DEFAULT FALSE;

-- Add 'target_date' column for one-time reminders
ALTER TABLE reminders 
ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ;

-- ================================
-- 2. CREATE TEMPLATES TABLE
-- ================================

CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  chat_id TEXT NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_templates_chat_id ON templates(chat_id);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(name);

-- ================================
-- 3. UPDATE SESSIONS TABLE (if needed)
-- ================================

-- Ensure sessions table exists
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'inactive',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================
-- 4. ROW LEVEL SECURITY (Optional)
-- ================================

-- Enable RLS on templates table
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists, then create new one
DROP POLICY IF EXISTS "Allow all operations on templates" ON templates;

-- Policy: Allow all operations (adjust as needed)
CREATE POLICY "Allow all operations on templates" ON templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================
-- VERIFICATION QUERIES
-- ================================

-- Check reminders table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reminders';

-- Check templates table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'templates';

-- ================================
-- NOTES
-- ================================
-- 
-- Jalankan script ini di Supabase SQL Editor:
-- 1. Buka dashboard Supabase
-- 2. Pilih project Anda
-- 3. Klik "SQL Editor" di sidebar
-- 4. Paste script ini dan klik "Run"
--
-- Script ini aman untuk dijalankan berkali-kali (idempotent)
-- karena menggunakan IF NOT EXISTS
