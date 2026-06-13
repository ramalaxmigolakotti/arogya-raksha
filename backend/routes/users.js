const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Get profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({ success: true, user: User.sanitize(req.user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'phone', 'avatar', 'health_profile', 'preferred_language', 'location'];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
    }
    // Also accept camelCase versions from frontend
    if (updates.healthProfile !== undefined) filteredUpdates.health_profile = updates.healthProfile;
    if (updates.preferredLanguage !== undefined) filteredUpdates.preferred_language = updates.preferredLanguage;

    const user = await User.update(req.userId, filteredUpdates);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update health profile
router.put('/health-profile', auth, async (req, res) => {
  try {
    const user = await User.update(req.userId, { health_profile: req.body });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
