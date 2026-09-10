# 🏥 Arogya Raksha — Complete Documentation

> **Part 1 of 5** | Feature #1: Healthcare Navigator (Flagship Feature)

---

## Feature 1: 🏦 AI-Powered Healthcare Navigator

### Overview

The **Healthcare Navigator** is the flagship feature of Arogya Raksha — a comprehensive AI-driven decision intelligence system that connects patients with the right hospitals, estimates treatment costs, and facilitates medical loan applications with EMI options. It is the platform's primary revenue and user-value engine.

---

### 1.1 What It Does

| Capability | Description |
|---|---|
| **Condition Assessment** | AI analyzes patient symptoms using Groq LLaMA 3 70B and maps them to clinical pathways |
| **Cost Estimation** | Real-time treatment cost breakdown with hospital-tier pricing (Government / Private / Super-specialty) |
| **Medical Loan Application** | Instant EMI calculation — 0% EMI available, neutral lender marketplace |
| **Hospital Discovery** | GPS-enabled nearby hospital finder using 249,756+ facilities from the Supabase database |
| **Financial Affordability Analysis** | Income-based treatment affordability scoring with personalized recommendations |

---

### 1.2 Architecture

```
User enters symptoms/condition
        │
        ▼
┌──────────────────────────┐
│  Frontend: Next.js Page  │  /dashboard/healthcare-navigator
│  Collects: condition,    │
│  location, income, age   │
└──────────┬───────────────┘
           │ POST /api/healthcare-navigator
           ▼
┌──────────────────────────┐
│  Next.js API Route       │  src/app/api/healthcare-navigator/route.ts
│  Calls Groq LLaMA 3 70B │
│  for clinical pathway    │
└──────────┬───────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐  ┌─────────────────────┐
│ Groq   │  │ Cost Estimation     │
│ AI     │  │ Service (KNN algo)  │
│ Engine │  │ medical_costs.csv   │
└────────┘  └─────────────────────┘
    │              │
    ▼              ▼
┌──────────────────────────┐
│  Response combines:      │
│  • Clinical pathway      │
│  • Cost range (INR)      │
│  • EMI options (6/12/24) │
│  • Nearby hospitals      │
│  • Affordability score   │
└──────────────────────────┘
```

---

### 1.3 Cost Estimation Engine — Deep Dive

**File:** `backend/services/costEstimationService.js`

The cost estimation uses a **k-Nearest Neighbors (KNN)** algorithm over a medical costs dataset:

```javascript
// KNN with k=20 — finds 20 most similar patient profiles
// Distance function weighs: smoker(4x) > age(3x) > BMI(2x) > sex(1x) > children(1x)
function estimateCost({ age, sex, bmi, smoker, children }) {
  const scored = data.map(d => {
    const ageDiff = Math.abs(d.age - (age || 30)) / 50;
    const bmiDiff = Math.abs(d.bmi - (bmi || 25)) / 30;
    const smokerDiff = (d.smoker === smoker) ? 0 : 1;
    const distance = ageDiff * 3 + bmiDiff * 2 + smokerDiff * 4 + ...;
    return { ...d, distance };
  });
  // Returns: estimated cost (USD/INR), cost range, EMI for 6/12/24 months
}
```

**Output structure:**
```json
{
  "estimated_annual_cost_usd": 12500,
  "estimated_annual_cost_inr": 1037500,
  "cost_range_inr": { "min": 415000, "max": 2490000 },
  "monthly_emi_6": 172917,
  "monthly_emi_12": 86458,
  "monthly_emi_24": 43229,
  "confidence": "high",
  "similar_profiles_analyzed": 20
}
```

---

### 1.4 Hospital Discovery Integration

The Healthcare Navigator integrates with the **249,756+ hospital database** for GPS-based recommendations:

**Backend Route:** `backend/routes/hospitals.js`
**Database Table:** `hospitals` (Supabase PostgreSQL)

| Query Parameter | Description | Example |
|---|---|---|
| `lat` | Patient latitude | `17.3850` |
| `lng` | Patient longitude | `78.4867` |
| `radius` | Search radius in km | `5` |
| `type` | Filter: government/private/clinic | `government` |

**Hospital record structure:**
```json
{
  "id": "uuid",
  "name": "Apollo Emergency Care",
  "address": "Jubilee Hills, Hyderabad",
  "city": "Hyderabad",
  "state": "Telangana",
  "type": "private",
  "departments": ["Emergency", "Cardiology", "Orthopedics"],
  "emergency": true,
  "ambulance": true,
  "total_beds": 500,
  "available_beds": 45,
  "rating": 4.5,
  "location": { "lat": 17.4326, "lng": 78.4071 }
}
```

---

### 1.5 Medical Loan Flow

```
Patient selects treatment plan
        │
        ▼
┌─────────────────────────┐
│  Loan Application Form  │
│  • Treatment cost       │
│  • Tenure: 6/12/24 mo   │
│  • Monthly income       │
│  • Employment type      │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Lender Marketplace     │
│  (Neutral — shows all)  │
│  • 0% EMI options       │
│  • Standard EMI plans   │
│  • Instant approval     │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Loan Confirmation      │
│  • EMI schedule         │
│  • Appointment booking  │
│  • Hospital directions  │
└─────────────────────────┘
```

---

### 1.6 Key Files

| File | Role |
|---|---|
| `frontend/src/app/dashboard/healthcare-navigator/page.tsx` | Main UI page |
| `frontend/src/app/api/healthcare-navigator/route.ts` | Next.js API proxy to Groq |
| `backend/services/costEstimationService.js` | KNN cost estimation engine |
| `backend/routes/hospitals.js` | Hospital GPS discovery API |
| `backend/data/medical_costs.csv` | Medical cost dataset for KNN |
| `frontend/src/components/HealthcareCTA.tsx` | Universal CTA component — appears on EVERY feature result page |

---

### 1.7 HealthcareCTA — Universal Cross-Selling Component

**File:** `frontend/src/components/HealthcareCTA.tsx` (6,827 bytes)

This is a critical business component — it appears at the bottom of **every** feature result across the entire platform:

- Symptom Checker results → "Apply for Medical Loan" + "Find Nearby Hospitals"
- Medicine Scanner results → "Apply for Medical Loan" + "Find Nearby Hospitals"
- Health Predictor results → "Apply for Medical Loan" + "Find Nearby Hospitals"
- Diagnostic Centre results → "Apply for Medical Loan" + "Find Nearby Hospitals"
- AI Quiz results → "Apply for Medical Loan" + "Find Nearby Hospitals"

This funnel drives users from **any health concern** to the Healthcare Navigator for financial support and hospital booking.

---

> **Next:** Part 2 — AI Doctor & Symptom Checker
