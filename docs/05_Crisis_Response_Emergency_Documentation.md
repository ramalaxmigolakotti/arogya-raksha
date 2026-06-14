# 🏥 Arogya Raksha — Complete Documentation

> **Part 5 of 5** | Feature #5: Crisis Response & Emergency Management

---

## Feature 5: 🚨 Crisis Response & Emergency Management System

### Overview

The **Crisis Response System** is Arogya Raksha's most architecturally complex feature — a real-time **incident management pipeline** designed for hospitality venues (hotels, resorts, malls). It provides an 8-step lifecycle from **QR code SOS trigger** through **AI triage** to **hospital pre-arrival alerts** — all connected via **Socket.io WebSockets**.

---

### 5.1 What It Does

| Capability | Description |
|---|---|
| **QR-Code SOS Trigger** | Guest scans room QR code → pre-filled emergency form |
| **Medical Profile Auto-Attach** | Patient's saved medical profile (blood group, conditions, allergies) automatically attaches to incident |
| **AI Triage (ICD-10)** | Groq AI assesses severity, assigns ICD-10 code, recommends department |
| **Smart Responder Assignment** | Auto-assigns nearest available staff (doctor > security > manager) |
| **Real-time Chat** | Bidirectional chat between guest, staff, and hospital |
| **Hospital Pre-Arrival Alerts** | Automatically notifies hospital with patient data before arrival |
| **Ambulance Dispatch** | Webhook-ready Twilio integration for 108 ambulance alerting |
| **Live Location Tracking** | Responder GPS relay to patient's SOS screen |
| **Cost Estimation** | Treatment cost range + EMI options attached to incident |

---

### 5.2 The 8-Step Incident Lifecycle

```
Step 1: QR SCAN / SOS TRIGGER
┌──────────────────────────────────────────────┐
│  Guest scans QR code in hotel room           │
│  → URL: /crisis/report?room=305&floor=3      │
│  → Pre-filled form with room metadata        │
│  → Guest enters: name, symptoms, type        │
└──────────────────┬───────────────────────────┘
                   │ POST /api/crisis/create
                   ▼
Step 2: INCIDENT CREATION
┌──────────────────────────────────────────────┐
│  Backend creates incident object             │
│  • ID: INC-XXXXXX (timestamp-based)          │
│  • Attaches medical_profile (if saved)       │
│  • Status: PENDING                           │
│  • Ambulance alert: WEBHOOK_READY            │
│  • Stores in memory + Supabase               │
│  → Socket.io: emit('new_incident')           │
└──────────────────┬───────────────────────────┘
                   │ POST /api/crisis/enrich/:id
                   ▼
Step 3: AI ENRICHMENT (TRIAGE)
┌──────────────────────────────────────────────┐
│  Groq AI (emergencyAgent) assesses:          │
│  • Severity: critical/high/moderate/low      │
│  • Condition: "Suspected cardiac event"      │
│  • ICD-10 Code: I21.9                        │
│  • Action: "Keep patient still, loosen..."   │
│  • Hospital Dept: "Cardiology / Emergency"   │
│  • Cost Range: ₹5,000 – ₹25,000             │
│  → Socket.io: emit('incident_enriched')      │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
Step 4: HOSPITAL PRE-ARRIVAL ALERT ⭐
┌──────────────────────────────────────────────┐
│  System auto-notifies hospital:              │
│  ┌────────────────────────────────────────┐  │
│  │  INCOMING PATIENT ALERT               │  │
│  │  Patient: John Doe                    │  │
│  │  Condition: Suspected cardiac event   │  │
│  │  ICD-10: I21.9                        │  │
│  │  Severity: HIGH                       │  │
│  │  Blood Group: O+ (from profile)       │  │
│  │  Allergies: Penicillin (from profile) │  │
│  │  ETA: 10-15 minutes                   │  │
│  │  From: Room 305, Hotel XYZ            │  │
│  └────────────────────────────────────────┘  │
│  → Socket.io: to('hospital_portal')          │
│    .emit('incoming_patient')                 │
└──────────────────┬───────────────────────────┘
                   │ POST /api/crisis/assign/:id
                   ▼
Step 5: SMART STAFF ASSIGNMENT
┌──────────────────────────────────────────────┐
│  Auto-assigns nearest available responder:   │
│  Priority: In-House Doctor (medical)         │
│           > Security Guard (other types)     │
│  • Only assigns 'available' responders       │
│  • Marks responder as 'busy'                 │
│  • Sends alert to responder's device         │
│  → Socket.io: emit('responder_alert_R003')   │
└──────────────────┬───────────────────────────┘
                   │ POST /api/crisis/status/:id
                   ▼
Step 6: RESPONDER STATUS UPDATES
┌──────────────────────────────────────────────┐
│  Status transitions:                         │
│  ASSIGNED → ACCEPTED → ENROUTE → ARRIVED     │
│                                              │
│  Each transition:                            │
│  • Updates incident timestamp                │
│  • Broadcasts to all connected clients       │
│  • Guest SOS page shows live status          │
│  → Socket.io: emit('incident_status_update') │
└──────────────────┬───────────────────────────┘
                   │ POST /api/crisis/chat/:id
                   ▼
Step 7: REAL-TIME INCIDENT CHAT
┌──────────────────────────────────────────────┐
│  Bidirectional messaging:                    │
│  Guest ↔ Staff ↔ Admin ↔ Hospital           │
│                                              │
│  Message structure:                          │
│  { sender, senderRole, text, timestamp }     │
│                                              │
│  Roles: guest | staff | admin | hospital     │
│  → Socket.io: to('incident_INC123')          │
│    .emit('incident_message')                 │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
Step 8: RESOLUTION
┌──────────────────────────────────────────────┐
│  Hospital: POST /api/crisis/hospital/        │
│  patient-arrived/:id                         │
│                                              │
│  • Marks incident as RESOLVED               │
│  • Calculates response time (minutes)        │
│  • Frees the assigned responder              │
│  • Final message to incident chat            │
│  → Socket.io: emit('incident_status_update') │
└──────────────────────────────────────────────┘
```

---

### 5.3 Hospital ↔ Venue Bridge

The system creates a **bidirectional bridge** between the venue (hotel) and hospital:

| Endpoint | Direction | Purpose |
|---|---|---|
| `GET /api/crisis/hospital/notifications` | Hospital reads | List all incoming patient alerts |
| `POST /api/crisis/hospital/acknowledge/:id` | Hospital → Venue | "We received the alert, bed preparing" |
| `POST /api/crisis/hospital/bed-ready/:id` | Hospital → Venue | "Bed ready in ER, team on standby" |
| `POST /api/crisis/hospital/patient-arrived/:id` | Hospital confirms | "Patient arrived, under medical care" |

**Notification Status Flow:**
```
sent → acknowledged → bed_ready → patient_arrived
```

Each status change triggers:
1. Socket.io broadcast to venue dashboard
2. Message pushed to incident chat
3. Guest SOS page updated in real-time

---

### 5.4 Medical Profile Auto-Attachment

**File:** `backend/routes/medicalProfile.js`

When a guest triggers SOS, their saved medical profile is automatically attached:

```
┌────────────────────────────────────────────┐
│  User Medical Profile (auto-attached)      │
│                                            │
│  Full Name: Iftekhar Ahmad                 │
│  Age: 28 | Gender: Male                   │
│  Blood Group: O+                           │
│  Height: 175 cm | Weight: 72 kg           │
│  Conditions: ["Asthma", "Mild Hyper..."]   │
│  BP: 130/85 mmHg                           │
│  Sugar: 95 mg/dL (fasting)                 │
│  Pulse: 78 bpm                             │
│  Current Meds: ["Salbutamol inhaler"]      │
│  Allergies: ["Penicillin", "Dust"]         │
│  Insurance: Yes — Star Health              │
│  Policy #: SH-2024-XXXXX                   │
│  Emergency Contact: +91-98XXXXXXXX         │
│  Organ Donor: Yes                          │
│  Preferred Hospital: Apollo Emergency      │
└────────────────────────────────────────────┘
```

**Emergency Card Endpoint:**
```
GET /api/medical-profile/emergency-card
→ Returns compact card for SOS handoff
```

---

### 5.5 Database Schema

**File:** `backend/crisis_schema.sql` (5,918 bytes)

```sql
-- 3 tables for crisis management:

-- 1. RESPONDERS (hotel staff)
CREATE TABLE responders (
  id TEXT PRIMARY KEY,           -- R001, R002...
  name TEXT NOT NULL,
  role TEXT NOT NULL,            -- 'Security Guard' | 'Floor Manager' | 'In-House Doctor'
  status TEXT DEFAULT 'available', -- 'available' | 'busy' | 'off-duty'
  location JSONB DEFAULT '{}',  -- { floor: 3, zone: "East Wing" }
  phone TEXT,
  hotel_id TEXT DEFAULT 'HOTEL_001'
);

-- 2. CRISIS INCIDENTS
CREATE TABLE crisis_incidents (
  id UUID PRIMARY KEY,
  incident_ref TEXT UNIQUE NOT NULL,  -- INC123456
  room TEXT NOT NULL,
  floor TEXT,
  guest_name TEXT,
  type TEXT DEFAULT 'medical',        -- 'medical' | 'fire' | 'security' | 'other'
  symptoms TEXT,
  severity TEXT DEFAULT 'assessing',  -- 'assessing' | 'low' | 'moderate' | 'high' | 'critical'
  status TEXT DEFAULT 'pending',      -- 'pending' → 'assigned' → 'accepted' → 'enroute' → 'arrived' → 'resolved'
  ai_condition TEXT,
  ai_icd10 TEXT,
  ai_action TEXT,
  assigned_responder TEXT,
  hospital_primary TEXT,
  cost_estimate_range TEXT,
  response_time_mins INTEGER,
  ambulance_alert JSONB,              -- Twilio webhook metadata
  fallback_strategy TEXT              -- SMS fallback if WebSocket fails
);

-- 3. INCIDENT MESSAGES (chat log)
CREATE TABLE incident_messages (
  id UUID PRIMARY KEY,
  incident_id TEXT REFERENCES crisis_incidents(incident_ref),
  sender TEXT NOT NULL,
  sender_role TEXT DEFAULT 'guest',   -- 'guest' | 'staff' | 'admin' | 'hospital'
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 5.6 Socket.io Real-time Events

| Event Name | Direction | Payload |
|---|---|---|
| `new_incident` | Server → All | Full incident object |
| `incident_enriched` | Server → All | Incident with AI triage data |
| `incident_assigned` | Server → All | Incident with assigned responder |
| `responder_alert_R003` | Server → Responder | Incident summary for mobile alert |
| `incident_status_update` | Server → All | Updated status (accepted/enroute/arrived/resolved) |
| `incident_message` | Server → Incident Room | Chat message |
| `incoming_patient` | Server → Hospital | Pre-arrival patient data |
| `hospital_acknowledged` | Server → Venue | Hospital confirmation |
| `hospital_bed_ready` | Server → Venue | Bed prepared notification |
| `responder_location` | Responder → All | GPS coordinates of approaching responder |
| `join_incident` | Client → Server | Join incident-specific room |
| `hospital_join` | Client → Server | Join hospital portal room |

---

### 5.7 QR Code System

```
GET /api/crisis/qr?room=305&floor=3&hotel=HOTEL_001

Response:
{
  "qr_config": {
    "room": "305",
    "floor": "3",
    "hotel_id": "HOTEL_001",
    "trigger_url": "https://app.arogyaraksha.com/crisis/report?room=305&floor=3&hotel=HOTEL_001",
    "note": "QR code embeds room/floor metadata. Guest scans → pre-filled emergency form."
  }
}
```

Hotels generate QR codes for each room. When a guest scans:
1. Opens the SOS form with room/floor pre-filled
2. Guest only needs to describe the emergency
3. Entire pipeline triggers automatically

---

### 5.8 Ambulance Webhook Architecture

```
┌─────────────────────────────────┐
│  Ambulance Alert (Production)   │
│                                 │
│  Provider: Twilio Emergency     │
│  Status: webhook_ready          │
│                                 │
│  Production flow:               │
│  1. POST to Twilio API          │
│  2. Twilio calls 108            │
│  3. Shares incident data        │
│  4. GPS coordinates included    │
│                                 │
│  Fallback: SMS after 30s        │
│  timeout if WebSocket fails     │
└─────────────────────────────────┘
```

---

### 5.9 Responder Location Tracking

**File:** `backend/server.js` (Lines 142-161)

```javascript
// Responder GPS location relay → guest crisis screen
io.on('connection', (socket) => {
  socket.on('responder_location', (data) => {
    socket.broadcast.emit('responder_location', data);
    io.emit(`responder_location_${data.incidentId}`, data);
  });
});
```

The guest's SOS page shows:
- Live ambulance/responder location on map
- ETA countdown
- Distance remaining

**File:** `frontend/src/components/AmbulanceMap.tsx` (8,979 bytes)
- Leaflet map showing responder's live GPS position
- Route line from responder to patient
- Real-time distance calculation

---

### 5.10 Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/crisis/report` | **Guest SOS Form** | QR-triggered emergency form |
| `/dashboard/crisis` | **Staff Dashboard** | All incidents, assignment, status tracking |
| `/hospital` | **Hospital Portal** | Incoming patient alerts, acknowledgment |
| `/responder` | **Responder App** | Accept assignments, update status, GPS relay |
| `/dashboard/emergency` | **Emergency SOS** | Quick-trigger SOS with nearest hospital routing |

---

### 5.11 Key Files

| File | Role |
|---|---|
| `backend/routes/crisis.js` | Crisis management API (540 lines, 23,600 bytes) |
| `backend/routes/medicalProfile.js` | Medical profile CRUD + emergency card |
| `backend/routes/emergency.js` | SOS endpoint |
| `backend/crisis_schema.sql` | Crisis database schema |
| `backend/medical_profile_schema.sql` | Medical profile schema |
| `backend/ioInstance.js` | Socket.io singleton pattern |
| `backend/services/socketService.js` | WebSocket event handlers |
| `frontend/src/app/crisis/` | Guest SOS pages |
| `frontend/src/app/dashboard/crisis/` | Staff crisis dashboard |
| `frontend/src/app/hospital/` | Hospital portal |
| `frontend/src/app/responder/` | Responder mobile app |
| `frontend/src/components/AmbulanceMap.tsx` | Live responder tracking map |

---

## 📊 Summary — All 5 Key Features

| # | Feature | Core Technology | Data Scale |
|---|---|---|---|
| 1 | **Healthcare Navigator** | KNN Cost Estimation + Groq AI | Medical costs dataset |
| 2 | **AI Doctor & Symptom Checker** | Groq LLaMA 3 70B streaming | 6 AI agent types |
| 3 | **Medicine Intelligence & Scanner** | Camera AI + Full-text Search | 246,068 medicines |
| 4 | **Hospital Discovery & Maps** | Leaflet.js + GPS + Redis | 249,756 facilities |
| 5 | **Crisis Response & Emergency** | Socket.io + AI Triage | Real-time incidents |

**Total Medical Records:** 496,000+
**Total API Routes:** 17 route files
**Total Services:** 7 backend services
**Total Frontend Pages:** 20+ dashboard pages
**Total Database Tables:** 12+

---

> 📝 **This is Part 5 of 5.** All five key features have been documented in detail.
> 
> For additional documentation (Health Predictors, Diagnostic Centre, AI Quiz, Blood Donor Registry, Video Consultation, Multi-Language Support, Security, and Deployment), request "Part 6: Supporting Features" or "Part 7: Infrastructure & Deployment".
