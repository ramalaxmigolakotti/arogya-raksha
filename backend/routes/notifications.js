const express = require('express');
const router = express.Router();

// In-memory token store (use Redis/DB in production)
const deviceTokens = new Map(); // userId → [tokens]

/**
 * POST /api/notifications/register-token
 * Saves FCM device token for a user
 */
router.post('/register-token', (req, res) => {
  const { userId, token, platform } = req.body;
  if (!userId || !token) {
    return res.status(400).json({ success: false, error: 'userId and token required' });
  }

  const existing = deviceTokens.get(userId) || [];
  if (!existing.includes(token)) {
    existing.push(token);
    deviceTokens.set(userId, existing);
  }

  console.log(`[FCM] Token registered for user ${userId} (${platform || 'web'}) — total: ${existing.length}`);
  res.json({ success: true, message: 'Token registered' });
});

/**
 * Internal helper — called from crisis route when SOS is triggered
 * Sends push notification to all hospital staff tokens
 */
async function sendPushToHospital(hospitalId, payload) {
  try {
    const admin = require('../services/firebaseAdmin');
    if (!admin.isConfigured()) return;

    const hospitalTokens = getHospitalTokens(hospitalId);
    if (!hospitalTokens.length) return;

    const message = {
      notification: {
        title: payload.title || '🚨 Emergency SOS Alert',
        body:  payload.body  || 'New patient incoming — action required',
      },
      data: {
        incidentId:   payload.incidentId || '',
        patientName:  payload.patientName || '',
        severity:     payload.severity || 'unknown',
        url:          '/hospital/portal',
      },
      tokens: hospitalTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM] Push sent: ${response.successCount} success, ${response.failureCount} failed`);
  } catch (err) {
    console.warn('[FCM] Push notification failed (non-fatal):', err.message);
  }
}

// Mock hospital → staff token mapping (replace with DB in production)
function getHospitalTokens(hospitalId) {
  // Return all registered tokens for now (in production: filter by hospital)
  const all = [];
  deviceTokens.forEach(tokens => all.push(...tokens));
  return all;
}

router.sendPushToHospital = sendPushToHospital;

module.exports = router;
