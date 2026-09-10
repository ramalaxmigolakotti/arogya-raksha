-- ============================================================
-- Migration: Update media_uploads to work with Clerk user IDs
-- Run this in Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Drop the old table (if you have data you want to keep, skip this and use ALTER TABLE instead)
DROP TABLE IF EXISTS media_uploads CASCADE;

-- Recreate with TEXT user_id (compatible with Clerk user IDs)
CREATE TABLE IF NOT EXISTS media_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_role TEXT DEFAULT 'patient',
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  public_id TEXT NOT NULL,
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  format TEXT,
  width INTEGER,
  height INTEGER,
  bytes INTEGER,
  duration NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_uploads_user_id ON media_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_user_role ON media_uploads(user_role);
CREATE INDEX IF NOT EXISTS idx_media_uploads_media_type ON media_uploads(media_type);
CREATE INDEX IF NOT EXISTS idx_media_uploads_created_at ON media_uploads(created_at DESC);
