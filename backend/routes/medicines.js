const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const { callGeminiAgent } = require('../services/aiService');

// Browse all medicines by letter — sorted A-Z, paginated
// GET /api/medicines/browse?letter=A&page=1&limit=24
router.get('/browse', async (req, res) => {
  try {
    const letter = req.query.letter || 'A';
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 24;
    const { total, medicines } = await Medicine.browse(letter, page, limit);
    res.json({ success: true, total, count: medicines.length, medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search medicines with pagination
// GET /api/medicines/search?q=paracetamol&page=1&limit=24
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 24 } = req.query;
    if (!q) return res.json({ success: true, total: 0, medicines: [] });

    const { total, medicines } = await Medicine.searchPaginated(q, parseInt(page), parseInt(limit));

    if (total === 0) {
      const aiResult = await callGeminiAgent('medicineAdvisor', q);
      return res.json({ success: true, total: 0, medicines: [], aiResponse: aiResult.data });
    }

    res.json({ success: true, total, count: medicines.length, medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get medicine categories with counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await Medicine.getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get medicines by category
router.get('/category/:category', async (req, res) => {
  try {
    const medicines = await Medicine.findByCategory(req.params.category);
    res.json({ success: true, count: medicines.length, medicines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Find cheaper alternatives for a medicine
router.get('/alternatives/:name', async (req, res) => {
  try {
    const alternatives = await Medicine.findAlternatives(req.params.name);
    res.json({
      success: true,
      original: req.params.name,
      count: alternatives.length,
      alternatives,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get medicine info via AI
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const result = await callGeminiAgent('medicineAdvisor', question);
    res.json({ success: true, response: result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get medicine by name
router.get('/:name', async (req, res) => {
  try {
    const medicine = await Medicine.findByName(req.params.name);
    if (!medicine) {
      const aiResult = await callGeminiAgent('medicineAdvisor', `Tell me about ${req.params.name}`);
      return res.json({ success: true, medicine: null, aiResponse: aiResult.data });
    }
    res.json({ success: true, medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
