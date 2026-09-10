const express = require('express');
const router = express.Router();

// Placeholder bot dashboard route (used internally)
router.get('/status', (req, res) => {
  res.json({ success: true, status: 'ok', service: 'botDashboard' });
});

module.exports = router;
