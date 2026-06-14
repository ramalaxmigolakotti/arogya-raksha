-- ============================================
-- Rapid Crisis V2 — Supabase Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Main incidents table
CREATE TABLE IF NOT EXISTS crisis_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_ref TEXT UNIQUE NOT NULL,
  room TEXT,
  floor TEXT,
  guest_name TEXT,
  guest_id TEXT,
  type TEXT DEFAULT 'medical',
  symptoms TEXT,
  photo_url TEXT,
  severity TEXT DEFAULT 'assessing',
  condition TEXT,
  icd10 TEXT,
  action TEXT,
  hospital_dept TEXT,
  status TEXT DEFAULT 'pending',
  medical_profile JSONB,
  assigned_responder JSONB,
  hospital_recommendation JSONB,
  cost_estimate JSONB,
  hospital_notification JSONB,
  ambulance_alert JSONB,
  guest_lat DOUBLE PRECISION,
  guest_lng DOUBLE PRECISION,
  responder_lat DOUBLE PRECISION,
  responder_lng DOUBLE PRECISION,
  response_time_minutes INTEGER,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Timeline events (train-station-style step tracker)
CREATE TABLE IF NOT EXISTS crisis_timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_ref TEXT NOT NULL,
  step TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  actor TEXT,
  actor_role TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chat messages (persistent)
CREATE TABLE IF NOT EXISTS crisis_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_ref TEXT NOT NULL,
  sender TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Hospital case log
CREATE TABLE IF NOT EXISTS hospital_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_ref TEXT NOT NULL,
  hospital_name TEXT,
  hospital_dept TEXT,
  patient_name TEXT,
  patient_condition TEXT,
  icd10 TEXT,
  severity TEXT,
  status TEXT DEFAULT 'sent',
  bed_number TEXT,
  responder_name TEXT,
  acknowledged_at TIMESTAMPTZ,
  bed_ready_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  response_time_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_crisis_timeline_ref ON crisis_timeline(incident_ref);
CREATE INDEX IF NOT EXISTS idx_crisis_messages_ref ON crisis_messages(incident_ref);
CREATE INDEX IF NOT EXISTS idx_hospital_cases_ref ON hospital_cases(incident_ref);
CREATE INDEX IF NOT EXISTS idx_crisis_incidents_status ON crisis_incidents(status);
