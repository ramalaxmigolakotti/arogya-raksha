const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { callGeminiAgent } = require('../services/aiService');

// Symptom checker
router.post('/symptoms', auth, async (req, res) => {
  try {
    const { symptoms, additionalInfo } = req.body;
    const context = `Patient symptoms: ${symptoms.join(', ')}. Additional info: ${additionalInfo || 'None'}`;
    const result = await callGeminiAgent('symptomChecker', context, JSON.stringify(req.user.health_profile || {}));
    res.json({ success: true, analysis: result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Diabetes prediction
router.post('/diabetes', auth, async (req, res) => {
  try {
    const { symptoms, sugarLevels, lifestyle } = req.body;
    const context = `Symptoms: ${JSON.stringify(symptoms)}. Sugar levels: ${JSON.stringify(sugarLevels)}. Lifestyle: ${JSON.stringify(lifestyle)}`;
    const result = await callGeminiAgent('diabetesPredictor', context, JSON.stringify(req.user.health_profile || {}));
    res.json({ success: true, prediction: result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// General AI chat
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, context } = req.body;
    const result = await callGeminiAgent('generalHealth', message, context || '');
    res.json({ success: true, response: result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Emergency assessment
router.post('/emergency-assess', async (req, res) => {
  try {
    const { situation } = req.body;
    const result = await callGeminiAgent('emergencyAgent', situation);
    res.json({ success: true, assessment: result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
