-- ═══════════════════════════════════════════════════════════
-- DELETE OLD MEDICINE DATA FROM SUPABASE
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Delete ALL rows from the medicines table (keeps the table structure)
TRUNCATE TABLE medicines RESTART IDENTITY CASCADE;

-- Verify it's empty
SELECT COUNT(*) AS remaining_medicines FROM medicines;
