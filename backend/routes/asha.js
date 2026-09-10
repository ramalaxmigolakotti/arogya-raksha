const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// POST /api/asha/patients — Register a new patient/villager
router.post('/patients', async (req, res) => {
  try {
    const ashaId = req.headers['x-user-id'];
    if (!ashaId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      full_name, age, gender, village, phone, address,
      blood_group, conditions, allergies, emergency_contact,
    } = req.body;

    if (!full_name || !village) {
      return res.status(400).json({ success: false, message: 'full_name and village are required' });
    }

    const { data, error } = await supabase
      .from('asha_patients')
      .insert([{
        asha_id: ashaId,
        full_name, age, gender, village, phone, address,
        blood_group, conditions: conditions || [], allergies: allergies || [],
        emergency_contact,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, patient: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/asha/patients — List patients for this ASHA worker
router.get('/patients', async (req, res) => {
  try {
    const ashaId = req.headers['x-user-id'];
    if (!ashaId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabase
      .from('asha_patients')
      .select('*')
      .eq('asha_id', ashaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, patients: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/asha/patients/:id — Get one patient with vitals history
router.get('/patients/:id', async (req, res) => {
  try {
    const [patientRes, vitalsRes] = await Promise.all([
      supabase.from('asha_patients').select('*').eq('id', req.params.id).single(),
      supabase.from('asha_vitals').select('*').eq('patient_id', req.params.id)
        .order('recorded_at', { ascending: false }).limit(30),
    ]);

    if (patientRes.error) throw patientRes.error;
    res.json({ success: true, patient: patientRes.data, vitals: vitalsRes.data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/asha/vitals — Log vitals for a patient
router.post('/vitals', async (req, res) => {
  try {
    const ashaId = req.headers['x-user-id'];
    const { patient_id, bp_systolic, bp_diastolic, sugar_level, weight, temperature, notes } = req.body;

    if (!patient_id) return res.status(400).json({ success: false, message: 'patient_id required' });

    // Simple risk assessment
    let risk = 'low';
    if (bp_systolic > 140 || bp_diastolic > 90) risk = 'high';
    else if (bp_systolic > 130 || sugar_level > 200) risk = 'medium';

    const { data, error } = await supabase
      .from('asha_vitals')
      .insert([{
        patient_id, asha_id: ashaId,
        bp_systolic, bp_diastolic, sugar_level, weight, temperature,
        notes, risk_level: risk,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, vitals: data, risk_level: risk });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/asha/stats — Dashboard summary stats
router.get('/stats', async (req, res) => {
  try {
    const ashaId = req.headers['x-user-id'];
    if (!ashaId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const [totalRes, highRiskRes] = await Promise.all([
      supabase.from('asha_patients').select('id', { count: 'exact', head: true }).eq('asha_id', ashaId),
      supabase.from('asha_vitals').select('patient_id', { count: 'exact', head: true })
        .eq('asha_id', ashaId).eq('risk_level', 'high'),
    ]);

    res.json({
      success: true,
      stats: {
        total_patients: totalRes.count || 0,
        high_risk_patients: highRiskRes.count || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
