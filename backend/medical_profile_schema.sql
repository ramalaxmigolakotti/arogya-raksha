-- ============================================================
-- Run this in Supabase SQL Editor:
-- supabase.com/dashboard → Your project → SQL Editor → New query
-- ============================================================

-- Step 1: Create the table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS user_medical_profiles (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               TEXT NOT NULL UNIQUE,
  full_name             TEXT,
  age                   INTEGER,
  date_of_birth         DATE,
  gender                TEXT,
  blood_group           TEXT,
  height_cm             INTEGER,
  weight_kg             DECIMAL(5,2),
  conditions            JSONB DEFAULT '[]',
  bp_systolic           INTEGER,
  bp_diastolic          INTEGER,
  sugar_level_fasting   DECIMAL(6,2),
  sugar_level_pp        DECIMAL(6,2),
  pulse_rate            INTEGER,
  current_medications   JSONB DEFAULT '[]',
  allergies             JSONB DEFAULT '[]',
  preferred_hospitals   JSONB DEFAULT '[]',
  emergency_contact_name    TEXT,
  emergency_contact_phone   TEXT,
  emergency_contact_relation TEXT,
  has_insurance         BOOLEAN DEFAULT false,
  insurance_provider    TEXT,
  policy_number         TEXT,
  organ_donor           BOOLEAN DEFAULT false,
  doctor_notes          TEXT,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE user_medical_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop any existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "allow_all_anon" ON user_medical_profiles;
DROP POLICY IF EXISTS "users_own_profile_select" ON user_medical_profiles;
DROP POLICY IF EXISTS "users_own_profile_insert" ON user_medical_profiles;
DROP POLICY IF EXISTS "users_own_profile_update" ON user_medical_profiles;

-- Step 4: Add open policy for demo (allows anon key to read/write all rows)
-- ⚠️ For production: replace with JWT-based auth policies
CREATE POLICY "allow_all_anon" ON user_medical_profiles
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Step 5: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_medical_profiles_user_id ON user_medical_profiles(user_id);

-- Step 6: Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_medical_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_medical_profile_updated ON user_medical_profiles;
CREATE TRIGGER trigger_medical_profile_updated
  BEFORE UPDATE ON user_medical_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_profile_timestamp();

-- Verify it worked:
SELECT COUNT(*) as profile_count FROM user_medical_profiles;
