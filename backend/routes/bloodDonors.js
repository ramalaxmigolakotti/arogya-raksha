const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const BloodDonor = require('../models/BloodDonor');
const User = require('../models/User');

// Register as donor
router.post('/register', auth, async (req, res) => {
  try {
    const { bloodGroup, phone, city, state, location } = req.body;
    let donor = await BloodDonor.findByUser(req.userId);

    if (donor) {
      const updates = { blood_group: bloodGroup, phone, city, state };
      if (location) updates.location = location;
      donor = await BloodDonor.update(donor.id, updates);
    } else {
      donor = await BloodDonor.create({
        userId: req.userId,
        bloodGroup,
        phone,
        city,
        state,
        location,
      });
    }

    res.status(201).json({ success: true, donor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search donors
router.get('/search', async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;
    const filters = {};
    if (bloodGroup) filters.bloodGroup = bloodGroup;
    if (city) filters.city = city;

    const donors = await BloodDonor.search(filters);

    // Enrich with user name
    const enriched = await Promise.all(
      donors.map(async (donor) => {
        const user = await User.findById(donor.user_id);
        return {
          ...donor,
          user: user ? { id: user.id, name: user.name } : null,
        };
      })
    );

    res.json({ success: true, donors: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle availability
router.put('/availability', auth, async (req, res) => {
  try {
    const donor = await BloodDonor.updateByUser(req.userId, { available: req.body.available });
    res.json({ success: true, donor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
