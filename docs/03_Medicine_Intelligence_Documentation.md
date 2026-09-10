# 🏥 Arogya Raksha — Complete Documentation

> **Part 3 of 5** | Feature #3: Medicine Intelligence & Scanner

---

## Feature 3: 💊 Medicine Intelligence System

### Overview

Arogya Raksha's Medicine Intelligence is a three-part system combining a **246,068+ medicine database**, an **AI-powered camera scanner**, and an **online ordering system** with Razorpay payments. Together they form a complete medicine lifecycle — from identification to purchase.

---

### 3.1 Sub-Features

| Sub-Feature | Page Route | Description |
|---|---|---|
| **Medicine Finder** | `/dashboard/medicines` | Search 246K+ medicines with filters |
| **Medicine Scanner** | `/dashboard/scanner` | Camera AI to identify medicines from photos |
| **Online Ordering** | (within Finder) | Order medicines with Razorpay payments |

---

### 3.2 Medicine Database — 246,068 Records

**Database Table:** `medicines` (Supabase PostgreSQL)

```sql
CREATE TABLE medicines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,              -- e.g., "Paracetamol 500mg"
  generic_name TEXT,               -- e.g., "Acetaminophen"
  category TEXT,                   -- e.g., "Analgesic", "Antibiotic"
  usage TEXT[] DEFAULT '{}',       -- Array of use cases
  dosage TEXT,                     -- e.g., "500mg twice daily"
  side_effects TEXT[] DEFAULT '{}', -- Array of side effects
  precautions TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  market_price NUMERIC,           -- Price in INR
  alternatives TEXT[] DEFAULT '{}', -- Alternative medicine names
  manufacturer TEXT,               -- e.g., "Cipla", "Sun Pharma"
  prescription_required BOOLEAN DEFAULT true,
  description TEXT
);
```

**Full-text search index:**
```sql
CREATE INDEX idx_medicines_fts ON medicines USING GIN(
  to_tsvector('english',
    coalesce(name, '') || ' ' ||
    coalesce(generic_name, '') || ' ' ||
    coalesce(category, '')
  )
);
```

---

### 3.3 Medicine Finder — Search Flow

```
User types medicine name (e.g., "Dolo 650")
        │
        ▼
┌───────────────────────────┐
│  Frontend: Medicine Page  │  /dashboard/medicines
│  • Search bar with auto-  │
│    complete               │
│  • Category filters       │
│  • Price range filter     │
└──────────┬────────────────┘
           │ GET /api/medicines/search?q=dolo
           ▼
┌───────────────────────────┐
│  Next.js API Route        │  src/app/api/medicines/route.ts
│  → Supabase full-text     │
│    search on 246K records │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│  Results Display:         │
│  ┌─────────────────────┐  │
│  │ Dolo 650             │  │
│  │ Generic: Paracetamol │  │
│  │ ₹35 / strip          │  │
│  │ Manufacturer: Micro  │  │
│  │ Labs                 │  │
│  │ [Order] [Details]    │  │
│  └─────────────────────┘  │
│  ┌─────────────────────┐  │
│  │ Dolo Extra           │  │
│  │ ₹58 / strip          │  │
│  │ ...                  │  │
│  └─────────────────────┘  │
└───────────────────────────┘
```

**API Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/medicines/search?q=paracetamol` | Full-text search across 246K medicines |
| `GET` | `/api/medicines/:id` | Get medicine details (composition, side effects, alternatives) |
| `GET` | `/api/medicines/categories` | List all medicine categories |

---

### 3.4 Medicine Scanner — Camera AI

**Flow:**
```
User captures/uploads medicine photo
        │
        ▼
┌───────────────────────────┐
│  Frontend: Scanner Page   │  /dashboard/scanner
│  • Camera capture (WebRTC)│
│  • Image upload option    │
│  • Preview before send    │
└──────────┬────────────────┘
           │ POST /api/scan-medicine
           │ (image as base64)
           ▼
┌───────────────────────────┐
│  Next.js API Route        │  src/app/api/scan-medicine/route.ts
│  Sends to Groq LLaMA 3   │
│  70B with vision prompt   │
│  "Identify this medicine" │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│  AI Returns JSON:         │
│  {                        │
│    name: "Amoxicillin",   │
│    composition: "...",    │
│    uses: ["Bacterial      │
│      infections", ...],   │
│    sideEffects: [         │
│      "Nausea", ...],      │
│    interactions: [        │
│      "Warfarin: ⚠️", ...],│
│    alternatives: [        │
│      "Augmentin", ...],   │
│    approximatePrice:      │
│      "₹80-120"            │
│  }                        │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│  Results Page Shows:      │
│  • Medicine identification│
│  • Composition breakdown  │
│  • Drug interactions ⚠️    │
│  • Alternative medicines  │
│  • HealthcareCTA (loan +  │
│    hospital finder)       │
└───────────────────────────┘
```

---

### 3.5 Online Ordering — Razorpay Payment Flow

**File:** `frontend/src/components/RazorpayCheckout.tsx` (6,467 bytes)

```
User clicks "Order Medicine"
        │
        ▼
┌──────────────────────────────┐
│  Order Form                  │
│  • Medicine name & quantity  │
│  • Shipping address          │
│  • Total price calculation   │
│  • [Pay Now] button          │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  POST /api/payment/create-   │
│  order                       │
│  → Razorpay creates order ID │
│  → Returns: order_id, amount │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Razorpay Checkout Modal     │
│  Supported methods:          │
│  • UPI (Google Pay, PhonePe) │
│  • Credit/Debit Cards        │
│  • Net Banking               │
│  • Wallets (Paytm, etc.)    │
│  • EMI                       │
└──────────┬───────────────────┘
           │ User completes payment
           ▼
┌──────────────────────────────┐
│  POST /api/payment/verify    │
│  → Verifies payment signature│
│  → Updates order status      │
│  → Triggers email confirm    │
│  → WhatsApp notification     │
└──────────────────────────────┘
```

**Order Database Schema:**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  order_type TEXT DEFAULT 'medicine',  -- 'medicine' | 'consultation' | 'lab_test' | 'other'
  items JSONB DEFAULT '[]',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'pending',       -- pending → confirmed → processing → shipped → delivered
  payment_id TEXT,
  payment_order_id TEXT,
  payment_signature TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending', -- pending → paid → failed → refunded
  shipping_address JSONB DEFAULT '{}',
  notes TEXT
);
```

---

### 3.6 Email Confirmation — Rich HTML Templates

**File:** `backend/services/emailService.js` (12,055 bytes)

After order completion, the system sends **beautiful HTML emails** via Resend:

| Email Template | Trigger | Key Data |
|---|---|---|
| `sendWelcomeEmail` | User registration | Name, email, role, feature highlights |
| `sendOrderConfirmationEmail` | Order placed | Item list, quantities, prices, total, shipping address |
| `sendAppointmentConfirmationEmail` | Appointment booked | Date, time, doctor, hospital, department |

All templates use:
- Green gradient header (#059669 → #10b981 → #34d399)
- Card-based layout with clear typography
- CTA buttons linking to dashboard
- Mobile-responsive design

---

### 3.7 Data Seeding — 246K Medicines

**File:** `backend/scripts/seedMedicines.js` (6,839 bytes)

```javascript
// Batch processing: 500-1000 records per batch
// Duplicate detection via upsert
// Progress logging with percentage
// Error recovery — continues on individual failures
// Idempotent — safe to re-run

npm run seed:medicines    // Seeds all 246,068 medicine records
```

**Data Sources:**
- CSV/JSON medicine databases (A-Z complete)
- Covers: name, generic name, composition, manufacturer, price, category
- All major Indian pharmaceutical manufacturers represented

---

### 3.8 Drug Interaction Intelligence

The AI medicineAdvisor agent includes drug interaction warnings:

```json
{
  "interactions": [
    {
      "drug": "Warfarin",
      "severity": "High",
      "description": "Amoxicillin may increase the effect of Warfarin, raising bleeding risk"
    },
    {
      "drug": "Methotrexate",
      "severity": "Moderate",
      "description": "Amoxicillin may reduce kidney clearance of Methotrexate"
    }
  ]
}
```

---

### 3.9 Key Files

| File | Role |
|---|---|
| `frontend/src/app/dashboard/medicines/page.tsx` | Medicine Finder UI |
| `frontend/src/app/dashboard/scanner/page.tsx` | Camera Scanner UI |
| `frontend/src/app/api/medicines/route.ts` | Medicine search API proxy |
| `frontend/src/app/api/scan-medicine/route.ts` | Medicine scanner AI proxy |
| `frontend/src/app/api/payment/create-order/route.ts` | Razorpay order creation |
| `frontend/src/app/api/payment/verify/route.ts` | Payment verification |
| `frontend/src/components/RazorpayCheckout.tsx` | Payment checkout component |
| `backend/routes/medicines.js` | Medicine CRUD + search API |
| `backend/routes/orders.js` | Order management API |
| `backend/models/Medicine.js` | Medicine data model |
| `backend/models/Order.js` | Order data model |
| `backend/scripts/seedMedicines.js` | 246K medicine seeder |
| `backend/services/emailService.js` | Order confirmation emails |

---

> **Next:** Part 4 — Hospital Discovery & Maps
