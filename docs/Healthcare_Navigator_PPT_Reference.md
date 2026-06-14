# 🏦 Healthcare & Financial Navigator
## Complete Feature Architecture — PPT Reference Document

> **Arogya Raksha's Flagship Feature**  
> AI-Powered Decision Intelligence | Cost Estimation | Medical Loan Application | Hospital Discovery

---

## 🎯 What is the Healthcare Navigator?

The **Healthcare & Financial Navigator** is the **primary feature** of the Arogya Raksha platform. It is an AI-powered decision intelligence engine that bridges the gap between **medical needs** and **financial capability** for patients in India.

### The Problem It Solves
- **70% of Indians** face financial hardship due to medical expenses
- Patients lack transparency on **treatment costs** across hospitals
- No single platform connects **clinical pathways → cost estimation → loan approval → hospital booking**
- Existing healthcare platforms don't address **"How will I pay for this?"**

### The Solution
A **single-query system** where a patient types their condition (e.g., "knee replacement surgery") and receives:
1. ✅ **Clinical Diagnosis** — AI detects condition with ICD-10 mapping
2. ✅ **Hospital Discovery** — 3 location-aware hospitals (Premium / Mid-tier / Budget)
3. ✅ **Cost Breakdown** — Procedure, stay, medicines, diagnostics, contingency
4. ✅ **Affordability Analysis** — Based on monthly income and budget
5. ✅ **EMI Scenarios** — 4 loan repayment plans (6mo / 12mo / 24mo / 36mo)
6. ✅ **Lender Marketplace** — Neutral display of NBFC, Private Bank, Public Bank, Digital Lender
7. ✅ **Loan Application** — Complete flow with identity verification & Razorpay payment
8. ✅ **Appointment Booking** — Auto-booked upon loan approval

---

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │            HEALTHCARE NAVIGATOR PAGE (973 lines)              │   │
│  │                                                               │   │
│  │  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐  │   │
│  │  │  Search Form  │  │  Advanced Form │  │  Quick Examples   │  │   │
│  │  │  • Condition  │  │  • Gender      │  │  🫀 Angioplasty   │  │   │
│  │  │  • City/GPS   │  │  • Comorbidity │  │  🦴 Knee Replace  │  │   │
│  │  │  • Age        │  │  • Income (₹)  │  │  👁 Cataract      │  │   │
│  │  │              │  │  • Budget (₹)  │  │  🎗 Cancer        │  │   │
│  │  └──────┬───────┘  └───────┬────────┘  │  💊 Dialysis      │  │   │
│  │         │                  │            │  🤰 C-Section     │  │   │
│  │         └──────────┬───────┘            └──────────────────┘  │   │
│  │                    │                                           │   │
│  │                    ▼                                           │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │              AI REPORT RESULTS (7 Sections)              │  │   │
│  │  │                                                          │  │   │
│  │  │  1. Condition Banner (ICD-10 + Urgency + Affordability)  │  │   │
│  │  │  2. Clinical Pathway (Step-by-step treatment plan)       │  │   │
│  │  │  3. Hospital Cards (3 GPS-matched, expandable)           │  │   │
│  │  │  4. Cost Breakdown (5 categories with min/max ranges)    │  │   │
│  │  │  5. EMI Scenarios Table (4 plans, select one)            │  │   │
│  │  │  6. Lender Marketplace (4 types, select one)             │  │   │
│  │  │  7. Financial Risk Score (0-1 gauge)                     │  │   │
│  │  └──────────────────────┬───────────────────────────────────┘  │   │
│  │                         │                                      │   │
│  │                         ▼                                      │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │          LOAN APPLICATION FLOW (6 Steps)                 │  │   │
│  │  │                                                          │  │   │
│  │  │  Step 0: Select EMI + Lender → "Apply" button            │  │   │
│  │  │  Step 1: User Details (Phone, Email, DOB)                │  │   │
│  │  │  Step 2: Razorpay ₹30 Processing Fee                    │  │   │
│  │  │  Step 3: Token Sent (Email + SMS verification)           │  │   │
│  │  │  Step 4: Enter Verification Token                        │  │   │
│  │  │  Step 5: ✅ Loan Approved + Appointment Auto-Booked      │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP POST /api/healthcare-navigator
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   NEXT.JS API ROUTE (Proxy Layer)                    │
│                                                                      │
│  File: frontend/src/app/api/healthcare-navigator/route.ts            │
│                                                                      │
│  • Receives: query, city, age, gender, comorbidities,               │
│              income, budget, lat, lng, area                          │
│  • Multi-key rotation: Cycles through 9 Groq API keys               │
│  • Rate limit fallback: Retries on 429 with next key                 │
│  • JSON validation: Parses & validates AI response                   │
│  • Error handling: Returns structured error messages                  │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTP POST (Groq Cloud API)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      GROQ AI ENGINE                                  │
│                                                                      │
│  Model: llama-3.3-70b-versatile                                      │
│  Temperature: 0.3 (low randomness for medical accuracy)              │
│  Max Tokens: 3,500                                                   │
│                                                                      │
│  System Prompt (70 lines):                                           │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Role: Healthcare & Financial Decision Navigator for India      │  │
│  │ Rules:                                                         │  │
│  │  • Neutral — no lender bias                                    │  │
│  │  • Transparent — show all assumptions                          │  │
│  │  • Responsible — prevent over-borrowing                        │  │
│  │  • NOT a diagnosis — decision support only                     │  │
│  │                                                                │  │
│  │ Calculation Engine:                                             │  │
│  │  • City multiplier: Metro=1.3x, Tier-2=1.0x, Tier-3=0.8x     │  │
│  │  • safeSpendLimit = income × 4                                 │  │
│  │  • emiThreshold = income × 0.25                                │  │
│  │  • loanNeeded = max(0, totalCost - budget)                     │  │
│  │  • EMI = P×r×(1+r)^n / ((1+r)^n - 1)                         │  │
│  │  • safe = (EMI/income) ≤ 30%                                  │  │
│  │  • Uses REAL hospital names for user's city/area               │  │
│  │  • Provides lat/lng coordinates for map integration            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Output: Structured JSON (25+ fields, ~3000 tokens)                  │
└──────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     PAYMENT LAYER (Razorpay)                         │
│                                                                      │
│  • ₹30 Processing Fee via Razorpay Checkout                         │
│  • Supports: UPI, Credit Card, Debit Card, Net Banking, Wallets     │
│  • 256-bit SSL encryption                                            │
│  • Order created via /api/payment/create-order                       │
│  • Verified via /api/payment/verify                                  │
│  • On success → triggers token verification flow                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 📊 AI Response Schema (What the AI Returns)

The AI generates a comprehensive **25+ field JSON report** for every query:

### 1. Clinical Intelligence
| Field | Type | Description |
|---|---|---|
| `detectedCondition` | string | AI-detected medical condition |
| `icdCode` | string | ICD-10 classification code |
| `snomedConcept` | string | SNOMED CT medical concept |
| `recommendedProcedure` | string | Suggested treatment/procedure |
| `clinicalPathway` | string[] | Step-by-step treatment plan (4-6 steps) |
| `urgencyLevel` | enum | `routine` / `urgent` / `emergency` |

### 2. Hospital Discovery (3 Hospitals)
| Field | Type | Description |
|---|---|---|
| `name` | string | Real hospital name near user's GPS |
| `category` | enum | `Premium` / `Mid-tier` / `Budget` |
| `location` | string | Address/area |
| `distance` | string | Distance from user (e.g., "3.2 km") |
| `rating` | number | Hospital rating (1-5) |
| `accreditations` | string[] | e.g., ["NABH", "NABL", "JCI"] |
| `costRange` | {min, max} | Treatment cost range at this hospital |
| `strengths` | string[] | Hospital specialties |
| `specialization` | string | Primary department |
| `procedureVolume` | string | e.g., "500+/year" |
| `appointmentAvailability` | string | e.g., "Within 3 days" |
| `lat`, `lng` | number | GPS coordinates for map |

### 3. Cost Breakdown (5 Categories)
| Category | Description |
|---|---|
| `procedure` | Surgery/treatment cost (min-max) |
| `hospitalStay` | Room + nursing charges |
| `medicines` | Drugs & consumables |
| `diagnostics` | Pre-op & post-op tests |
| `contingency` | 10-25% buffer (higher with comorbidities) |
| **`total`** | **Sum of all categories** |

### 4. Financial Intelligence
| Field | Type | Description |
|---|---|---|
| `affordabilityStatus` | enum | `fully_affordable` / `partial_financing` / `high_stress` / `unknown` |
| `safeSpendLimit` | number | Income × 4 (max safe expenditure) |
| `emiAffordabilityThreshold` | number | Income × 0.25 (max safe EMI) |
| `loanNeeded` | number | max(0, totalCost - budget) |
| `financialRiskScore` | float | 0-1 risk assessment |
| `financialRiskLabel` | string | Low / Moderate / High |

### 5. EMI Scenarios (4 Plans)
Each scenario includes:
| Field | Description |
|---|---|
| `tenure` | Loan duration (6 / 12 / 24 / 36 months) |
| `interestRate` | Annual interest rate (%) |
| `emi` | Monthly EMI amount (₹) |
| `totalRepayment` | Total amount to be repaid |
| `totalInterest` | Interest cost over loan period |
| `incomePercent` | EMI as % of monthly income |
| `safe` | Boolean — is EMI ≤ 30% of income? |

### 6. Lender Marketplace (4 Types)
| Lender Type | Examples | Interest | Approval | Docs |
|---|---|---|---|---|
| **NBFC** | Bajaj Finserv, Tata Capital | 12-18% | 1-3 days | Minimal |
| **Private Bank** | HDFC, ICICI, Axis | 10-15% | 3-7 days | Moderate |
| **Public Bank** | SBI, PNB, Canara | 9-13% | 7-14 days | Detailed |
| **Digital Lender** | KreditBee, MoneyTap | 14-24% | Same day | Minimal |

---

## 🔄 Complete User Flow (End-to-End)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY MAP                          │
└─────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  START  │
    └────┬────┘
         │
         ▼
  ┌──────────────┐     User types: "knee replacement surgery"
  │ Enter Query  │     + City auto-detected via GPS
  │ + Basic Info │     + Optional: age, income, budget
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐     AI Processing (2-5 seconds):
  │  AI Analysis │     • ICD-10 mapping
  │  (Groq LLM)  │     • Hospital matching
  └──────┬───────┘     • Cost computation
         │             • EMI calculation
         ▼
  ┌──────────────────────────────────────────────────────┐
  │              FULL REPORT DISPLAYED                    │
  │                                                       │
  │  ┌─────────────────────────────────────────────────┐ │
  │  │ 🩺 Condition: Osteoarthritis (ICD: M17.1)      │ │
  │  │ ⚡ Urgency: Routine                             │ │
  │  │ 💰 Affordability: Partial Financing Needed       │ │
  │  └─────────────────────────────────────────────────┘ │
  │                                                       │
  │  ┌─────────────────────────────────────────────────┐ │
  │  │ 📋 Clinical Pathway:                            │ │
  │  │  1. Orthopedic consultation + X-ray/MRI         │ │
  │  │  2. Pre-anesthesia assessment                   │ │
  │  │  3. Total Knee Replacement surgery              │ │
  │  │  4. Post-op rehabilitation (6-8 weeks)          │ │
  │  └─────────────────────────────────────────────────┘ │
  │                                                       │
  │  ┌─────────────────────────────────────────────────┐ │
  │  │ 🏥 Hospitals Near You:                          │ │
  │  │  ⭐ Apollo Hospital (Premium) — ₹2.5L-₹4L       │ │
  │  │     Jubilee Hills, 2.3 km · Rating: 4.5         │ │
  │  │  ● Care Hospitals (Mid-tier) — ₹1.8L-₹3L       │ │
  │  │     Banjara Hills, 3.1 km · Rating: 4.2         │ │
  │  │  ○ Government General (Budget) — ₹50K-₹1.2L    │ │
  │  │     Nampally, 5.0 km · Rating: 3.8              │ │
  │  └─────────────────────────────────────────────────┘ │
  │                                                       │
  │  ┌─────────────────────────────────────────────────┐ │
  │  │ 💳 Cost Breakdown:                              │ │
  │  │  Procedure:      ₹1,00,000 — ₹2,50,000         │ │
  │  │  Hospital Stay:  ₹20,000  — ₹50,000             │ │
  │  │  Medicines:      ₹15,000  — ₹30,000             │ │
  │  │  Diagnostics:    ₹10,000  — ₹25,000             │ │
  │  │  Contingency:    ₹15,000  — ₹35,000             │ │
  │  │  ─────────────────────────────────────           │ │
  │  │  TOTAL:          ₹1,60,000 — ₹3,90,000          │ │
  │  └─────────────────────────────────────────────────┘ │
  │                                                       │
  │  ┌─────────────────────────────────────────────────┐ │
  │  │ 📊 EMI Scenarios (Loan: ₹1,60,000):            │ │
  │  │  6 mo  @ 14% → ₹28,000/mo (23% income) ✅ Safe  │ │
  │  │  12 mo @ 14% → ₹15,000/mo (12% income) ✅ Safe  │ │
  │  │  24 mo @ 16% → ₹9,000/mo  (7% income)  ✅ Safe  │ │
  │  │  36 mo @ 18% → ₹7,000/mo  (6% income)  ✅ Safe  │ │
  │  │                  └── 💡 Recommended               │ │
  │  └─────────────────────────────────────────────────┘ │
  └──────────────────────┬───────────────────────────────┘
                         │ User selects EMI + Lender
                         ▼
  ┌──────────────────────────────────────────────────────┐
  │          LOAN APPLICATION FLOW                        │
  │                                                       │
  │  Step 1: Enter Details                                │
  │  ┌──────────────────────────────────────────────┐    │
  │  │ Phone: [  9876543210  ] (pre-filled Clerk)   │    │
  │  │ Email: [  name@email.com  ] (pre-filled)     │    │
  │  │ DOB:   [  1985-03-15  ]                      │    │
  │  │           [Continue to Payment →]             │    │
  │  └──────────────────────────────────────────────┘    │
  │                         │                             │
  │                         ▼                             │
  │  Step 2: Processing Fee (₹30)                        │
  │  ┌──────────────────────────────────────────────┐    │
  │  │  Loan Processing Fee:              ₹30       │    │
  │  │  • One-time, non-refundable                  │    │
  │  │  • Covers verification & approval            │    │
  │  │  • Via Razorpay (UPI/Card/NetBanking)        │    │
  │  │           [ 🔒 Pay ₹30 ]                     │    │
  │  └──────────────────────────────────────────────┘    │
  │                         │                             │
  │                         ▼ Razorpay payment success    │
  │                                                       │
  │  Step 3: Token Verification                           │
  │  ┌──────────────────────────────────────────────┐    │
  │  │  📧📱 Token sent to email & SMS!              │    │
  │  │  Token: AR-X7KM92 (6 chars)                  │    │
  │  │  ⏱ Time remaining: 29:45                     │    │
  │  │           [Enter Token →]                     │    │
  │  └──────────────────────────────────────────────┘    │
  │                         │                             │
  │                         ▼ Token verified              │
  │                                                       │
  │  Step 4: ✅ APPROVED + BOOKED                        │
  │  ┌──────────────────────────────────────────────┐    │
  │  │  🎉 Loan Approved & Appointment Booked!       │    │
  │  │                                               │    │
  │  │  Loan ID:       LOAN-M4K7P2                   │    │
  │  │  Loan Amount:   ₹1.6L                         │    │
  │  │  EMI:           ₹15,000/mo                    │    │
  │  │  Processing Fee: ₹30 ✓                        │    │
  │  │                                               │    │
  │  │  📅 Appointment: Wed, 22 Apr 2026             │    │
  │  │  🏥 Hospital: Apollo Hospital                  │    │
  │  │  🩺 Condition: Osteoarthritis                  │    │
  │  │                                               │    │
  │  │  ✉ Confirmation sent to em***@email.com       │    │
  │  │    and 98****3210                              │    │
  │  └──────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────┘
```

---

## 🔗 Cross-Feature Integration

The Healthcare Navigator is connected to **every feature** in the platform through the **HealthcareCTA component**:

```
┌─────────────────────────────────────────────────────────────┐
│              CROSS-FEATURE CTA INTEGRATION                   │
│                                                              │
│  Every feature result page shows:                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🔥 Apply for Medical Loan  (Orange/Red gradient)      │  │
│  │     → Links to /dashboard/healthcare-navigator         │  │
│  │     → Highlighted, primary CTA with 0% EMI badge       │  │
│  │     → Shine animation on hover                         │  │
│  │                                                         │  │
│  │  🏥 Find Nearby Hospitals  (Blue/White card)            │  │
│  │     → Links to /dashboard/hospitals                     │  │
│  │     → GPS-enabled, secondary CTA                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Integrated into these features:                             │
│  ✅ Symptom Checker    → After diagnosis results             │
│  ✅ Medicine Scanner   → After scan analysis                 │
│  ✅ Health Predictors  → After risk assessment               │
│  ✅ AI Doctor Chat     → After 3+ messages exchanged         │
│  ✅ Medicine Finder    → In medicine details panel           │
│  ✅ Diagnostic Centre  → Above the bottom CTA section        │
│  ✅ Health Quiz        → After quiz results                  │
│  ✅ Main Dashboard     → Between diagnostics & testimonials  │
│                                                              │
│  Component: src/components/HealthcareCTA.tsx                 │
│  Variants: 'default' (full cards), 'compact' (inline btns), │
│            'wide' (2-column layout)                          │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar Navigation Priority
```
┌─────────────────────────────────┐
│  ■ Dashboard                    │  ← Regular
│  ✨ Healthcare Navigator  NEW   │  ← FEATURED (gradient bg, sparkle icon)
│  ■ AI Doctor                    │  ← Regular
│  ■ Symptom Checker              │  ← Regular
│  ■ Medicine Finder              │  ← Regular
│  ■ Medicine Scanner             │  ← Regular
│  ...                            │
└─────────────────────────────────┘
```

---

## 📐 Financial Calculation Engine

### Core Formulas

```
┌─────────────────────────────────────────────────────────────┐
│                 FINANCIAL CALCULATION ENGINE                  │
│                                                              │
│  City Cost Multiplier:                                       │
│    Metro (Mumbai/Delhi/Bangalore/Chennai/Kolkata) = 1.3x     │
│    Tier-2 (Hyderabad/Pune/Jaipur/etc.)            = 1.0x     │
│    Tier-3 (Others)                                 = 0.8x     │
│                                                              │
│  Safe Spend Limit:                                           │
│    safeSpendLimit = monthly_income × 4                       │
│    Example: ₹60,000/mo → ₹2,40,000 safe limit               │
│                                                              │
│  EMI Affordability Threshold:                                │
│    emiThreshold = monthly_income × 0.25                      │
│    Example: ₹60,000/mo → ₹15,000/mo max EMI                 │
│                                                              │
│  Loan Amount Needed:                                         │
│    loanNeeded = max(0, total_cost_min - available_budget)    │
│    Example: ₹1,60,000 - ₹0 = ₹1,60,000                     │
│                                                              │
│  EMI Formula (Reducing Balance):                              │
│    EMI = P × r × (1+r)^n / ((1+r)^n - 1)                    │
│    Where: P = principal, r = rate/1200, n = months           │
│                                                              │
│  Safety Check:                                               │
│    safe = (EMI / monthly_income × 100) ≤ 30%                │
│                                                              │
│  Affordability Status:                                       │
│    fully_affordable   → loanNeeded = 0                       │
│    partial_financing  → loanNeeded < safeSpendLimit          │
│    high_stress        → loanNeeded ≥ safeSpendLimit          │
│    unknown            → income not provided                  │
│                                                              │
│  Financial Risk Score (0-1):                                 │
│    Based on: income-to-cost ratio + EMI burden               │
│             + comorbidity factor + age factor                 │
│    < 0.35 = Low  |  0.35-0.6 = Moderate  |  > 0.6 = High   │
│                                                              │
│  Contingency Adjustment:                                     │
│    Base: 10% of total                                        │
│    With comorbidities: 15-25% of total                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡 Security & Trust Features

| Feature | Implementation |
|---|---|
| **No Lender Bias** | AI system prompt explicitly forbids ranking lenders as "best" |
| **Transparent Assumptions** | Every report shows numbered assumptions list |
| **Disclaimer** | Permanent banner: "Decision Support Tool — Not Medical or Financial Advice" |
| **Identity Verification** | 6-character token (AR-XXXXXX) sent via Email + SMS |
| **30-Minute Expiry** | Verification token expires with visible countdown timer |
| **Payment Security** | Razorpay 256-bit SSL encryption |
| **Data Privacy** | Email/phone masked in UI (em***@email.com, 98****3210) |
| **Pre-fill from Auth** | Email and phone auto-populated from Clerk profile |
| **Notes & Disclaimers** | AI generates context-specific notes and disclaimers |

---

## 🎨 UI/UX Design Highlights

### Visual Design System
| Element | Design |
|---|---|
| **Search Card** | White card with emerald accent, quick-example pills |
| **Condition Banner** | Urgency badge (Green/Amber/Red) + Affordability status |
| **Hospital Cards** | Expandable with "Best Match" tag, tier color coding |
| **Cost Table** | 5 rows with category icons, min-max range columns |
| **EMI Table** | Interactive with "Select" buttons, "Recommended" badge |
| **Lender Cards** | 2×2 grid with selection checkmark, neutral styling |
| **Loan Flow** | Stepped cards (Details → Payment → Token → Approved) |
| **Success State** | 🎉 Full-width emerald card with Loan ID, appointment details |

### Loading States
- Animated spinning circle with pulse effect
- 5 sequential shimmer pills: *ICD-10 Mapping → Hospital Discovery → Cost Estimation → EMI Analysis → Lender Matching*

### GPS Integration
- Live location badge with pulsing green dot
- Auto-filled city from `LocationContext`
- GPS coordinates (lat/lng) displayed for precision
- Hospitals sorted by actual distance from user

---

## 📱 Technology Dependencies

| Component | Technology | Purpose |
|---|---|---|
| **Frontend Page** | Next.js 16 + React 19 | 973-line interactive UI |
| **AI Engine** | Groq LLaMA 3.3 70B | Clinical + financial intelligence |
| **API Layer** | Next.js API Route | Proxy with multi-key rotation |
| **Authentication** | Clerk | User identity, pre-filled details |
| **Payment** | Razorpay | ₹30 processing fee |
| **Location** | Browser Geolocation API | GPS coordinates |
| **Location Context** | React Context | Reverse geocoding (area, city) |
| **Icons** | Lucide React (35 icons) | Medical & financial iconography |
| **Animations** | Tailwind CSS `animate-in` | Smooth transitions |

---

## 📈 Key Metrics & Impact

| Metric | Value |
|---|---|
| **Component Size** | 973 lines (largest single component) |
| **AI Response Fields** | 25+ structured fields per report |
| **Hospital Matching** | 3 tier-matched hospitals per query |
| **EMI Plans** | 4 scenarios (6/12/24/36 months) |
| **Lender Types** | 4 neutral marketplace options |
| **Loan Flow Steps** | 6 steps (idle → approved) |
| **Processing Fee** | ₹30 (via Razorpay) |
| **Token Validity** | 30 minutes |
| **Cross-Feature CTAs** | 8 feature pages integrated |
| **Response Time** | 2-5 seconds (Groq AI) |

---

## 🚀 Future Roadmap

1. **Real Lender API Integration** — Connect to actual NBFC/bank APIs for live approval
2. **Credit Score Check** — CIBIL/Experian integration for instant eligibility
3. **Hospital API** — Real-time bed availability and appointment slots
4. **Insurance Integration** — Factor in health insurance coverage
5. **EMI Calculator Widget** — Standalone embeddable calculator
6. **Loan Tracker** — Post-approval EMI tracking dashboard
7. **Multi-Language Support** — Navigator in 8 Indian languages
8. **Document Upload** — Upload medical records for better AI analysis

---

> **This document is designed for PPT presentations. Each section maps to 1-2 slides.**  
> **Total recommended slides: 12-15 slides**

| Slide # | Section | Content |
|---|---|---|
| 1 | Title | Healthcare Navigator — AI Decision Intelligence |
| 2 | Problem | 70% Indians face medical financial hardship |
| 3 | Solution | Single-query: Condition → Cost → Loan → Hospital |
| 4 | Architecture | Full system diagram |
| 5 | AI Schema | 25+ field JSON output breakdown |
| 6-7 | User Flow | Step-by-step journey map |
| 8 | Cost Engine | Financial calculation formulas |
| 9 | Loan Flow | 6-step application process |
| 10 | Cross-Feature | CTA integration across 8 pages |
| 11 | Security | Trust & verification features |
| 12 | Metrics | Key numbers & impact |
| 13 | Demo | Live screenshots |
| 14 | Roadmap | Future enhancements |
| 15 | Thank You | Contact & links |
