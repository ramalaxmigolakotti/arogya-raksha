const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Report = require('../models/Report');
const { callGeminiAgent } = require('../services/aiService');

// Upload and analyze report
router.post('/analyze', auth, async (req, res) => {
  try {
    const { fileUrl, extractedText, type, title } = req.body;

    const aiResult = await callGeminiAgent('reportAnalyzer', extractedText || 'No text provided',
      `Report type: ${type}, Title: ${title}`);

    let analysis = {};
    // Try to parse AI response as structured analysis
    try {
      const parsed = JSON.parse(aiResult.data);
      analysis = {
        summary: parsed.summary,
        abnormalValues: (parsed.parameters || [])
          .filter(p => p.status !== 'normal')
          .map(p => ({
            parameter: p.name,
            value: p.value,
            normalRange: p.normalRange,
            status: p.status,
          })),
        recommendations: parsed.recommendations || [],
        overallStatus: parsed.abnormalCount > 3 ? 'critical' : parsed.abnormalCount > 0 ? 'attention' : 'normal',
      };
    } catch (e) {
      analysis = { summary: aiResult.data, overallStatus: 'attention' };
    }

    const report = await Report.create({
      userId: req.userId,
      type: type || 'other',
      title: title || 'Medical Report',
      fileUrl,
      extractedText,
      analysis,
      aiInsights: aiResult.data,
    });

    res.status(201).json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user reports
router.get('/my', auth, async (req, res) => {
  try {
    const reports = await Report.findByUser(req.userId);
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single report
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
