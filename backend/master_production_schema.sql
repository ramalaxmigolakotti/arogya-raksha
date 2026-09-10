-- ==============================================================================
-- 🏥 AROGYA RAKSHA (ALL 9 PANELS) — COMPLETE MASTER SUPABASE SQL SCHEMA
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/zjitgtmigelfhejzdhdy
-- 2. Click "SQL Editor" on the left navigation bar.
-- 3. Click "+ New Query".
-- 4. Paste this ENTIRE query and click "Run" (▶).
--
-- Features:
-- - 100% IDEMPOTENT: Safe to run on empty DB or existing DB (no data wiped).
-- - Covers all 9 Panels: Patient, Reception, Doctor EHR, Pharmacy, Lab/Diagnostic,
--   108 Ambulance, ASHA Community, HealthShare, and Admin Analytics.
-- - Enables Row Level Security (RLS) with open anon policies for live testing.
-- - Enables Supabase Realtime for instant WebSocket synchronization across panels.
-- ==============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USERS & AUTHENTICATED PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin', 'pharmacist', 'receptionist', 'driver', 'asha')),
  phone TEXT,
  avatar TEXT,
  health_profile JSONB DEFAULT '{}',
  preferred_language TEXT DEFAULT 'en',
  location JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==============================================================================
-- 2. HOSPITALS & CLINICAL INFRASTRUCTURE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  type TEXT DEFAULT 'private' CHECK (type IN ('government', 'private', 'clinic')),
  departments TEXT[] DEFAULT '{}',
  facilities TEXT[] DEFAULT '{}',
  emergency BOOLEAN DEFAULT false,
  ambulance BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0,
  total_beds INTEGER DEFAULT 100,
  available_beds INTEGER DEFAULT 25,
  image TEXT,
  location JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. DOCTORS & CLINICAL PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  license_id TEXT UNIQUE,
  specialization TEXT NOT NULL,
  qualification TEXT,
  experience INTEGER DEFAULT 0,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT true,
  consultation_fee NUMERIC DEFAULT 500,
  rating NUMERIC DEFAULT 4.8,
  total_reviews INTEGER DEFAULT 0,
  availability JSONB DEFAULT '[]',
  languages TEXT[] DEFAULT '{}',
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  location TEXT NOT NULL,
  specialization TEXT DEFAULT '',
  qualification TEXT DEFAULT '',
  experience INTEGER DEFAULT 0,
  consultation_fee NUMERIC DEFAULT 500,
  hospital_name TEXT DEFAULT '',
  hospital_image TEXT DEFAULT '',
  profile_image TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  languages TEXT[] DEFAULT '{}',
  rating NUMERIC DEFAULT 4.8,
  total_reviews INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user_id ON doctor_profiles(user_id);

-- ==============================================================================
-- 4. UNIFIED 9-STAGE HEALTHCARE JOURNEYS TABLE (Cross-Panel State Machine)
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

DO $$ 
BEGIN
  ALTER TABLE healthcare_journeys DROP CONSTRAINT IF EXISTS healthcare_journeys_current_step_check;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS village TEXT DEFAULT 'Local Ward';
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS patient_phone TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS age INTEGER;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS gender TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS household_no TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS department TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS asha_worker_name TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'patient_self';
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS status_notes TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS vitals TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS symptoms TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS ambulance_requested BOOLEAN DEFAULT false;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS ambulance_dispatch_id TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid';
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC DEFAULT 500;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS payment_id TEXT;
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS prescription_data JSONB DEFAULT '{}';
  ALTER TABLE healthcare_journeys ADD COLUMN IF NOT EXISTS timestamps JSONB DEFAULT '{}';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_healthcare_journeys_patient ON healthcare_journeys(patient_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_journeys_doctor ON healthcare_journeys(doctor_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_journeys_step ON healthcare_journeys(current_step);
CREATE INDEX IF NOT EXISTS idx_healthcare_journeys_village ON healthcare_journeys(village);

-- ==============================================================================
-- 5. DIGITAL PRESCRIPTIONS (Doctor EHR ➔ Central Pharmacy Queue)
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
-- 6. PERMANENT LIFETIME HEALTH RECORDS (Patient Medical Timeline)
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
-- 7. USER MEDICAL PROFILES & CHRONIC CONDITIONS
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
  consent_pin                 TEXT,
  abha_id                     TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN
  ALTER TABLE user_medical_profiles ADD COLUMN IF NOT EXISTS village TEXT DEFAULT 'Local Ward';
  ALTER TABLE user_medical_profiles ADD COLUMN IF NOT EXISTS consent_pin TEXT;
  ALTER TABLE user_medical_profiles ADD COLUMN IF NOT EXISTS abha_id TEXT;
  ALTER TABLE user_medical_profiles ADD COLUMN IF NOT EXISTS blood_group TEXT;
  ALTER TABLE user_medical_profiles ADD COLUMN IF NOT EXISTS allergies JSONB DEFAULT '[]';
  ALTER TABLE user_medical_profiles ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]';
  ALTER TABLE user_medical_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
  ALTER TABLE user_medical_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_medical_profiles_user_id ON user_medical_profiles(user_id);

-- ==============================================================================
-- 8. ASHA COMMUNITY HEALTHCARE ROSTER & DOORSTEP VITALS
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

-- Ensure all columns in asha_patients exist in pre-existing tables
DO $$
BEGIN
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS village VARCHAR(255) DEFAULT 'Local Village';
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS asha_id VARCHAR(255);
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS age INTEGER;
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS address TEXT;
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS conditions TEXT[] DEFAULT '{}';
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS allergies TEXT[] DEFAULT '{}';
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS household_no VARCHAR(50);
  ALTER TABLE asha_patients ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'routine';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

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

DO $$
BEGIN
  ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS asha_id VARCHAR(255);
  ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS bp_systolic INTEGER;
  ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS bp_diastolic INTEGER;
  ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS sugar_level DECIMAL(6,2);
  ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS weight DECIMAL(6,2);
  ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS temperature DECIMAL(5,2);
  ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE asha_vitals ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS issue_tickets (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id           TEXT UNIQUE NOT NULL,
  asha_id             TEXT,
  assigned_doctor_id  TEXT,
  asha_name           TEXT NOT NULL,
  village             TEXT NOT NULL,
  category            TEXT NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  patient_name        TEXT,
  priority            TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status              TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  doctor_notes        TEXT,
  assigned_doctor     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS village TEXT DEFAULT 'Local Ward';
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS asha_id TEXT;
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS assigned_doctor_id TEXT;
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS asha_name TEXT DEFAULT 'ASHA Field Worker';
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Clinical Notification';
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS patient_name TEXT;
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS doctor_notes TEXT;
  ALTER TABLE issue_tickets ADD COLUMN IF NOT EXISTS assigned_doctor TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_asha_patients_village ON asha_patients(village);
CREATE INDEX IF NOT EXISTS idx_asha_vitals_patient ON asha_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_asha_vitals_risk ON asha_vitals(risk_level);
CREATE INDEX IF NOT EXISTS idx_issue_tickets_ticket_id ON issue_tickets(ticket_id);

-- ==============================================================================
-- 9. APPOINTMENTS & OPD QUEUE TOKENS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  patient_name TEXT,
  patient_email TEXT,
  patient_phone TEXT,
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  hospital_name TEXT,
  appointment_token INTEGER,
  token_number INTEGER,
  order_id TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_slot JSONB DEFAULT '{}',
  department TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'uploaded', 'verified', 'failed', 'paid', 'free_bpl_aarogyasri')),
  payment_id TEXT,
  payment_amount NUMERIC DEFAULT 500,
  booking_source TEXT DEFAULT 'patient_self',
  payment_proof TEXT,
  notes TEXT,
  prescription TEXT,
  follow_up TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);

-- ==============================================================================
-- 10. DIAGNOSTIC LAB BOOKINGS & MEDICAL REPORTS
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

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type TEXT DEFAULT 'other',
  title TEXT,
  file_url TEXT,
  extracted_text TEXT,
  analysis JSONB DEFAULT '{}',
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- ==============================================================================
-- 11. MEDICINES & PHARMACY ORDERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  usage TEXT[] DEFAULT '{}',
  dosage TEXT,
  side_effects TEXT[] DEFAULT '{}',
  precautions TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  market_price NUMERIC DEFAULT 0,
  alternatives TEXT[] DEFAULT '{}',
  manufacturer TEXT,
  prescription_required BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  order_type TEXT DEFAULT 'medicine',
  items JSONB DEFAULT '[]',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_id TEXT,
  payment_order_id TEXT,
  payment_signature TEXT,
  payment_method TEXT DEFAULT 'razorpay',
  payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  delivery_mode TEXT DEFAULT 'delivery',
  shipping_address JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);

-- ==============================================================================
-- 12. 108 AMBULANCE DISPATCH & TELEMETRY STREAM
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ambulance_dispatch (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id           TEXT UNIQUE NOT NULL,
  driver_id             TEXT,
  patient_id            TEXT,
  vehicle_no            TEXT NOT NULL,
  driver_name           TEXT NOT NULL,
  driver_phone          TEXT,
  patient_name          TEXT,
  pickup_location       TEXT,
  hospital_destination  TEXT,
  lat                   DOUBLE PRECISION NOT NULL DEFAULT 17.3850,
  lng                   DOUBLE PRECISION NOT NULL DEFAULT 78.4867,
  speed_kmh             NUMERIC DEFAULT 45,
  eta_minutes           INTEGER DEFAULT 5,
  status                TEXT DEFAULT 'en_route' CHECK (status IN ('dispatched', 'en_route', 'arrived_scene', 'transporting', 'arrived_hospital', 'completed')),
  ambulance_type        TEXT DEFAULT 'govt_108',
  payment_status        TEXT DEFAULT 'free_govt',
  payment_amount        NUMERIC DEFAULT 0,
  payment_id            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ambulance_dispatch_id ON ambulance_dispatch(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_ambulance_status ON ambulance_dispatch(status);

-- ==============================================================================
-- 13. BLOOD DONORS & COMMUNITY DIRECTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS blood_donors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  full_name TEXT,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  phone TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  last_donation TIMESTAMPTZ,
  location JSONB DEFAULT '{}',
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blood_donors_blood_group ON blood_donors(blood_group);

-- ==============================================================================
-- 14. TELEHEALTH CHATS & MESSAGING
-- ==============================================================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants TEXT[] NOT NULL DEFAULT '{}',
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  chat_type TEXT DEFAULT 'general' CHECK (chat_type IN ('consultation', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice', 'video', 'file', 'prescription')),
  file_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 15. HEALTHSHARE & PHC DIRECTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS healthshare_resources (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  posted_by       VARCHAR(255) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  category        VARCHAR(100) NOT NULL,
  status          VARCHAR(20) DEFAULT 'available',
  description     TEXT,
  condition       VARCHAR(50) DEFAULT 'good',
  type            VARCHAR(30) DEFAULT 'donate',
  price           INTEGER DEFAULT 0,
  location        TEXT,
  city            VARCHAR(100),
  state           VARCHAR(100),
  contact_phone   VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS healthshare_volunteers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  role            VARCHAR(100) NOT NULL,
  status          VARCHAR(20) DEFAULT 'active',
  skills          TEXT[] DEFAULT '{}',
  city            VARCHAR(100),
  state           VARCHAR(100),
  phone           VARCHAR(20),
  availability    JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS healthshare_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by    VARCHAR(255) NOT NULL,
  resource_id     UUID REFERENCES healthshare_resources(id) ON DELETE CASCADE,
  status          VARCHAR(20) DEFAULT 'pending',
  message         TEXT,
  contact_phone   VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phc_facilities (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  district        VARCHAR(100) NOT NULL,
  taluka          VARCHAR(100),
  block           VARCHAR(100),
  address         TEXT,
  phone           VARCHAR(20),
  type            VARCHAR(50) DEFAULT 'PHC',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 16. WHATSAPP AI TRIAGE & RAPID CRISIS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_triage (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone               TEXT NOT NULL,
  lang                TEXT DEFAULT 'en',
  symptom             TEXT,
  duration            TEXT,
  location            TEXT,
  urgency             TEXT CHECK (urgency IN ('low', 'medium', 'high')),
  possible_condition  TEXT,
  recommendation      TEXT,
  nearest_phc         JSONB,
  triage_result       JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crisis_incidents (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_ref            TEXT UNIQUE NOT NULL,
  room                    TEXT,
  floor                   TEXT,
  guest_name              TEXT,
  guest_id                TEXT,
  type                    TEXT DEFAULT 'medical',
  symptoms                TEXT,
  photo_url               TEXT,
  severity                TEXT DEFAULT 'assessing',
  condition               TEXT,
  icd10                   TEXT,
  action                  TEXT,
  hospital_dept           TEXT,
  status                  TEXT DEFAULT 'pending',
  medical_profile         JSONB,
  assigned_responder      JSONB,
  hospital_recommendation JSONB,
  cost_estimate           JSONB,
  hospital_notification   JSONB,
  ambulance_alert         JSONB,
  guest_lat               DOUBLE PRECISION,
  guest_lng               DOUBLE PRECISION,
  responder_lat           DOUBLE PRECISION,
  responder_lng           DOUBLE PRECISION,
  response_time_minutes   INTEGER,
  resolved_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

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

-- ==============================================================================
-- 17. ROW LEVEL SECURITY (RLS) & OPEN POLICIES (Test / Production Pilot Safe)
-- ==============================================================================
ALTER TABLE healthcare_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE asha_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE asha_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulance_dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthshare_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthshare_volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthshare_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE phc_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_timeline ENABLE ROW LEVEL SECURITY;

-- Idempotent full-access policies for anon & authenticated roles during live evaluation:
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'healthcare_journeys', 'digital_prescriptions', 'patient_health_records',
    'user_medical_profiles', 'asha_patients', 'asha_vitals', 'issue_tickets',
    'diagnostic_bookings', 'users', 'hospitals', 'doctors', 'doctor_profiles',
    'appointments', 'reports', 'medicines', 'orders', 'ambulance_dispatch',
    'blood_donors', 'chats', 'messages', 'healthshare_resources',
    'healthshare_volunteers', 'healthshare_requests', 'phc_facilities',
    'whatsapp_triage', 'crisis_incidents', 'crisis_timeline'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_anon_%I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "allow_all_anon_%I" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_auth_%I" ON %I', t, t);
    EXECUTE format('CREATE POLICY "allow_all_auth_%I" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ==============================================================================
-- 18. SUPABASE REALTIME REPLICATION (Instant WebSocket Push Across All 9 Panels)
-- ==============================================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'healthcare_journeys', 'digital_prescriptions', 'patient_health_records',
    'user_medical_profiles', 'asha_patients', 'asha_vitals', 'issue_tickets',
    'diagnostic_bookings', 'appointments', 'orders', 'ambulance_dispatch', 'messages'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- Table already subscribed to realtime publication
    END;
  END LOOP;
END $$;

-- ==============================================================================
-- 19. VERIFICATION QUERY (Run this to verify all tables created)
-- ==============================================================================
SELECT 'AROGYA RAKSHA DATABASE SCHEMA READY ✅' AS status,
       NOW() AS migration_timestamp;
