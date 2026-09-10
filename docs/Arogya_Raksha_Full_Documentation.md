# 🏥 Arogya Raksha — AI-Powered Healthcare Platform

> **Version 2.0** | Last Updated: April 2026  
> Full-Stack Healthcare Intelligence Platform with AI Diagnostics, Financial Navigation & 496K+ Medical Records

---

## 📋 Table of Contents

1. [Platform Overview](#-platform-overview)
2. [Key Features](#-key-features)
3. [Tech Stack](#-tech-stack)
4. [Architecture](#-architecture)
5. [Getting Started](#-getting-started)
6. [Environment Variables](#-environment-variables)
7. [Backend API Reference](#-backend-api-reference)
8. [Frontend Pages & Components](#-frontend-pages--components)
9. [Database Schema](#-database-schema)
10. [AI Services](#-ai-services)
11. [Payment Integration](#-payment-integration)
12. [Data Seeding](#-data-seeding)
13. [Deployment](#-deployment)
14. [Project Structure](#-project-structure)

---

## 🌟 Platform Overview

**Arogya Raksha** (meaning "Health Shield" in Sanskrit) is an enterprise-grade, AI-powered healthcare platform that combines clinical intelligence, financial navigation, and real-time hospital discovery into a single unified experience.

### Core Highlights

| Metric | Value |
|---|---|
| **Total Medical Records** | 496,000+ |
| **Medicine Database** | 246,068 medicines (A-Z) |
| **Hospital/Facility Database** | 249,756 facilities (Pan-India) |
| **Doctor Profiles** | 111+ auto-generated |
| **AI Models** | Groq LLaMA 3 (70B / 8B) |
| **Supported Languages** | 8 (EN, HI, TE, TA, KN, MR, BN, BHO) |
| **Disease Predictors** | 9 ML-based risk models |
| **Payment Gateway** | Razorpay (UPI, Cards, EMI) |

---

## 🚀 Key Features

### 🏦 Healthcare Navigator *(Primary Feature)*
The flagship feature providing AI-powered healthcare decision intelligence:
- **Condition Assessment** — AI analyzes symptoms and maps clinical pathways
- **Cost Estimation** — Real-time treatment cost breakdowns with hospital-tier pricing
- **Medical Loan Application** — Instant EMI options (0% EMI available), lender marketplace
- **Hospital Discovery** — GPS-enabled nearby hospital finder (249K+ facilities)
- **Financial Affordability Analysis** — Income-based treatment affordability scoring

### 🤖 AI Doctor (Arogya AI)
- Real-time streaming chat powered by Groq AI (LLaMA 3 70B)
- Context-aware medical consultation with conversation history
- Personalized responses using patient name
- Markdown-rendered rich text responses

### 🩺 Symptom Checker
- Input symptoms (text-based & selection)
- AI-powered differential diagnosis
- Severity assessment (Mild / Moderate / Severe / Critical)
- Recommended medications, tests, and specialists
- **→ Direct CTA to Apply for Loan & Find Nearby Hospitals**

### 💊 Medicine Scanner (Camera AI)
- Upload/capture medicine images
- AI identifies medicine name, composition, uses, side effects
- Drug interaction warnings
- Alternative medicine suggestions
- **→ Direct CTA to Apply for Loan & Find Nearby Hospitals**

### 💊 Medicine Finder & Tracker
- Search 246,068+ medicines from comprehensive database
- View composition, pricing, manufacturer details
- Nearby pharmacy locator with GPS
- Online ordering with Razorpay payments
- Drug interaction intelligence
- **→ Direct CTA to Apply for Loan & Find Nearby Hospitals**

### 🧬 Health Predictors (9 Disease Risk Models)
| Predictor | Dataset Size |
|---|---|
| Diabetes & Heart | Real patient records |
| Dengue Fever | Epidemic data |
| Kidney Disease | Clinical records |
| Liver Disease | Lab data |
| Lung Disease | Imaging data |
| Cancer Risk | Tumor markers |
| Thyroid Cancer | Endocrine data |
| Asthma Risk | Pulmonary data |
| Mental Health | Behavioral data |

Each predictor provides:
- Animated risk gauge (0-100 score)
- Contributing factor analysis
- Personalized health advice
- Recommended diagnostic tests with pricing
- **→ Direct CTA to Apply for Loan & Find Nearby Hospitals**

### 🧪 Diagnostic Centre
- 50+ diagnostic tests with booking
- 6 eye & optics services
- 5 curated health packages (up to 40% savings)
- 8 hospital departments
- Razorpay payment integration
- WhatsApp booking confirmation
- **→ Direct CTA to Apply for Loan & Find Nearby Hospitals**

### 🧠 AI Health Quiz
- AI-generated quizzes on any health topic via Groq
- 6+ preset categories with curated questions
- Instant scoring with explanations
- Quick-topic pills for popular subjects
- **→ Direct CTA to Apply for Loan & Find Nearby Hospitals**

### 🏥 Hospital Finder
- Interactive Leaflet map with 249K+ facilities
- GPS-based proximity search (configurable radius)
- Hospital type filtering (Government, Private, PHC, CHC, etc.)
- Real-time directions via Google Maps integration
- Contact information and facility details

### 👨‍⚕️ Doctor Profiles & Dashboard
- Specialist directory with category filtering
- Doctor dashboard for managing appointments
- Profile management (qualifications, experience, specialization)
- Real-time appointment status updates

### 📱 Additional Features
- **Medical Reports** — Upload, store, and manage health records via Cloudinary
- **Media Gallery** — Hospital/clinic media management
- **Emergency Services** — SOS system with nearest hospital routing
- **Blood Donor Registry** — Community blood donation matching
- **Appointments** — Book, track, and manage doctor appointments
- **Video Consultation** — Real-time video calls (Socket.io)
- **MediBot Agent** — Persistent floating AI assistant across all pages

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.6 | React framework with Turbopack |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first styling |
| **Framer Motion** | 12.36.0 | Animations |
| **Leaflet** | 1.9.4 | Interactive maps |
| **Recharts** | 3.8.0 | Data visualization |
| **Clerk** | 7.0.4 | Authentication |
| **Razorpay** | 2.9.6 | Payment processing |
| **Socket.io Client** | 4.8.3 | Real-time communication |
| **Lucide React** | 0.577.0 | Icon system |
| **Groq SDK** | 1.1.1 | AI inference (client-side) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Express.js** | 5.2.1 | API framework |
| **Node.js** | 18+ | Runtime |
| **Supabase** | 2.101.1 | PostgreSQL database |
| **Redis (ioredis)** | 5.10.1 | Caching layer |
| **Groq SDK** | 1.1.2 | AI inference (server-side) |
| **Cloudinary** | 2.9.0 | Media storage |
| **Helmet** | 8.1.0 | Security headers |
| **Socket.io** | 4.8.3 | WebSocket server |
| **Resend** | 6.10.0 | Email notifications |
| **Clerk Express** | 2.1.1 | Auth middleware |
| **Multer** | 2.1.1 | File uploads |

### Infrastructure
| Service | Purpose |
|---|---|
| **Supabase** | PostgreSQL database + auth |
| **Redis Cloud** | Response caching |
| **Cloudinary** | Image/video CDN |
| **Razorpay** | Payment gateway |
| **Clerk** | User authentication & management |
| **Groq Cloud** | LLM inference (LLaMA 3) |
| **Render** | Backend deployment |
| **Vercel** | Frontend deployment |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 16)                   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │  Clerk  │ │ Leaflet  │ │ Razorpay │ │   Groq SDK    │   │
│  │  Auth   │ │   Maps   │ │ Checkout │ │ (Client-side) │   │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘   │
│       │           │            │                │           │
│  ┌────┴───────────┴────────────┴────────────────┴────────┐  │
│  │              Next.js API Routes (Proxy)               │  │
│  │  /api/chat  /api/symptoms  /api/predict  /api/quiz    │  │
│  │  /api/scan-medicine  /api/healthcare-navigator        │  │
│  │  /api/hospitals  /api/medicines  /api/payment         │  │
│  └────────────────────────┬──────────────────────────────┘  │
│                           │ HTTP                            │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                   BACKEND (Express.js 5)                    │
│                           │                                 │
│  ┌────────────────────────┴──────────────────────────────┐  │
│  │                   API Routes Layer                    │  │
│  │  /api/auth  /api/hospitals  /api/medicines            │  │
│  │  /api/appointments  /api/orders  /api/reports         │  │
│  │  /api/doctor-profiles  /api/emergency                 │  │
│  │  /api/blood-donors  /api/media  /api/chat             │  │
│  └───┬──────────┬────────────┬──────────┬────────────────┘  │
│      │          │            │          │                    │
│  ┌───┴────┐ ┌───┴───┐ ┌─────┴────┐ ┌───┴──────┐            │
│  │Supabase│ │ Redis │ │Cloudinary│ │  Groq AI │            │
│  │  (DB)  │ │(Cache)│ │ (Media)  │ │ (LLaMA3) │            │
│  └────────┘ └───────┘ └──────────┘ └──────────┘            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Services Layer                          │   │
│  │  aiService.js  │  redisService.js  │  emailService   │   │
│  │  costEstimation │  cloudinaryService │  socketService │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ 
- **npm** 9+
- Supabase account with project
- Groq API key
- Clerk account (for auth)
- Razorpay account (for payments)
- Cloudinary account (for media)

### 1. Clone the Repository
```bash
git clone https://github.com/ifthekharahmad69/Arogya.git
cd Arogya
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create .env file (see Environment Variables section)
cp .env.example .env

# Run database schema
# Execute backend/schema.sql in your Supabase SQL editor

# Seed data (496K+ records)
npm run seed

# Start the server
npm start
# → Server runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create .env.local (see Environment Variables section)
cp .env.local.example .env.local

# Start development server
npm run dev
# → App runs on http://localhost:3000
```

### 4. Seed Scripts
```bash
# Seed everything (hospitals + medicines)
npm run seed

# Seed only hospitals (249K+ facilities)
npm run seed:hospitals

# Seed only medicines (246K+ records)
npm run seed:medicines
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
```env
# Server
PORT=5000
NODE_ENV=development

# Supabase (PostgreSQL)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# Authentication
JWT_SECRET=your-jwt-secret
CLERK_SECRET_KEY=sk_live_xxxxx

# AI Service
GROQ_API_KEY=gsk_xxxxx

# Media Storage
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Caching
REDIS_URL=redis://default:pass@host:port

# Email
RESEND_API_KEY=re_xxxxx
FROM_EMAIL=noreply@yourdomain.com

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env.local`)
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Supabase (direct client access)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Service
GROQ_API_KEY=gsk_xxxxx

# Razorpay Payments
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your-secret
```

---

## 📡 Backend API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | User login |
| `GET` | `/api/auth/profile` | Get current user |
| `PUT` | `/api/auth/profile` | Update profile |

### Hospitals
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/hospitals` | List hospitals (pagination, geo-filter) |
| `GET` | `/api/hospitals?lat=X&lng=Y&radius=5` | Nearby hospitals by GPS |
| `GET` | `/api/hospitals/stats` | Hospital statistics |
| `GET` | `/api/hospitals/:id` | Hospital details |

### Medicines
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/medicines/search?q=paracetamol` | Search 246K+ medicines |
| `GET` | `/api/medicines/:id` | Medicine details |
| `GET` | `/api/medicines/categories` | List categories |

### Doctor Profiles
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/doctor-profiles` | List all doctors |
| `GET` | `/api/doctor-profiles/:id` | Doctor details |
| `POST` | `/api/doctor-profiles` | Create profile |
| `PUT` | `/api/doctor-profiles/:id` | Update profile |
| `DELETE` | `/api/doctor-profiles/:id` | Delete profile |

### Appointments
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/appointments` | List user appointments |
| `POST` | `/api/appointments` | Book appointment |
| `PUT` | `/api/appointments/:id` | Update appointment |
| `DELETE` | `/api/appointments/:id` | Cancel appointment |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/orders` | Create medicine order |
| `GET` | `/api/orders` | List user orders |
| `PUT` | `/api/orders/:id` | Update order status |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/reports` | Upload medical report |
| `GET` | `/api/reports` | List user reports |
| `DELETE` | `/api/reports/:id` | Delete report |

### Media
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/media/upload` | Upload media (Cloudinary) |
| `GET` | `/api/media` | List media files |
| `DELETE` | `/api/media/:id` | Delete media |

### Emergency & Blood Donors
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/emergency` | Trigger SOS emergency |
| `GET` | `/api/blood-donors` | List blood donors |
| `POST` | `/api/blood-donors` | Register as donor |

### AI & Health
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/analyze` | AI medical analysis |
| `POST` | `/api/chat` | AI doctor chat |
| `GET` | `/api/health` | System health check |

### Frontend API Routes (Next.js Proxy)
| Method | Endpoint | AI Model |
|---|---|---|
| `POST` | `/api/symptoms` | Groq LLaMA 3 70B |
| `POST` | `/api/scan-medicine` | Groq LLaMA 3 70B |
| `POST` | `/api/chat` | Groq LLaMA 3 70B (Streaming) |
| `POST` | `/api/predict` | Groq LLaMA 3 8B |
| `POST` | `/api/quiz` | Groq LLaMA 3 70B |
| `POST` | `/api/healthcare-navigator` | Groq LLaMA 3 70B |
| `GET/POST` | `/api/hospitals` | Direct Supabase |
| `GET` | `/api/medicines` | Direct Supabase |
| `POST` | `/api/payment/create-order` | Razorpay API |
| `POST` | `/api/payment/verify` | Razorpay verification |

---

## 🎨 Frontend Pages & Components

### Dashboard Pages (16 Total)

| Route | Page | Description |
|---|---|---|
| `/dashboard` | **Home Dashboard** | Health stats, quick actions, nearby hospitals, diagnostic CTA |
| `/dashboard/healthcare-navigator` | **Healthcare Navigator** ⭐ | AI decision intelligence, cost estimation, loan application |
| `/dashboard/ai` | **AI Doctor** | Streaming AI medical chat |
| `/dashboard/symptoms` | **Symptom Checker** | AI-powered symptom analysis & diagnosis |
| `/dashboard/medicines` | **Medicine Finder** | Search 246K+ medicines, order online |
| `/dashboard/scanner` | **Medicine Scanner** | Camera-based medicine identification |
| `/dashboard/doctors` | **Doctor Directory** | Find specialists by category |
| `/dashboard/doctor-dashboard` | **Doctor Dashboard** | Manage appointments & profile |
| `/dashboard/diagnostic-centre` | **Diagnostic Centre** | Book tests & health packages |
| `/dashboard/hospitals` | **Hospital Finder** | Interactive map with 249K+ facilities |
| `/dashboard/predictors` | **Health Predictors** | 9 disease risk assessment models |
| `/dashboard/quiz` | **AI Health Quiz** | AI-generated quizzes on any topic |
| `/dashboard/reports` | **Medical Reports** | Upload & manage health records |
| `/dashboard/media` | **Media Gallery** | Hospital/clinic media management |
| `/dashboard/appointments` | **Appointments** | Book & track doctor visits |
| `/dashboard/emergency` | **Emergency SOS** | Nearest hospital routing |
| `/dashboard/video-call` | **Video Consultation** | Real-time video calls |

### Core Components

| Component | File | Purpose |
|---|---|---|
| **HealthcareCTA** | `components/HealthcareCTA.tsx` | Universal "Apply for Loan" + "Find Hospitals" CTA — appears on every feature result |
| **MediBotAgent** | `components/MediBotAgent.jsx` | Floating AI assistant (persistent across pages) |
| **RazorpayCheckout** | `components/RazorpayCheckout.tsx` | Payment processing component |
| **Sidebar** | `components/layout/Sidebar.tsx` | Navigation with Healthcare Navigator as featured item |
| **Header** | `components/layout/Header.tsx` | Top navigation bar |
| **Footer** | `components/layout/Footer.tsx` | Page footer |
| **DiagnosticServices** | `components/DiagnosticServices.tsx` | Quick-access diagnostic test cards |
| **Testimonials** | `components/Testimonials.tsx` | Patient testimonials carousel |
| **ClerkApiProvider** | `components/ClerkApiProvider.tsx` | Authentication context bridge |

### Context Providers

| Provider | File | Purpose |
|---|---|---|
| **LocationContext** | `context/LocationContext.tsx` | GPS location & geocoding |
| **LanguageContext** | `context/LanguageContext.tsx` | 8-language i18n system |

### Utility Libraries

| Library | File | Purpose |
|---|---|---|
| **API Client** | `lib/api.ts` | Centralized HTTP client with auth headers |
| **Groq Agent** | `lib/groqAgent.js` | AI agent with tool-calling capabilities |
| **Groq Key Manager** | `lib/groqKeyManager.ts` | Multi-key rotation for API rate limits |
| **Supabase Client** | `lib/supabaseClient.ts` | Browser-side Supabase connection |
| **Translations** | `lib/translations.ts` | i18n translation strings |

---

## 🗄 Database Schema

### Supabase Tables

| Table | Records | Description |
|---|---|---|
| `users` | — | User profiles & auth data |
| `hospitals` | 249,756 | Pan-India hospital/facility directory |
| `medicines` | 246,068 | Comprehensive medicine database |
| `doctors` | 111+ | Doctor profiles with specializations |
| `appointments` | — | Booking records |
| `orders` | — | Medicine/test orders |
| `reports` | — | Medical report metadata |
| `chats` | — | AI conversation history |
| `blood_donors` | — | Blood donor registry |

### Key Indexes
- `hospitals`: Geolocation index (`latitude`, `longitude`), name search (GIN trigram)
- `medicines`: Name search (GIN trigram), composition index
- `doctors`: Specialization index, hospital affiliation

---

## 🤖 AI Services

### Groq LLaMA 3 Integration

The platform uses **Groq Cloud** for ultra-fast AI inference:

| Model | Use Case | Avg Response |
|---|---|---|
| `llama-3.3-70b-versatile` | Medical chat, symptom analysis, medicine scanning, healthcare navigator | ~2-5s |
| `llama-3.1-8b-instant` | Health predictors, quiz generation | ~1-2s |

### AI Service Architecture (`backend/services/aiService.js`)
- Unified Groq-based service replacing previous Gemini dependency
- Structured JSON output for medical analysis
- Streaming support for chat responses
- System prompts tailored for medical context

### Key AI Capabilities
1. **Symptom Analysis** — Differential diagnosis with severity scoring
2. **Medicine Identification** — Image-to-text analysis for drug identification
3. **Health Prediction** — Statistical risk assessment with factor analysis
4. **Cost Estimation** — Treatment cost prediction based on condition + location
5. **Financial Navigation** — EMI calculation, loan eligibility, affordability scoring
6. **Quiz Generation** — Dynamic medical quiz creation on any health topic
7. **Chat Intelligence** — Context-aware medical Q&A with streaming

### Groq Key Manager
Multi-key rotation system (`lib/groqKeyManager.ts`) to handle API rate limits:
- Automatic key cycling on rate limit errors
- Tracks per-key usage with cooldown periods
- Supports up to 10 concurrent API keys

---

## 💳 Payment Integration

### Razorpay Setup
- **Frontend**: `RazorpayCheckout.tsx` component handles UI
- **Backend Proxy**: Next.js API routes for order creation & verification
- **Supported Methods**: UPI, Credit/Debit Cards, Net Banking, Wallets, EMI
- **WhatsApp Confirmation**: Auto-sends booking details via WhatsApp after payment

### Payment Flow
```
User clicks "Pay" → Frontend creates order via /api/payment/create-order
→ Razorpay checkout modal opens → User completes payment
→ Frontend verifies via /api/payment/verify → Success confirmation
→ WhatsApp notification sent with booking details
```

---

## 🌱 Data Seeding

### Seed Scripts (`backend/scripts/`)

| Script | Records | Sources |
|---|---|---|
| `seedHospitals.js` | 249,756 | JSON hospitals + PMC infrastructure + Geocoded health centres |
| `seedMedicines.js` | 246,068 | CSV/JSON medicine databases (A-Z complete) |
| `seedAll.js` | 496,000+ | Orchestrates both seeders sequentially |

### Commands
```bash
npm run seed              # Seed everything
npm run seed:hospitals    # Hospitals only (249K)
npm run seed:medicines    # Medicines only (246K)
```

### Seeder Features
- Batch processing (500-1000 records per batch)
- Duplicate detection via `upsert`
- Progress logging with percentage
- Error recovery — continues on individual failures
- Idempotent — safe to re-run

---

## 🚀 Deployment

### Backend → Render

Configuration in `render.yaml`:
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

Required environment variables on Render:
- `NODE_ENV=production`
- `PORT=10000`
- All keys from Backend `.env` section

### Frontend → Vercel

```bash
# Deploy settings in Vercel:
Root Directory: frontend
Build Command: npm run build
Output Directory: .next
Framework Preset: Next.js
```

Required environment variables on Vercel:
- All keys from Frontend `.env.local` section
- Set `NEXT_PUBLIC_API_URL` to your Render backend URL

### Post-Deployment Checklist
- [ ] Backend health check: `GET /api/health` returns `{"status":"ok"}`
- [ ] Frontend loads at Vercel URL
- [ ] Clerk authentication works (sign in / sign up)
- [ ] Hospital search returns data
- [ ] Medicine search returns results
- [ ] AI chat responds (streaming)
- [ ] Razorpay payment flow completes
- [ ] Healthcare Navigator loan application works

---

## 📁 Project Structure

```
Arogya/
├── 📄 Arogya_Raksha_Full_Documentation.md   # This file
├── 📄 render.yaml                            # Render deployment config
├── 📄 .gitignore
│
├── 📂 backend/                               # Express.js API Server
│   ├── 📄 server.js                          # Entry point (Express 5 + Socket.io)
│   ├── 📄 supabaseClient.js                  # Supabase connection
│   ├── 📄 package.json
│   ├── 📄 schema.sql                         # Database schema
│   ├── 📄 doctor_profiles.sql                # Doctor data SQL
│   ├── 📂 routes/                            # API route handlers
│   │   ├── auth.js                           # Authentication
│   │   ├── hospitals.js                      # Hospital CRUD + geo-search
│   │   ├── medicines.js                      # Medicine search
│   │   ├── doctorProfiles.js                 # Doctor management
│   │   ├── appointments.js                   # Booking system
│   │   ├── orders.js                         # Medicine orders
│   │   ├── reports.js                        # Medical reports
│   │   ├── media.js                          # Media uploads (Cloudinary)
│   │   ├── chat.js                           # AI chat persistence
│   │   ├── ai.js                             # AI analysis endpoints
│   │   ├── health.js                         # System health endpoints
│   │   ├── emergency.js                      # SOS & emergency
│   │   ├── bloodDonors.js                    # Blood donor registry
│   │   └── users.js                          # User management
│   ├── 📂 models/                            # Data models (Supabase)
│   │   ├── User.js, Hospital.js, Medicine.js
│   │   ├── Doctor.js, Appointment.js, Order.js
│   │   ├── Report.js, Chat.js, BloodDonor.js
│   ├── 📂 services/                          # Business logic
│   │   ├── aiService.js                      # Unified Groq AI service
│   │   ├── redisService.js                   # Redis caching
│   │   ├── cloudinaryService.js              # Media CDN
│   │   ├── costEstimationService.js          # Treatment cost engine
│   │   ├── emailService.js                   # Email via Resend
│   │   └── socketService.js                  # WebSocket handlers
│   ├── 📂 middleware/
│   │   └── clerkAuth.js                      # Clerk JWT verification
│   ├── 📂 scripts/                           # Data seeders
│   │   ├── seedAll.js                        # Master seeder
│   │   ├── seedHospitals.js                  # 249K hospital seeder
│   │   └── seedMedicines.js                  # 246K medicine seeder
│   └── 📂 data/                              # Raw data & SQL
│       └── indexes.sql                       # Performance indexes
│
├── 📂 frontend/                              # Next.js 16 Application
│   ├── 📄 package.json
│   ├── 📄 next.config.ts                     # Next.js configuration
│   ├── 📄 tsconfig.json                      # TypeScript config
│   ├── 📂 public/assets/                     # Static assets (images, icons)
│   ├── 📂 src/
│   │   ├── 📂 app/                           # Next.js App Router
│   │   │   ├── layout.tsx                    # Root layout
│   │   │   ├── page.tsx                      # Landing page
│   │   │   ├── 📂 sign-in/                   # Clerk sign-in
│   │   │   ├── 📂 sign-up/                   # Clerk sign-up
│   │   │   ├── 📂 api/                       # Next.js API routes (proxy)
│   │   │   │   ├── chat/route.ts             # AI chat proxy
│   │   │   │   ├── symptoms/route.ts         # Symptom analysis proxy
│   │   │   │   ├── scan-medicine/route.ts    # Medicine scanner proxy
│   │   │   │   ├── predict/route.ts          # Health predictor proxy
│   │   │   │   ├── quiz/route.ts             # Quiz generation proxy
│   │   │   │   ├── healthcare-navigator/route.ts # Navigator proxy
│   │   │   │   ├── hospitals/route.ts        # Hospital data proxy
│   │   │   │   ├── medicines/route.ts        # Medicine data proxy
│   │   │   │   ├── payment/                  # Razorpay create-order & verify
│   │   │   │   └── agent/route.ts            # MediBot agent proxy
│   │   │   └── 📂 dashboard/                 # Protected dashboard pages
│   │   │       ├── layout.tsx                # Dashboard layout (Sidebar + Header)
│   │   │       ├── page.tsx                  # Home dashboard
│   │   │       ├── healthcare-navigator/     # ⭐ Primary: Loan & Navigation
│   │   │       ├── ai/                       # AI Doctor chat
│   │   │       ├── symptoms/                 # Symptom checker
│   │   │       ├── medicines/                # Medicine finder
│   │   │       ├── scanner/                  # Medicine scanner
│   │   │       ├── hospitals/                # Hospital map
│   │   │       ├── predictors/               # Health predictors
│   │   │       ├── quiz/                     # AI health quiz
│   │   │       ├── doctors/                  # Doctor directory
│   │   │       ├── doctor-dashboard/         # Doctor management
│   │   │       ├── diagnostic-centre/        # Lab tests & booking
│   │   │       ├── reports/                  # Medical reports
│   │   │       ├── media/                    # Media gallery
│   │   │       ├── appointments/             # Appointment booking
│   │   │       ├── emergency/                # SOS system
│   │   │       └── video-call/               # Video consultation
│   │   ├── 📂 components/                    # Reusable components
│   │   │   ├── HealthcareCTA.tsx             # Universal Loan + Hospital CTA
│   │   │   ├── MediBotAgent.jsx              # Floating AI assistant
│   │   │   ├── RazorpayCheckout.tsx          # Payment component
│   │   │   ├── DiagnosticServices.tsx        # Diagnostic quick cards
│   │   │   ├── Testimonials.tsx              # Patient reviews
│   │   │   ├── ClerkApiProvider.tsx           # Auth context bridge
│   │   │   ├── 📂 layout/                    # Layout components
│   │   │   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   │   │   ├── Header.tsx                # Top header bar
│   │   │   │   └── Footer.tsx                # Page footer
│   │   │   └── 📂 ui/                        # shadcn/ui primitives
│   │   ├── 📂 context/                       # React context providers
│   │   │   ├── LocationContext.tsx            # GPS & geolocation
│   │   │   └── LanguageContext.tsx            # Multi-language i18n
│   │   └── 📂 lib/                           # Utility libraries
│   │       ├── api.ts                        # HTTP client
│   │       ├── groqAgent.js                  # AI tool-calling agent
│   │       ├── groqKeyManager.ts             # Multi-key rotation
│   │       ├── supabaseClient.ts             # Supabase browser client
│   │       ├── translations.ts               # Translation strings
│   │       └── utils.ts                      # Utility functions
│   └── 📄 .env.local                         # Environment variables
```

---

## 🌐 Multi-Language Support

| Code | Language | Script |
|---|---|---|
| `en` | English | Latin |
| `hi` | Hindi | Devanagari |
| `te` | Telugu | Telugu |
| `ta` | Tamil | Tamil |
| `kn` | Kannada | Kannada |
| `mr` | Marathi | Devanagari |
| `bn` | Bengali | Bengali |
| `bho` | Bhojpuri | Devanagari |

Language selection is available in the sidebar dropdown and persists across sessions.

---

## 🔒 Security Features

- **Clerk Authentication** — OAuth, MFA, session management
- **Helmet.js** — HTTP security headers (CSP, HSTS, XSS protection)
- **Rate Limiting** — 500 req/15min (general), 30 req/15min (auth)
- **CORS** — Whitelist-based origin validation
- **JWT Verification** — Clerk-issued tokens validated server-side
- **Input Validation** — Sanitized user inputs across all endpoints
- **Body Size Limits** — 50MB max to prevent DoS
- **Gzip Compression** — 60-80% response size reduction

---

## 📊 Performance Optimizations

- **Redis Caching** — Frequently accessed data (hospital stats, medicine search)
- **Supabase Indexes** — GIN trigram for text search, B-tree for geo queries
- **Turbopack** — Next.js 16 ultra-fast dev server
- **Response Compression** — Gzip via `compression` middleware
- **Batch Seeding** — 500-1000 records per batch for data import
- **Image CDN** — Cloudinary for optimized media delivery
- **Multi-Key Rotation** — Groq API key cycling to avoid rate limits
- **Lazy Loading** — Component-level code splitting via Next.js dynamic imports

---

## 👥 Credits

Built with ❤️ for accessible, affordable, and intelligent healthcare in India.

**AI Powered by** [Groq Cloud](https://groq.com) (LLaMA 3 by Meta)  
**Database by** [Supabase](https://supabase.com)  
**Authentication by** [Clerk](https://clerk.com)  
**Payments by** [Razorpay](https://razorpay.com)  
**Maps by** [Leaflet](https://leafletjs.com) + [OpenStreetMap](https://openstreetmap.org)

---

> **⚕️ Disclaimer**: Arogya Raksha is an AI-assisted healthcare platform for educational and informational purposes. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult qualified healthcare professionals for medical decisions.
