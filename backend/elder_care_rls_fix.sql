-- ═══════════════════════════════════════════════════════════
-- Elder Care RLS Fix — Run this in Supabase SQL Editor
-- This disables Row Level Security on all Elder Care tables
-- so the backend service role can freely read/write them.
-- ═══════════════════════════════════════════════════════════

-- Disable RLS on all elder care tables (backend uses service role)
ALTER TABLE elder_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE elder_caregiver_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE elder_care_alerts DISABLE ROW LEVEL SECURITY;

-- Grant full access to the anon and authenticated roles
GRANT ALL ON elder_profiles TO anon, authenticated, service_role;
GRANT ALL ON caregiver_profiles TO anon, authenticated, service_role;
GRANT ALL ON elder_caregiver_matches TO anon, authenticated, service_role;
GRANT ALL ON caregiver_tasks TO anon, authenticated, service_role;
GRANT ALL ON elder_care_alerts TO anon, authenticated, service_role;
