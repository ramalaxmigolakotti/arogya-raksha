const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// ==============================================================================
// GET /api/beds — List beds for a hospital with optional ward + status filter
// ==============================================================================
router.get('/', async (req, res) => {
  try {
    const { hospital_id, hospital_name, ward, status, limit = 200 } = req.query;

    let query = supabase
      .from('hospital_beds')
      .select('*')
      .order('ward', { ascending: true })
      .order('bed_number', { ascending: true })
      .limit(parseInt(limit));

    if (hospital_id)   query = query.eq('hospital_id', hospital_id);
    if (hospital_name) query = query.ilike('hospital_name', `%${hospital_name}%`);
    if (ward)          query = query.eq('ward', ward);
    if (status)        query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    // Group by ward for dashboard grid view
    const byWard = {};
    (data || []).forEach(bed => {
      if (!byWard[bed.ward]) byWard[bed.ward] = [];
      byWard[bed.ward].push(bed);
    });

    const available = (data || []).filter(b => b.status === 'available').length;
    const occupied  = (data || []).filter(b => b.status === 'occupied').length;

    res.json({
      success: true,
      total: data.length,
      available,
      occupied,
      reserved: (data || []).filter(b => b.status === 'reserved').length,
      beds: data,
      byWard,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// GET /api/beds/availability — Quick availability count per ward
// ==============================================================================
router.get('/availability', async (req, res) => {
  try {
    const { hospital_id, hospital_name } = req.query;

    let query = supabase
      .from('hospital_beds')
      .select('ward, status');

    if (hospital_id)   query = query.eq('hospital_id', hospital_id);
    if (hospital_name) query = query.ilike('hospital_name', `%${hospital_name}%`);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate per ward
    const summary = {};
    (data || []).forEach(b => {
      if (!summary[b.ward]) summary[b.ward] = { total: 0, available: 0, occupied: 0 };
      summary[b.ward].total++;
      if (b.status === 'available') summary[b.ward].available++;
      if (b.status === 'occupied')  summary[b.ward].occupied++;
    });

    res.json({ success: true, byWard: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// GET /api/beds/:id — Single bed
// ==============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hospital_beds')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: 'Bed not found' });
    res.json({ success: true, bed: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// PATCH /api/beds/:id — Update bed status (admin marks maintenance, reserve, etc.)
// ==============================================================================
router.patch('/:id', async (req, res) => {
  try {
    const { status, patient_id, patient_name, admission_id, notes } = req.body;

    const updatePayload = { updated_at: new Date().toISOString() };
    if (status       !== undefined) updatePayload.status = status;
    if (patient_id   !== undefined) updatePayload.patient_id = patient_id;
    if (patient_name !== undefined) updatePayload.patient_name = patient_name;
    if (admission_id !== undefined) updatePayload.admission_id = admission_id;

    const { data, error } = await supabase
      .from('hospital_beds')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, bed: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// POST /api/beds — Create a new bed (admin)
// ==============================================================================
router.post('/', async (req, res) => {
  try {
    const { hospital_id, hospital_name, bed_number, ward, bed_type = 'standard', floor_number = 1, features = [] } = req.body;

    if (!bed_number || !ward) {
      return res.status(400).json({ success: false, error: 'bed_number and ward are required' });
    }

    const { data, error } = await supabase
      .from('hospital_beds')
      .insert({ hospital_id, hospital_name, bed_number, ward, bed_type, floor_number, features, status: 'available' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, bed: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
