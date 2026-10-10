# 🏥 AROGYA RAKSHA AI (आरोग्य रक्षा)
## Complete Technical & Product Documentation (Current Production Version)

> **Platform:** Arogya Raksha — AI-Powered Decentralized Healthcare & Hospital Operating System  
> **Repository:** `ifthekharahmad69-ship-it/arogyaa-rakshaa`  
> **Live Architecture:** Next.js 16 (React 19 + TypeScript) + Express 5 (Node.js) / FastAPI (Python) + Supabase (PostgreSQL) + Upstash Redis + Groq Llama 3.3 + Google Gemini 2.0 Flash + WebAuthn Passkeys  
> **Audience:** Patients, ASHA Workers, Doctors, Hospital Administrators, Pharmacists, Ambulance Operators  

---

## 📋 Table of Contents

1. [Executive Summary & What the Present App Is](#1-executive-summary--what-the-present-app-is)
2. [Explicitly Removed Features (Decommissioned Modules)](#2-explicitly-removed-features-decommissioned-modules)
3. [Current System Architecture](#3-current-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [User Roles & Personas](#5-user-roles--personas)
6. [Core Present Feature Modules](#6-core-present-feature-modules)
   - 6.1 Modern Biometric Passkeys & Universal Auth
   - 6.2 MediBot Multi-Agent AI Clinical Assistant
   - 6.3 AI Doctor & Smart Symptom Checker
   - 6.4 Vision AI Medicine Scanner with Forensic De-Blur
   - 6.5 250,000+ Medicine Intelligence & Drug Search
   - 6.6 9 Clinical Machine Learning Health Predictors
   - 6.7 Medical Report & Prescription AI Analyzer
   - 6.8 Live Journey Radar & Ambulance GPS Telemetry
   - 6.9 Smart Appointments & Care Flow Engine
   - 6.10 200,000+ Geocoded Hospitals & Facility Finder
   - 6.11 Hospital Inpatient Bed & Ward Management System
   - 6.12 Doctor EHR & Clinical Records Console
   - 6.13 Diagnostic Centre Finder & Lab Packages
   - 6.14 Emergency SOS & Crisis Dispatch
   - 6.15 Telemedicine & WebRTC Video Consultations
   - 6.16 Digital Medical Profile & Emergency QR Health ID
   - 6.17 Preventive Health Tracker & Wellness Quiz
   - 6.18 Blood Donors Network
   - 6.19 WhatsApp AI Triage Integration
   - 6.20 23 Official Indian Languages Translation Engine
   - 6.21 Payments Integration (Razorpay)
7. [Backend API Reference](#7-backend-api-reference)
8. [Frontend API Routes Reference](#8-frontend-api-routes-reference)
9. [Database Schema & Data Architecture](#9-database-schema--data-architecture)
10. [Environment Variables & Configuration](#10-environment-variables--configuration)
11. [Local Development & Deployment Guide](#11-local-development--deployment-guide)

---

## 1. Executive Summary & What the Present App Is

**Arogya Raksha** (आरोग्य रक्षा — "Health Protection") is a full-stack, AI-native healthcare operating system designed to eliminate medical access barriers, hospital overcrowding, prescription errors, and rural-urban healthcare divides in India.

The present platform unites **6 primary healthcare stakeholders** into a single cohesive interface:
1. **Citizens / Patients:** Self-triage, symptom check, report analysis, medicine search, smart queue booking, live ambulance radar, emergency SOS, and verifiable medical profile QR codes.
2. **ASHA Field Workers:** Community health tracking, village OPD ticketing, field immunization recording, and referral routing.
3. **Doctors:** Electronic Health Records (EHR), live patient queues, digital prescriptions, lab orders, and AI diagnostic validation.
4. **Hospital Administrators:** Real-time inpatient bed allocation across General, ICU, Emergency, Paediatric, and Maternity wards with an 8-stage admission lifecycle tracker.
5. **Hospital Pharmacists:** Digital prescription dispensing queues, drug inventory, generic medicine alternatives, and delivery logistics.
6. **Ambulance Dispatchers:** Real-time GPS navigation, emergency call handling, triage telemetry, and hospital routing.

---

## 2. Explicitly Removed Features (Decommissioned Modules)

In accordance with system restructuring and streamlining, the following features and dependencies were **permanently removed** from the codebase and are **no longer present**:

| Removed Feature / Module | Former Route / File | Reason for Removal / Replacement |
|---|---|---|
| **Healthcare Navigator** | `/dashboard/healthcare-navigator` | Replaced by direct Care Flow, Doctor Directory, and transparent Inpatient Ward Management. |
| **Voice Agent (Standalone)** | `/dashboard/voice-agent` | Replaced by integrated Whisper Speech-to-Text & Text-to-Speech directly inside **MediBot**. |
| **HealthShare / Resource Sharing** | `/dashboard/healthshare/*` | Removed in favor of official Hospital Inpatient & Pharmacy Stock inventory management. |
| **Media Gallery / Uploads** | `/dashboard/media` | Decommissioned; report files now attach directly to patient EHR and report analyzer. |
| **Elder Care AI Matching** | `/dashboard/elder-care/*` | Streamlined into universal patient medical profiles and ASHA community rosters. |
| **Old Standalone Crisis Flow** | `/dashboard/crisis/*`, `/crisis/*` | Consolidated into the unified `/dashboard/emergency` SOS & real-time `/dashboard/tracking` radar. |
| **PHC Finder (Separate)** | `/dashboard/phc-finder` | Consolidated into the master 200,000+ hospital & clinic directory (`/dashboard/hospitals`). |
| **Standalone Analytics Page** | `/dashboard/analytics` | Embedded directly into role-specific dashboard cards and health tracking quizzes. |
| **Clerk Authentication** | `@clerk/nextjs` | Completely removed; replaced by native **Supabase WebAuthn Biometric Passkeys**, Google OAuth, and Passwordless/Magic Link auth. |

---

## 3. Current System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                             │
│                     Tailwind CSS + React 19 + TS                         │
│                                                                          │
│  ┌─────────────────────────── DASHBOARD ──────────────────────────────┐  │
│  │ Patient │ ASHA Worker │ Doctor EHR │ Hospital Admin │ Pharmacy     │  │
│  │ Ambulance Dispatch │ Live Tracking │ Inpatient Bed Management     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                │                                         │
│   Contexts: UserRoleContext (Passkeys/Auth) │ LanguageContext (23 Langs) │
│             SmartQueueContext │ HealthcareJourneyContext │ RealtimeContext│
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ REST + Socket.io
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     BACKEND SERVICES LAYER                               │
│                                                                          │
│  ┌───────────────────────────┐           ┌────────────────────────────┐  │
│  │ Express 5 (Node.js API)   │           │ FastAPI (Python ML Engine) │  │
│  │ Port 5000 / Render        │           │ 9 Preloaded ML Datasets    │  │
│  │ 20+ REST Route Handlers   │           │ Scikit-Learn Predictors    │  │
│  │ Socket.io Real-Time Hub   │           │ Pandas / NumPy Inference   │  │
│  └─────────────┬─────────────┘           └─────────────┬──────────────┘  │
└────────────────┼───────────────────────────────────────┼─────────────────┘
                 ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  DATA & CLOUD INFRASTRUCTURE                             │
│                                                                          │
│  • Supabase (PostgreSQL with Row Level Security & Storage)               │
│  • Upstash Redis (Session caching, query caching, API rate limiting)     │
│  • Groq Cloud (Llama 3.3 70B Versatile, Mixtral 8x7B)                    │
│  • Google Gemini 2.0 Flash (OCR & Multimodal Vision Analysis)            │
│  • Razorpay Payment Gateway (Consultation tokens & medicine orders)      │
│  • Twilio Webhooks (WhatsApp AI emergency triage)                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4, Lucide React icons
- **State & Contexts:** React Context (`UserRoleContext`, `LanguageContext`, `LocationContext`, `SmartQueueContext`, `HealthcareJourneyContext`, `RealtimeContext`)
- **Maps:** Leaflet & React-Leaflet with OpenStreetMap tiles
- **Client AI:** Groq SDK, Web Speech API (STT), Web Audio API (TTS)
- **Real-Time Client:** Socket.io Client
- **Payments:** Razorpay Checkout JS SDK

### Backend
- **Node.js Gateway:** Express 5, HTTP Server, Socket.io
- **Python ML Service:** FastAPI, Uvicorn, Scikit-Learn, Pandas, NumPy
- **Security:** Helmet, CORS, Express Rate Limit, Compression
- **Database:** Supabase PostgreSQL with RLS, Database triggers, and Foreign keys
- **Caching:** Redis / Upstash Redis
- **Authentication:** WebAuthn (SimpleWebAuthn / Supabase Auth), Google OAuth, JWT

---

## 5. User Roles & Personas

The application features instant, zero-latency role switching (`useUserRole`) that immediately adapts the entire navigation, sidebar, and dashboard view:

```
                  ┌──────────────────────┐
                  │    UserRoleContext   │
                  └──────────┬───────────┘
         ┌────────────┬──────┴───────┬────────────┬─────────────┐
         ▼            ▼              ▼            ▼             ▼
    🧑‍⚕️ Patient   👩‍🌾 ASHA      👨‍⚕️ Doctor   🏥 Admin   💊 Pharmacy   🚑 Ambulance
```

1. **Patient (`patient`):**
   - Personal health metrics, emergency SOS, MediBot assistant, symptom analyzer, medicine finder, appointment booking, report upload, and digital medical ID.
2. **ASHA Field Desk (`asha`):**
   - Community health tracking, village OPD queue monitor, field visits checklist, immunization registers, and emergency hospital referrals.
3. **Doctor Console (`doctor`):**
   - Live waiting room queue, patient electronic health records (EHR), AI diagnostic suggestions, digital prescription writing, and lab test requisitions.
4. **Hospital Admin (`hospital_admin`):**
   - Operational bed occupancy dashboard, inpatient admissions, ward distribution (General, ICU, Emergency, Paediatric, Maternity), doctor duty rosters, and pharmacy stock overview.
5. **Pharmacy Console (`pharmacy`):**
   - Digital prescription processing, medicine dispensing counter, inventory tracking, generic substitute lookup, and village delivery radar.
6. **Ambulance Dispatcher (`ambulance`):**
   - Active emergency calls, turn-by-turn GPS routing, patient vitals monitoring in transit, direct hospital emergency desk connectivity, and trip logs.

---

## 6. Core Present Feature Modules

### 6.1 Modern Biometric Passkeys & Universal Auth
- **Passwordless WebAuthn Passkeys:** Allows patients and doctors to sign in seamlessly using device biometrics (Fingerprint, Touch ID, Face ID, Windows Hello).
- **GitHub-Style Passkey Management:** Manage, rename, inspect, and revoke registered passkeys from settings.
- **Google OAuth 2.0:** One-tap sign in via Google.
- **Guest / Public Mode:** Immediate frictionless access to all features without forced authentication walls.

### 6.2 MediBot Multi-Agent AI Clinical Assistant
- **Engine:** Groq Llama 3.3 70B Versatile.
- **Clinical Tool-Calling:** Automatically calls internal functions to lookup medicines, locate nearby emergency hospitals, verify symptoms, and book queue tokens.
- **Multimodal Voice Interaction:** Built-in Speech-to-Text (STT) and dynamic natural Text-to-Speech (TTS) voice playback.

### 6.3 AI Doctor & Smart Symptom Checker
- **Route:** `/dashboard/symptoms`
- **Triage Pipeline:** Input symptoms (fever, chest tightness, rash, cough) -> Algorithmic urgency assessment (`mild`, `moderate`, `severe`, `emergency`).
- **Clinical Suggestions:** Differential conditions, recommended specialist departments, safe over-the-counter (OTC) guidelines, and home remedy advice.

### 6.4 Vision AI Medicine Scanner with Forensic De-Blur
- **Route:** `/dashboard/scanner`
- **Forensic Pre-Processing:** Canvas-based contrast enhancement, adaptive grayscale thresholding, and de-blurring filters for low-light smartphone camera captures.
- **Gemini 2.0 Flash Vision OCR:** Extracts brand name, salt formulation, strength, manufacturer, dosage instructions, expiry dates, contraindications, and warnings.

### 6.5 250,000+ Medicine Intelligence & Drug Search
- **Route:** `/dashboard/medicines`
- **Database:** Over 250,000 verified Indian pharmaceutical formulations with A-Z cataloging.
- **Features:** Salt composition lookup, pricing comparison, indications, dosage warnings, and lower-cost generic alternatives.

### 6.6 9 Clinical Machine Learning Health Predictors
- **Route:** `/dashboard/predictors`
- **Trained Datasets & Specialized Models:**
  1. **Diabetes & Heart Risk:** Blood glucose, BMI, age, blood pressure, insulin, cholesterol.
  2. **Dengue Fever Risk:** Platelet counts, fever duration, WBC counts, hematocrit.
  3. **Kidney Disease (CKD):** Serum creatinine, blood urea, albumin, specific gravity.
  4. **Liver Disease:** Bilirubin, alkaline phosphatase, SGOT/SGPT ratios.
  5. **Lung Disease:** Chest symptoms, oxygen saturation, smoking history, peak flow.
  6. **Cancer Screening:** Age, genetic markers, chronic inflammation, abnormal blood cytology.
  7. **Thyroid Cancer Screening:** T3/T4/TSH levels, nodule characteristics.
  8. **Asthma Risk:** Spirometry parameters, wheezing frequency, environmental triggers.
  9. **Mental Health Assessment:** PHQ-9 & GAD-7 clinical depression/anxiety scoring.
- **Autofill Integration:** Automatically pulls biometrics from the patient's digital medical profile.

### 6.7 Medical Report & Prescription AI Analyzer
- **Route:** `/dashboard/reports`
- **Capabilities:** Analyzes CBC blood tests, metabolic panels, lipid profiles, urine chemistry, and doctor prescription slips.
- **Output:** Categorized parameters, abnormal/out-of-range indicators, easy-to-understand explanations, and recommended follow-up tests.

### 6.8 Live Journey Radar & Ambulance GPS Telemetry
- **Route:** `/dashboard/tracking`
- **Real-Time Map:** Interactive Leaflet map streaming live ambulance positions, traffic-optimized routing polylines, speed, driver details, and accurate ETA.
- **Socket.io Streaming:** Sub-second bi-directional telemetry broadcast between dispatchers, drivers, and patients.

### 6.9 Smart Appointments & Care Flow Engine
- **Route:** `/dashboard/appointments`
- **Smart Queue Tokens:** Dynamic token issue, active consulting counter, and live wait-time updates.
- **Unified Care Flow:** Seamlessly transitions patients through Consultation -> Diagnostics Requisition -> Medicine Dispensing -> Follow-up.
- **Integrated Payments:** Secure checkout for token charges and medicines via Razorpay.

### 6.10 200,000+ Geocoded Hospitals & Facility Finder
- **Route:** `/dashboard/hospitals`
- **Multi-Source Geolocation:** GPS -> Local Cache -> IP Geolocation -> Default Center.
- **Filters:** Radius (5km to 50km), facility type (Public/Government, Private, CHC, Eye, Dental, Pediatric), emergency trauma readiness, bed counts, and direct Google Maps navigation.

### 6.11 Hospital Inpatient Bed & Ward Management System
- **Route:** `/dashboard/hospital-management`
- **Wards Supported:** General Ward, ICU, Emergency / Trauma, Paediatric, Maternity.
- **Bed Status Tracking:** Available, Occupied, Reserved, Maintenance.
- **8-Stage Inpatient Admission Pipeline:**
  1. `registered` (Admitted at reception)
  2. `doctor_assigned` (Attending physician linked)
  3. `under_examination` (Clinical evaluation underway)
  4. `diagnostics_ordered` (Lab / imaging requisitioned)
  5. `diagnostics_done` (Results ready & reviewed)
  6. `treatment_ongoing` (Therapy / medication in progress)
  7. `ready_for_discharge` (Clinical sign-off completed)
  8. `discharged` (Patient discharged)

### 6.12 Doctor EHR & Clinical Records Console
- **Route:** `/dashboard/doctor-dashboard` & `/dashboard/doctors`
- **Doctor Directory:** Browse certified doctors by specialty (Cardiology, Pediatrics, Neurology, Orthopedics, General Medicine), OPD timings, ratings, and consultation fees.
- **Clinical Desk:** Review patient history, check diagnostic reports, write prescriptions, and refer patients directly to inpatient admissions.

### 6.13 Diagnostic Centre Finder & Lab Packages
- **Route:** `/dashboard/diagnostic-centre`
- **Packages:** Full Body Health Checkup, Cardiac Profile, Diabetes Health Check, Thyroid Profile, Women's Wellness.
- **Booking Options:** Home sample collection or on-site diagnostic center visits.

### 6.14 Emergency SOS & Crisis Dispatch
- **Route:** `/dashboard/emergency`
- **One-Tap SOS:** Transmits GPS coordinates, patient name, blood type, and emergency contacts to nearest trauma hospitals.
- **Speed Dial Directory:** National Emergency (112), Ambulance (108), Police (100), Women's Helpline (1091), Disaster Management (1077).
- **Crisis Badge:** Quick on-screen emergency medical card showing allergies and blood group.

### 6.15 Telemedicine & WebRTC Video Consultations
- **Route:** `/dashboard/video-call`
- **P2P Video / Audio:** High-definition, low-latency browser-based video consultation powered by WebRTC with in-call messaging, mute, camera toggle, and screen share capabilities.

### 6.16 Digital Medical Profile & Emergency QR Health ID
- **Route:** `/dashboard/profile`
- **Data Points:** Demographics, blood group, chronic conditions, existing medications, known drug allergies, organ donor consent, and emergency contacts.
- **Emergency QR:** Generates a scannable QR code that allows first responders to view life-saving medical data without unlocking the device.
- **Cloud Sync:** Background synchronization to Supabase with local-first offline caching.

### 6.17 Preventive Health Tracker & Wellness Quiz
- **Route:** `/dashboard/quiz`
- **Interactive Quiz:** Evaluates physical activity, sleep cycles, hydration, nutritional balance, and stress levels to compute a personalized Wellness Score and lifestyle recommendations.

### 6.18 Blood Donors Network
- **Endpoints:** `/api/blood-donors`
- **Capabilities:** Search for voluntary blood donors by blood group (A+, A-, B+, B-, AB+, AB-, O+, O-) and city; direct donor registration.

### 6.19 WhatsApp AI Triage Integration
- **Endpoints:** `/api/whatsapp/webhook`
- **Functionality:** Twilio-powered webhook accepting incoming citizen WhatsApp messages, classifying urgency, saving records into `whatsapp_triage`, and dispatching AI-guided triage instructions.

### 6.20 23 Official Indian Languages Translation Engine
- **Supported Languages:** English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali, Bhojpuri, Gujarati, Punjabi, Odia, Assamese, Urdu, Malayalam, Maithili, Santali, Konkani, Dogri, Kashmiri, Manipuri, Nepali, Sindhi, Sanskrit.
- **Architecture:** Instant UI switching with fallback dictionary and dynamic neural translation via Groq / MyMemory API with local persistent caching.

### 6.21 Payments Integration (Razorpay)
- **Integration:** Official Razorpay Checkout JS SDK integrated with `/api/payment` for generating orders, verifying signatures, and managing payments for doctor consultations and medicine orders.

---

## 7. Backend API Reference

### Express 5 (Node.js API) — Root: `/api`

| Endpoint | Method | Purpose | Authentication |
|---|---|---|---|
| `/` | `GET` | API Health & Service Information | Public |
| `/health` | `GET` | Health status (Supabase & Redis connection) | Public |
| `/auth/register` | `POST` | Register user account | Public |
| `/auth/login` | `POST` | Sign in with email/password | Public |
| `/auth/passkey/register-options` | `POST` | WebAuthn passkey registration options | Authenticated |
| `/auth/passkey/verify-registration` | `POST` | Verify and save new WebAuthn passkey | Authenticated |
| `/auth/passkey/auth-options` | `POST` | WebAuthn passkey login challenge | Public |
| `/auth/passkey/verify-auth` | `POST` | Verify passkey assertion & issue JWT | Public |
| `/users/me` | `GET`, `PUT` | Get / update user profile | Authenticated |
| `/hospitals` | `GET` | Query geocoded hospitals with radius filters | Public |
| `/reports/upload` | `POST` | Upload and parse medical lab report | Authenticated |
| `/reports/user/:id` | `GET` | Fetch user medical reports history | Authenticated |
| `/medicines/search` | `GET` | Search 250,000+ medicine database | Public |
| `/medicines/:id` | `GET` | Get detailed medicine info & alternatives | Public |
| `/ai/chat` | `POST` | MediBot clinical conversation | Public / Auth |
| `/emergency/sos` | `POST` | Broadcast emergency SOS alert | Public / Auth |
| `/blood-donors/search` | `GET` | Search blood donors by group & city | Public |
| `/blood-donors/register` | `POST` | Register as voluntary blood donor | Authenticated |
| `/doctor-profiles` | `GET` | List verified doctor profiles & specialties | Public |
| `/medical-profile` | `GET`, `POST` | Get / upsert comprehensive medical profile | Authenticated |
| `/notifications` | `GET` | Fetch unread user notifications | Authenticated |
| `/whatsapp/webhook` | `POST` | Incoming Twilio WhatsApp triage webhook | Twilio Sig |
| `/predict/:type` | `POST` | Execute ML risk predictor inference | Public |
| `/queue/token` | `POST` | Issue smart OPD queue token | Public / Auth |
| `/queue/status/:id` | `GET` | Get live queue status and estimated wait | Public |
| `/tickets` | `GET`, `POST` | Manage ASHA & OPD patient tickets | Authenticated |
| `/admissions` | `GET`, `POST` | Inpatient hospital admissions management | Hospital Admin |
| `/admissions/:id/status`| `PATCH`| Transition admission through 8 clinical stages | Hospital Admin |
| `/beds` | `GET`, `POST` | Query & update ward bed occupancy | Hospital Admin |
| `/orders` | `GET`, `POST` | Pharmacy and prescription orders | Authenticated |

---

## 8. Frontend API Routes Reference

Next.js internal API edge handlers located at `frontend/src/app/api`:

| Route | Method | Purpose |
|---|---|---|
| `/api/agent` | `POST` | Groq Llama 3.3 multi-tool clinical agent |
| `/api/analyze-report` | `POST` | Gemini 2.0 Flash medical lab report analyzer |
| `/api/chat` | `POST` | Direct conversational doctor AI endpoint |
| `/api/hospitals` | `GET` | Geocoded hospital caching and distance sort |
| `/api/medicines` | `GET` | Fast local medicine dataset search |
| `/api/multi-agent` | `POST` | Multi-agent collaborative diagnostic triage |
| `/api/notify` | `POST` | Internal event notification dispatcher |
| `/api/payment` | `POST` | Razorpay order creation and verification |
| `/api/predict` | `POST` | Next.js proxy to Python/Express ML predictors |
| `/api/push` | `POST` | Web Push notification subscription and push |
| `/api/quiz` | `POST` | Wellness lifestyle quiz scoring |
| `/api/scan-medicine` | `POST` | Vision OCR medicine strip processing |
| `/api/speech-to-text` | `POST` | Audio voice file transcription |
| `/api/text-to-speech` | `POST` | Text synthesis to natural Indian voice audio |
| `/api/symptoms` | `POST` | Algorithmic symptom analysis and triage |
| `/api/translate` | `POST` | Real-time translation across 23 languages |

---

## 9. Database Schema & Data Architecture

The application uses **Supabase (PostgreSQL)** with Row Level Security (RLS). Primary schemas and tables include:

```sql
-- Core User & Auth Profiles
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient', -- patient, asha, doctor, hospital_admin, pharmacy, ambulance
  name TEXT NOT NULL,
  phone TEXT,
  badge_id TEXT,
  hospital_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WebAuthn Biometric Passkeys
CREATE TABLE user_passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  counter BIGINT DEFAULT 0,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Universal Medical Profile & Emergency ID
CREATE TABLE medical_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blood_group TEXT,
  age INTEGER,
  gender TEXT,
  chronic_conditions TEXT[],
  allergies TEXT[],
  current_medications TEXT[],
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  qr_code_data TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hospital Inpatient Beds & Admissions
CREATE TABLE hospital_beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name TEXT NOT NULL,
  bed_number TEXT NOT NULL,
  ward TEXT NOT NULL, -- General, ICU, Emergency, Paediatric, Maternity
  bed_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, reserved, maintenance
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE hospital_admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_age INTEGER,
  patient_gender TEXT,
  hospital_name TEXT NOT NULL,
  assigned_doctor_name TEXT,
  bed_number TEXT,
  ward TEXT,
  severity TEXT NOT NULL DEFAULT 'moderate', -- mild, moderate, severe, critical
  chief_complaint TEXT,
  status TEXT NOT NULL DEFAULT 'registered',
  timestamps JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Smart OPD Queue & Tokens
CREATE TABLE opd_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  doctor_id UUID REFERENCES users(id),
  department TEXT NOT NULL,
  status TEXT DEFAULT 'waiting', -- waiting, consulting, completed, skipped
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Emergency Triage
CREATE TABLE whatsapp_triage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'low',
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 10. Environment Variables & Configuration

### Frontend (`frontend/.env.local`)
```ini
NEXT_PUBLIC_API_URL=https://arogya-raksha-n89v.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### Backend (`backend/.env`)
```ini
PORT=5000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
REDIS_URL=rediss://default:token@your-redis-host.upstash.io:6379
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

---

## 11. Local Development & Deployment Guide

### Running Locally

```bash
# 1. Start Backend (Node.js Express + Socket.io)
cd backend
npm install
npm run dev

# 2. (Optional) Run Python ML Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload

# 3. Start Frontend (Next.js 16)
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Production Deployment
- **Frontend:** Deployed on **Vercel** with Next.js edge runtime optimizations.
- **Backend:** Deployed on **Render** (Node.js Web Service + Docker container option).
- **Database:** **Supabase** Managed PostgreSQL.
- **Cache:** **Upstash Redis**.
