-- ==============================================================================
-- 🏥 AROGYA RAKSHA — HOSPITAL INPATIENT WORKFLOW MIGRATION
-- ==============================================================================
-- Instructions:
-- 1. Open Supabase Dashboard → SQL Editor → + New Query
-- 2. Paste this entire script and click ▶ Run
-- 3. 100% IDEMPOTENT — safe to run on existing DB (no data wiped)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLE 1: hospital_beds — Individual bed registry per hospital
-- ==============================================================================
CREATE TABLE IF NOT EXISTS hospital_beds (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id   UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  hospital_name TEXT,
  bed_number    TEXT NOT NULL,
  ward          TEXT NOT NULL DEFAULT 'General',
  bed_type      TEXT DEFAULT 'standard' CHECK (
    bed_type IN ('standard','icu','emergency','private','semi_private')
  ),
  status        TEXT DEFAULT 'available' CHECK (
    status IN ('available','occupied','reserved','maintenance')
  ),
  patient_id    TEXT,
  patient_name  TEXT,
  admission_id  UUID,
  floor_number  INTEGER DEFAULT 1,
  features      TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE hospital_beds ADD COLUMN IF NOT EXISTS hospital_name TEXT;
  ALTER TABLE hospital_beds ADD COLUMN IF NOT EXISTS patient_name TEXT;
  ALTER TABLE hospital_beds ADD COLUMN IF NOT EXISTS floor_number INTEGER DEFAULT 1;
  ALTER TABLE hospital_beds ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_hospital_beds_hospital ON hospital_beds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_beds_status ON hospital_beds(status);
CREATE INDEX IF NOT EXISTS idx_hospital_beds_ward ON hospital_beds(ward);

-- ==============================================================================
-- TABLE 2: inpatient_admissions — Core inpatient state machine
-- ==============================================================================
CREATE TABLE IF NOT EXISTS inpatient_admissions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Patient info
  patient_id              TEXT,
  patient_name            TEXT NOT NULL,
  patient_phone           TEXT,
  patient_age             INTEGER,
  patient_gender          TEXT,

  -- Hospital info
  hospital_id             UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  hospital_name           TEXT NOT NULL,
  admitted_by             TEXT,   -- hospital_admin user ID who registered

  -- Doctor + Bed assignment
  assigned_doctor_id      TEXT,
  assigned_doctor_name    TEXT,
  bed_id                  UUID,
  bed_number              TEXT,
  ward                    TEXT,

  -- Clinical
  severity                TEXT DEFAULT 'mild' CHECK (
    severity IN ('mild','moderate','severe','critical')
  ),
  chief_complaint         TEXT,
  vitals                  JSONB DEFAULT '{}',

  -- State machine
  status                  TEXT DEFAULT 'registered' CHECK (
    status IN (
      'registered',
      'doctor_assigned',
      'under_examination',
      'diagnostics_ordered',
      'diagnostics_done',
      'treatment_ongoing',
      'ready_for_discharge',
      'discharged'
    )
  ),

  -- Diagnostics (summary array for quick display)
  diagnostic_orders       JSONB DEFAULT '[]',

  -- Prescription link (to existing digital_prescriptions table)
  prescription_id         UUID,

  -- Discharge (only doctor can fill these)
  discharge_summary       TEXT,
  discharge_notes         JSONB DEFAULT '{}',
  discharged_by_doctor_id TEXT,
  discharged_at           TIMESTAMPTZ,

  -- Full timestamp log for patient tracking
  timestamps              JSONB DEFAULT '{}',

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS patient_phone TEXT;
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS patient_age INTEGER;
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS patient_gender TEXT;
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS admitted_by TEXT;
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS assigned_doctor_name TEXT;
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS bed_number TEXT;
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS ward TEXT;
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS vitals JSONB DEFAULT '{}';
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS diagnostic_orders JSONB DEFAULT '[]';
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS prescription_id UUID;
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS discharge_notes JSONB DEFAULT '{}';
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS discharged_by_doctor_id TEXT;
  ALTER TABLE inpatient_admissions ADD COLUMN IF NOT EXISTS discharged_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_inpatient_admissions_patient ON inpatient_admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_inpatient_admissions_doctor ON inpatient_admissions(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_inpatient_admissions_hospital ON inpatient_admissions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_inpatient_admissions_status ON inpatient_admissions(status);

-- ==============================================================================
-- TABLE 3: inpatient_diagnostic_orders — Doctor-ordered lab/radiology tests
-- ==============================================================================
CREATE TABLE IF NOT EXISTS inpatient_diagnostic_orders (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_id             UUID REFERENCES inpatient_admissions(id) ON DELETE CASCADE,
  patient_id               TEXT,
  patient_name             TEXT,
  hospital_name            TEXT,

  ordered_by_doctor_id     TEXT NOT NULL,
  ordered_by_doctor_name   TEXT,

  test_name                TEXT NOT NULL,
  test_category            TEXT DEFAULT 'pathology' CHECK (
    test_category IN ('pathology','radiology','cardiology','biochemistry','microbiology','other')
  ),
  urgency                  TEXT DEFAULT 'routine' CHECK (
    urgency IN ('routine','urgent','stat')
  ),

  status                   TEXT DEFAULT 'ordered' CHECK (
    status IN ('ordered','sample_collected','processing','completed','cancelled')
  ),

  result_url               TEXT,
  result_summary           TEXT,
  reviewed_by_doctor       BOOLEAN DEFAULT false,

  ordered_at               TIMESTAMPTZ DEFAULT NOW(),
  completed_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE inpatient_diagnostic_orders ADD COLUMN IF NOT EXISTS patient_name TEXT;
  ALTER TABLE inpatient_diagnostic_orders ADD COLUMN IF NOT EXISTS hospital_name TEXT;
  ALTER TABLE inpatient_diagnostic_orders ADD COLUMN IF NOT EXISTS reviewed_by_doctor BOOLEAN DEFAULT false;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_inpatient_diag_admission ON inpatient_diagnostic_orders(admission_id);
CREATE INDEX IF NOT EXISTS idx_inpatient_diag_status ON inpatient_diagnostic_orders(status);
CREATE INDEX IF NOT EXISTS idx_inpatient_diag_doctor ON inpatient_diagnostic_orders(ordered_by_doctor_id);

-- ==============================================================================
-- TABLE 4: inpatient_medicine_administrations — Ward-level dose tracking
-- ==============================================================================
CREATE TABLE IF NOT EXISTS inpatient_medicine_administrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_id    UUID REFERENCES inpatient_admissions(id) ON DELETE CASCADE,
  prescription_id UUID,
  medicine_name   TEXT NOT NULL,
  dose            TEXT,
  route           TEXT DEFAULT 'oral' CHECK (
    route IN ('oral','IV','IM','subcutaneous','topical','inhalation')
  ),
  frequency       TEXT,
  administered_by TEXT,
  bed_number      TEXT,
  administered_at TIMESTAMPTZ DEFAULT NOW(),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inpatient_meds_admission ON inpatient_medicine_administrations(admission_id);

-- ==============================================================================
-- SEED: Pre-populate hospital_beds for existing hospitals (50 beds each)
-- ==============================================================================
DO $$
DECLARE
  hosp RECORD;
  ward_names TEXT[] := ARRAY['General','General','General','ICU','Emergency'];
  bed_types  TEXT[] := ARRAY['standard','standard','semi_private','icu','emergency'];
  ward_text  TEXT;
  bed_text   TEXT;
  bed_num    TEXT;
  i          INTEGER;
  w          INTEGER;
BEGIN
  FOR hosp IN SELECT id, name FROM hospitals LOOP
    -- Skip if this hospital already has beds
    IF (SELECT COUNT(*) FROM hospital_beds WHERE hospital_id = hosp.id) > 0 THEN
      CONTINUE;
    END IF;

    -- Create 10 beds across 5 ward types
    FOR w IN 1..5 LOOP
      ward_text := ward_names[w];
      FOR i IN 1..10 LOOP
        bed_num := UPPER(LEFT(ward_text,3)) || '-' || LPAD((((w-1)*10)+i)::TEXT, 2, '0');
        INSERT INTO hospital_beds (
          hospital_id, hospital_name, bed_number, ward,
          bed_type, status, floor_number
        ) VALUES (
          hosp.id, hosp.name, bed_num, ward_text,
          bed_types[w], 'available', w
        ) ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ==============================================================================
-- RLS POLICIES (open for anon — same pattern as rest of schema)
-- ==============================================================================
ALTER TABLE hospital_beds                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inpatient_admissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE inpatient_diagnostic_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inpatient_medicine_administrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "allow_all_hospital_beds" ON hospital_beds;
  CREATE POLICY "allow_all_hospital_beds" ON hospital_beds FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_inpatient_admissions" ON inpatient_admissions;
  CREATE POLICY "allow_all_inpatient_admissions" ON inpatient_admissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_inpatient_diag" ON inpatient_diagnostic_orders;
  CREATE POLICY "allow_all_inpatient_diag" ON inpatient_diagnostic_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_inpatient_meds" ON inpatient_medicine_administrations;
  CREATE POLICY "allow_all_inpatient_meds" ON inpatient_medicine_administrations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ==============================================================================
-- REALTIME — enable Supabase live subscriptions
-- ==============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE hospital_beds;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE inpatient_admissions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE inpatient_diagnostic_orders;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ==============================================================================
-- Verify
-- ==============================================================================
SELECT
  'hospital_beds'                    AS table_name, COUNT(*) AS rows FROM hospital_beds
UNION ALL SELECT 'inpatient_admissions',            COUNT(*) FROM inpatient_admissions
UNION ALL SELECT 'inpatient_diagnostic_orders',     COUNT(*) FROM inpatient_diagnostic_orders
UNION ALL SELECT 'inpatient_medicine_administrations', COUNT(*) FROM inpatient_medicine_administrations;
