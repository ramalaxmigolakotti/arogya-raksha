const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { callGeminiAgent } = require('../services/aiService');
const ioInstance = require('../ioInstance');
const { fetchNearbyHospitals } = require('../services/nearbyHospitals');
const { uploadToCloudinary } = require('../services/cloudinaryService');

// ── Helper: log a timeline event to Supabase + emit via Socket ──
async function logTimeline(incidentRef, step, title, description, actor, actorRole, metadata) {
  const event = { incident_ref: incidentRef, step, title, description, actor, actor_role: actorRole, metadata, created_at: new Date().toISOString() };
  supabase.from('crisis_timeline').insert([event]).then(({ error }) => {
    if (error && !error.message.includes('does not exist')) console.warn('Timeline insert:', error.message);
  });
  const io = ioInstance.getIo();
  if (io) io.emit('timeline_update', { incidentId: incidentRef, event });
  return event;
}

// ── Helper: persist incident to Supabase ──
async function persistIncident(incident) {
  const row = {
    incident_ref: incident.id, room: incident.room, floor: incident.floor,
    guest_name: incident.guest_name, guest_id: incident.guest_id, type: incident.type,
    symptoms: incident.symptoms, photo_url: incident.photo_url || null,
    severity: incident.severity, condition: incident.condition, icd10: incident.icd10,
    action: incident.action, hospital_dept: incident.hospital_dept, status: incident.status,
    medical_profile: incident.medical_profile, assigned_responder: incident.assigned_responder,
    hospital_recommendation: incident.hospital_recommendation, cost_estimate: incident.cost_estimate,
    hospital_notification: incident.hospital_notification, ambulance_alert: incident.ambulance_alert,
    guest_lat: incident.guest_lat, guest_lng: incident.guest_lng,
    responder_lat: incident.responder_lat, responder_lng: incident.responder_lng,
    response_time_minutes: incident.response_time_minutes, resolved_at: incident.resolved_at,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('crisis_incidents').upsert([row], { onConflict: 'incident_ref' });
  if (error && !error.message.includes('does not exist')) console.warn('Incident persist:', error.message);
}

// ── Helper: persist chat message to Supabase ──
async function persistMessage(incidentRef, sender, senderRole, text) {
  supabase.from('crisis_messages').insert([{ incident_ref: incidentRef, sender, sender_role: senderRole, text }])
    .then(({ error }) => { if (error && !error.message.includes('does not exist')) console.warn('Message persist:', error.message); });
}

// ── Helper: persist hospital case to Supabase ──
async function persistHospitalCase(data) {
  supabase.from('hospital_cases').upsert([data], { onConflict: 'incident_ref' })
    .then(({ error }) => { if (error && !error.message.includes('does not exist')) console.warn('Hospital case persist:', error.message); });
}

// ─────────────────────────────────────────────
// MOCK RESPONDERS (in-memory for demo — no DB seed needed)
// ─────────────────────────────────────────────
const MOCK_RESPONDERS = [
  { id: 'R001', name: 'Arjun Sharma',   role: 'Security Guard',   status: 'available', location: { floor: 3, zone: 'East Wing' } },
  { id: 'R002', name: 'Priya Nair',     role: 'Floor Manager',    status: 'available', location: { floor: 2, zone: 'Reception' } },
  { id: 'R003', name: 'Dr. Mehta',      role: 'In-House Doctor',  status: 'available', location: { floor: 1, zone: 'Medical Room' } },
  { id: 'R004', name: 'Suresh Kumar',   role: 'Security Guard',   status: 'busy',      location: { floor: 4, zone: 'West Wing' } },
  { id: 'R005', name: 'Ananya Singh',   role: 'Duty Manager',     status: 'available', location: { floor: 0, zone: 'Lobby' } },
];

// In-memory incident store (Supabase table used if available, fallback to memory)
const incidentStore = new Map();

// ─────────────────────────────────────────────
// GET /api/crisis/responders  — list all responders & their status
// ─────────────────────────────────────────────
router.get('/responders', (req, res) => {
  res.json({ success: true, responders: MOCK_RESPONDERS });
});

// ─────────────────────────────────────────────
// POST /api/crisis/create  — Step 2: Incident creation
// ─────────────────────────────────────────────
router.post('/create', async (req, res) => {
  try {
    const { room, floor, guestName, guestId, type = 'medical', symptoms = '', medical_profile = null, photo = null, lat = null, lng = null } = req.body;

    // Upload photo to Cloudinary if provided
    let photo_url = null;
    if (photo) {
      try {
        const upload = await uploadToCloudinary(photo, { folder: 'crisis/evidence', resourceType: 'image' });
        photo_url = upload.url;
      } catch (e) { console.warn('Cloudinary upload skipped:', e.message); }
    }

    const incident = {
      id: `INC${Date.now().toString().slice(-6)}`,
      room: room || 'Unknown', floor: floor || 'Unknown',
      guest_name: guestName || 'Guest', guest_id: guestId || null,
      type, symptoms, photo_url,
      medical_profile,
      status: 'pending', severity: 'assessing', ai_enriched: false,
      assigned_responder: null, messages: [],
      hospital_recommendation: null, cost_estimate: null,
      guest_lat: lat, guest_lng: lng,
      responder_lat: null, responder_lng: null,
      ambulance_alert: { status: 'webhook_ready', provider: 'Twilio_Emergency_Webhook', demo_message: '🚑 Ambulance alerted via emergency services bridge' },
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

    incidentStore.set(incident.id, incident);

    // Persist to Supabase
    persistIncident(incident);

    // Log timeline event
    logTimeline(incident.id, 'created', '🚨 Emergency Alert Sent', `${guestName || 'Guest'} triggered SOS from Room ${room}`, guestName || 'Guest', 'guest', { type, room, floor });

    // Emit via Socket.io
    const io = ioInstance.getIo();
    if (io) io.emit('new_incident', incident);

    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// Helper: Enrich an incident with AI + hospitals + hospital notification
// (Shared between /enrich/:id and /create-and-enrich)
// ─────────────────────────────────────────────
async function enrichIncident(incident) {
  const { symptoms, type } = incident;

  // Call Groq AI for severity assessment
  const aiResponse = await callGeminiAgent(
    'emergencyAgent',
    `Hotel emergency: Type=${type}. Symptoms: ${symptoms || 'Not specified'}. 
     Assess severity (critical/high/moderate/low), probable ICD-10 condition, 
     and recommended immediate action for hotel staff. 
     Also suggest best hospital department needed.
     Return JSON: { severity, condition, icd10, action, hospitalDept, costRange }`,
    `Hospitality Emergency at Room ${incident.room}`
  );

  let enrichment = {
    severity: 'high',
    condition: 'Medical emergency requiring immediate attention',
    icd10: 'Z99.9',
    action: 'Keep guest calm, do not move if injury suspected, call in-house doctor',
    hospitalDept: 'Emergency / Trauma',
    costRange: '₹5,000 – ₹25,000',
  };

  if (aiResponse.success && aiResponse.data) {
    try {
      const cleaned = aiResponse.data.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      enrichment = { ...enrichment, ...parsed };
    } catch {
      // Use default enrichment if JSON parse fails
    }
  }

  // Normalize AI response keys (handles both hospitalDept and hospital_dept)
  const hospitalDept = enrichment.hospitalDept || enrichment.hospital_dept || 'Emergency / Trauma';
  const costRange = enrichment.costRange || enrichment.cost_range || '₹5,000 – ₹25,000';

  // Update incident
  incident.severity = enrichment.severity || 'high';
  incident.ai_enriched = true;
  incident.condition = enrichment.condition;
  incident.icd10 = enrichment.icd10;
  incident.action = enrichment.action;
  incident.hospital_dept = hospitalDept;
  incident.cost_estimate = {
    range: costRange,
    emi_options: ['₹1,200/mo × 6', '₹700/mo × 12', '₹450/mo × 18'],
    loan_available: true,
  };

  // Log AI assessment timeline event
  logTimeline(incident.id, 'ai_assessed', '🧠 AI Assessment Complete', `${enrichment.condition} (ICD-10: ${enrichment.icd10}) — Severity: ${enrichment.severity}`, 'AI Engine', 'system', enrichment);

  // ── Fetch REAL nearby hospitals from OpenStreetMap ──
  let realHospitals = [];
  if (incident.guest_lat && incident.guest_lng) {
    try {
      realHospitals = await fetchNearbyHospitals(incident.guest_lat, incident.guest_lng, 10);
    } catch (e) { console.warn('Hospital fetch skipped:', e.message); }
  }

  // Build hospital recommendation from real data (fallback to defaults)
  if (realHospitals.length >= 1) {
    const primary = realHospitals[0];
    const nearest = realHospitals[1] || primary;
    const budget = realHospitals.find(h => h.type === 'Hospital' && h.name.toLowerCase().includes('govt')) || realHospitals[realHospitals.length - 1] || primary;
    incident.hospital_recommendation = {
      primary: { name: primary.name, dist: `${primary.distance_km} km`, dept: hospitalDept, tier: 'Nearest', lat: primary.lat, lng: primary.lng },
      nearest: { name: nearest.name, dist: `${nearest.distance_km} km`, dept: 'General Emergency', tier: 'Alternative', lat: nearest.lat, lng: nearest.lng },
      budget: { name: budget.name, dist: `${budget.distance_km} km`, dept: 'Emergency', tier: 'Budget', lat: budget.lat, lng: budget.lng },
    };
    incident.nearby_hospitals = realHospitals.slice(0, 8);
  } else {
    incident.hospital_recommendation = {
      primary: { name: 'Apollo Emergency Care', dist: '1.8 km', dept: hospitalDept, tier: 'Tier 1' },
      nearest: { name: 'City Central Hospital ER', dist: '0.9 km', dept: 'General Emergency', tier: 'Tier 2' },
      budget: { name: 'Govt District Hospital', dist: '2.1 km', dept: 'Emergency', tier: 'Govt' },
    };
  }

  // ── Auto-notify hospital ──
  const io2 = ioInstance.getIo();
  const primaryHospName = incident.hospital_recommendation.primary.name;

  const hospitalNotification = {
    id: `HN${Date.now()}`,
    incident_id: incident.id,
    hospital: primaryHospName,
    hospital_dept: hospitalDept,
    sent_at: new Date().toISOString(),
    status: 'sent',
    acknowledged_at: null,
    patient: {
      name: incident.guest_name, age: 'Unknown',
      condition: enrichment.condition, icd10: enrichment.icd10,
      severity: enrichment.severity, symptoms: incident.symptoms,
      action_taken: enrichment.action,
      venue: `Room ${incident.room}, ${incident.floor ? 'Floor ' + incident.floor : ''}`,
      venue_type: 'hotel', estimated_arrival: '10-15 minutes',
    },
    webhook: { endpoint: 'https://hospital-his-api.example.com/incoming-patient', method: 'POST', status: 'webhook_ready' },
  };

  incident.hospital_notification = hospitalNotification;
  incident.updated_at = new Date().toISOString();
  incidentStore.set(incident.id, incident);

  // Persist everything
  persistIncident(incident);
  persistHospitalCase({ incident_ref: incident.id, hospital_name: primaryHospName, hospital_dept: hospitalDept, patient_name: incident.guest_name, patient_condition: enrichment.condition, icd10: enrichment.icd10, severity: enrichment.severity, status: 'sent' });
  logTimeline(incident.id, 'hospital_notified', '🏥 Hospital Notified', `Pre-arrival alert sent to ${primaryHospName}`, 'System', 'system', { hospital: primaryHospName });

  // Broadcast
  if (io2) {
    io2.emit('incident_enriched', incident);
    io2.to('hospital_portal').emit('incoming_patient', hospitalNotification);
  }
  console.log(`[HOSPITAL BRIDGE] Pre-arrival sent for ${incident.id} → ${primaryHospName} | ${enrichment.condition} | ${enrichment.severity}`);

  return { incident, hospitalNotification, realHospitals };
}

// ─────────────────────────────────────────────
// POST /api/crisis/create-and-enrich  — COMBINED: Create + AI Enrich + Auto-Assign (single call)
// Eliminates the multi-step timeout chain on the frontend
// ─────────────────────────────────────────────
router.post('/create-and-enrich', async (req, res) => {
  try {
    const { room, floor, guestName, guestId, type = 'medical', symptoms = '', medical_profile = null, photo = null, lat = null, lng = null } = req.body;

    // Upload photo to Cloudinary if provided
    let photo_url = null;
    if (photo) {
      try {
        const upload = await uploadToCloudinary(photo, { folder: 'crisis/evidence', resourceType: 'image' });
        photo_url = upload.url;
      } catch (e) { console.warn('Cloudinary upload skipped:', e.message); }
    }

    // Step 1: Create incident
    const incident = {
      id: `INC${Date.now().toString().slice(-6)}`,
      room: room || 'Unknown', floor: floor || 'Unknown',
      guest_name: guestName || 'Guest', guest_id: guestId || null,
      type, symptoms, photo_url,
      medical_profile,
      status: 'pending', severity: 'assessing', ai_enriched: false,
      assigned_responder: null, messages: [],
      hospital_recommendation: null, cost_estimate: null,
      guest_lat: lat, guest_lng: lng,
      responder_lat: null, responder_lng: null,
      ambulance_alert: { status: 'webhook_ready', provider: 'Twilio_Emergency_Webhook', demo_message: '🚑 Ambulance alerted via emergency services bridge' },
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };

    incidentStore.set(incident.id, incident);
    persistIncident(incident);
    logTimeline(incident.id, 'created', '🚨 Emergency Alert Sent', `${guestName || 'Guest'} triggered SOS from Room ${room}`, guestName || 'Guest', 'guest', { type, room, floor });

    const io = ioInstance.getIo();
    if (io) io.emit('new_incident', incident);

    // Step 2: AI Enrichment + Hospital notification (inline, no separate call)
    let enrichResult = null;
    try {
      enrichResult = await enrichIncident(incident);
    } catch (e) {
      console.warn('Enrichment failed, continuing with base incident:', e.message);
    }

    // Step 3: Auto-assign responder
    let responder = null;
    try {
      const preferred = type === 'medical' ? 'In-House Doctor' : 'Security Guard';
      responder = MOCK_RESPONDERS.find(r => r.status === 'available' && r.role === preferred)
               || MOCK_RESPONDERS.find(r => r.status === 'available');
      if (responder) {
        const idx = MOCK_RESPONDERS.findIndex(r => r.id === responder.id);
        if (idx !== -1) MOCK_RESPONDERS[idx].status = 'busy';
        incident.assigned_responder = {
          id: responder.id, name: responder.name, role: responder.role,
          location: responder.location, accepted_at: null,
        };
        incident.status = 'assigned';
        incident.updated_at = new Date().toISOString();
        incidentStore.set(incident.id, incident);
        persistIncident(incident);
        logTimeline(incident.id, 'assigned', `👨‍⚕️ ${responder.name} Assigned`, `${responder.role} dispatched to Room ${incident.room}`, responder.name, 'responder', { responderId: responder.id });
        if (io) {
          io.emit('incident_assigned', incident);
          io.emit(`responder_alert_${responder.id}`, { incidentId: incident.id, room: incident.room, floor: incident.floor, type: incident.type, severity: incident.severity, condition: incident.condition, action: incident.action });
        }
      }
    } catch (e) { console.warn('Auto-assign skipped:', e.message); }

    // Fetch timeline
    let timeline = [];
    try {
      const { data } = await supabase.from('crisis_timeline')
        .select('*').eq('incident_ref', incident.id).order('created_at', { ascending: true });
      if (data) timeline = data;
    } catch {}
    // Fallback timeline from in-memory
    if (timeline.length === 0) {
      timeline = [{ step: 'created', title: '🚨 Emergency Alert Sent', description: `SOS from Room ${incident.room}`, created_at: incident.created_at }];
      if (incident.ai_enriched) timeline.push({ step: 'ai_assessed', title: '🧠 AI Assessment Complete', description: `${incident.condition} (${incident.icd10})`, created_at: incident.updated_at });
      if (incident.assigned_responder) timeline.push({ step: 'assigned', title: `👨‍⚕️ ${incident.assigned_responder.name} Assigned`, description: incident.assigned_responder.role, created_at: incident.updated_at });
      if (incident.hospital_notification) timeline.push({ step: 'hospital_notified', title: '🏥 Hospital Notified', description: `Pre-arrival alert sent to ${incident.hospital_notification.hospital}`, created_at: incident.updated_at });
    }

    res.json({
      success: true,
      incident,
      timeline,
      nearby_hospitals: enrichResult?.realHospitals || [],
      responder: responder || null,
    });
  } catch (error) {
    console.error('Create-and-enrich error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/crisis/enrich/:id  — Step 3: AI Enrichment (ICD-10 + severity)
// (Kept for backward compatibility — new frontend uses /create-and-enrich)
// ─────────────────────────────────────────────
router.post('/enrich/:id', async (req, res) => {
  try {
    const incident = incidentStore.get(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const result = await enrichIncident(incident);
    res.json({ success: true, incident: result.incident, hospital_notified: true, hospital_notification: result.hospitalNotification, nearby_hospitals: result.realHospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/crisis/assign/:id  — Step 5: Smart Staff Assignment
// ─────────────────────────────────────────────
router.post('/assign/:id', async (req, res) => {
  try {
    const incident = incidentStore.get(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const { responderId } = req.body;

    // Gap 3 fix: only assign "available" responders
    let responder;
    if (responderId) {
      responder = MOCK_RESPONDERS.find(r => r.id === responderId && r.status === 'available');
    } else {
      // Auto-assign: pick nearest available responder
      // Priority: In-house doctor for medical, security for others
      const preferred = incident.type === 'medical' ? 'In-House Doctor' : 'Security Guard';
      responder = MOCK_RESPONDERS.find(r => r.status === 'available' && r.role === preferred)
               || MOCK_RESPONDERS.find(r => r.status === 'available');
    }

    if (!responder) {
      return res.status(400).json({ success: false, message: 'No available responders at this time' });
    }

    // Mark responder as busy
    const idx = MOCK_RESPONDERS.findIndex(r => r.id === responder.id);
    if (idx !== -1) MOCK_RESPONDERS[idx].status = 'busy';

    incident.assigned_responder = {
      id: responder.id, name: responder.name, role: responder.role,
      location: responder.location, accepted_at: null,
    };
    incident.status = 'assigned';
    incident.updated_at = new Date().toISOString();
    incidentStore.set(incident.id, incident);
    persistIncident(incident);
    logTimeline(incident.id, 'assigned', `👨‍⚕️ ${responder.name} Assigned`, `${responder.role} dispatched to Room ${incident.room}`, responder.name, 'responder', { responderId: responder.id });

    const io = ioInstance.getIo();
    if (io) {
      io.emit('incident_assigned', incident);
      io.emit(`responder_alert_${responder.id}`, { incidentId: incident.id, room: incident.room, floor: incident.floor, type: incident.type, severity: incident.severity, condition: incident.condition, action: incident.action });
    }

    res.json({ success: true, incident, responder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/crisis/status/:id  — Step 6 & 7: Responder status updates
// ─────────────────────────────────────────────
router.post('/status/:id', async (req, res) => {
  try {
    const incident = incidentStore.get(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const { status } = req.body;
    // Valid transitions: assigned → accepted → enroute → arrived → resolved
    const validStatuses = ['accepted', 'enroute', 'arrived', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    incident.status = status;
    incident.updated_at = new Date().toISOString();

    const titleMap = { accepted: '✔️ Responder Accepted', enroute: '🏃 Responder En Route', arrived: '📍 Responder Arrived', resolved: '✅ Incident Resolved' };
    const descMap = { accepted: 'Responder confirmed and heading to room', enroute: 'Responder is on the way', arrived: 'Responder has reached the patient', resolved: 'Emergency has been resolved' };
    const respName = incident.assigned_responder?.name || 'Staff';

    if (status === 'accepted' && incident.assigned_responder) {
      incident.assigned_responder.accepted_at = new Date().toISOString();
    }
    if (status === 'resolved') {
      incident.resolved_at = new Date().toISOString();
      incident.response_time_minutes = Math.round((new Date(incident.resolved_at) - new Date(incident.created_at)) / 60000);
      if (incident.assigned_responder) {
        const idx = MOCK_RESPONDERS.findIndex(r => r.id === incident.assigned_responder.id);
        if (idx !== -1) MOCK_RESPONDERS[idx].status = 'available';
      }
    }

    incidentStore.set(incident.id, incident);
    persistIncident(incident);
    logTimeline(incident.id, status, titleMap[status] || status, descMap[status] || '', respName, 'responder', { status });

    const io = ioInstance.getIo();
    if (io) io.emit('incident_status_update', incident);

    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/crisis/chat/:id  — Step 7: Real-time incident chat message persist
// ─────────────────────────────────────────────
router.post('/chat/:id', async (req, res) => {
  try {
    const incident = incidentStore.get(req.params.id);
    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });

    const { sender, senderRole, text } = req.body;
    const message = {
      id: `MSG${Date.now()}`,
      sender,
      senderRole: senderRole || 'guest',
      text,
      timestamp: new Date().toISOString(),
    };

    incident.messages.push(message);
    incident.updated_at = new Date().toISOString();
    incidentStore.set(incident.id, incident);
    persistMessage(incident.id, sender, senderRole || 'guest', text);

    const io = ioInstance.getIo();
    if (io) io.to(`incident_${incident.id}`).emit('incident_message', message);

    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/crisis/incidents  — Step 4: All incidents for dashboard
// ─────────────────────────────────────────────
router.get('/incidents', (req, res) => {
  const all = Array.from(incidentStore.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
  res.json({ success: true, incidents: all, total: all.length });
});

// ─────────────────────────────────────────────
// GET /api/crisis/incidents/:id  — Get single incident
// ─────────────────────────────────────────────
router.get('/incidents/:id', (req, res) => {
  const incident = incidentStore.get(req.params.id);
  if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
  res.json({ success: true, incident });
});

// ─────────────────────────────────────────────
// GET /api/crisis/qr  — QR scan endpoint (room-based trigger)
// ─────────────────────────────────────────────
router.get('/qr', (req, res) => {
  const { room, floor, hotel } = req.query;
  res.json({
    success: true,
    qr_config: {
      room: room || 'Unknown',
      floor: floor || 'Unknown',
      hotel_id: hotel || 'HOTEL_001',
      trigger_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/crisis/report?room=${room}&floor=${floor}&hotel=${hotel}`,
      note: 'QR code embeds room/floor metadata. Guest scans → pre-filled emergency form.',
    },
  });
});

// ─────────────────────────────────────────────
// HOSPITAL ↔ VENUE BRIDGE ENDPOINTS
// ─────────────────────────────────────────────

// GET /api/crisis/hospital/notifications — Hospital portal: all incoming patient alerts
router.get('/hospital/notifications', (req, res) => {
  const notifications = [];
  for (const incident of incidentStore.values()) {
    if (incident.hospital_notification) {
      notifications.push({
        ...incident.hospital_notification,
        // attach live incident context
        incident_status: incident.status,
        responder: incident.assigned_responder,
        venue_type: 'hotel',
      });
    }
  }
  const sorted = notifications.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
  res.json({ success: true, notifications: sorted, total: sorted.length });
});

// POST /api/crisis/hospital/acknowledge/:notificationId
// Hospital clicks "Acknowledge" — sends confirmation back to venue
router.post('/hospital/acknowledge/:incidentId', (req, res) => {
  try {
    const incident = incidentStore.get(req.params.incidentId);
    if (!incident || !incident.hospital_notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const { responder_name = 'ER Nurse', bed_number = 'ER-A02', eta_confirmation = '10 min' } = req.body;

    incident.hospital_notification.status = 'acknowledged';
    incident.hospital_notification.acknowledged_at = new Date().toISOString();
    incident.hospital_notification.bed_number = bed_number;
    incident.hospital_notification.hospital_responder = responder_name;
    incident.hospital_notification.eta_confirmation = eta_confirmation;
    incidentStore.set(incident.id, incident);
    persistIncident(incident);
    persistHospitalCase({ incident_ref: incident.id, hospital_name: incident.hospital_notification.hospital, status: 'acknowledged', bed_number, responder_name, acknowledged_at: new Date().toISOString() });
    logTimeline(incident.id, 'hospital_acknowledged', '✅ Hospital Acknowledged', `${incident.hospital_notification.hospital} confirmed — Bed ${bed_number} ready`, incident.hospital_notification.hospital, 'hospital', { bed_number });

    // Notify the venue staff dashboard in real-time
    const io = ioInstance.getIo();
    if (io) {
      io.emit('hospital_acknowledged', {
        incidentId: incident.id,
        hospital: incident.hospital_notification.hospital,
        bed_number,
        responder_name,
        eta_confirmation,
        message: `✅ ${incident.hospital_notification.hospital} confirmed — Bed ${bed_number} ready, ${eta_confirmation} ETA`,
      });
      // Also push to the incident-specific room so guest page sees it
      io.to(`incident_${incident.id}`).emit('incident_message', {
        id: `HN-ACK-${Date.now()}`,
        sender: incident.hospital_notification.hospital,
        senderRole: 'hospital',
        text: `🏥 Hospital Ready: Bed ${bed_number} prepared in ${incident.hospital_notification.hospital_dept}. Please proceed immediately. ETA: ${eta_confirmation}.`,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[HOSPITAL BRIDGE] ACK received: ${incident.hospital_notification.hospital} → Bed ${bed_number}`);
    res.json({ success: true, notification: incident.hospital_notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crisis/hospital/bed-ready/:incidentId
// Hospital signals bed is prepared and department is alerted
router.post('/hospital/bed-ready/:incidentId', (req, res) => {
  try {
    const incident = incidentStore.get(req.params.incidentId);
    if (!incident || !incident.hospital_notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const { bed_number, notes = '' } = req.body;
    incident.hospital_notification.status = 'bed_ready';
    incident.hospital_notification.bed_number = bed_number || 'ER-01';
    incident.hospital_notification.hospital_notes = notes;
    incidentStore.set(incident.id, incident);
    persistIncident(incident);
    persistHospitalCase({ incident_ref: incident.id, status: 'bed_ready', bed_number: bed_number || 'ER-01', bed_ready_at: new Date().toISOString() });
    logTimeline(incident.id, 'bed_ready', '🛏️ Bed Ready', `Bed ${bed_number || 'ER-01'} prepared — ${incident.hospital_notification.hospital_dept} team on standby`, incident.hospital_notification.hospital, 'hospital', { bed_number });

    const io = ioInstance.getIo();
    if (io) {
      io.emit('hospital_bed_ready', { incidentId: incident.id, bed_number, hospital: incident.hospital_notification.hospital });
      io.to(`incident_${incident.id}`).emit('incident_message', {
        id: `HN-BED-${Date.now()}`,
        sender: incident.hospital_notification.hospital,
        senderRole: 'hospital',
        text: `🛏️ Bed ${bed_number || 'ER-01'} is now prepared and ${incident.hospital_notification.hospital_dept} team is on standby. ${notes}`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, notification: incident.hospital_notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/crisis/hospital/patient-arrived/:incidentId
// Mark patient as physically arrived at hospital — closes the loop
router.post('/hospital/patient-arrived/:incidentId', (req, res) => {
  try {
    const incident = incidentStore.get(req.params.incidentId);
    if (!incident || !incident.hospital_notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    incident.hospital_notification.status = 'patient_arrived';
    incident.hospital_notification.arrived_at = new Date().toISOString();
    incident.status = 'resolved';
    incident.resolved_at = new Date().toISOString();
    incident.response_time_minutes = Math.round(
      (new Date(incident.resolved_at) - new Date(incident.created_at)) / 60000
    );
    // Free the responder
    if (incident.assigned_responder) {
      const idx = MOCK_RESPONDERS.findIndex(r => r.id === incident.assigned_responder.id);
      if (idx !== -1) MOCK_RESPONDERS[idx].status = 'available';
    }
    incidentStore.set(incident.id, incident);
    persistIncident(incident);
    persistHospitalCase({ incident_ref: incident.id, status: 'patient_arrived', arrived_at: new Date().toISOString(), response_time_minutes: incident.response_time_minutes });
    logTimeline(incident.id, 'patient_arrived', '🏥 Patient Arrived at Hospital', `${incident.guest_name} received at ${incident.hospital_notification.hospital}`, incident.hospital_notification.hospital, 'hospital', {});
    logTimeline(incident.id, 'resolved', '✅ Incident Resolved', `Response time: ${incident.response_time_minutes} minutes`, 'System', 'system', { response_time_minutes: incident.response_time_minutes });

    const io = ioInstance.getIo();
    if (io) {
      io.emit('incident_status_update', incident);
      io.to(`incident_${incident.id}`).emit('incident_message', {
        id: `HN-ARR-${Date.now()}`,
        sender: incident.hospital_notification.hospital,
        senderRole: 'hospital',
        text: `✅ Patient ${incident.guest_name} has arrived at ${incident.hospital_notification.hospital} and is now under medical care.`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/crisis/timeline/:id — Train-station-style timeline for an incident
// ─────────────────────────────────────────────
router.get('/timeline/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('crisis_timeline')
      .select('*').eq('incident_ref', req.params.id).order('created_at', { ascending: true });
    if (error) {
      // Fallback: build from in-memory incident
      const incident = incidentStore.get(req.params.id);
      if (!incident) return res.json({ success: true, timeline: [] });
      const timeline = [{ step: 'created', title: '🚨 Emergency Alert Sent', description: `SOS from Room ${incident.room}`, created_at: incident.created_at }];
      if (incident.ai_enriched) timeline.push({ step: 'ai_assessed', title: '🧠 AI Assessment Complete', description: `${incident.condition} (${incident.icd10})`, created_at: incident.updated_at });
      if (incident.assigned_responder) timeline.push({ step: 'assigned', title: `👨‍⚕️ ${incident.assigned_responder.name} Assigned`, description: incident.assigned_responder.role, created_at: incident.updated_at });
      return res.json({ success: true, timeline });
    }
    res.json({ success: true, timeline: data || [] });
  } catch (e) {
    res.json({ success: true, timeline: [] });
  }
});

// ─────────────────────────────────────────────
// GET /api/crisis/nearby-hospitals — Real hospitals from OpenStreetMap
// ─────────────────────────────────────────────
router.get('/nearby-hospitals', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng are required' });
    const hospitals = await fetchNearbyHospitals(parseFloat(lat), parseFloat(lng), parseFloat(radius) || 10);
    res.json({ success: true, hospitals, total: hospitals.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/crisis/hospital/stats — Hospital case analytics
// ─────────────────────────────────────────────
router.get('/hospital/stats', async (req, res) => {
  try {
    // Try Supabase first
    const { data, error } = await supabase.from('hospital_cases').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const total = data.length;
      const acknowledged = data.filter(c => c.acknowledged_at).length;
      const bedReady = data.filter(c => c.bed_ready_at).length;
      const arrived = data.filter(c => c.arrived_at).length;
      const avgResponse = data.filter(c => c.response_time_minutes).reduce((s, c) => s + c.response_time_minutes, 0) / (arrived || 1);
      return res.json({ success: true, stats: { total, acknowledged, bedReady, arrived, pending: total - arrived, avgResponseMinutes: Math.round(avgResponse) }, cases: data.slice(0, 50) });
    }
    // Fallback: in-memory
    const cases = [];
    for (const inc of incidentStore.values()) {
      if (inc.hospital_notification) cases.push({ incident_ref: inc.id, hospital_name: inc.hospital_notification.hospital, patient_name: inc.guest_name, severity: inc.severity, status: inc.hospital_notification.status, created_at: inc.created_at });
    }
    res.json({ success: true, stats: { total: cases.length, arrived: cases.filter(c => c.status === 'patient_arrived').length, pending: cases.filter(c => c.status !== 'patient_arrived').length, avgResponseMinutes: 0 }, cases });
  } catch (error) {
    res.json({ success: true, stats: { total: 0, arrived: 0, pending: 0, avgResponseMinutes: 0 }, cases: [] });
  }
});

module.exports = router;
