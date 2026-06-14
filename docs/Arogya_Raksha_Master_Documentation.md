# 🏥 Arogya Raksha — Complete Technical Documentation

> **Version:** Latest (May 2026)  
> **Platform:** AI-Powered Intelligent Healthcare Platform  
> **Stack:** Next.js 16 + Express 5 + Supabase (PostgreSQL) + Redis + Socket.io  
> **AI Engine:** Groq LLM (Llama 3.3 70B + Llama 4 Scout Vision)  
> **Deployment:** Vercel (Frontend) + Render (Backend, Singapore Region)

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Backend Services](#4-backend-services)
5. [AI Agentic System](#5-ai-agentic-system)
6. [API Reference](#6-api-reference)
7. [Database Schema](#7-database-schema)
8. [Frontend Architecture](#8-frontend-architecture) *(Part 2)*
9. [Crisis Response System](#9-crisis-response-system) *(Part 2)*
10. [Deployment & Infrastructure](#10-deployment--infrastructure) *(Part 2)*

---

## 1. Platform Overview

**Arogya Raksha** (आरोग्य रक्षा — "Health Protection") is a full-stack, AI-powered healthcare platform designed for the Indian healthcare ecosystem. It combines agentic AI automation with real-time crisis response, multilingual support (8 Indian languages), and a comprehensive healthcare navigation layer.

### Core Capabilities

| # | Feature | Description |
|---|---------|-------------|
| 1 | **MediBot AI Agent** | Agentic chatbot with 8 tool-calling capabilities (appointments, medicines, navigation, quiz, image analysis, hospitals, health tips, medicine scanning) |
| 2 | **AI Doctor & Symptom Checker** | Structured symptom analysis → conditions (ranked), medicines, urgency, home remedies |
| 3 | **Medicine Intelligence** | 250K+ medicine database, AI-powered info, scanner (image → medicine details) |
| 4 | **Hospital Discovery & Maps** | 200K+ facilities, live geolocation, Leaflet maps, nearby search |
| 5 | **Rapid Crisis Response** | QR-triggered SOS → AI enrichment → staff dispatch → hospital bridge → real-time tracking |
| 6 | **Healthcare Navigator** | AI-powered clinical pathway mapping, cost estimation, EMI calculator, loan flow |
| 7 | **Doctor Dashboard** | Profile management, media gallery (Cloudinary), appointment management |
| 8 | **Health Predictors** | Diabetes risk screening (KNN on medical_costs.csv dataset), report analysis |
| 9 | **Payments** | Razorpay integration for appointments, medicines, consultations |
| 10 | **Real-time Chat** | Socket.io powered doctor-patient messaging with WebRTC video call signaling |

### Multilingual Support

The platform supports **8 Indian languages** with full UI translations:

| Code | Language | Script |
|------|----------|--------|
| `en` | English | Latin |
| `hi` | Hindi | देवनागरी |
| `te` | Telugu | తెలుగు |
| `ta` | Tamil | தமிழ் |
| `kn` | Kannada | ಕನ್ನಡ |
| `mr` | Marathi | देवनागरी |
| `bn` | Bengali | বাংলা |
| `bho` | Bhojpuri | देवनागरी |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                        │
│                         Deployed on Vercel                          │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌─────────┐ │
│  │Dashboard │ │MediBot   │ │Healthcare │ │Crisis    │ │Hospital │ │
│  │  Pages   │ │AI Agent  │ │Navigator  │ │SOS Pages │ │Portal   │ │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘ └────┬────┘ │
│       │             │             │             │            │      │
│  ┌────┴─────────────┴─────────────┴─────────────┴────────────┴───┐ │
│  │              Shared Layer: Contexts + Lib + Hooks             │ │
│  │  LanguageContext │ LocationContext │ ThemeContext │ AuthContext │ │
│  │  api.ts │ groqAgent.js │ groqKeyManager.ts │ firebase.ts      │ │
│  └───────────────────────────┬───────────────────────────────────┘ │
└──────────────────────────────┼──────────────────────────────────────┘
                               │ REST API + Socket.io
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express 5 + Node.js)                   │
│                       Deployed on Render (SG)                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     Middleware Layer                          │   │
│  │  Helmet │ CORS │ Rate Limiter │ Compression │ Clerk Auth     │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                              │                                      │
│  ┌──────────┐ ┌──────────┐ ┌┴─────────┐ ┌──────────┐ ┌──────────┐ │
│  │17 Route  │ │7 Backend │ │9 Data    │ │Socket.io │ │Seed      │ │
│  │Modules   │ │Services  │ │Models    │ │Real-time │ │Scripts   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────┘ │
│       │             │            │             │                     │
│  ┌────┴─────────────┴────────────┴─────────────┴───────────────┐   │
│  │                    Data & Infrastructure                      │   │
│  │  Supabase (PostgreSQL) │ Redis Cloud │ Cloudinary │ Firebase  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
User Action → Next.js Page/API Route
  → Clerk Auth (JWT validation)
    → Express Backend (/api/*)
      → Redis Cache Check
        → Supabase Query / Groq AI Call
          → Response (cached if applicable)
            → Socket.io broadcast (if real-time event)
```

---

## 3. Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.6 | React framework, App Router, SSR |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Framer Motion | 12.36.0 | Animations |
| Clerk | 7.0.4 | Authentication (Google SSO) |
| Leaflet + React-Leaflet | 1.9.4 / 5.0.0 | Interactive maps |
| Recharts | 3.8.1 | Data visualization |
| Socket.io Client | 4.8.3 | Real-time communication |
| Groq SDK | 1.1.1 | Client-side AI agent |
| Firebase | 12.12.1 | Push notifications (FCM) |
| Razorpay | 2.9.6 | Payment processing |
| Lucide React | 0.577.0 | Icon library |
| QRCode.react | 4.2.0 | QR code generation |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Express | 5.2.1 | HTTP server framework |
| Supabase JS | 2.101.1 | PostgreSQL client |
| Groq SDK | 1.1.2 | AI inference (Llama models) |
| IORedis | 5.10.1 | Redis caching & rate limiting |
| Socket.io | 4.8.3 | WebSocket server |
| Cloudinary | 2.9.0 | Image/video CDN |
| Clerk Express | 2.1.1 | Auth middleware |
| Resend | 6.10.0 | Transactional emails |
| Helmet | 8.1.0 | Security headers |
| Multer | 2.1.1 | File uploads |
| Compression | 1.8.1 | Gzip (60-80% reduction) |

### Infrastructure

| Service | Purpose |
|---------|---------|
| **Supabase** | PostgreSQL database, Row Level Security |
| **Redis Cloud** | Response caching (5 min TTL), rate limiting |
| **Cloudinary** | Media storage (images, videos, avatars) |
| **Firebase Cloud Messaging** | Push notifications (SOS pattern vibrate) |
| **Vercel** | Frontend hosting, edge functions |
| **Render** | Backend hosting (Singapore region) |

---

## 4. Backend Services

### 4.1 AI Service (`services/aiService.js`)

Central AI inference engine with **6 specialized agent prompts**:

| Agent | Model | Purpose |
|-------|-------|---------|
| `symptomChecker` | Llama 3.3 70B | Symptom → conditions, medicines, urgency |
| `diabetesPredictor` | Llama 3.3 70B | Risk assessment with daily health plan |
| `reportAnalyzer` | Llama 3.3 70B | Medical report parsing & flagging |
| `medicineAdvisor` | Llama 3.3 70B | Drug info, dosage, alternatives, pricing |
| `generalHealth` | Llama 3.3 70B | Conversational health assistant |
| `emergencyAgent` | Llama 3.3 70B | Emergency triage & first aid |

**Configuration:** Temperature 0.7, Max tokens 2000, fallback demo responses on API failure.

### 4.2 Redis Service (`services/redisService.js`)

| Function | Description |
|----------|-------------|
| `cacheGet(key)` | Get parsed JSON from cache |
| `cacheSet(key, value, ttl)` | Set with TTL (default 300s) |
| `cacheDel(pattern)` | Delete by key or glob pattern |
| `cacheMiddleware(ttl)` | Express middleware — auto-caches GET responses |
| `redisRateLimit(windowMs, max)` | Redis-backed per-IP rate limiter |
| `redisHealth()` | Connection health check (ping) |

**Resilience:** All operations gracefully degrade if Redis is disconnected.

### 4.3 Socket.io Service (`services/socketService.js`)

Real-time event channels:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `user_online` | Client → Server | Track online users |
| `join_chat` / `send_message` | Bidirectional | Doctor-patient chat |
| `typing` / `stop_typing` | Client → Server | Typing indicators |
| `join_incident` | Client → Server | Join crisis room |
| `crisis_message` | Bidirectional | Incident chat relay |
| `crisis_status_update` | Client → Server | Responder status |
| `hospital_join` | Client → Server | Hospital portal room |
| `responder_location` | Client → Broadcast | GPS tracking relay |
| `call_user` / `answer_call` | Peer-to-peer | WebRTC signaling |

### 4.4 Email Service (`services/emailService.js`)

Powered by **Resend API** with branded HTML templates:

| Template | Trigger |
|----------|---------|
| `sendWelcomeEmail` | User registration |
| `sendOrderConfirmationEmail` | Medicine/consultation order placed |
| `sendAppointmentConfirmationEmail` | Doctor appointment booked |

All emails use a consistent green gradient header design with Arogya Raksha branding.

### 4.5 Cost Estimation Service (`services/costEstimationService.js`)

| Function | Algorithm | Description |
|----------|-----------|-------------|
| `estimateCost()` | K-Nearest Neighbors (k=20) | Medical cost prediction from `medical_costs.csv` dataset. Factors: age, sex, BMI, smoker status, children. Returns USD/INR estimates with EMI options (6/12/24 months). |
| `screenDiabetesRisk()` | Logistic scoring | Diabetes risk from glucose, BP, BMI, age, insulin, pregnancies. Returns risk level (Low/Moderate/High/Very High) with percentage. |

### 4.6 Cloudinary Service (`services/cloudinaryService.js`)

| Function | Description |
|----------|-------------|
| `uploadToCloudinary()` | Upload base64 images/videos with auto-quality, 1200px limit, video transcoding |
| `deleteFromCloudinary()` | Remove by public ID |
| `generateUploadSignature()` | Signed URL for direct browser uploads |

### 4.7 Firebase Admin (`services/firebaseAdmin.js`)

Server-side push notification sender via FCM. Lazy-initialized singleton. Used for SOS crisis alerts with vibrate pattern `[200, 100, 200, 100, 200]`.

---

## 5. AI Agentic System

### 5.1 MediBot Agent Architecture (`frontend/src/lib/groqAgent.js`)

The MediBot is a **tool-calling agentic AI** that runs on the client-side via Next.js API routes. It uses the Groq SDK with automatic multi-key rotation.

```
User Message
    │
    ▼
┌─────────────────────┐
│  System Prompt       │  ← Language-aware, user-personalized
│  (buildSystemPrompt) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Groq LLM Call #1    │  ← model: llama-3.3-70b-versatile
│  with AGENT_TOOLS    │     (or llama-4-scout for vision)
│  tool_choice: "auto" │
└──────────┬──────────┘
           │
     ┌─────┴──────┐
     │ Tool Calls? │
     └─────┬──────┘
       No  │  Yes
       │   │
       │   ▼
       │  ┌──────────────────┐
       │  │ executeToolCall() │  ← 8 tool handlers
       │  │ Returns actions   │
       │  └────────┬─────────┘
       │           │
       │           ▼
       │  ┌──────────────────┐
       │  │ Groq LLM Call #2  │  ← Final response with tool results
       │  │ (summarization)   │
       │  └────────┬─────────┘
       │           │
       └─────┬─────┘
             ▼
     Final Response to User
     (text + UI actions)
```

### 5.2 Agent Tools (8 Functions)

| Tool | Parameters | UI Action |
|------|-----------|-----------|
| `book_appointment` | doctor, specialty, date, time, reason | Opens booking form |
| `suggest_medicines` | symptoms[], severity, age_group | Shows medicine suggestions |
| `scan_medicine` | medicine_name, query_type | Shows medicine details |
| `navigate_to_page` | page (12 destinations) | In-app navigation |
| `play_health_quiz` | topic, difficulty, num_questions | Opens quiz interface |
| `analyze_medical_image` | image_type, analysis_focus | Shows image analysis |
| `find_nearby_hospitals` | facility_type, specialty, radius | Navigates to hospital map |
| `get_health_tips` | category, condition | Shows wellness tips |

### 5.3 Groq Key Rotation Manager (`frontend/src/lib/groqKeyManager.ts`)

Enterprise-grade API key management with:

- **Round-robin distribution** across up to 4 API keys
- **Rate-limit detection** (HTTP 429) → automatic rotation
- **Cooldown tracking** per key with configurable window
- **Failure counting** and key prioritization
- **Legacy key compatibility** (backward-compatible env vars)
- **Retry with fallback** — `groqChatWithRetry()` tries all keys before failing

### 5.4 Vision AI Pipeline

For medical image analysis (prescriptions, lab reports, X-rays, skin conditions):

```
Image Upload → Base64 encode
  → Try vision models in order:
    1. meta-llama/llama-4-scout-17b-16e-instruct
    2. llama-3.2-11b-vision-preview
    3. llama-3.2-90b-vision-preview
  → Rotate API keys on rate limit
  → Return analysis text
```

---

## 6. API Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public | Register user (patient/doctor/admin) |
| POST | `/login` | Public | Login with email/password |
| GET | `/verify` | JWT | Verify token validity |

### Users (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get current user profile |
| PUT | `/profile` | Update profile |
| PUT | `/health-profile` | Update health data |

### AI Agents (`/api/ai`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/symptoms` | Symptom analysis |
| POST | `/diabetes` | Diabetes risk prediction |
| POST | `/chat` | General AI chat |
| POST | `/emergency-assess` | Emergency triage |

### Hospitals (`/api/hospitals`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Search hospitals (query params) |
| GET | `/nearby?lat=&lng=` | Geolocation-based search |

### Medicines (`/api/medicines`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?q=` | Full-text medicine search |
| POST | `/ask` | AI medicine Q&A |

### Appointments (`/api/appointments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Book appointment (sends email) |
| GET | `/my` | List user's appointments |

### Orders (`/api/orders`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create order (medicine/consultation) |
| GET | `/my` | List user's orders |

### Doctor Profiles (`/api/doctor-profiles`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all doctors (search, filter) |
| GET | `/me` | Get own doctor profile |
| GET | `/:id` | Get specific doctor |
| POST | `/` | Create doctor profile |
| PUT | `/` | Update doctor profile |
| DELETE | `/` | Delete doctor profile |

### Media (`/api/media`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload image/video to Cloudinary |
| POST | `/avatar` | Upload profile avatar |
| GET | `/my` | Get user's media |
| GET | `/doctors/gallery` | Public doctor gallery |
| DELETE | `/:id` | Delete media |

### Medical Profile (`/api/medical-profile`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get medical profile |
| POST | `/` | Create/update profile (upsert) |
| GET | `/emergency-card` | Compact emergency card for SOS |

### Crisis Response (`/api/crisis`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/responders` | List all responders & status |
| POST | `/create` | Create incident (SOS trigger) |
| POST | `/enrich/:id` | AI enrichment (ICD-10, severity) |
| POST | `/assign/:id` | Smart staff assignment |
| POST | `/status/:id` | Update incident status |
| POST | `/chat/:id` | Incident chat message |
| GET | `/incidents` | All incidents (dashboard) |
| GET | `/incidents/:id` | Single incident detail |
| GET | `/qr` | QR config for room-based trigger |
| GET | `/hospital/notifications` | Hospital incoming patient alerts |
| POST | `/hospital/acknowledge/:id` | Hospital acknowledges alert |
| POST | `/hospital/bed-ready/:id` | Hospital signals bed ready |
| POST | `/hospital/patient-arrived/:id` | Patient arrival confirmation |

### Other Routes

| Route | Description |
|-------|-------------|
| `/api/emergency/sos` | SOS with GPS coordinates |
| `/api/blood-donors/*` | Donor registration & search |
| `/api/chat/*` | Doctor-patient chat |
| `/api/reports/*` | Medical report analysis |
| `/api/health` | Health check endpoint |
| `/api/notifications/*` | Push notification management |

### Frontend API Routes (`/api/*`)

| Route | Description |
|-------|-------------|
| `/api/agent` | MediBot agentic AI proxy |
| `/api/symptoms` | Symptom checker (Groq) |
| `/api/chat` | AI chat proxy |
| `/api/quiz` | Health quiz generator |
| `/api/predict` | Diabetes/health predictor |
| `/api/scan-medicine` | Medicine scanner |
| `/api/hospitals` | Hospital search proxy |
| `/api/medicines` | Medicine search proxy |
| `/api/healthcare-navigator` | Navigator AI proxy |
| `/api/payment/create-order` | Razorpay order creation |
| `/api/payment/verify` | Payment verification |

---

## 7. Database Schema

### Supabase PostgreSQL — 12 Tables

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users      │────▶│   doctors    │────▶│  hospitals   │
│ (UUID PK)     │     │ (license_id) │     │ (200K+ rows) │
│ role: patient │     │ specialization│    │ departments[] │
│   /doctor     │     │ consultation │     │ facilities[]  │
│   /admin      │     │   _fee       │     │ location JSONB│
│ health_profile│     └──────────────┘     └──────────────┘
│   JSONB       │            │
└──────┬───────┘            │
       │                     │
       ▼                     ▼
┌──────────────┐     ┌──────────────┐
│ appointments  │     │   reports    │
│ patient_email │     │ ai_insights  │
│ payment_proof │     │ analysis JSONB│
│ time_slot JSONB│    └──────────────┘
└──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   orders      │     │  medicines   │     │ blood_donors │
│ items JSONB   │     │ 250K+ rows   │     │ blood_group  │
│ Razorpay IDs  │     │ FTS index    │     │ location JSONB│
│ shipping_addr │     │ alternatives[]│    └──────────────┘
└──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    chats      │────▶│  messages    │     │health_schemes│
│ participants[]│     │ type: text/  │     │ 15 govt      │
│ chat_type     │     │  image/voice │     │ schemes seeded│
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│user_medical_     │  │crisis_incidents  │  │media_uploads     │
│  profiles        │  │ (incident_ref)   │  │ (cloudinary_url) │
│ blood_group,     │  │ room, floor,     │  │ user_id,         │
│ conditions[],    │  │ guest_name,      │  │ media_type,      │
│ medications[],   │  │ severity, status │  │ title, desc      │
│ allergies[],     │  └──────────────────┘  └──────────────────┘
│ emergency_contact│
│ insurance info   │
└──────────────────┘
```

### Key Indexes

- Full-text search on `medicines` (name + generic_name + category)
- Full-text search on `health_schemes` (scheme_name + description + eligibility)
- GIN index on `chats.participants` (array search)
- B-tree indexes on all foreign keys, emails, payment IDs, blood groups

### Health Schemes (Seeded)

15 government health schemes pre-loaded including Ayushman Bharat PMJAY, YSR Aarogyasri, Janani Suraksha Yojana, state-specific schemes, and Jan Aushadhi Yojana.
# 🏥 Arogya Raksha — Documentation Part 2

> Frontend Architecture, Crisis Response, Deployment & Environment

---

## 8. Frontend Architecture

### 8.1 App Structure (Next.js 16 App Router)

```
frontend/src/
├── app/
│   ├── layout.tsx              # Root layout (Clerk, Theme, Language providers)
│   ├── page.tsx                # Landing redirect
│   ├── globals.css             # Tailwind + custom styles
│   ├── sign-in/[[...sign-in]]/ # Clerk sign-in page
│   ├── sign-up/[[...sign-up]]/ # Clerk sign-up page
│   ├── login/                  # Legacy login
│   ├── register/               # Legacy registration
│   ├── crisis/                 # Crisis SOS pages
│   │   ├── layout.tsx
│   │   └── report/             # Emergency report form
│   ├── hospital/               # Hospital portal
│   ├── responder/              # Responder mobile app
│   ├── dashboard/
│   │   ├── layout.tsx          # Sidebar + Header layout
│   │   ├── page.tsx            # Main dashboard (22KB)
│   │   ├── loading.tsx         # Skeleton loader
│   │   ├── ai/                 # Ask AI Doctor
│   │   ├── symptoms/           # Symptom Checker
│   │   ├── medicines/          # Medicine Finder
│   │   ├── scanner/            # Medicine Scanner (camera)
│   │   ├── hospitals/          # Hospital Discovery + Map
│   │   ├── healthcare-navigator/ # AI Navigator
│   │   ├── reports/            # Medical Reports
│   │   ├── quiz/               # Health Quiz
│   │   ├── appointments/       # Appointment Booking
│   │   ├── emergency/          # Emergency SOS
│   │   ├── crisis/             # Crisis Dashboard
│   │   ├── doctors/            # Doctor Directory
│   │   ├── doctor-dashboard/   # Doctor Management
│   │   ├── diagnostic-centre/  # Diagnostic Services
│   │   ├── predictors/         # Health Predictors
│   │   ├── analytics/          # Health Analytics
│   │   ├── media/              # Media Gallery
│   │   ├── video-call/         # WebRTC Video Call
│   │   ├── profile/            # Medical Profile
│   │   └── settings/           # User Settings
│   └── api/                    # Next.js API Routes (10 endpoints)
│       ├── agent/              # MediBot AI agent
│       ├── chat/               # AI chat
│       ├── symptoms/           # Symptom checker
│       ├── quiz/               # Quiz generator
│       ├── predict/            # Health predictor
│       ├── scan-medicine/      # Medicine scanner
│       ├── hospitals/          # Hospital proxy
│       ├── medicines/          # Medicine proxy
│       ├── healthcare-navigator/ # Navigator
│       └── payment/            # Razorpay (create-order, verify)
├── components/
│   ├── MediBotAgent.jsx        # Agentic AI chatbot (34KB)
│   ├── AmbulanceMap.tsx        # Real-time ambulance tracking
│   ├── HealthcareCTA.tsx       # Healthcare Navigator CTAs
│   ├── DiagnosticServices.tsx  # Diagnostic center component
│   ├── RazorpayCheckout.tsx    # Payment integration
│   ├── GeminiBadge.tsx         # Hackathon branding badge
│   ├── Testimonials.tsx        # User testimonials carousel
│   ├── ClerkApiProvider.tsx    # Clerk token → API client bridge
│   ├── layout/
│   │   ├── Header.tsx          # Top navigation bar
│   │   ├── Sidebar.tsx         # 20+ nav items sidebar (12KB)
│   │   └── Footer.tsx          # Footer with links
│   └── ui/
│       ├── button.tsx          # Shadcn button variants
│       └── MapComponent.tsx    # Leaflet map wrapper
├── context/
│   ├── LanguageContext.tsx     # 8-language i18n (59KB, 140+ keys)
│   ├── LocationContext.tsx     # Geolocation + reverse geocoding
│   └── ThemeContext.tsx        # Light/Dark/System theme
├── lib/
│   ├── api.ts                 # API client class (40+ methods)
│   ├── groqAgent.js           # Agentic AI engine (631 lines)
│   ├── groqKeyManager.ts      # Multi-key rotation manager
│   ├── auth-context.tsx       # Legacy auth context
│   ├── firebase.ts            # Firebase FCM config
│   ├── supabaseClient.ts      # Supabase browser client
│   ├── translations.ts        # Additional translations
│   └── utils.ts               # Utility helpers
├── hooks/
│   └── usePushNotifications.ts # FCM push notification hook
├── data/
│   ├── index.ts               # Data exports
│   ├── appointments/          # Appointment mock data
│   ├── doctors/               # Doctor profiles data
│   ├── emergency/             # Emergency contacts
│   ├── hospitals/             # Hospital data
│   ├── medicines/             # Medicine database
│   ├── predictors/            # Health predictor models
│   ├── quiz/                  # Quiz question banks
│   └── symptoms/              # Symptom mapping data
└── middleware.ts              # Clerk auth middleware
```

### 8.2 Key Components

#### MediBotAgent (`components/MediBotAgent.jsx` — 34KB)

The flagship AI chatbot component with:
- Floating chat bubble (bottom-right)
- Full conversation UI with message history
- Image upload for medical image analysis
- Tool result rendering (appointments, medicines, navigation)
- Language-aware responses
- Streaming support for real-time text generation
- Auto-scroll and typing indicators

#### ClerkApiProvider (`components/ClerkApiProvider.tsx`)

Bridges Clerk authentication with the custom API client:
```
Clerk Session → getToken() → api.setTokenGetter() → Authorization: Bearer <token>
```

#### AmbulanceMap (`components/AmbulanceMap.tsx`)

Real-time ambulance tracking on Leaflet map:
- Patient location marker (red)
- Ambulance location marker (blue, animated)
- Socket.io listener for `responder_location` events
- Route polyline rendering
- ETA display

### 8.3 Context Providers

```tsx
<ClerkProvider>
  <ThemeProvider>
    <LanguageProvider>
      <LocationProvider>
        <ClerkApiProvider>
          {children}
        </ClerkApiProvider>
      </LocationProvider>
    </LanguageProvider>
  </ThemeProvider>
</ClerkProvider>
```

| Context | State | Features |
|---------|-------|----------|
| **LanguageContext** | `language`, `t()` | 8 languages, 140+ translation keys, localStorage persistence |
| **LocationContext** | `location`, `loading` | Browser geolocation, reverse geocoding (Nominatim), localStorage cache |
| **ThemeContext** | `theme` | Light/Dark/System modes via `next-themes` |

### 8.4 API Client (`lib/api.ts`)

Singleton `ApiClient` class with 40+ typed methods:
- **Dual auth support:** Clerk dynamic token getter + legacy static JWT
- **Auto-retry:** Network error handling
- **Content-Type:** JSON with 50MB body limit
- **Methods cover:** Auth, Users, Appointments, Hospitals, Reports, AI, Medicines, Emergency, Blood Donors, Chat, Orders, Media, Doctor Profiles

---

## 9. Crisis Response System

### 9.1 Full Workflow (8 Steps)

```
┌─────────────────────────────────────────────────────────┐
│                CRISIS RESPONSE PIPELINE                  │
│                                                          │
│  Step 1: QR SCAN / SOS TRIGGER                          │
│  ├─ Guest scans room QR code                            │
│  ├─ Pre-fills room/floor metadata                       │
│  └─ Medical profile auto-loaded from DB                 │
│                     │                                    │
│                     ▼                                    │
│  Step 2: INCIDENT CREATION                              │
│  ├─ POST /api/crisis/create                             │
│  ├─ Generates INC{timestamp} reference                  │
│  ├─ Stores in memory + Supabase (async)                 │
│  ├─ Socket.io broadcasts 'new_incident'                 │
│  └─ Ambulance webhook stub ready                        │
│                     │                                    │
│                     ▼                                    │
│  Step 3: AI ENRICHMENT                                  │
│  ├─ POST /api/crisis/enrich/:id                         │
│  ├─ Groq AI assesses severity (critical/high/mod/low)   │
│  ├─ ICD-10 condition code mapping                       │
│  ├─ Hospital department recommendation                  │
│  ├─ Cost estimate with EMI options                      │
│  └─ Hospital recommendation (Tier 1/2/Govt)             │
│                     │                                    │
│                     ▼                                    │
│  Step 4: HOSPITAL BRIDGE (Auto-Notification)            │
│  ├─ Socket.io → 'hospital_portal' room                  │
│  ├─ Pre-arrival alert with patient data                 │
│  ├─ ICD-10, severity, symptoms, medical history         │
│  ├─ Webhook-ready for HIS (Hospital Info System)        │
│  └─ Hospital portal receives 'incoming_patient'         │
│                     │                                    │
│                     ▼                                    │
│  Step 5: SMART STAFF ASSIGNMENT                         │
│  ├─ POST /api/crisis/assign/:id                         │
│  ├─ Priority: In-house Doctor (medical), Security       │
│  ├─ Only assigns "available" responders                 │
│  ├─ Socket.io → responder_alert_{id}                    │
│  └─ Status: pending → assigned                          │
│                     │                                    │
│                     ▼                                    │
│  Step 6: RESPONDER ACTIONS                              │
│  ├─ POST /api/crisis/status/:id                         │
│  ├─ Status transitions:                                 │
│  │   assigned → accepted → enroute → arrived → resolved │
│  ├─ GPS location relay via Socket.io                    │
│  └─ AmbulanceMap tracks responder in real-time          │
│                     │                                    │
│                     ▼                                    │
│  Step 7: HOSPITAL ACKNOWLEDGMENT                        │
│  ├─ POST /api/crisis/hospital/acknowledge/:id           │
│  ├─ Hospital confirms bed number, responder, ETA        │
│  ├─ POST /api/crisis/hospital/bed-ready/:id             │
│  └─ Socket.io pushes to incident room + portal          │
│                     │                                    │
│                     ▼                                    │
│  Step 8: RESOLUTION                                     │
│  ├─ POST /api/crisis/hospital/patient-arrived/:id       │
│  ├─ Calculates response_time_minutes                    │
│  ├─ Frees assigned responder                            │
│  └─ Incident status → resolved                          │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Mock Responders (Demo)

| ID | Name | Role | Default Status |
|----|------|------|---------------|
| R001 | Arjun Sharma | Security Guard | Available |
| R002 | Priya Nair | Floor Manager | Available |
| R003 | Dr. Mehta | In-House Doctor | Available |
| R004 | Suresh Kumar | Security Guard | Busy |
| R005 | Ananya Singh | Duty Manager | Available |

### 9.3 Hospital Notification Lifecycle

```
sent → acknowledged → bed_ready → patient_arrived
```

Each transition emits Socket.io events to both the venue staff dashboard and the guest's crisis screen.

---

## 10. Deployment & Infrastructure

### 10.1 Render Backend (`render.yaml`)

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

### 10.2 Environment Variables

#### Backend (`.env`)

| Variable | Service | Description |
|----------|---------|-------------|
| `PORT` | Express | Server port (default 5000, Render uses 10000) |
| `SUPABASE_URL` | Supabase | PostgreSQL connection URL |
| `SUPABASE_KEY` | Supabase | Service role key |
| `JWT_SECRET` | Auth | JWT signing secret |
| `GROQ_API_KEY` | Groq | AI inference API key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | Cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary | API key |
| `CLOUDINARY_API_SECRET` | Cloudinary | API secret |
| `CLERK_SECRET_KEY` | Clerk | Backend auth verification |
| `FRONTEND_URL` | CORS | Allowed frontend origin |
| `REDIS_URL` | Redis Cloud | Connection string |
| `RESEND_API_KEY` | Resend | Email sending |
| `FROM_EMAIL` | Resend | Sender email address |

#### Frontend (`.env.local`)

| Variable | Service | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend | API base URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Public auth key |
| `CLERK_SECRET_KEY` | Clerk | Server-side auth |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Client-side DB |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Anonymous key |
| `GROQ_API_KEY_1` through `GROQ_API_KEY_4` | Groq | Multi-key rotation |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay | Payment gateway |
| `RAZORPAY_KEY_SECRET` | Razorpay | Server-side verification |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase | FCM push notifications |

### 10.3 Security Measures

| Layer | Implementation |
|-------|---------------|
| **Authentication** | Clerk (Google SSO + email/password) |
| **API Protection** | Rate limiting: 500 req/15min general, 30 req/15min auth |
| **Headers** | Helmet (XSS, HSTS, CSP, Referrer) |
| **CORS** | Whitelist: localhost:3000, FRONTEND_URL, *.vercel.app |
| **Compression** | Gzip via `compression` middleware (60-80% reduction) |
| **Input Validation** | 50MB body limit, route-level validation |
| **Redis Rate Limit** | Per-IP sliding window (backup to express-rate-limit) |

### 10.4 Data Seeding

```bash
# Seed all data
npm run seed

# Seed 200K+ hospitals from CSV
npm run seed:hospitals

# Seed 250K+ medicines from CSV
npm run seed:medicines
```

Seed scripts use batch processing with configurable chunk sizes to handle large datasets.

---

## 11. File Inventory

### Backend (17 Routes, 7 Services, 9 Models)

| Category | Files |
|----------|-------|
| **Routes (17)** | ai, appointments, auth, bloodDonors, chat, crisis, doctorProfiles, emergency, health, hospitals, media, medicalProfile, medicines, notifications, orders, reports, users |
| **Services (7)** | aiService, cloudinaryService, costEstimationService, emailService, firebaseAdmin, redisService, socketService |
| **Models (9)** | Appointment, BloodDonor, Chat, Doctor, Hospital, Medicine, Order, Report, User |
| **Middleware (2)** | auth (JWT), clerkAuth (Clerk) |
| **Scripts (3)** | seedAll, seedHospitals, seedMedicines |
| **SQL Schemas (4)** | schema.sql, crisis_schema.sql, medical_profile_schema.sql, doctor_profiles.sql, media_uploads.sql |

### Frontend (20+ Dashboard Pages, 10 API Routes, 8 Components)

| Category | Count |
|----------|-------|
| Dashboard pages | 20 (ai, analytics, appointments, crisis, diagnostic-centre, doctor-dashboard, doctors, emergency, healthcare-navigator, hospitals, media, medicines, predictors, profile, quiz, reports, scanner, settings, symptoms, video-call) |
| API routes | 10 (agent, chat, hospitals, medicines, symptoms, quiz, predict, scan-medicine, healthcare-navigator, payment) |
| Components | 8 + 3 layout + 2 UI |
| Contexts | 3 (Language, Location, Theme) |
| Lib modules | 8 |
| Data modules | 8 directories |

---

## 12. Quick Start

```bash
# Clone repository
git clone <repo-url>
cd ssrrk

# Backend setup
cd backend
cp .env.example .env
# Fill in environment variables
npm install
npm run seed          # Seed database
npm start             # Start on port 5000

# Frontend setup (new terminal)
cd frontend
cp .env.local.example .env.local
# Fill in environment variables
npm install
npm run dev           # Start on port 3000
```

### Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste and run `backend/schema.sql`
3. Run `backend/crisis_schema.sql` for crisis tables
4. Run `backend/medical_profile_schema.sql` for medical profiles
5. Run `backend/doctor_profiles.sql` for doctor profiles
6. Run `backend/media_uploads.sql` for media storage

---

> **Built for Google Gemini Hackathon** | Arogya Raksha — आरोग्य रक्षा — *Your Health, Our Priority*
