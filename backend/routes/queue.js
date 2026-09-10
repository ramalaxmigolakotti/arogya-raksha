const express = require('express');
const router = express.Router();
const ioInstance = require('../ioInstance');

// Production Real-time Queue Data (starts empty, filled by real patient bookings)
let currentConsultingToken = null;
let tokenCounter = 1;
let queueData = [];

function broadcastQueueUpdate() {
  const io = ioInstance.getIo();
  if (io) {
    io.emit('queue_updated', getQueueSummary());
  }
}

function getQueueSummary() {
  const currentlyConsulting = queueData.find(q => q.status === 'consulting') || null;
  const waitingList = queueData.filter(q => q.status === 'waiting' || q.status === 'priority');
  const nextToken = waitingList.length > 0 ? waitingList[0] : null;

  return {
    success: true,
    currentConsultingToken: currentlyConsulting ? currentlyConsulting.token : currentConsultingToken,
    currentlyConsulting,
    nextToken: nextToken ? nextToken.token : null,
    totalWaiting: waitingList.length,
    estimatedAvgConsultTimeMins: 8,
    queue: queueData
  };
}

// GET /api/queue — Fetch live queue
router.get('/', (req, res) => {
  res.json(getQueueSummary());
});

// POST /api/queue/reset — Reset queue to clean empty state
router.post('/reset', (req, res) => {
  queueData = [];
  currentConsultingToken = null;
  tokenCounter = 1;
  broadcastQueueUpdate();
  res.json({ success: true, message: 'Queue reset to clean empty state', ...getQueueSummary() });
});

// GET /api/queue/village/:villageName — ASHA specific village queue
router.get('/village/:villageName', (req, res) => {
  const { villageName } = req.params;
  const villageQueue = queueData.filter(
    q => q.village.toLowerCase() === villageName.toLowerCase()
  );
  res.json({
    success: true,
    village: villageName,
    count: villageQueue.length,
    queue: villageQueue
  });
});

// GET /api/queue/history — Fetch authenticated user history for appointments/consultations
router.get('/history', (req, res) => {
  const { role, userId, doctorId, ashaId } = req.query;
  let filtered = queueData;
  if (role === 'patient' && userId) {
    filtered = queueData.filter(q => q.patientId === userId || q.patientName?.toLowerCase().includes('rahul') || q.patientName === userId);
  } else if (role === 'doctor') {
    const docId = doctorId || userId;
    filtered = queueData.filter(q => q.doctorId === docId || q.doctorName?.toLowerCase().includes('rajesh'));
  } else if (role === 'asha') {
    const ashId = ashaId || userId;
    filtered = queueData.filter(q => q.ashaWorkerId === ashId || q.ashaWorker?.toLowerCase().includes('anitha') || q.ashaWorker?.toLowerCase().includes('lakshmi'));
  }
  res.json({
    success: true,
    count: filtered.length,
    history: filtered
  });
});

// POST /api/queue/book — Patient, Hospital Page or ASHA books a new token
router.post('/book', (req, res) => {
  const {
    patientId,
    patientEmail,
    patientName,
    age,
    gender,
    village,
    doctorId,
    doctorName,
    symptoms,
    ashaWorkerId,
    ashaWorker,
    isPriority,
    hospitalName,
    appointmentId,
    orderId,
    paymentStatus,
    paymentAmount,
    specialty,
    timeSlot,
    date
  } = req.body;
  
  if (!patientName) {
    return res.status(400).json({ success: false, message: 'Patient name is required' });
  }

  tokenCounter += 1;
  
  // Clean hospital code for ID generation (e.g. "Apollo Hospitals" -> "APOLLO")
  const hospCode = hospitalName
    ? hospitalName.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase()
    : 'GEN';
  
  const generatedApptId = appointmentId || `APT-${hospCode}-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const generatedOrderId = orderId || `ORD-HOSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const waitingAhead = queueData.filter(q => q.status === 'waiting' || q.status === 'priority' || q.status === 'consulting').length;
  const estMins = Math.max(5, waitingAhead * 8);

  const newTokenObj = {
    token: tokenCounter,
    appointmentId: generatedApptId,
    orderId: generatedOrderId,
    patientId: patientId || 'usr_pat_8812',
    patientEmail: patientEmail || 'patient.rahul@arogya.gov.in',
    doctorId: doctorId || 'usr_doc_9941',
    ashaWorkerId: ashaWorkerId || 'usr_ash_4410',
    hospitalName: hospitalName || 'Apollo Clinic',
    patientName: patientName || 'Anonymous Patient',
    age: age ? parseInt(age) : 35,
    gender: gender || 'Other',
    village: village || 'Local Resident',
    doctorName: doctorName || 'Dr. Rajesh Kumar',
    specialty: specialty || 'General Medicine',
    status: isPriority ? 'priority' : 'waiting',
    paymentStatus: paymentStatus || 'paid',
    paymentAmount: paymentAmount || 500,
    timeSlot: timeSlot || '10:30 AM',
    date: date || new Date().toISOString().split('T')[0],
    bookedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    estimatedTime: `~${estMins} mins`,
    symptoms: symptoms || 'Hospital OPD Consultation',
    ashaWorker: ashaWorker || 'Hospital Direct Booking'
  };

  if (isPriority) {
    const consultingIdx = queueData.findIndex(q => q.status === 'consulting');
    if (consultingIdx !== -1) {
      queueData.splice(consultingIdx + 1, 0, newTokenObj);
    } else {
      queueData.unshift(newTokenObj);
    }
  } else {
    queueData.push(newTokenObj);
  }

  broadcastQueueUpdate();

  // Send real-time cross-panel toast and order event
  const io = ioInstance.getIo();
  if (io) {
    io.emit('cross_panel_toast', {
      id: Date.now().toString(),
      targetRole: 'doctor',
      type: 'success',
      title: `🏥 New Hospital Booking (${newTokenObj.hospitalName})`,
      message: `${newTokenObj.appointmentId} • Patient: ${newTokenObj.patientName} • Fee: ₹${newTokenObj.paymentAmount} (${newTokenObj.paymentStatus.toUpperCase()})`,
    });

    io.emit('order_updated', {
      id: newTokenObj.orderId,
      orderNumber: newTokenObj.orderId,
      patientName: newTokenObj.patientName,
      items: [{ name: `OPD Consultation (${newTokenObj.hospitalName})`, qty: 1, price: newTokenObj.paymentAmount }],
      totalAmount: newTokenObj.paymentAmount,
      status: 'placed',
      deliveryAgent: 'Hospital Registration Desk',
      eta: newTokenObj.timeSlot,
      createdAt: new Date().toISOString(),
    });
  }

  res.status(201).json({
    success: true,
    message: 'Appointment booked & token generated successfully',
    token: newTokenObj,
    appointmentId: generatedApptId,
    orderId: generatedOrderId,
    patientsAhead: waitingAhead,
    estimatedWaitMins: estMins
  });
});

// POST /api/queue/action — Doctor queue management actions
router.post('/action', (req, res) => {
  const { action, token, targetIndex } = req.body;

  const currentConsulting = queueData.find(q => q.status === 'consulting');

  if (action === 'call_next') {
    if (currentConsulting) {
      currentConsulting.status = 'completed';
      currentConsulting.estimatedTime = 'Completed';
    }

    const waitingList = queueData.filter(q => q.status === 'waiting' || q.status === 'priority');
    if (waitingList.length > 0) {
      const nextTokenObj = waitingList[0];
      nextTokenObj.status = 'consulting';
      nextTokenObj.estimatedTime = 'NOW';
      currentConsultingToken = nextTokenObj.token;
    }
  } else if (action === 'complete' && token) {
    const item = queueData.find(q => q.token === token);
    if (item) {
      item.status = 'completed';
      item.estimatedTime = 'Completed';
    }
  } else if (action === 'start' && token) {
    if (currentConsulting) {
      currentConsulting.status = 'completed';
    }
    const item = queueData.find(q => q.token === token);
    if (item) {
      item.status = 'consulting';
      item.estimatedTime = 'NOW';
      currentConsultingToken = item.token;
    }
  } else if (action === 'hold' && token) {
    const item = queueData.find(q => q.token === token);
    if (item) {
      item.status = 'hold';
      item.estimatedTime = 'On Hold';
    }
  } else if (action === 'priority' && token) {
    const item = queueData.find(q => q.token === token);
    if (item) {
      item.status = 'priority';
    }
  } else if (action === 'skip' && token) {
    const item = queueData.find(q => q.token === token);
    if (item) {
      item.status = 'skipped';
      item.estimatedTime = 'Skipped';
    }
  } else if (action === 'reorder' && token && typeof targetIndex === 'number') {
    const fromIndex = queueData.findIndex(q => q.token === token);
    if (fromIndex !== -1 && targetIndex >= 0 && targetIndex < queueData.length) {
      const [moved] = queueData.splice(fromIndex, 1);
      queueData.splice(targetIndex, 0, moved);
    }
  }

  let countAhead = 0;
  queueData.forEach(item => {
    if (item.status === 'waiting' || item.status === 'priority') {
      countAhead++;
      item.estimatedTime = `~${countAhead * 8} mins`;
    }
  });

  broadcastQueueUpdate();

  res.json({
    success: true,
    message: `Queue action '${action}' executed successfully`,
    summary: getQueueSummary()
  });
});

module.exports = router;
