-- Run this in your Supabase SQL Editor
-- WhatsApp triage sessions from MediReach bot

CREATE TABLE IF NOT EXISTS whatsapp_triage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           TEXT NOT NULL,
  lang            TEXT DEFAULT 'en',
  symptom         TEXT,
  duration        TEXT,
  location        TEXT,
  urgency         TEXT CHECK (urgency IN ('low', 'medium', 'high')),
  possible_condition TEXT,
  recommendation  TEXT,
  nearest_phc     JSONB,
  triage_result   JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for urgency-based queries (doctor dashboard)
CREATE INDEX IF NOT EXISTS idx_whatsapp_triage_urgency ON whatsapp_triage(urgency);
CREATE INDEX IF NOT EXISTS idx_whatsapp_triage_created ON whatsapp_triage(created_at DESC);

-- Enable RLS
ALTER TABLE whatsapp_triage ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend only)
CREATE POLICY "Service role full access" ON whatsapp_triage
  FOR ALL USING (true);
