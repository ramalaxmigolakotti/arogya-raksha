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
