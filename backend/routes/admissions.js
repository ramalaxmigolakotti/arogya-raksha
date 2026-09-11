const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const ioInstance = require('../ioInstance');

// ─── Helper: broadcast Socket.io cross-panel toast ───────────────────────────
function toast(targetRole, title, message, type = 'success') {
  const io = ioInstance.getIo();
  if (io) {
    io.emit('cross_panel_toast', {
      id: Date.now().toString(),
      targetRole,
      type,
      title,
      message,
    });
  }
}

// ─── Helper: stamp a timestamp entry into JSONB field ────────────────────────
function buildTimestamp(existing = {}, key) {
  return { ...existing, [key]: new Date().toISOString() };
}

// ==============================================================================
// GET /api/admissions — List admissions (filtered by hospital, doctor, patient, status)
// ==============================================================================
router.get('/', async (req, res) => {
  try {
    const { hospital_name, doctor_id, patient_id, status, limit = 50 } = req.query;

    let query = supabase
      .from('inpatient_admissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (hospital_name) query = query.ilike('hospital_name', `%${hospital_name}%`);
    if (doctor_id)    query = query.eq('assigned_doctor_id', doctor_id);
    if (patient_id)   query = query.eq('patient_id', patient_id);
    if (status)       query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, count: data.length, admissions: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// GET /api/admissions/:id — Single admission with diagnostic orders
// ==============================================================================
router.get('/:id', async (req, res) => {
  try {
    const { data: admission, error } = await supabase
      .from('inpatient_admissions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !admission) {
      return res.status(404).json({ success: false, error: 'Admission not found' });
    }

    // Fetch associated diagnostic orders
    const { data: diagnostics } = await supabase
      .from('inpatient_diagnostic_orders')
      .select('*')
      .eq('admission_id', req.params.id)
      .order('ordered_at', { ascending: true });

    // Fetch linked prescription if exists
    let prescription = null;
    if (admission.prescription_id) {
      const { data: rx } = await supabase
        .from('digital_prescriptions')
        .select('*')
        .eq('id', admission.prescription_id)
        .single();
      prescription = rx;
    }

    res.json({
      success: true,
      admission,
      diagnostics: diagnostics || [],
      prescription,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// POST /api/admissions — Register a new inpatient (by hospital_admin)
// ==============================================================================
router.post('/', async (req, res) => {
  try {
    const {
      patient_id,
      patient_name,
      patient_phone,
      patient_age,
      patient_gender,
      hospital_id,
      hospital_name,
      admitted_by,
      severity = 'mild',
      chief_complaint,
      vitals = {},
    } = req.body;

    if (!patient_name || !hospital_name) {
      return res.status(400).json({ success: false, error: 'patient_name and hospital_name are required' });
    }

    const timestamps = buildTimestamp({}, 'registered_at');

    const { data, error } = await supabase
      .from('inpatient_admissions')
      .insert({
        patient_id,
        patient_name,
        patient_phone,
        patient_age: patient_age ? parseInt(patient_age) : null,
        patient_gender,
        hospital_id,
        hospital_name,
        admitted_by,
        severity,
        chief_complaint,
        vitals,
        status: 'registered',
        timestamps,
      })
      .select()
      .single();

    if (error) throw error;

    // Notify hospital_admin panel
    toast('hospital_admin', '🏥 New Inpatient Registered', `${patient_name} | Severity: ${severity.toUpperCase()}`);

    res.status(201).json({ success: true, admission: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// PATCH /api/admissions/:id/assign — Assign doctor + bed (by hospital_admin)
// ==============================================================================
router.patch('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_doctor_id, assigned_doctor_name, bed_id, bed_number, ward } = req.body;

    // Get current admission for timestamps
    const { data: current } = await supabase
      .from('inpatient_admissions')
      .select('timestamps, patient_name, hospital_name')
      .eq('id', id)
      .single();

    const timestamps = buildTimestamp(current?.timestamps || {}, 'doctor_assigned_at');

    // Update admission
    const { data, error } = await supabase
      .from('inpatient_admissions')
      .update({
        assigned_doctor_id,
        assigned_doctor_name,
        bed_id,
        bed_number,
        ward,
        status: 'doctor_assigned',
        timestamps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Mark the bed as occupied
    if (bed_id) {
      await supabase.from('hospital_beds').update({
        status: 'occupied',
        patient_id: data.patient_id,
        patient_name: data.patient_name,
        admission_id: id,
        updated_at: new Date().toISOString(),
      }).eq('id', bed_id);
    }

    // Decrement available_beds on the hospital record
    if (data.hospital_id) {
      await supabase.rpc('decrement_available_beds', { hosp_id: data.hospital_id }).catch(() => {
        // Fallback: raw update
        supabase.from('hospitals').select('available_beds').eq('id', data.hospital_id).single()
          .then(({ data: h }) => {
            if (h) {
              supabase.from('hospitals').update({ available_beds: Math.max(0, (h.available_beds || 1) - 1) }).eq('id', data.hospital_id);
            }
          });
      });
    }

    // Notify doctor
    toast('doctor', '👨‍⚕️ New Inpatient Assigned to You',
      `Patient: ${data.patient_name} | ${ward || 'Ward'}: ${bed_number || 'TBD'} | Severity: ${data.severity?.toUpperCase()}`);

    res.json({ success: true, admission: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// PATCH /api/admissions/:id/status — Update status (doctor/admin)
// ==============================================================================
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = [
      'registered','doctor_assigned','under_examination',
      'diagnostics_ordered','diagnostics_done',
      'treatment_ongoing','ready_for_discharge','discharged',
    ];

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status: ${status}` });
    }

    const { data: current } = await supabase
      .from('inpatient_admissions')
      .select('timestamps, patient_name')
      .eq('id', id)
      .single();

    const timestamps = buildTimestamp(current?.timestamps || {}, `${status}_at`);

    const { data, error } = await supabase
      .from('inpatient_admissions')
      .update({ status, timestamps, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Role-specific notifications
    if (status === 'ready_for_discharge') {
      toast('hospital_admin', '📋 Patient Ready for Discharge', `${data.patient_name} | ${data.bed_number || 'Ward'}`);
    }

    res.json({ success: true, admission: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// POST /api/admissions/:id/diagnostics — Doctor orders lab tests
// ==============================================================================
router.post('/:id/diagnostics', async (req, res) => {
  try {
    const { id } = req.params;
    const { tests = [], ordered_by_doctor_id, ordered_by_doctor_name } = req.body;

    if (!tests.length) {
      return res.status(400).json({ success: false, error: 'At least one test is required' });
    }

    // Get admission info
    const { data: admission } = await supabase
      .from('inpatient_admissions')
      .select('patient_id, patient_name, hospital_name, timestamps')
      .eq('id', id)
      .single();

    if (!admission) return res.status(404).json({ success: false, error: 'Admission not found' });

    // Insert all test orders
    const orderRows = tests.map(t => ({
      admission_id: id,
      patient_id: admission.patient_id,
      patient_name: admission.patient_name,
      hospital_name: admission.hospital_name,
      ordered_by_doctor_id,
      ordered_by_doctor_name,
      test_name: t.test_name,
      test_category: t.category || t.test_category || 'pathology',
      urgency: t.urgency || 'routine',
      status: 'ordered',
    }));

    const { data: orders, error: ordErr } = await supabase
      .from('inpatient_diagnostic_orders')
      .insert(orderRows)
      .select();

    if (ordErr) throw ordErr;

    // Update admission status to diagnostics_ordered
    const timestamps = buildTimestamp(admission.timestamps || {}, 'diagnostics_ordered_at');
    await supabase.from('inpatient_admissions').update({
      status: 'diagnostics_ordered',
      timestamps,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    // Notify lab / admin
    const testNames = tests.map(t => `${t.test_name} (${t.urgency || 'routine'})`).join(', ');
    toast('hospital_admin', '🔬 New Lab Orders', `${testNames} for ${admission.patient_name}`);

    res.status(201).json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// PATCH /api/admissions/:admissionId/diagnostics/:diagId — Lab updates test result
// ==============================================================================
router.patch('/:admissionId/diagnostics/:diagId', async (req, res) => {
  try {
    const { admissionId, diagId } = req.params;
    const { status, result_summary, result_url } = req.body;

    const updatePayload = { status };
    if (result_summary !== undefined) updatePayload.result_summary = result_summary;
    if (result_url     !== undefined) updatePayload.result_url = result_url;
    if (status === 'completed')       updatePayload.completed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('inpatient_diagnostic_orders')
      .update(updatePayload)
      .eq('id', diagId)
      .eq('admission_id', admissionId)
      .select()
      .single();

    if (error) throw error;

    // Check if ALL orders for this admission are now completed
    const { data: remaining } = await supabase
      .from('inpatient_diagnostic_orders')
      .select('id')
      .eq('admission_id', admissionId)
      .not('status', 'in', '("completed","cancelled")');

    if (!remaining || remaining.length === 0) {
      // All done — update admission to diagnostics_done
      const { data: adm } = await supabase
        .from('inpatient_admissions')
        .select('timestamps, assigned_doctor_id, patient_name')
        .eq('id', admissionId)
        .single();

      if (adm) {
        const timestamps = buildTimestamp(adm.timestamps || {}, 'diagnostics_done_at');
        await supabase.from('inpatient_admissions').update({
          status: 'diagnostics_done',
          timestamps,
          updated_at: new Date().toISOString(),
        }).eq('id', admissionId);

        toast('doctor', '✅ All Lab Results Ready', `Results available for ${adm.patient_name}`);
      }
    }

    res.json({ success: true, order: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// POST /api/admissions/:id/prescribe — Doctor creates prescription
// ==============================================================================
router.post('/:id/prescribe', async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, medicines = [], advice, follow_up_days = 7, doctor_id, doctor_name } = req.body;

    const { data: admission } = await supabase
      .from('inpatient_admissions')
      .select('patient_name, hospital_name, timestamps')
      .eq('id', id)
      .single();

    if (!admission) return res.status(404).json({ success: false, error: 'Admission not found' });

    // Insert into EXISTING digital_prescriptions table
    // journey_id is reused as the admission ID so pharmacy panel picks it up
    const { data: rx, error: rxErr } = await supabase
      .from('digital_prescriptions')
      .insert({
        journey_id: id,
        patient_name: admission.patient_name,
        doctor_name,
        doctor_id,
        diagnosis,
        medicines,
        advice,
        follow_up_days,
        status: 'queued',  // goes straight into pharmacy queue
      })
      .select()
      .single();

    if (rxErr) throw rxErr;

    // Link prescription to admission + move to treatment_ongoing
    const timestamps = buildTimestamp(admission.timestamps || {}, 'treatment_started_at');
    await supabase.from('inpatient_admissions').update({
      prescription_id: rx.id,
      status: 'treatment_ongoing',
      timestamps,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    // Notify pharmacy (same as OPD flow)
    const io = ioInstance.getIo();
    if (io) {
      io.emit('cross_panel_toast', {
        id: Date.now().toString(),
        targetRole: 'pharmacy',
        type: 'success',
        title: `💊 New Inpatient Prescription — WARD DELIVERY`,
        message: `${medicines.length} medicine(s) for ${admission.patient_name} | ${admission.hospital_name}`,
      });
      io.emit('order_updated', {
        id: rx.id,
        orderNumber: rx.id,
        patientName: admission.patient_name,
        items: medicines.map(m => ({ name: m.name, qty: 1, price: 0 })),
        totalAmount: 0,
        status: 'placed',
        deliveryAgent: `Ward Delivery — ${admission.hospital_name}`,
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({ success: true, prescription: rx });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// PATCH /api/admissions/:id/discharge — Doctor-ONLY discharge gate
// ==============================================================================
router.patch('/:id/discharge', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      discharge_summary,
      discharge_notes = {},
      discharged_by_doctor_id,
      discharged_by_doctor_name,
    } = req.body;

    if (!discharged_by_doctor_id) {
      return res.status(403).json({ success: false, error: 'Only a doctor can discharge a patient (doctor_id required)' });
    }
    if (!discharge_summary) {
      return res.status(400).json({ success: false, error: 'discharge_summary is required' });
    }

    const { data: admission } = await supabase
      .from('inpatient_admissions')
      .select('*')
      .eq('id', id)
      .single();

    if (!admission) return res.status(404).json({ success: false, error: 'Admission not found' });

    const timestamps = buildTimestamp(admission.timestamps || {}, 'discharged_at');
    const dischargedAt = new Date().toISOString();

    // Finalize admission
    const { data, error } = await supabase
      .from('inpatient_admissions')
      .update({
        status: 'discharged',
        discharge_summary,
        discharge_notes,
        discharged_by_doctor_id,
        discharged_at: dischargedAt,
        timestamps,
        updated_at: dischargedAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Free the bed
    if (admission.bed_id) {
      await supabase.from('hospital_beds').update({
        status: 'available',
        patient_id: null,
        patient_name: null,
        admission_id: null,
        updated_at: dischargedAt,
      }).eq('id', admission.bed_id);
    }

    // Increment available_beds on the hospital
    if (admission.hospital_id) {
      supabase.from('hospitals').select('available_beds').eq('id', admission.hospital_id).single()
        .then(({ data: h }) => {
          if (h) {
            supabase.from('hospitals').update({
              available_beds: (h.available_beds || 0) + 1,
            }).eq('id', admission.hospital_id);
          }
        });
    }

    // Write permanent discharge record to EXISTING patient_health_records table
    if (admission.patient_id) {
      await supabase.from('patient_health_records').insert({
        user_id: admission.patient_id,
        type: 'hospital_admission',
        record_type: 'inpatient_discharge',
        title: `Discharged: ${admission.hospital_name} — ${discharge_notes?.diagnosis || 'Inpatient Stay'}`,
        summary: discharge_summary,
        metadata: {
          admission_id: id,
          doctor: discharged_by_doctor_name,
          hospital: admission.hospital_name,
          bed: admission.bed_number,
          ward: admission.ward,
          severity: admission.severity,
          discharged_at: dischargedAt,
        },
      }).catch(() => {}); // non-blocking
    }

    // Notifications to all panels
    toast('hospital_admin', '✅ Patient Discharged — Bed Free',
      `${admission.patient_name} discharged | ${admission.bed_number || 'Bed'} now available`);
    toast('patient', '🏠 Discharge Summary Ready',
      `You have been discharged from ${admission.hospital_name}. See your Health Records.`);

    res.json({ success: true, admission: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// POST /api/admissions/:id/administer — Log a medicine dose given in ward
// ==============================================================================
router.post('/:id/administer', async (req, res) => {
  try {
    const { medicine_name, dose, route = 'oral', frequency, administered_by, notes, prescription_id } = req.body;
    const { data: admission } = await supabase
      .from('inpatient_admissions')
      .select('bed_number')
      .eq('id', req.params.id)
      .single();

    const { data, error } = await supabase
      .from('inpatient_medicine_administrations')
      .insert({
        admission_id: req.params.id,
        prescription_id,
        medicine_name,
        dose,
        route,
        frequency,
        administered_by,
        bed_number: admission?.bed_number,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, administration: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
