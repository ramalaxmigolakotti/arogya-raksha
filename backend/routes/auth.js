const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { sendWelcomeEmail } = require('../services/emailService');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, licenseId, specialization } = req.body;

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, role: role || 'patient', phone });

    // If doctor, create doctor profile
    if (role === 'doctor') {
      await Doctor.create({
        userId: user.id,
        licenseId,
        specialization: specialization || 'General Medicine',
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    // Send welcome email (non-blocking)
    sendWelcomeEmail({ to: email, name: user.name, role: user.role }).catch(err =>
      console.error('Welcome email failed:', err.message)
    );

    res.status(201).json({ success: true, token, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    let doctorProfile = null;
    if (user.role === 'doctor') {
      doctorProfile = await Doctor.findByUserId(user.id);
    }

    res.json({ success: true, token, user: User.sanitize(user), doctorProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ success: false });

    res.json({ success: true, user: User.sanitize(user) });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
});

module.exports = router;
