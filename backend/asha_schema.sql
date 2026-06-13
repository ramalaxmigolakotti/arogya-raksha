-- ============================================================
-- ASHA Worker Module - Supabase PostgreSQL Schema
-- Paste this ENTIRE query in Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Drop old tables if they exist (for fresh run)
DROP TABLE IF EXISTS asha_health_records CASCADE;
DROP TABLE IF EXISTS asha_patients CASCADE;

-- 1. ASHA Patients (Villagers)
-- NOTE: asha_worker_id is TEXT (not UUID) to support Clerk string IDs like "user_2abc..."
CREATE TABLE asha_patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asha_worker_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT,
  village_name TEXT,
  medical_history TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ASHA Health Records (Vitals Logs)
CREATE TABLE asha_health_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES asha_patients(id) ON DELETE CASCADE,
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  sugar_level NUMERIC,
  weight NUMERIC,
  pregnancy_status TEXT,
  vaccinations TEXT[],
  notes TEXT,
  ai_risk_flag BOOLEAN DEFAULT false,
  ai_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_asha_patients_worker ON asha_patients(asha_worker_id);
CREATE INDEX idx_asha_records_patient ON asha_health_records(patient_id);
