/**
 * Health Assessment Routes
 * - Cost estimation (powered by medical_costs dataset)
 * - Diabetes risk screening (powered by diabetes dataset)
 */
const express = require('express');
const router = express.Router();
const { estimateCost, screenDiabetesRisk } = require('../services/costEstimationService');

// POST /api/health/cost-estimate
// Estimate healthcare costs based on patient profile
router.post('/cost-estimate', async (req, res) => {
  try {
    const { age, sex, bmi, smoker, children } = req.body;

    if (!age) {
      return res.status(400).json({
        success: false,
        message: 'Age is required for cost estimation',
      });
    }

    const estimate = estimateCost({
      age: parseInt(age),
      sex: sex || 'male',
      bmi: parseFloat(bmi) || 25,
      smoker: smoker === true || smoker === 'yes',
      children: parseInt(children) || 0,
    });

    res.json({
      success: true,
      estimate,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/health/diabetes-screening
// Screen for diabetes risk based on health parameters
router.post('/diabetes-screening', async (req, res) => {
  try {
    const { glucose, bloodPressure, bmi, age, pregnancies, insulin, skinThickness } = req.body;

    const result = screenDiabetesRisk({
      glucose: parseFloat(glucose) || undefined,
      bloodPressure: parseFloat(bloodPressure) || undefined,
      bmi: parseFloat(bmi) || undefined,
      age: parseInt(age) || undefined,
      pregnancies: parseInt(pregnancies) || undefined,
      insulin: parseFloat(insulin) || undefined,
      skinThickness: parseFloat(skinThickness) || undefined,
    });

    res.json({
      success: true,
      screening: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/health/stats
// Get dataset statistics
router.get('/stats', async (req, res) => {
  try {
    const { loadCostData } = require('../services/costEstimationService');
    const costData = loadCostData();

    res.json({
      success: true,
      stats: {
        cost_dataset_records: costData.length,
        features_available: ['cost-estimate', 'diabetes-screening'],
        datasets_loaded: {
          medical_costs: costData.length > 0,
          diabetes: true,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
