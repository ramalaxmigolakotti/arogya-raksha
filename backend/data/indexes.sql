-- ============================================================
-- Arogya Raksha — Additional Indexes for Dataset Integration
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- Hospital search indexes
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON hospitals(city);
CREATE INDEX IF NOT EXISTS idx_hospitals_state ON hospitals(state);
CREATE INDEX IF NOT EXISTS idx_hospitals_type ON hospitals(type);
CREATE INDEX IF NOT EXISTS idx_hospitals_emergency ON hospitals(emergency);
CREATE INDEX IF NOT EXISTS idx_hospitals_name ON hospitals USING GIN(to_tsvector('english', coalesce(name, '')));
CREATE INDEX IF NOT EXISTS idx_hospitals_departments ON hospitals USING GIN(departments);

-- Medicine search indexes (enhanced)
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_manufacturer ON medicines USING GIN(to_tsvector('english', coalesce(manufacturer, '')));
CREATE INDEX IF NOT EXISTS idx_medicines_generic ON medicines USING GIN(to_tsvector('english', coalesce(generic_name, '')));
CREATE INDEX IF NOT EXISTS idx_medicines_price ON medicines(market_price);
