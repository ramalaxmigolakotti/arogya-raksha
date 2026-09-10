const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// SOS Emergency
router.post('/sos', auth, async (req, res) => {
  try {
    const { location, message, emergencyContacts } = req.body;
    // In production: send SMS, push notifications, alert hospitals
    console.log(`🚨 SOS Alert from user ${req.userId}:`, { location, message });

    res.json({
      success: true,
      message: 'Emergency alert sent successfully!',
      alert: {
        id: Date.now().toString(),
        status: 'dispatched',
        nearestHospital: 'AIIMS Delhi',
        estimatedArrival: '8 minutes',
        ambulanceNumber: '108',
        emergencyNumber: '112',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get emergency contacts
router.get('/contacts', auth, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      contacts: user.health_profile?.emergencyContacts || [],
      defaultNumbers: {
        ambulance: '108',
        emergency: '112',
        poisonControl: '1800-11-6117',
        mentalHealth: '08046110007',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
