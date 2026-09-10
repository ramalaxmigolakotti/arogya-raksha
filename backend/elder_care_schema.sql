-- ═══════════════════════════════════════════════════════════
-- Elder Care & Caregiver Connect — Supabase Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Elder Profiles
CREATE TABLE IF NOT EXISTS elder_profiles (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_by VARCHAR(255) NOT NULL,         -- Clerk user ID of family member
  full_name     VARCHAR(255) NOT NULL,
  age           INTEGER NOT NULL,
  gender        VARCHAR(20),
  address       TEXT NOT NULL,
  city          VARCHAR(100),
  state         VARCHAR(100),
  pincode       VARCHAR(10),
  latitude      DECIMAL(9, 6),
  longitude     DECIMAL(9, 6),
  photo_url     TEXT,
  conditions    TEXT[] DEFAULT '{}',           -- e.g. ['Diabetes', 'Hypertension']
  mobility      VARCHAR(50) DEFAULT 'mobile',  -- mobile | partial | bedridden
  medicine_schedule JSONB DEFAULT '[]',        -- [{name, time, dose}]
  emergency_contacts JSONB DEFAULT '[]',       -- [{name, phone, relation}]
  budget_per_month INTEGER DEFAULT 0,          -- INR per month
  special_notes TEXT,
  status        VARCHAR(20) DEFAULT 'active',  -- active | inactive
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Caregiver Profiles
CREATE TABLE IF NOT EXISTS caregiver_profiles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         VARCHAR(255),                 -- Clerk user ID if registered
  full_name       VARCHAR(255) NOT NULL,
  age             INTEGER,
  gender          VARCHAR(20),
  phone           VARCHAR(20) NOT NULL,
  email           VARCHAR(255),
  photo_url       TEXT,
  village         VARCHAR(255) NOT NULL,
  city            VARCHAR(100),
  state           VARCHAR(100),
  pincode         VARCHAR(10),
  latitude        DECIMAL(9, 6),
  longitude       DECIMAL(9, 6),
  skills          TEXT[] DEFAULT '{}',          -- ['Diabetic Care', 'Medicine Management', 'Hospital Visits']
  languages       TEXT[] DEFAULT '{}',          -- ['Telugu', 'Hindi', 'English']
  experience_years INTEGER DEFAULT 0,
  availability    JSONB DEFAULT '{}',           -- {days: ['Mon','Tue'], timing: 'Morning'}
  salary_expectation INTEGER DEFAULT 0,         -- INR per month
  rating          DECIMAL(3, 2) DEFAULT 0,
  total_reviews   INTEGER DEFAULT 0,
  is_verified     BOOLEAN DEFAULT FALSE,
  status          VARCHAR(20) DEFAULT 'available', -- available | engaged | inactive
  bio             TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Elder-Caregiver Matches
CREATE TABLE IF NOT EXISTS elder_caregiver_matches (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elder_id        UUID NOT NULL REFERENCES elder_profiles(id) ON DELETE CASCADE,
  caregiver_id    UUID NOT NULL REFERENCES caregiver_profiles(id) ON DELETE CASCADE,
  match_score     INTEGER DEFAULT 0,            -- 0-100
  distance_km     DECIMAL(6, 2),
  status          VARCHAR(30) DEFAULT 'suggested', -- suggested | shortlisted | hired | rejected | completed
  hired_at        TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  family_notes    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(elder_id, caregiver_id)
);

-- 4. Caregiver Tasks
CREATE TABLE IF NOT EXISTS caregiver_tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id        UUID NOT NULL REFERENCES elder_caregiver_matches(id) ON DELETE CASCADE,
  elder_id        UUID NOT NULL REFERENCES elder_profiles(id) ON DELETE CASCADE,
  caregiver_id    UUID NOT NULL REFERENCES caregiver_profiles(id) ON DELETE CASCADE,
  task_type       VARCHAR(50) NOT NULL,         -- medicine_delivery | doctor_booking | hospital_accompany | health_check | other
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  due_date        DATE,
  due_time        TIME,
  status          VARCHAR(20) DEFAULT 'pending', -- pending | in_progress | done | skipped
  done_at         TIMESTAMPTZ,
  done_notes      TEXT,
  created_by      VARCHAR(255),                 -- Clerk user ID
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Elder Care Alerts (from AI integrations)
CREATE TABLE IF NOT EXISTS elder_care_alerts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  elder_id        UUID NOT NULL REFERENCES elder_profiles(id) ON DELETE CASCADE,
  alert_type      VARCHAR(50) NOT NULL,         -- symptom_risk | health_predictor | medicine_missed | manual
  severity        VARCHAR(20) DEFAULT 'medium', -- low | medium | high | critical
  message         TEXT NOT NULL,
  source          VARCHAR(50),                  -- ai_symptom_checker | health_predictor | caregiver | family
  is_read         BOOLEAN DEFAULT FALSE,
  notified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_elder_profiles_registered_by ON elder_profiles(registered_by);
CREATE INDEX IF NOT EXISTS idx_elder_profiles_status ON elder_profiles(status);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_status ON caregiver_profiles(status);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_location ON caregiver_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_matches_elder_id ON elder_caregiver_matches(elder_id);
CREATE INDEX IF NOT EXISTS idx_matches_caregiver_id ON elder_caregiver_matches(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON elder_caregiver_matches(status);
CREATE INDEX IF NOT EXISTS idx_tasks_caregiver_id ON caregiver_tasks(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_tasks_elder_id ON caregiver_tasks(elder_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON caregiver_tasks(status);
CREATE INDEX IF NOT EXISTS idx_alerts_elder_id ON elder_care_alerts(elder_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON elder_care_alerts(is_read);

-- ── Updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_elder_care_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER elder_profiles_updated_at
  BEFORE UPDATE ON elder_profiles
  FOR EACH ROW EXECUTE FUNCTION update_elder_care_updated_at();

CREATE TRIGGER caregiver_profiles_updated_at
  BEFORE UPDATE ON caregiver_profiles
  FOR EACH ROW EXECUTE FUNCTION update_elder_care_updated_at();

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON elder_caregiver_matches
  FOR EACH ROW EXECUTE FUNCTION update_elder_care_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON caregiver_tasks
  FOR EACH ROW EXECUTE FUNCTION update_elder_care_updated_at();
