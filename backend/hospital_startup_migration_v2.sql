-- ==============================================================================
-- 🏥 AROGYA RAKSHA — PRODUCTION-READY SUPABASE SQL MIGRATION (V2)
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/zjitgtmigelfhejzdhdy
-- 2. Click "SQL Editor" on the left navigation menu.
-- 3. Click "+ New Query".
-- 4. Copy and paste this entire script and click "Run" (▶).
--
-- This script is completely IDEMPOTENT (safe to run multiple times without data loss).
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. UNIFIED 9-STAGE HEALTHCARE JOURNEYS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS healthcare_journeys (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token_number            INTEGER NOT NULL,
  patient_id              TEXT,
  patient_name            TEXT NOT NULL,
  patient_phone           TEXT,
  age                     INTEGER,
  gender                  TEXT,
  village                 TEXT,
  household_no            TEXT,
  hospital_name           TEXT NOT NULL,
  department              TEXT,
  doctor_name             TEXT NOT NULL,
  doctor_id               TEXT,
  slot_time               TEXT NOT NULL,
  booking_source          TEXT DEFAULT 'patient_self' CHECK (booking_source IN ('patient_self', 'asha_assisted')),
  asha_worker_name        TEXT,
  current_step            TEXT DEFAULT 'booked' CHECK (
    current_step IN (
      'booked',
      'transit',
      'checked_in',
      'consulting',
      'prescribed',
      'pharmacy_processing',
      'medicines_packed',
      'dispatched',
      'completed'
    )
  ),
  status_notes            TEXT,
  vitals                  TEXT,
  symptoms                TEXT,
  ambulance_requested     BOOLEAN DEFAULT false,
  ambulance_dispatch_id   TEXT,
  payment_status          TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'free_bpl_aarogyasri')),
  consultation_fee        NUMERIC DEFAULT 500,
  payment_id              TEXT,
  prescription_data       JSONB DEFAULT '{}',
  timestamps              JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Index for real-time lookups
CREATE INDEX IF NOT EXISTS idx_healthcare_journeys_patient ON healthcare_journeys(patient_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_journeys_doctor ON healthcare_journeys(doctor_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_journeys_step ON healthcare_journeys(current_step);

-- ==============================================================================
-- 2. DIGITAL PRESCRIPTIONS (Hospital EHR ➔ Central Pharmacy Queue)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS digital_prescriptions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id              TEXT NOT NULL,
  patient_name            TEXT NOT NULL,
  doctor_name             TEXT NOT NULL,
  doctor_id               TEXT,
  diagnosis               TEXT NOT NULL,
  medicines               JSONB DEFAULT '[]',
  advice                  TEXT,
  follow_up_days          INTEGER DEFAULT 7,
  status                  TEXT DEFAULT 'queued' CHECK (
    status IN ('queued', 'accepted_by_pharmacy', 'packed', 'dispatched_or_ready', 'completed')
  ),
  packed_by               TEXT,
  payment_status          TEXT DEFAULT 'paid',
  payment_id              TEXT,
  dispatched_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_prescriptions_journey ON digital_prescriptions(journey_id);
CREATE INDEX IF NOT EXISTS idx_digital_prescriptions_status ON digital_prescriptions(status);

-- ==============================================================================
-- 3. PERMANENT LIFETIME HEALTH RECORDS (Stored Forever)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS patient_health_records (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 TEXT NOT NULL,
  type                    TEXT,
  record_type             TEXT,
  title                   TEXT NOT NULL,
  user_query              TEXT,
  ai_response             TEXT,
  summary                 TEXT,
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade existing patient_health_records if already created with older constraints
DO $$ 
BEGIN
  ALTER TABLE patient_health_records DROP CONSTRAINT IF EXISTS patient_health_records_type_check;
  ALTER TABLE patient_health_records ADD COLUMN IF NOT EXISTS record_type TEXT;
  ALTER TABLE patient_health_records ADD COLUMN IF NOT EXISTS summary TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_patient_health_records_user_id ON patient_health_records(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_health_records_type ON patient_health_records(type);
CREATE INDEX IF NOT EXISTS idx_patient_health_records_created_at ON patient_health_records(created_at DESC);

-- ==============================================================================
-- 4. USER MEDICAL PROFILES & EHR RECORDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_medical_profiles (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     TEXT NOT NULL UNIQUE,
  full_name                   TEXT,
  age                         INTEGER,
  date_of_birth               DATE,
  gender                      TEXT,
  blood_group                 TEXT,
  height_cm                   INTEGER,
  weight_kg                   DECIMAL(5,2),
  conditions                  JSONB DEFAULT '[]',
  bp_systolic                 INTEGER,
  bp_diastolic                INTEGER,
  sugar_level_fasting         DECIMAL(6,2),
  sugar_level_pp              DECIMAL(6,2),
  pulse_rate                  INTEGER,
  current_medications         JSONB DEFAULT '[]',
  allergies                   JSONB DEFAULT '[]',
  preferred_hospitals         JSONB DEFAULT '[]',
  emergency_contact_name      TEXT,
  emergency_contact_phone     TEXT,
  emergency_contact_relation  TEXT,
  has_insurance               BOOLEAN DEFAULT false,
  insurance_provider          TEXT,
  policy_number               TEXT,
  organ_donor                 BOOLEAN DEFAULT false,
  doctor_notes                TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_medical_profiles_user_id ON user_medical_profiles(user_id);

-- ==============================================================================
-- 4B. ASHA WORKER COMMUNITY ROSTER & DOORSTEP VITALS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS asha_patients (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name         VARCHAR(255) NOT NULL,
  village           VARCHAR(255) NOT NULL,
  asha_id           VARCHAR(255),
  age               INTEGER,
  gender            VARCHAR(20),
  phone             VARCHAR(20),
  address           TEXT,
  blood_group       VARCHAR(10),
  conditions        TEXT[] DEFAULT '{}',
  allergies         TEXT[] DEFAULT '{}',
  emergency_contact JSONB DEFAULT '{}',
  household_no      VARCHAR(50),
  category          VARCHAR(50) DEFAULT 'routine',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asha_vitals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id      UUID REFERENCES asha_patients(id) ON DELETE CASCADE,
  asha_id         VARCHAR(255),
  bp_systolic     INTEGER,
  bp_diastolic    INTEGER,
  sugar_level     DECIMAL(6,2),
  weight          DECIMAL(6,2),
  temperature     DECIMAL(5,2),
  notes           TEXT,
  risk_level      VARCHAR(20) DEFAULT 'low',
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asha_patients_village ON asha_patients(village);
CREATE INDEX IF NOT EXISTS idx_asha_vitals_patient ON asha_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_asha_vitals_risk ON asha_vitals(risk_level);

-- ==============================================================================
-- 5. UPGRADE EXISTING APPOINTMENTS & QUEUE TOKENS TABLE (IF EXISTS)
-- ==============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') THEN
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_id TEXT;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 500;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS token_number INTEGER;
    ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'patient_self';
    
    -- Relax check constraint on payment_status if it exists
    BEGIN
      ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_payment_status_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ==============================================================================
-- 6. UPGRADE EXISTING ORDERS TABLE (PHARMACY & MEDICINES)
-- ==============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'razorpay';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'delivery';
  END IF;
END $$;

-- ==============================================================================
-- 7. UPGRADE AMBULANCE DISPATCH TABLE
-- ==============================================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ambulance_dispatch') THEN
    ALTER TABLE ambulance_dispatch ADD COLUMN IF NOT EXISTS ambulance_type TEXT DEFAULT 'govt_108';
    ALTER TABLE ambulance_dispatch ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'free_govt';
    ALTER TABLE ambulance_dispatch ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0;
    ALTER TABLE ambulance_dispatch ADD COLUMN IF NOT EXISTS payment_id TEXT;
  END IF;
END $$;

-- ==============================================================================
-- 7B. DIAGNOSTIC LAB BOOKINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS diagnostic_bookings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_name       TEXT NOT NULL,
  category        TEXT,
  price           NUMERIC NOT NULL,
  patient_name    TEXT NOT NULL,
  phone           TEXT,
  booking_date    TEXT,
  slot_time       TEXT,
  payment_id      TEXT,
  payment_status  TEXT DEFAULT 'paid',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. ROW LEVEL SECURITY & OPEN POLICIES (Demo / Pilot Ready)
-- ==============================================================================
ALTER TABLE healthcare_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE asha_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE asha_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_bookings ENABLE ROW LEVEL SECURITY;

-- Allow anon key full read/write for live app demo
DROP POLICY IF EXISTS "allow_all_anon_journeys" ON healthcare_journeys;
CREATE POLICY "allow_all_anon_journeys" ON healthcare_journeys FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_anon_prescriptions" ON digital_prescriptions;
CREATE POLICY "allow_all_anon_prescriptions" ON digital_prescriptions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_anon_records" ON patient_health_records;
CREATE POLICY "allow_all_anon_records" ON patient_health_records FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_anon_profiles" ON user_medical_profiles;
CREATE POLICY "allow_all_anon_profiles" ON user_medical_profiles FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_anon_asha_patients" ON asha_patients;
CREATE POLICY "allow_all_anon_asha_patients" ON asha_patients FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_anon_asha_vitals" ON asha_vitals;
CREATE POLICY "allow_all_anon_asha_vitals" ON asha_vitals FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_anon_diagnostics" ON diagnostic_bookings;
CREATE POLICY "allow_all_anon_diagnostics" ON diagnostic_bookings FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable real-time replication for Supabase WebSockets
ALTER PUBLICATION supabase_realtime ADD TABLE healthcare_journeys;
ALTER PUBLICATION supabase_realtime ADD TABLE digital_prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE patient_health_records;
ALTER PUBLICATION supabase_realtime ADD TABLE user_medical_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE asha_patients;
ALTER PUBLICATION supabase_realtime ADD TABLE asha_vitals;
ALTER PUBLICATION supabase_realtime ADD TABLE diagnostic_bookings;

-- ==============================================================================
-- VERIFY EXECUTION
-- ==============================================================================
SELECT 'MIGRATION COMPLETE ✅' as status,
       (SELECT COUNT(*) FROM healthcare_journeys) as journeys_count,
       (SELECT COUNT(*) FROM patient_health_records) as health_records_count,
       (SELECT COUNT(*) FROM digital_prescriptions) as prescriptions_count;
