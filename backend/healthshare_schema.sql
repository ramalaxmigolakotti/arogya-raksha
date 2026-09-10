-- Run this in your Supabase SQL Editor

-- 1. Resources (Equipment, Medicines, Supplies)
CREATE TABLE IF NOT EXISTS healthshare_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID REFERENCES users(id), -- Nullable if anonymous NGO posting for hackathon
  provider_name   TEXT NOT NULL,
  provider_phone  TEXT NOT NULL,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('equipment', 'medicine', 'supplies')),
  description     TEXT,
  condition       TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair')),
  is_free         BOOLEAN DEFAULT true,
  price           NUMERIC DEFAULT 0,
  deposit         NUMERIC DEFAULT 0,
  is_emergency    BOOLEAN DEFAULT false,
  lat             NUMERIC NOT NULL,
  lng             NUMERIC NOT NULL,
  location_name   TEXT,
  image_url       TEXT,
  status          TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'unavailable')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Volunteers (Healthcare Professionals, Drivers, NGO workers)
CREATE TABLE IF NOT EXISTS healthshare_volunteers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('doctor', 'nurse', 'paramedic', 'driver', 'ngo_worker', 'other')),
  skills          TEXT,
  availability    TEXT DEFAULT 'on_call',
  lat             NUMERIC NOT NULL,
  lng             NUMERIC NOT NULL,
  location_name   TEXT,
  verified        BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Requests/Bookings
CREATE TABLE IF NOT EXISTS healthshare_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id     UUID REFERENCES healthshare_resources(id),
  requester_name  TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  urgency         TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'high', 'emergency')),
  message         TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast map querying
CREATE INDEX IF NOT EXISTS idx_hs_resources_loc ON healthshare_resources(lat, lng);
CREATE INDEX IF NOT EXISTS idx_hs_volunteers_loc ON healthshare_volunteers(lat, lng);

-- Disable RLS for Hackathon speed (or setup policies if needed)
ALTER TABLE healthshare_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE healthshare_volunteers DISABLE ROW LEVEL SECURITY;
ALTER TABLE healthshare_requests DISABLE ROW LEVEL SECURITY;
