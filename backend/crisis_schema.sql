-- ============================================================
-- Arogya Raksha — Crisis Response Extension Schema
-- Run this in Supabase Dashboard → SQL Editor → Run
-- These tables are ADDITIVE — they don't touch existing tables
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. RESPONDERS  (Gap 3 Fix: includes status field)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS responders (
  id            TEXT PRIMARY KEY,         -- e.g., R001
  name          TEXT NOT NULL,
  role          TEXT NOT NULL,            -- 'Security Guard' | 'Floor Manager' | 'In-House Doctor' | 'Duty Manager'
  status        TEXT NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'busy', 'off-duty')),
  location      JSONB DEFAULT '{}',       -- { floor, zone }
  phone         TEXT,
  hotel_id      TEXT DEFAULT 'HOTEL_001',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. CRISIS INCIDENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crisis_incidents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_ref        TEXT UNIQUE NOT NULL,   -- e.g., INC123456
  room                TEXT NOT NULL,
  floor               TEXT,
  guest_name          TEXT,
  guest_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  type                TEXT DEFAULT 'medical'  -- 'medical' | 'fire' | 'security' | 'other'
                      CHECK (type IN ('medical', 'fire', 'security', 'other')),
  symptoms            TEXT,
  severity            TEXT DEFAULT 'assessing'
                      CHECK (severity IN ('assessing', 'low', 'moderate', 'high', 'critical')),
  status              TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'assigned', 'accepted', 'enroute', 'arrived', 'resolved')),
  ai_condition        TEXT,
  ai_icd10            TEXT,
  ai_action           TEXT,
  assigned_responder  TEXT REFERENCES responders(id) ON DELETE SET NULL,
  hospital_primary    TEXT,
  hospital_nearest    TEXT,
  cost_estimate_range TEXT,
  response_time_mins  INTEGER,
  resolved_at         TIMESTAMPTZ,
  -- Gap 1 Fix: ambulance webhook metadata
  ambulance_alert     JSONB DEFAULT '{"status":"webhook_ready","provider":"Twilio_Emergency_Webhook"}',
  -- Gap 2 Fix: offline fallback strategy
  fallback_strategy   TEXT DEFAULT 'SMS via Twilio — queued if WebSocket unavailable',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. INCIDENT MESSAGES (real-time chat log)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incident_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id TEXT NOT NULL REFERENCES crisis_incidents(incident_ref) ON DELETE CASCADE,
  sender      TEXT NOT NULL,
  sender_role TEXT DEFAULT 'guest',    -- 'guest' | 'staff' | 'admin' | 'system'
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crisis_incidents_status   ON crisis_incidents(status);
CREATE INDEX IF NOT EXISTS idx_crisis_incidents_severity ON crisis_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_crisis_incidents_created  ON crisis_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_messages_incident ON incident_messages(incident_id);
CREATE INDEX IF NOT EXISTS idx_responders_status          ON responders(status);

-- ────────────────────────────────────────────────────────────
-- SEED: Default Responders
-- ────────────────────────────────────────────────────────────
INSERT INTO responders (id, name, role, status, location, phone) VALUES
  ('R001', 'Arjun Sharma',   'Security Guard',  'available', '{"floor":3,"zone":"East Wing"}',    '+91-98000-10001'),
  ('R002', 'Priya Nair',     'Floor Manager',   'available', '{"floor":2,"zone":"Reception"}',    '+91-98000-10002'),
  ('R003', 'Dr. Mehta',      'In-House Doctor', 'available', '{"floor":1,"zone":"Medical Room"}', '+91-98000-10003'),
  ('R004', 'Suresh Kumar',   'Security Guard',  'available', '{"floor":4,"zone":"West Wing"}',    '+91-98000-10004'),
  ('R005', 'Ananya Singh',   'Duty Manager',    'available', '{"floor":0,"zone":"Lobby"}',        '+91-98000-10005')
ON CONFLICT (id) DO NOTHING;
