const express = require('express');
const router = express.Router();
const ioInstance = require('../ioInstance');

// In-memory initial tickets database (synced via socket and REST)
let TICKETS = [
  {
    id: 'TCK-2026-8842',
    ashaName: 'Lakshmi Devi',
    village: 'Peruru Ward 4',
    category: 'Maternal Risk',
    title: 'High-risk 3rd trimester mother needs doctor consultation',
    description: 'Patient Sita Devi (Age 26) showing elevated BP (150/95) and edema. Requires priority checkup.',
    patientName: 'Sita Devi',
    priority: 'critical',
    status: 'open',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    doctorNotes: '',
    assignedDoctor: 'Dr. Ananya Sharma',
  },
  {
    id: 'TCK-2026-8843',
    ashaName: 'Priya Kumari',
    village: 'Kothapeta',
    category: 'Vaccine Deficit',
    title: 'Polio & BCG vaccine shortage at PHC center',
    description: 'Only 3 vials remaining for upcoming drive on Tuesday. 45 infants scheduled.',
    patientName: 'Community Drive',
    priority: 'high',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    doctorNotes: 'Requisition sent to District Cold Chain store.',
    assignedDoctor: 'Dr. Ramesh Verma',
  },
  {
    id: 'TCK-2026-8844',
    ashaName: 'Lakshmi Devi',
    village: 'Peruru Ward 2',
    category: 'Sanitation Hazard',
    title: 'Open water stagnation near Anganwadi',
    description: 'Increased mosquito breeding leading to 4 reported fever cases in young children.',
    patientName: 'Anganwadi Area',
    priority: 'medium',
    status: 'open',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    doctorNotes: '',
    assignedDoctor: '',
  },
];

// GET /api/tickets - List all tickets
router.get('/', (req, res) => {
  res.json({ success: true, count: TICKETS.length, tickets: TICKETS });
});

// POST /api/tickets - Create a new ASHA ticket (TCK-2026-XXXX)
router.post('/', (req, res) => {
  try {
    const { ashaName, village, category, title, description, patientName, priority } = req.body;
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newTicket = {
      id: `TCK-2026-${randomNum}`,
      ashaName: ashaName || 'ASHA Worker',
      village: village || 'Local Ward',
      category: category || 'General Escalation',
      title: title || 'Field Escalation Alert',
      description: description || '',
      patientName: patientName || 'N/A',
      priority: priority || 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
      doctorNotes: '',
      assignedDoctor: '',
    };

    TICKETS.unshift(newTicket);

    // Emit Socket event to all clients
    const io = ioInstance.getIo();
    if (io) {
      io.emit('ticket_created', newTicket);
      io.emit('cross_panel_toast', {
        id: Date.now().toString(),
        targetRole: 'doctor',
        type: priority === 'critical' ? 'critical' : 'warning',
        title: `🎫 New ASHA Ticket (${newTicket.id})`,
        message: `${newTicket.category}: ${newTicket.title} (${newTicket.village})`,
      });
    }

    res.status(201).json({ success: true, ticket: newTicket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/tickets/:id - Update ticket status or add doctor notes
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, doctorNotes, assignedDoctor } = req.body;

    const ticketIndex = TICKETS.findIndex(t => t.id === id);
    if (ticketIndex === -1) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    if (status) TICKETS[ticketIndex].status = status;
    if (doctorNotes !== undefined) TICKETS[ticketIndex].doctorNotes = doctorNotes;
    if (assignedDoctor) TICKETS[ticketIndex].assignedDoctor = assignedDoctor;

    const updatedTicket = TICKETS[ticketIndex];

    // Emit Socket event
    const io = ioInstance.getIo();
    if (io) {
      io.emit('ticket_updated', updatedTicket);
      io.emit('cross_panel_toast', {
        id: Date.now().toString(),
        targetRole: 'asha',
        type: 'info',
        title: `🎫 Ticket Updated (${updatedTicket.id})`,
        message: `Status changed to '${updatedTicket.status.toUpperCase()}' by ${updatedTicket.assignedDoctor || 'Doctor'}`,
      });
    }

    res.json({ success: true, ticket: updatedTicket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
