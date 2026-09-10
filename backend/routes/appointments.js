const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { sendAppointmentConfirmationEmail } = require('../services/emailService');

// Book appointment
router.post('/', auth, async (req, res) => {
  try {
    const { doctorId, hospitalId, date, timeSlot, department, reason } = req.body;
    const user = req.user;

    const appointment = await Appointment.create({
      patientId: user.id,
      patientName: user.name,
      patientEmail: user.email,
      patientPhone: user.phone,
      doctorId,
      hospitalId,
      date,
      timeSlot,
      department,
      reason,
    });

    // Resolve doctor & hospital names for the email (non-blocking)
    (async () => {
      try {
        let doctorName = 'Assigned Doctor';
        let hospitalName = '';
        if (doctorId) {
          const doc = await Doctor.findById(doctorId);
          if (doc) {
            const docUser = await User.findById(doc.user_id);
            if (docUser) doctorName = `Dr. ${docUser.name}`;
          }
        }
        if (hospitalId) {
          const hosp = await Hospital.findById(hospitalId);
          if (hosp) hospitalName = hosp.name;
        }
        await sendAppointmentConfirmationEmail({
          to: user.email,
          name: user.name,
          appointment,
          doctorName,
          hospitalName,
        });
      } catch (err) {
        console.error('Appointment email failed:', err.message);
      }
    })();

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user appointments
router.get('/my', auth, async (req, res) => {
  try {
    const appointments = await Appointment.findByPatient(req.userId);

    // Manually enrich with doctor and hospital info
    const enriched = await Promise.all(
      appointments.map(async (apt) => {
        const [doctor, hospital] = await Promise.all([
          Doctor.findById(apt.doctor_id),
          apt.hospital_id ? Hospital.findById(apt.hospital_id) : null,
        ]);

        let doctorUser = null;
        if (doctor) {
          doctorUser = await User.findById(doctor.user_id);
        }

        return {
          ...apt,
          patient: { id: apt.patient_id, name: apt.patient_name, email: apt.patient_email, phone: apt.patient_phone },
          doctor: doctor ? { ...doctor, userId: doctorUser ? { id: doctorUser.id, name: doctorUser.name, email: doctorUser.email } : null } : null,
          hospital: hospital ? { id: hospital.id, name: hospital.name, address: hospital.address } : null,
        };
      })
    );

    res.json({ success: true, appointments: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all appointments (admin) - shows who booked with their email
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    const appointments = await Appointment.findAll();
    res.json({ success: true, appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update appointment status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const appointment = await Appointment.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload payment proof
router.put('/:id/payment', auth, async (req, res) => {
  try {
    const appointment = await Appointment.updatePayment(req.params.id, req.body.paymentProof);
    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
