-- ═══════════════════════════════════════════════════════════
-- FIXED Missing Tables SQL — Run in Supabase SQL Editor
-- Handles both NEW and EXISTING tables safely
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- ASHA Worker Tables (safe upsert approach)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS asha_patients (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name         VARCHAR(255) NOT NULL,
  village           VARCHAR(255) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist yet
ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS asha_id       VARCHAR(255);
ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS age            INTEGER;
ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS gender         VARCHAR(20);
ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS phone          VARCHAR(20);
ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS address        TEXT;
ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS blood_group    VARCHAR(10);
ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS conditions     TEXT[] DEFAULT '{}';
ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS allergies      TEXT[] DEFAULT '{}';
ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS asha_vitals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id      UUID NOT NULL REFERENCES asha_patients(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS asha_id       VARCHAR(255);
ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS bp_systolic   INTEGER;
ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS bp_diastolic  INTEGER;
ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS sugar_level   DECIMAL(6,2);
ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS weight        DECIMAL(6,2);
ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS temperature   DECIMAL(5,2);
ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS notes         TEXT;
ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS risk_level    VARCHAR(20) DEFAULT 'low';

CREATE INDEX IF NOT EXISTS idx_asha_patients_asha_id ON asha_patients(asha_id);
CREATE INDEX IF NOT EXISTS idx_asha_vitals_patient_id ON asha_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_asha_vitals_risk ON asha_vitals(risk_level);

ALTER TABLE asha_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE asha_vitals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'asha_patients' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON asha_patients FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'asha_vitals' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON asha_vitals FOR ALL USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- HealthShare Tables
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS healthshare_resources (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  posted_by       VARCHAR(255) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  category        VARCHAR(100) NOT NULL,
  status          VARCHAR(20) DEFAULT 'available',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE healthshare_resources ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE healthshare_resources ADD COLUMN IF NOT EXISTS condition      VARCHAR(50) DEFAULT 'good';
ALTER TABLE healthshare_resources ADD COLUMN IF NOT EXISTS type           VARCHAR(30) DEFAULT 'donate';
ALTER TABLE healthshare_resources ADD COLUMN IF NOT EXISTS price          INTEGER DEFAULT 0;
ALTER TABLE healthshare_resources ADD COLUMN IF NOT EXISTS location       TEXT;
ALTER TABLE healthshare_resources ADD COLUMN IF NOT EXISTS city           VARCHAR(100);
ALTER TABLE healthshare_resources ADD COLUMN IF NOT EXISTS state          VARCHAR(100);
ALTER TABLE healthshare_resources ADD COLUMN IF NOT EXISTS contact_phone  VARCHAR(20);

CREATE TABLE IF NOT EXISTS healthshare_volunteers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  role            VARCHAR(100) NOT NULL,
  status          VARCHAR(20) DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE healthshare_volunteers ADD COLUMN IF NOT EXISTS skills        TEXT[] DEFAULT '{}';
ALTER TABLE healthshare_volunteers ADD COLUMN IF NOT EXISTS city          VARCHAR(100);
ALTER TABLE healthshare_volunteers ADD COLUMN IF NOT EXISTS state         VARCHAR(100);
ALTER TABLE healthshare_volunteers ADD COLUMN IF NOT EXISTS phone         VARCHAR(20);
ALTER TABLE healthshare_volunteers ADD COLUMN IF NOT EXISTS availability  JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS healthshare_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by    VARCHAR(255) NOT NULL,
  resource_id     UUID NOT NULL REFERENCES healthshare_resources(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE healthshare_requests ADD COLUMN IF NOT EXISTS message        TEXT;
ALTER TABLE healthshare_requests ADD COLUMN IF NOT EXISTS contact_phone  VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_hs_resources_status   ON healthshare_resources(status);
CREATE INDEX IF NOT EXISTS idx_hs_resources_city     ON healthshare_resources(city);
CREATE INDEX IF NOT EXISTS idx_hs_resources_category ON healthshare_resources(category);
CREATE INDEX IF NOT EXISTS idx_hs_volunteers_city    ON healthshare_volunteers(city);

ALTER TABLE healthshare_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthshare_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthshare_requests   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='healthshare_resources' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON healthshare_resources FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='healthshare_volunteers' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON healthshare_volunteers FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='healthshare_requests' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON healthshare_requests FOR ALL USING (true);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- PHC Facilities Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS phc_facilities (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  district        VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE phc_facilities ADD COLUMN IF NOT EXISTS taluka   VARCHAR(100);
ALTER TABLE phc_facilities ADD COLUMN IF NOT EXISTS block    VARCHAR(100);
ALTER TABLE phc_facilities ADD COLUMN IF NOT EXISTS address  TEXT;
ALTER TABLE phc_facilities ADD COLUMN IF NOT EXISTS phone    VARCHAR(20);
ALTER TABLE phc_facilities ADD COLUMN IF NOT EXISTS type     VARCHAR(50) DEFAULT 'PHC';

CREATE INDEX IF NOT EXISTS idx_phc_district ON phc_facilities(district);
CREATE INDEX IF NOT EXISTS idx_phc_name     ON phc_facilities(name);

ALTER TABLE phc_facilities ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='phc_facilities' AND policyname='Public read access') THEN
    CREATE POLICY "Public read access" ON phc_facilities FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='phc_facilities' AND policyname='Service role full access') THEN
    CREATE POLICY "Service role full access" ON phc_facilities FOR ALL USING (true);
  END IF;
END $$;
