const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');

// Search hospitals with enhanced filters
router.get('/', async (req, res) => {
  try {
    const { city, state, department, emergency, ambulance, type, search, minBeds, limit } = req.query;
    const filters = {};
    if (city) filters.city = city;
    if (state) filters.state = state;
    if (department) filters.department = department;
    if (emergency === 'true') filters.emergency = true;
    if (ambulance === 'true') filters.ambulance = true;
    if (type) filters.type = type;
    if (search) filters.search = search;
    if (minBeds) filters.minBeds = minBeds;

    const hospitals = await Hospital.findAll(filters, parseInt(limit) || 50);
    res.json({ success: true, count: hospitals.length, hospitals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Nearby hospitals (uses geocoded lat/lng from dataset)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10000 } = req.query;
    if (!lat || !lng) {
      return res.json({ success: true, hospitals: [] });
    }
    const hospitals = await Hospital.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(maxDistance)
    );
    res.json({ success: true, count: hospitals.length, hospitals });
  } catch (error) {
    res.json({ success: true, hospitals: [] });
  }
});

// Hospital stats (dashboard analytics)
router.get('/stats', async (req, res) => {
  try {
    const stats = await Hospital.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get hospital by ID
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    res.json({ success: true, hospital });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
