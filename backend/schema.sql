-- ============================================================
-- Arogya Raksha - COMPLETE Supabase PostgreSQL Schema
-- Paste this ENTIRE query in Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DROP old tables (in reverse dependency order)
-- ============================================================
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS blood_donors CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS medicines CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  phone TEXT,
  avatar TEXT,
  health_profile JSONB DEFAULT '{}',
  preferred_language TEXT DEFAULT 'en',
  location JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. HOSPITALS
-- ============================================================
CREATE TABLE hospitals (
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
  total_beds INTEGER,
  available_beds INTEGER,
  image TEXT,
  location JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. DOCTORS
-- ============================================================
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_id TEXT UNIQUE NOT NULL,
  specialization TEXT NOT NULL,
  qualification TEXT,
  experience INTEGER,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT false,
  consultation_fee NUMERIC,
  rating NUMERIC DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  availability JSONB DEFAULT '[]',
  languages TEXT[] DEFAULT '{}',
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. APPOINTMENTS (stores who booked with their email)
-- ============================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_name TEXT,
  patient_email TEXT,
  patient_phone TEXT,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL,
  time_slot JSONB DEFAULT '{}',
  department TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'uploaded', 'verified', 'failed')),
  payment_proof TEXT,
  notes TEXT,
  prescription TEXT,
  follow_up TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. REPORTS
-- ============================================================
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'other' CHECK (type IN ('blood_test', 'scan', 'lab', 'prescription', 'other')),
  title TEXT,
  file_url TEXT,
  extracted_text TEXT,
  analysis JSONB DEFAULT '{}',
  ai_insights TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. MEDICINES
-- ============================================================
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  usage TEXT[] DEFAULT '{}',
  dosage TEXT,
  side_effects TEXT[] DEFAULT '{}',
  precautions TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  market_price NUMERIC,
  alternatives TEXT[] DEFAULT '{}',
  manufacturer TEXT,
  prescription_required BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. BLOOD DONORS
-- ============================================================
CREATE TABLE blood_donors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- ============================================================
-- 8. CHATS
-- ============================================================
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants UUID[] NOT NULL DEFAULT '{}',
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  chat_type TEXT DEFAULT 'general' CHECK (chat_type IN ('consultation', 'general')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. MESSAGES
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice', 'video', 'file', 'prescription')),
  file_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. ORDERS (stores every order with user name, email, phone)
-- ============================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  order_type TEXT DEFAULT 'medicine' CHECK (order_type IN ('medicine', 'consultation', 'lab_test', 'other')),
  items JSONB DEFAULT '[]',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_id TEXT,
  payment_order_id TEXT,
  payment_signature TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  shipping_address JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient_email ON appointments(patient_email);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_blood_donors_user_id ON blood_donors(user_id);
CREATE INDEX idx_blood_donors_blood_group ON blood_donors(blood_group);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_chats_participants ON chats USING GIN(participants);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_user_email ON orders(user_email);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_id ON orders(payment_id);


-- Full text search on medicines
CREATE INDEX idx_medicines_fts ON medicines USING GIN(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(generic_name, '') || ' ' || coalesce(category, ''))
);

-- ============================================================
-- 12. HEALTH SCHEMES
-- ============================================================
CREATE TABLE health_schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_name TEXT NOT NULL,
  description TEXT,
  benefits TEXT,
  eligibility TEXT,
  state TEXT,
  district TEXT,
  official_link TEXT,
  category TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_schemes_state ON health_schemes(state);
CREATE INDEX idx_health_schemes_category ON health_schemes(category);
CREATE INDEX idx_health_schemes_status ON health_schemes(status);
CREATE INDEX idx_health_schemes_fts ON health_schemes USING GIN(
  to_tsvector('english', coalesce(scheme_name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(eligibility,''))
);

-- ============================================================
-- SEED DATA: health_schemes
-- ============================================================
INSERT INTO health_schemes (scheme_name, description, benefits, eligibility, state, district, official_link, category, status) VALUES
('Ayushman Bharat - PMJAY', 'Pradhan Mantri Jan Arogya Yojana provides health cover of Rs 5 lakh per family per year for secondary and tertiary care hospitalization.', 'Free treatment at empanelled hospitals up to Rs 5 lakh per year. Covers pre and post hospitalization expenses. Cashless and paperless access.', 'Bottom 40% of poor and vulnerable population as per SECC 2011 data.', 'All India', 'All Districts', 'https://pmjay.gov.in', 'insurance', 'active'),
('YSR Aarogyasri', 'Andhra Pradesh government health insurance scheme covering serious ailments for BPL families.', 'Cashless treatment up to Rs 5 lakh. Covers 2,446 procedures including surgeries and therapies. Transport allowance of Rs 1,000.', 'Families with annual income below Rs 5 lakh in Andhra Pradesh. Must hold Aarogyasri health card.', 'Andhra Pradesh', 'All Districts', 'https://www.ysraarogyasri.ap.gov.in', 'insurance', 'active'),
('Janani Suraksha Yojana', 'A safe motherhood intervention under NHM promoting institutional delivery among poor pregnant women.', 'Cash assistance of Rs 1,400 (rural) / Rs 1,000 (urban) for institutional delivery. Free delivery and C-section at government hospitals.', 'All pregnant women in LPS states. BPL pregnant women aged 19+ in HPS states. SC/ST women in all states.', 'All India', 'All Districts', 'https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=841&lid=309', 'maternity', 'active'),
('Pradhan Mantri Suraksha Bima Yojana', 'Accident insurance scheme offering coverage for death or disability due to accident at a premium of Rs 20/year.', 'Rs 2 lakh for accidental death. Rs 2 lakh for total permanent disability. Rs 1 lakh for partial permanent disability.', 'Any individual aged 18-70 years with a bank account. Auto-debit of Rs 20/year from bank account.', 'All India', 'All Districts', 'https://financialservices.gov.in/insurance-divisions/Government-Sponsored-Socially-Oriented-Insurance-Schemes/Pradhan-Mantri-Suraksha-Bima-Yojana(PMSBY)', 'insurance', 'active'),
('Rashtriya Swasthya Bima Yojana', 'Health insurance for BPL families providing cashless treatment in empanelled hospitals.', 'Coverage up to Rs 30,000 per family per annum. Cashless treatment for most diseases requiring hospitalization. Transport allowance.', 'BPL families as per Planning Commission criteria. MGNREGA workers who have worked for more than 15 days.', 'All India', 'All Districts', 'https://www.india.gov.in/spotlight/rashtriya-swasthya-bima-yojana', 'insurance', 'active'),
('Atal Amrit Abhiyan', 'Assam state health insurance providing free treatment for six critical diseases.', 'Free treatment up to Rs 2 lakh for cancer, heart, kidney, liver diseases, neurosurgery and neonatal diseases. Covers surgeries and therapies.', 'Families with annual income up to Rs 5 lakh in Assam. Valid Aadhaar and BPL certificate needed.', 'Assam', 'All Districts', 'https://atalamrit.assam.gov.in', 'insurance', 'active'),
('Chief Minister Comprehensive Insurance Scheme', 'Tamil Nadu government health insurance for families with annual income below Rs 72,000.', 'Free medical and surgical treatment at empanelled hospitals. Coverage up to Rs 5 lakh. Covers 1,027 procedures including organ transplants.', 'Families with annual income up to Rs 72,000 in Tamil Nadu. Must hold family card.', 'Tamil Nadu', 'All Districts', 'https://www.cmchistn.com', 'insurance', 'active'),
('Pradhan Mantri Matru Vandana Yojana', 'Maternity benefit program providing Rs 5,000 in three installments to pregnant and lactating mothers for first live birth.', 'Rs 5,000 cash incentive in 3 installments during pregnancy and after delivery. Compensates wage loss. Promotes safe delivery practices.', 'Pregnant and lactating women for first live birth. Women aged 19 years and above. Not applicable for government/PSU employees.', 'All India', 'All Districts', 'https://pmmvy.wcd.gov.in', 'maternity', 'active'),
('Mukhyamantri Amrutam Yojana', 'Gujarat government health insurance for BPL families and lower middle class families.', 'Cashless treatment up to Rs 5 lakh per family per year. Covers cardiovascular, neurological, renal, cancer, burns and neonatal diseases.', 'BPL families and families with annual income up to Rs 4 lakh in Gujarat. Must hold MA card or MA Vatsalya card.', 'Gujarat', 'All Districts', 'https://www.magujarat.com', 'insurance', 'active'),
('Karunya Health Scheme', 'Kerala health insurance scheme covering critical illnesses for BPL families.', 'Financial assistance up to Rs 2 lakh for treatment of serious ailments. Covers cancer, heart, liver, kidney diseases and transplants.', 'BPL families in Kerala with annual income below Rs 3 lakh. Must have Karunya Benevolent Fund card.', 'Kerala', 'All Districts', 'https://karunyabhf.kerala.gov.in', 'insurance', 'active'),
('Mahatma Jyotiba Phule Jan Arogya Yojana', 'Maharashtra government health insurance providing cashless treatment to eligible families.', 'Cashless treatment up to Rs 2.5 lakh for 1,134 medical procedures. Free follow-up treatment for 10 days post discharge.', 'Families holding yellow/orange ration cards in Maharashtra. Annual family income below Rs 1 lakh.', 'Maharashtra', 'All Districts', 'https://www.jeevandayee.gov.in', 'insurance', 'active'),
('Biju Swasthya Kalyan Yojana', 'Odisha state health assurance scheme for all residents of the state.', 'Free treatment up to Rs 5 lakh per family per year. Women get additional Rs 5 lakh. Covers all government and empanelled private hospitals.', 'All families of Odisha state. No income criteria. Aadhaar-linked ration card or SECC data.', 'Odisha', 'All Districts', 'https://bsky.odisha.gov.in', 'insurance', 'active'),
('Ayushman Bharat Health and Wellness Centres', 'Comprehensive primary health care including maternal health, child health, non-communicable diseases, and free essential drugs.', 'Free OPD consultations and basic diagnostics. Free essential medicines and lab tests. Yoga and wellness activities. Teleconsultation facilities.', 'All citizens of India. No income criteria. Walk-in at any Health and Wellness Centre.', 'All India', 'All Districts', 'https://ab-hwc.nhp.gov.in', 'primary_care', 'active'),
('Pradhan Mantri Jan Aushadhi Yojana', 'Dedicated stores providing quality generic medicines at affordable prices up to 50-90% less than branded medicines.', 'Quality medicines at 50-90% less cost. Over 1,800 medicines and 280+ surgical items. All Jan Aushadhi stores follow quality standards.', 'All citizens can purchase medicines. No eligibility criteria. Available at Jan Aushadhi Kendras across India.', 'All India', 'All Districts', 'https://janaushadhi.gov.in', 'medicines', 'active'),
('National Programme for Prevention and Control of Cancer, Diabetes, CVD & Stroke', 'National programme for screening and management of non-communicable diseases at population level.', 'Free screening for diabetes, hypertension and common cancers at CHCs and PHCs. Free treatment and follow-up. Health education and awareness.', 'All citizens above 30 years of age. Priority to high-risk groups. Available at all district NCD clinics.', 'All India', 'All Districts', 'https://main.mohfw.gov.in/Major-Programmes/non-communicable-diseases-injury-trauma/Non-Communicable-Disease-II/National-Programme-for-Prevention-and-Control-of-Cancer-Diabetes-Cardiovascular-diseases-and-Stroke-NPCDCS', 'screening', 'active');
