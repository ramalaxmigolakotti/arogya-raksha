-- ============================================================
-- Migration: Doctor Profiles (Self-managed by doctors)
-- Run this in Supabase Dashboard → SQL Editor → Run
-- ============================================================

DROP TABLE IF EXISTS doctor_profiles CASCADE;

CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,           -- Clerk user ID (owner)
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  specialization TEXT DEFAULT '',
  qualification TEXT DEFAULT '',
  experience INTEGER DEFAULT 0,
  consultation_fee NUMERIC DEFAULT 0,
  hospital_name TEXT DEFAULT '',
  hospital_image TEXT DEFAULT '',          -- Cloudinary URL
  profile_image TEXT DEFAULT '',           -- Cloudinary URL
  bio TEXT DEFAULT '',
  languages TEXT[] DEFAULT '{}',
  rating NUMERIC DEFAULT 4.5,
  total_reviews INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user_id ON doctor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_location ON doctor_profiles(location);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_specialization ON doctor_profiles(specialization);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_name ON doctor_profiles USING GIN(to_tsvector('english', name));
