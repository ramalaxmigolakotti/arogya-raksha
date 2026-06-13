const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// ─────────────────────────────────────────────────────────────
// HELPER: extract userId from Clerk JWT or custom header
// ─────────────────────────────────────────────────────────────
function getUserId(req) {
  // Try Clerk auth (set by clerkAuth middleware)
  if (req.auth?.userId) return req.auth.userId;
  // Fallback: custom header for direct API calls
  if (req.headers['x-user-id']) return req.headers['x-user-id'];
  return null;
}

// ─────────────────────────────────────────────────────────────
// GET /api/medical-profile — fetch the logged-in user's profile
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabase
      .from('user_medical_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No profile yet — return empty object so frontend can show the form
      return res.json({ success: true, profile: null, hasProfile: false });
    }
    if (error) throw error;

    return res.json({ success: true, profile: data, hasProfile: true });
  } catch (err) {
    console.error('medical-profile GET error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/medical-profile — create or update profile (upsert)
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      full_name, age, date_of_birth, gender, blood_group, height_cm, weight_kg,
      conditions, bp_systolic, bp_diastolic, sugar_level_fasting, sugar_level_pp,
      pulse_rate, current_medications, allergies, preferred_hospitals,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      has_insurance, insurance_provider, policy_number, organ_donor, doctor_notes,
    } = req.body;

    const profileData = {
      user_id: userId,
      full_name, age, date_of_birth: date_of_birth || null,
      gender, blood_group, height_cm: height_cm || null, weight_kg: weight_kg || null,
      conditions: conditions || [],
      bp_systolic: bp_systolic || null, bp_diastolic: bp_diastolic || null,
      sugar_level_fasting: sugar_level_fasting || null,
      sugar_level_pp: sugar_level_pp || null,
      pulse_rate: pulse_rate || null,
      current_medications: current_medications || [],
      allergies: allergies || [],
      preferred_hospitals: preferred_hospitals || [],
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      has_insurance: has_insurance || false,
      insurance_provider: insurance_provider || null,
      policy_number: policy_number || null,
      organ_donor: organ_donor || false,
      doctor_notes: doctor_notes || null,
    };

    const { data, error } = await supabase
      .from('user_medical_profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, profile: data });
  } catch (err) {
    console.error('medical-profile POST error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/medical-profile/emergency-card — compact card for SOS
// Returns only the data needed for an emergency handoff
// ─────────────────────────────────────────────────────────────
router.get('/emergency-card', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabase
      .from('user_medical_profiles')
      .select(`
        full_name, age, gender, blood_group,
        conditions, allergies, current_medications,
        bp_systolic, bp_diastolic, sugar_level_fasting,
        pulse_rate, preferred_hospitals,
        emergency_contact_name, emergency_contact_phone,
        has_insurance, insurance_provider, organ_donor,
        doctor_notes
      `)
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.json({ success: true, card: null });
    }
    if (error) throw error;

    // Format as a clean emergency card
    const card = {
      ...data,
      bp: data.bp_systolic && data.bp_diastolic ? `${data.bp_systolic}/${data.bp_diastolic} mmHg` : null,
      sugar: data.sugar_level_fasting ? `${data.sugar_level_fasting} mg/dL (fasting)` : null,
      conditions_summary: (data.conditions || []).join(', '),
      medications_summary: (data.current_medications || []).join(', '),
      allergies_summary: (data.allergies || []).join(', '),
      preferred_hospital_primary: (data.preferred_hospitals || [])[0] || 'Apollo Emergency Care',
    };

    return res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
