# 🏥 AROGYA RAKSHA AI
## Complete Project Documentation
### HacksPrix Season 3 | Team Sameer X | Gen AI & ML Track

> **Version:** HacksPrix Edition (June 2026)
> **Repo:** https://github.com/ifthekharahmad69-ship-it/AROGYA-RAKSHAA-AI
> **Deployment:** Coming soon during hackathon
> **Stack:** Next.js 16 + Express 5 + Supabase + Redis + Groq AI

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Feature Modules](#4-feature-modules)
   - 4.1 MediBot AI Agent
   - 4.2 AI Doctor & Symptom Checker
   - 4.3 Vision AI Medicine Scanner
   - 4.4 ML Health Predictors
   - 4.5 Crisis Response System
   - 4.6 Elder Care AI Matching
   - 4.7 ASHA Workers Portal
   - 4.8 PHC Finder
   - 4.9 HealthShare Resource Sharing
   - 4.10 Blood Donors Network
   - 4.11 Hospital Discovery & Maps
   - 4.12 Medicine Intelligence
   - 4.13 Doctor Platform & Appointments
   - 4.14 Real-time Chat & Video
   - 4.15 Healthcare Navigator
   - 4.16 Medical Profile & Emergency ID
   - 4.17 Diagnostic Centre
   - 4.18 Health Analytics & Quiz
   - 4.19 Multilingual Support
   - 4.20 Payments Integration
5. [Backend API Reference](#5-backend-api-reference)
6. [Frontend API Routes](#6-frontend-api-routes)
7. [Database Schema](#7-database-schema)
8. [Backend Services](#8-backend-services)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Deployment & Infrastructure](#10-deployment--infrastructure)
11. [Environment Variables](#11-environment-variables)
12. [Setup Guide](#12-setup-guide)

---

## 1. Project Overview

**Arogya Raksha** (आरोग्य रक्षा — "Health Protection") is a full-stack, AI-powered healthcare platform built to serve 1.4 billion Indians. It combines agentic AI, real-time emergency response, community health tools, and multilingual support into a single production-grade system.

### Key Metrics

| Metric | Value |
|---|---|
| Medicines in Database | 250,000+ |
| Health Facilities | 200,000+ |
| Indian Languages Supported | 8 |
| AI Features | 10+ |
| Backend API Routes | 25 |
| Frontend Pages | 24 |
| Backend Services | 9 |
| Database Tables | 12+ |
| Frontend API Routes | 16 |

### Multilingual Support

| Code | Language | Region |
|------|----------|--------|
| `en` | English | Pan-India |
| `hi` | Hindi | North India |
| `te` | Telugu | Andhra Pradesh, Telangana |
| `ta` | Tamil | Tamil Nadu |
| `kn` | Kannada | Karnataka |
| `mr` | Marathi | Maharashtra |
| `bn` | Bengali | West Bengal |
| `bho` | Bhojpuri | Bihar, UP |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                     │
│                      Deployed on Vercel                      │
│                                                              │
│  Dashboard (24 pages) │ MediBot Agent │ Crisis SOS           │
│  ──────────────────────────────────────────────────────      │
│  Contexts: Language │ Location │ Theme                       │
│  Libs: groqAgent │ groqKeyManager │ firebase │ api.ts        │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Express 5 + Node.js)               │
│                   Deployed on Render Singapore               │
│                                                              │
│  Middleware: Helmet │ CORS │ Rate Limit │ Compression        │
│  ──────────────────────────────────────────────────────      │
│  25 API Route Modules │ 9 Services │ 9 Data Models           │
│  Socket.io WebSocket Server                                  │
└──────────────────────────┬───────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  Supabase (PG)       Redis Cloud         Groq AI
  12+ Tables          Caching             Llama 3.3 70B
  RLS enabled         Rate limit          Llama 4 Scout Vision
```

### Request Flow
```
User → Next.js Page → Clerk Auth → Express Backend
     → Redis Cache Check → Supabase / Groq AI
     → Response → Socket.io broadcast (if real-time)
```

---

## 3. Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.6 | React framework, App Router, SSR |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Framer Motion | 12.36.0 | Animations |
| Clerk | 7.0.4 | Authentication (Google SSO) |
| Leaflet + React-Leaflet | 1.9.4 / 5.0.0 | Interactive maps |
| Recharts | 3.8.1 | Data visualization |
| Socket.io Client | 4.8.3 | Real-time communication |
| Groq SDK | 1.1.1 | Client-side AI |
| Firebase | 12.12.1 | Push notifications (FCM) |
| Razorpay | 2.9.6 | Payment processing |
| Lucide React | 0.577.0 | Icons |
| QRCode.react | 4.2.0 | QR code generation |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Express | 5.2.1 | HTTP server |
| Supabase JS | 2.101.1 | PostgreSQL client |
| Groq SDK | 1.1.2 | AI inference |
| IORedis | 5.10.1 | Redis caching |
| Socket.io | 4.8.3 | WebSocket server |
| Cloudinary | 2.9.0 | Media CDN |
| Clerk Express | 2.1.1 | Auth middleware |
| Resend | 6.10.0 | Transactional emails |
| Helmet | 8.1.0 | Security headers |
| Multer | 2.1.1 | File uploads |
| Compression | 1.8.1 | Gzip (60–80% reduction) |

### Infrastructure

| Service | Purpose |
|---|---|
| Supabase | PostgreSQL database with Row Level Security |
| Redis Cloud | Response caching (TTL 300s), rate limiting |
| Cloudinary | Media storage — images, videos, avatars |
| Firebase Cloud Messaging | Push notifications, SOS alerts |
| Vercel | Frontend hosting, edge functions |
| Render (Singapore) | Backend API hosting |

---

## 4. Feature Modules

### 4.1 🤖 MediBot AI Agent

**File:** `frontend/src/lib/groqAgent.js` (631 lines)
**Component:** `frontend/src/components/MediBotAgent.jsx` (34KB)

A true tool-calling agentic AI chatbot — not just a chatbot, it *acts*.

**Architecture:**
```
User Message → System Prompt (language-aware)
  → Groq LLM Call #1 (with 8 tools, tool_choice: "auto")
    → Tool Calls detected? → executeToolCall()
      → Groq LLM Call #2 (summarize tool results)
        → Final Response + UI Actions
```

**8 Tool Functions:**

| Tool | Parameters | UI Action |
|------|-----------|-----------|
| `book_appointment` | doctor, specialty, date, time, reason | Opens booking form |
| `suggest_medicines` | symptoms[], severity, age_group | Shows medicine list |
| `scan_medicine` | medicine_name, query_type | Shows drug info |
| `navigate_to_page` | page (12 destinations) | In-app navigation |
| `play_health_quiz` | topic, difficulty, num_questions | Opens quiz |
| `analyze_medical_image` | image_type, analysis_focus | Image analysis |
| `find_nearby_hospitals` | facility_type, specialty, radius | Opens hospital map |
| `get_health_tips` | category, condition | Shows tips |

**Model:** Groq Llama 3.3 70B Versatile
**Key Features:**
- Floating chat bubble (bottom-right)
- Image upload for medical image analysis
- Language-aware responses (8 languages)
- Auto multi-key rotation on rate limit
- Streaming text generation support

---

### 4.2 🩺 AI Doctor & Symptom Checker

**Backend Route:** `backend/routes/health.js`
**Frontend Page:** `frontend/src/app/dashboard/symptoms/`
**Frontend API:** `frontend/src/app/api/symptoms/route.ts`

Structured AI-powered medical diagnosis pipeline:

```
Symptoms Input
  → Groq Llama 3.3 70B
    → JSON Output:
       • Possible conditions (ranked by probability)
       • Recommended medicines
       • Urgency level (Low / Medium / High / Emergency)
       • Home remedies
       • When to see a doctor
```

**AI Agents Available:**
| Agent | Model | Purpose |
|-------|-------|---------|
| `symptomChecker` | Llama 3.3 70B | Symptom → diagnosis pipeline |
| `generalHealth` | Llama 3.3 70B | Conversational health assistant |
| `emergencyAgent` | Llama 3.3 70B | Emergency triage & first aid |
| `medicineAdvisor` | Llama 3.3 70B | Drug info, dosage, alternatives |
| `reportAnalyzer` | Llama 3.3 70B | Medical report parsing |
| `diabetesPredictor` | Llama 3.3 70B | Risk assessment + health plan |

---

### 4.3 📸 Vision AI Medicine Scanner

**Frontend API:** `frontend/src/app/api/scan-medicine/route.ts`
**Frontend Page:** `frontend/src/app/dashboard/scanner/`

Camera-based medicine identification using Vision AI:

```
Camera/Upload → Base64 Image
  → Vision Models (tried in order):
    1. meta-llama/llama-4-scout-17b-16e-instruct
    2. llama-3.2-11b-vision-preview
    3. llama-3.2-90b-vision-preview
  → Rotate API keys on rate limit (429)
  → Returns: drug name, dosage, uses, side effects, warnings
```

Also handles: prescriptions, lab reports, X-rays, skin conditions.

---

### 4.4 📊 ML Health Predictors

**Backend Route:** `backend/routes/predict.js`
**Backend Service:** `backend/services/predictorDatasets.js` + `costEstimationService.js`
**Frontend API:** `frontend/src/app/api/predict/route.ts`
**Frontend Page:** `frontend/src/app/dashboard/predictors/`

**9 Predictor Datasets (preloaded into memory on server start):**

| Predictor | Algorithm | Inputs |
|-----------|-----------|--------|
| Diabetes | Logistic scoring | glucose, BP, BMI, age, insulin, pregnancies |
| Heart Disease | Risk scoring | age, cholesterol, BP, chest pain |
| Cancer | Rule-based | symptoms, risk factors |
| Kidney Disease | Rule-based | creatinine, albumin, BP |
| Liver Disease | Rule-based | bilirubin, enzymes |
| Lung Disease | Rule-based | smoking, symptoms |
| Mental Health | Scoring | PHQ-9 style questions |
| Thyroid | TSH-based | TSH level, symptoms |
| Dengue | Rule-based | fever pattern, symptoms |

**Cost Estimator (KNN Algorithm):**
- Dataset: `medical_costs.csv`
- k=20 nearest neighbors
- Factors: age, sex, BMI, smoker status, children count
- Output: USD + INR estimate + EMI options (6/12/24 months)

---

### 4.5 🚨 Crisis Response System

**Backend Route:** `backend/routes/crisis.js` (40KB — largest route file)
**Frontend Pages:** `frontend/src/app/crisis/` + `frontend/src/app/dashboard/crisis/`
**Responder App:** `frontend/src/app/responder/`
**Hospital Portal:** `frontend/src/app/hospital/portal/`

**8-Step Automated Pipeline:**

```
Step 1: QR Scan SOS (no login required)
  → Pre-fills room/floor metadata
  → Loads medical profile from DB

Step 2: Incident Creation (POST /api/crisis/create)
  → Generates INC{timestamp} reference
  → Socket.io broadcasts 'new_incident' to staff

Step 3: AI Enrichment (POST /api/crisis/enrich/:id)
  → Groq AI assesses severity: critical/high/medium/low
  → ICD-10 condition code mapping
  → Hospital department recommendation

Step 4: Hospital Bridge (auto)
  → Socket.io → 'hospital_portal' room
  → Pre-arrival alert with full patient data
  → Medical history, severity, ICD-10 code

Step 5: Smart Staff Assignment (POST /api/crisis/assign/:id)
  → Finds available responders by role
  → Priority: Doctor > Manager > Security
  → Socket.io alert to assigned responder

Step 6: Responder Actions (status transitions)
  → assigned → accepted → enroute → arrived → resolved
  → GPS location relayed via Socket.io in real-time

Step 7: Hospital Acknowledgment
  → Confirms bed number, responder, ETA
  → Socket.io pushes to incident room

Step 8: Resolution
  → Calculates response_time_minutes
  → Frees assigned responder
  → Incident status → resolved
```

**Demo Responders:**
| ID | Name | Role |
|----|------|------|
| R001 | Arjun Sharma | Security Guard |
| R002 | Priya Nair | Floor Manager |
| R003 | Dr. Mehta | In-House Doctor |
| R004 | Suresh Kumar | Security Guard |
| R005 | Ananya Singh | Duty Manager |

---

### 4.6 👴 Elder Care AI Matching System

**Backend Route:** `backend/routes/elderCare.js` (657 lines)
**Frontend Pages:** `frontend/src/app/dashboard/elder-care/` (6 sub-pages)
**Schema:** `backend/elder_care_schema.sql`

**Smart Matching Algorithm (Score 0–100):**

| Factor | Max Points | Logic |
|--------|-----------|-------|
| Distance | 40 pts | ≤2km=40, ≤5km=30, ≤10km=15, ≤20km=5 |
| Skill Match | 30 pts | Condition↔Skill keyword mapping (diabetes, hypertension, dementia, etc.) |
| Language | 20 pts | State→language mapping (Telangana=Telugu, etc.) |
| Budget | 10 pts | salary_expectation ≤ budget=10pts, ≤120%=5pts |

**Entities:**
- **Elder Profile:** conditions, mobility, medicine_schedule, emergency_contacts, budget
- **Caregiver Profile:** skills, languages, experience_years, salary_expectation, rating
- **Match:** score, distance_km, status (suggested/hired/rejected)
- **Tasks:** health_check, medicine_delivery, hospital_visit (auto-generated on hire)
- **Alerts:** manual/vitals/medicine types with severity levels

**Pages:**
- `/dashboard/elder-care` — Family dashboard
- `/dashboard/elder-care/register-elder` — Register elderly person
- `/dashboard/elder-care/register-caregiver` — Register as caregiver
- `/dashboard/elder-care/directory` — Browse caregivers
- `/dashboard/elder-care/matches` — View AI matches
- `/dashboard/elder-care/[id]` — Elder detail view

---

### 4.7 👥 ASHA Workers Portal

**Backend Route:** `backend/routes/asha.js`
**Frontend Page:** `frontend/src/app/dashboard/asha/`
**Schema:** `backend/asha_schema.sql`

Digital toolkit for India's ~1 million Accredited Social Health Activists:

**Features:**
- Register and manage village patients
- Log vitals: BP (systolic/diastolic), sugar level, weight, temperature, notes
- **Auto risk assessment:**
  - BP systolic > 140 OR diastolic > 90 → **HIGH risk**
  - BP systolic > 130 OR sugar > 200 → **MEDIUM risk**
  - Otherwise → **LOW risk**
- Dashboard: total patients, high-risk patient count
- Vitals history per patient (last 30 records)

**Pages:**
- `/dashboard/asha` — ASHA worker dashboard
- `/dashboard/asha/patients` — Patient list
- `/dashboard/asha/register` — Register new patient

---

### 4.8 🏥 PHC Finder (Primary Health Centres)

**Backend Route:** `backend/routes/phc.js`
**Frontend Page:** `frontend/src/app/dashboard/phc-finder/`

Live GPS-based search for government health facilities using **OpenStreetMap Overpass API**:

**Searches for:**
- `amenity=hospital`, `amenity=clinic`, `amenity=health_post`
- `amenity=doctors`, `healthcare=centre`, `healthcare=clinic`
- Way (building-level) hospitals

**Returns (sorted by distance):**
- Facility name, coordinates, address
- Phone number, emergency status
- Distance from user in km
- Up to 30 nearest results

**Tech:** Haversine formula for distance calculation, 20-second timeout

---

### 4.9 🤝 HealthShare — Community Resource Sharing

**Backend Route:** `backend/routes/healthshare.js`
**Frontend Pages:** `frontend/src/app/dashboard/healthshare/` (4 sub-pages)
**Schema:** `backend/healthshare_schema.sql`

Community platform for sharing medical equipment and volunteers:

**Resource Types:** donate / lend / request
**Categories:** wheelchair, oxygen cylinder, crutches, BP monitor, nebulizer, etc.
**Conditions:** new / good / fair / needs_repair

**Entities:**
- **Resources:** title, category, condition, type, price, city, contact
- **Volunteers:** full_name, role, skills[], city, availability
- **Requests:** resource_id, message, contact_phone, status

**Pages:**
- `/dashboard/healthshare` — Browse resources
- `/dashboard/healthshare/new` — Post a resource
- `/dashboard/healthshare/directory` — Full directory
- `/dashboard/healthshare/volunteers` — Volunteer list
- `/dashboard/healthshare/volunteers/register` — Register as volunteer

---

### 4.10 🩸 Blood Donors Network

**Backend Route:** `backend/routes/bloodDonors.js`
**Model:** `backend/models/BloodDonor.js`

**Features:**
- Register as blood donor (blood group, phone, city, state, GPS location)
- Search donors by blood group + city
- Toggle availability (available/unavailable) in real-time
- Enriched results with donor name from user profile

**Blood Groups Supported:** A+, A-, B+, B-, AB+, AB-, O+, O-

---

### 4.11 🗺 Hospital Discovery & Maps

**Backend Route:** `backend/routes/hospitals.js`
**Service:** `backend/services/nearbyHospitals.js`
**Frontend Page:** `frontend/src/app/dashboard/hospitals/`
**Data:** `frontend/src/data/hospitals/` (200K+ facilities)

**Features:**
- 200,000+ health facilities in database
- Live geolocation with browser GPS
- Interactive Leaflet maps with OpenStreetMap tiles
- Distance-based sorting using Haversine formula
- Filter by specialty, distance radius, hospital type
- Hospital detail cards with departments, ratings, contact

---

### 4.12 💊 Medicine Intelligence

**Backend Route:** `backend/routes/medicines.js`
**Frontend Page:** `frontend/src/app/dashboard/medicines/`
**Data:** `frontend/src/data/medicines/` (A-Z JSON files, 250K+ medicines)
**Scripts:** `backend/scripts/` (seeder scripts)

**Features:**
- 250,000+ medicine database with full-text search
- AI-powered medicine Q&A (Groq LLM)
- Search by name, generic name, category, condition
- Medicine details: uses, dosage, side effects, alternatives, pricing
- Camera-based medicine scanner (Vision AI)
- Prescription reader & decoder

---

### 4.13 👨‍⚕️ Doctor Platform & Appointments

**Routes:** `backend/routes/doctorProfiles.js`, `backend/routes/appointments.js`, `backend/routes/orders.js`
**Schema:** `backend/doctor_profiles.sql`
**Pages:** `frontend/src/app/dashboard/doctors/`, `frontend/src/app/dashboard/doctor-dashboard/`, `frontend/src/app/dashboard/appointments/`

**Doctor Features:**
- Create/update public doctor profile
- Specialization, consultation fee, availability
- Media gallery (photos/videos via Cloudinary)
- Appointment management queue
- Digital prescription issuing

**Appointment Flow:**
```
Patient selects doctor → Chooses time slot
  → POST /api/appointments (creates record)
  → Razorpay payment (if applicable)
  → Confirmation email via Resend
  → Doctor notified via Socket.io
```

---

### 4.14 💬 Real-time Chat & Video Calls

**Routes:** `backend/routes/chat.js`, `backend/services/socketService.js`
**Frontend Page:** `frontend/src/app/dashboard/video-call/`

**Socket.io Events:**
| Event | Purpose |
|-------|---------|
| `join_chat` | Join doctor-patient chat room |
| `send_message` | Send text/image message |
| `typing` / `stop_typing` | Typing indicators |
| `call_user` / `answer_call` | WebRTC signaling |
| `join_incident` | Join crisis incident room |
| `responder_location` | GPS relay (ambulance tracking) |
| `hospital_join` | Hospital portal room |

**Video Calls:** WebRTC peer-to-peer, no third-party app needed.

---

### 4.15 🧭 Healthcare Navigator

**Frontend API:** `frontend/src/app/api/healthcare-navigator/`
**Frontend Page:** `frontend/src/app/dashboard/healthcare-navigator/`

**Features:**
- Clinical pathways for 50+ conditions
- AI-generated treatment roadmaps
- KNN cost estimation (from medical_costs.csv dataset)
- EMI calculator (6, 12, 24 month options)
- Healthcare loan application flow
- Razorpay financing integration
- 15 government health schemes (Ayushman Bharat PMJAY, YSR Aarogyasri, etc.)

---

### 4.16 🆔 Medical Profile & Emergency ID

**Route:** `backend/routes/medicalProfile.js`
**Schema:** `backend/medical_profile_schema.sql`
**Frontend Page:** `frontend/src/app/dashboard/profile/`

**Profile Fields:**
- Full name, DOB, blood group, gender
- Conditions (chronic), medications, allergies
- BP readings, blood sugar levels
- Emergency contact details
- Insurance information
- QR code (auto-generated from profile data)

**Emergency Use:**
- Profile auto-shared with hospital during Crisis SOS
- `GET /api/medical-profile/emergency-card` returns compact JSON
- QR code scannable without app login

---

### 4.17 🔬 Diagnostic Centre

**Frontend Page:** `frontend/src/app/dashboard/diagnostic-centre/`
**Component:** `frontend/src/components/DiagnosticServices.tsx`

- Find diagnostic labs, scan centres, pathology labs
- Book tests online
- View test packages and pricing

---

### 4.18 📊 Health Analytics & Quiz

**Frontend Pages:** `frontend/src/app/dashboard/analytics/`, `frontend/src/app/dashboard/quiz/`
**Frontend API:** `frontend/src/app/api/quiz/route.ts`
**Data:** `frontend/src/data/quiz/`, `frontend/src/data/healthAnalyticsData.ts`

**Analytics Features:**
- Personal health trend charts (Recharts)
- Historical vitals tracking
- AI-generated health insights from reports

**Quiz Features:**
- AI-generated health education quizzes
- Topics: nutrition, hygiene, disease prevention, first aid
- Difficulty levels: Easy / Medium / Hard

---

### 4.19 🌍 Multilingual Support

**Context:** `frontend/src/context/LanguageContext.tsx` (59KB)
**Translations:** `frontend/src/lib/translations.ts`

- 8 Indian languages with 140+ UI translation keys
- Language persisted in localStorage
- MediBot responds in selected language
- All API responses language-aware
- Covers: dashboard labels, feature names, buttons, alerts

---

### 4.20 💳 Payments Integration

**Routes:** `backend/routes/orders.js`, `frontend/src/app/api/payment/`
**Component:** `frontend/src/components/RazorpayCheckout.tsx`

**Flows:**
- Appointment booking payment
- Medicine order payment
- Healthcare loan EMI (via Razorpay)

**Process:**
```
Frontend → POST /api/payment/create-order (Razorpay order ID)
  → Razorpay checkout modal
    → POST /api/payment/verify (signature validation)
      → Order confirmed + email sent
```

---

## 5. Backend API Reference

### All 25 Route Modules

| Route Prefix | File | Purpose |
|---|---|---|
| `/api/auth` | `routes/auth.js` | Register, login, JWT verify |
| `/api/users` | `routes/users.js` | User profile management |
| `/api/ai` | `routes/ai.js` | AI symptom/chat/diabetes/emergency |
| `/api/health` | `routes/health.js` | AI Doctor symptom checker |
| `/api/hospitals` | `routes/hospitals.js` | Hospital search & nearby |
| `/api/medicines` | `routes/medicines.js` | Medicine search & AI Q&A |
| `/api/appointments` | `routes/appointments.js` | Book & manage appointments |
| `/api/orders` | `routes/orders.js` | Medicine/consultation orders |
| `/api/doctor-profiles` | `routes/doctorProfiles.js` | Doctor CRUD + gallery |
| `/api/crisis` | `routes/crisis.js` | Full crisis pipeline (12 endpoints) |
| `/api/medical-profile` | `routes/medicalProfile.js` | Medical profile + emergency card |
| `/api/elder-care` | `routes/elderCare.js` | Elder/caregiver/match/task/alert |
| `/api/asha` | `routes/asha.js` | ASHA patients + vitals |
| `/api/healthshare` | `routes/healthshare.js` | Resources + volunteers + requests |
| `/api/phc` | `routes/phc.js` | PHC finder (OpenStreetMap) |
| `/api/phc-db` | `routes/phcDatabase.js` | PHC database queries |
| `/api/predict` | `routes/predict.js` | 9 health predictors |
| `/api/blood-donors` | `routes/bloodDonors.js` | Donor register/search/toggle |
| `/api/chat` | `routes/chat.js` | Doctor-patient chat |
| `/api/reports` | `routes/reports.js` | Medical report analysis |
| `/api/media` | `routes/media.js` | Cloudinary upload/delete |
| `/api/notifications` | `routes/notifications.js` | FCM push notifications |
| `/api/emergency` | `routes/emergency.js` | SOS with GPS |
| `/api/whatsapp` | `routes/whatsapp.js` | WhatsApp alerts |

### Key Endpoints

#### Crisis System
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/crisis/create` | Trigger SOS incident |
| POST | `/api/crisis/enrich/:id` | AI enrichment (ICD-10, severity) |
| POST | `/api/crisis/assign/:id` | Smart staff assignment |
| POST | `/api/crisis/status/:id` | Update responder status |
| GET | `/api/crisis/incidents` | All incidents dashboard |
| POST | `/api/crisis/hospital/acknowledge/:id` | Hospital acknowledges |
| POST | `/api/crisis/hospital/bed-ready/:id` | Bed confirmed |
| POST | `/api/crisis/hospital/patient-arrived/:id` | Arrival confirmed |

#### Elder Care
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/elder-care/elders` | Register elder |
| GET | `/api/elder-care/elders` | List elders by user |
| POST | `/api/elder-care/caregivers` | Register caregiver |
| GET | `/api/elder-care/caregivers` | List available caregivers |
| POST | `/api/elder-care/matches` | Run AI smart match |
| PUT | `/api/elder-care/matches/:id/hire` | Hire caregiver |
| POST | `/api/elder-care/tasks` | Create care task |
| POST | `/api/elder-care/alerts` | Create care alert |

#### ASHA Workers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/asha/patients` | Register patient |
| GET | `/api/asha/patients` | List worker's patients |
| POST | `/api/asha/vitals` | Log vitals + auto risk |
| GET | `/api/asha/stats` | Dashboard stats |

---

## 6. Frontend API Routes

| Route | File | Purpose |
|---|---|---|
| `/api/agent` | `app/api/agent/` | MediBot agentic AI proxy |
| `/api/symptoms` | `app/api/symptoms/` | Symptom checker |
| `/api/chat` | `app/api/chat/` | AI chat proxy |
| `/api/quiz` | `app/api/quiz/` | Quiz generator |
| `/api/predict` | `app/api/predict/` | Health predictors |
| `/api/scan-medicine` | `app/api/scan-medicine/` | Medicine scanner (Vision AI) |
| `/api/hospitals` | `app/api/hospitals/` | Hospital search proxy |
| `/api/medicines` | `app/api/medicines/` | Medicine search proxy |
| `/api/healthcare-navigator` | `app/api/healthcare-navigator/` | AI navigator |
| `/api/payment/create-order` | `app/api/payment/create-order/` | Razorpay order |
| `/api/payment/verify` | `app/api/payment/verify/` | Payment verification |
| `/api/notify` | `app/api/notify/` | Push notifications |
| `/api/translate` | `app/api/translate/` | Language translation |
| `/api/speech-to-text` | `app/api/speech-to-text/` | Voice input |
| `/api/text-to-speech` | `app/api/text-to-speech/` | Voice output |
| `/api/voice-agent` | `app/api/voice-agent/` | Voice-enabled MediBot |

---

## 7. Database Schema

### Tables (Supabase PostgreSQL)

| Table | Key Fields | Purpose |
|---|---|---|
| `users` | id, email, role, health_profile JSONB | User accounts |
| `doctors` | license_id, specialization, consultation_fee | Doctor profiles |
| `hospitals` | name, location JSONB, departments[], facilities[] | 200K+ hospitals |
| `medicines` | name, generic_name, category, FTS index | 250K+ medicines |
| `appointments` | patient_email, time_slot JSONB, payment_proof | Bookings |
| `orders` | items JSONB, razorpay_ids, shipping_addr | Purchases |
| `chats` + `messages` | participants[], message type | Real-time chat |
| `blood_donors` | blood_group, location JSONB, available | Donor network |
| `reports` | ai_insights, analysis JSONB | Medical reports |
| `user_medical_profiles` | blood_group, conditions[], medications[], emergency_contact | Emergency ID |
| `crisis_incidents` | incident_ref, room, floor, severity, status | SOS events |
| `media_uploads` | cloudinary_url, user_id, media_type | Media gallery |
| `health_schemes` | scheme_name, eligibility, benefits | 15 govt schemes |
| `elder_profiles` | conditions[], medicine_schedule[], budget | Elder care |
| `caregiver_profiles` | skills[], languages[], salary_expectation | Caregivers |
| `elder_caregiver_matches` | match_score, distance_km, status | AI matches |
| `caregiver_tasks` | task_type, due_date, status | Care tasks |
| `elder_care_alerts` | alert_type, severity, is_read | Care alerts |
| `asha_patients` | village, conditions[], blood_group | ASHA patients |
| `asha_vitals` | bp_systolic, sugar_level, risk_level | Vitals log |
| `healthshare_resources` | category, condition, type, city | Equipment sharing |
| `healthshare_volunteers` | role, skills[], availability | Volunteers |
| `healthshare_requests` | resource_id, status, contact | Resource requests |

### Indexes
- Full-text search: `medicines` (name + generic_name + category)
- Full-text search: `health_schemes` (name + description + eligibility)
- GIN index: `chats.participants` (array search)
- B-tree: all foreign keys, emails, payment IDs, blood groups

---

## 8. Backend Services

| Service | File | Purpose |
|---|---|---|
| AI Service | `services/aiService.js` | 6 specialized Groq AI prompts |
| Redis Service | `services/redisService.js` | Caching, rate limiting, health check |
| Socket Service | `services/socketService.js` | WebSocket event handlers |
| Email Service | `services/emailService.js` | Resend transactional emails |
| Cost Estimation | `services/costEstimationService.js` | KNN cost + diabetes risk |
| Cloudinary Service | `services/cloudinaryService.js` | Media upload/delete/sign |
| Firebase Admin | `services/firebaseAdmin.js` | FCM push notifications |
| Nearby Hospitals | `services/nearbyHospitals.js` | Geolocation hospital search |
| Predictor Datasets | `services/predictorDatasets.js` | 9 ML datasets (memory preload) |

---

## 9. Frontend Architecture

### 24 Dashboard Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Main hub (22KB) |
| AI Doctor | `/dashboard/ai` | MediBot + AI Doctor |
| Symptoms | `/dashboard/symptoms` | Symptom checker |
| Scanner | `/dashboard/scanner` | Medicine scanner |
| Medicines | `/dashboard/medicines` | Medicine finder |
| Hospitals | `/dashboard/hospitals` | Hospital map |
| Healthcare Navigator | `/dashboard/healthcare-navigator` | Clinical pathways |
| Predictors | `/dashboard/predictors` | Health risk predictors |
| Reports | `/dashboard/reports` | AI medical reports |
| Quiz | `/dashboard/quiz` | Health quiz |
| Appointments | `/dashboard/appointments` | Book appointments |
| Doctors | `/dashboard/doctors` | Doctor directory |
| Doctor Dashboard | `/dashboard/doctor-dashboard` | Doctor management |
| Crisis | `/dashboard/crisis` | Crisis command center |
| Emergency | `/dashboard/emergency` | Emergency SOS |
| Elder Care | `/dashboard/elder-care` | Elder care system |
| ASHA | `/dashboard/asha` | ASHA workers portal |
| PHC Finder | `/dashboard/phc-finder` | PHC locator |
| HealthShare | `/dashboard/healthshare` | Resource sharing |
| Profile | `/dashboard/profile` | Medical profile + QR |
| Video Call | `/dashboard/video-call` | WebRTC consultation |
| Analytics | `/dashboard/analytics` | Health analytics |
| Media | `/dashboard/media` | Media gallery |
| Settings | `/dashboard/settings` | User settings |

### Special Pages
| Page | Route | Description |
|---|---|---|
| Crisis SOS | `/crisis/report` | Public SOS (no login) |
| Responder App | `/responder` | Ambulance responder |
| Hospital Portal | `/hospital/portal` | Hospital staff view |
| Sign In | `/sign-in` | Clerk auth |
| Sign Up | `/sign-up` | Clerk auth |

---

## 10. Deployment & Infrastructure

### Backend (`render.yaml`)
```yaml
services:
  - type: web
    name: arogya-raksha-api
    runtime: node
    region: singapore
    rootDir: backend
    buildCommand: npm install
    startCommand: node server.js
```

### Server Security
- **Rate Limiting:** 500 req/15min (API), 30 req/15min (auth)
- **Helmet:** XSS, HSTS, CSP, frameguard headers
- **CORS:** Whitelist with Vercel preview support (`*.vercel.app`)
- **Compression:** Gzip 60–80% response size reduction
- **Body Limit:** 50MB for media uploads

### Socket.io Configuration
- CORS: localhost:3000, FRONTEND_URL, *.vercel.app
- Events: chat, crisis, GPS relay, WebRTC signaling, hospital portal

---

## 11. Environment Variables

### Backend (`.env`)

| Variable | Service |
|---|---|
| `PORT` | Express server port |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key |
| `JWT_SECRET` | JWT signing secret |
| `GROQ_API_KEY` | Primary Groq API key |
| `GROQ_API_KEY_2` | Fallback Groq key |
| `GROQ_API_KEY_3` | Fallback Groq key |
| `REDIS_URL` | Redis Cloud connection URL |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud |
| `CLOUDINARY_API_KEY` | Cloudinary key |
| `CLOUDINARY_API_SECRET` | Cloudinary secret |
| `RESEND_API_KEY` | Resend email API key |
| `FIREBASE_PROJECT_ID` | Firebase project |
| `FIREBASE_PRIVATE_KEY` | Firebase service account |
| `FIREBASE_CLIENT_EMAIL` | Firebase service email |
| `RAZORPAY_KEY_ID` | Razorpay key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `FRONTEND_URL` | Frontend URL (CORS) |

### Frontend (`.env.local`)

| Variable | Service |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth |
| `CLERK_SECRET_KEY` | Clerk server |
| `NEXT_PUBLIC_API_URL` | Backend URL |
| `NEXT_PUBLIC_GROQ_API_KEY` | Groq (client) |
| `NEXT_PUBLIC_GROQ_API_KEY_2` | Groq fallback |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase FCM config |
| `RAZORPAY_KEY_ID` | Razorpay |
| `RAZORPAY_KEY_SECRET` | Razorpay |

---

## 12. Setup Guide

```bash
# 1. Clone the repo
git clone https://github.com/ifthekharahmad69-ship-it/AROGYA-RAKSHAA-AI.git
cd AROGYA-RAKSHAA-AI

# 2. Backend setup
cd backend
cp .env.example .env        # Fill in your API keys
npm install
npm run seed                 # Seed 250K+ medicines & 200K+ hospitals
node server.js               # → http://localhost:5000

# 3. Frontend setup (new terminal)
cd frontend
cp .env.example .env.local   # Fill in your keys
npm install
npm run dev                  # → http://localhost:3000

# 4. Database setup (Supabase SQL Editor — run in order)
backend/schema.sql
backend/crisis_schema.sql
backend/medical_profile_schema.sql
backend/doctor_profiles.sql
backend/elder_care_schema.sql
backend/asha_schema.sql
backend/healthshare_schema.sql
backend/media_uploads.sql
```

---

## 📊 Project Stats

| | |
|---|---|
| **Team** | Sameer X |
| **Hackathon** | HacksPrix Season 3 |
| **Track** | Gen AI & ML |
| **Built In** | 24 hours |
| **Lines of Code** | ~15,000+ |
| **Total Files** | 150+ |
| **Repo** | https://github.com/ifthekharahmad69-ship-it/AROGYA-RAKSHAA-AI |
| **Live** | Deploying during hackathon |

---

*Built with ❤️ by Team Sameer X for HacksPrix Season 3*
