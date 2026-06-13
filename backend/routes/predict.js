/**
 * predict.js — Backend predict route
 * GET  /api/predict        — real patient counts from CSVs
 * POST /api/predict        — stats lookup for a predictor
 */

const express = require('express');
const router  = express.Router();
const { loadAll, getStats } = require('../services/predictorDatasets');

// Predictor display metadata (names, descriptions, fields)
const PREDICTORS_META = [
  {
    id: 'diabetes-heart',
    name: 'Diabetes & Heart Risk',
    description: 'Analyzes glucose levels, BMI, blood pressure and lifestyle to predict diabetes & cardiovascular risk using Framingham Heart Study data.',
    fields: [
      { key: 'age', label: 'Age', type: 'number', unit: 'years', min: 1, max: 120 },
      { key: 'glucose', label: 'Glucose Level', type: 'number', unit: 'mg/dL', min: 50, max: 400 },
      { key: 'bmi', label: 'BMI', type: 'number', unit: 'kg/m²', min: 10, max: 60 },
      { key: 'blood_pressure', label: 'Blood Pressure (Systolic)', type: 'number', unit: 'mmHg', min: 60, max: 250 },
      { key: 'insulin', label: 'Insulin Level', type: 'number', unit: 'μU/mL', min: 0, max: 900 },
      { key: 'cholesterol', label: 'Cholesterol', type: 'number', unit: 'mg/dL', min: 100, max: 400 },
      { key: 'smoking', label: 'Do you smoke?', type: 'select', options: ['No', 'Occasionally', 'Daily'] },
      { key: 'family_history', label: 'Family History of Diabetes/Heart Disease?', type: 'select', options: ['No', 'Yes'] },
    ],
  },
  {
    id: 'dengue',
    name: 'Dengue Fever Risk',
    description: 'Assesses dengue fever risk based on symptoms, platelet count and mosquito exposure history.',
    fields: [
      { key: 'fever', label: 'High Fever (>38.5°C)?', type: 'select', options: ['No', 'Yes'] },
      { key: 'headache', label: 'Severe Headache?', type: 'select', options: ['No', 'Mild', 'Severe'] },
      { key: 'joint_pain', label: 'Joint / Muscle Pain?', type: 'select', options: ['No', 'Yes'] },
      { key: 'rash', label: 'Skin Rash?', type: 'select', options: ['No', 'Yes'] },
      { key: 'platelet', label: 'Platelet Count (if tested)', type: 'number', unit: 'K/μL', min: 0, max: 500 },
      { key: 'area', label: 'High mosquito-prone area?', type: 'select', options: ['No', 'Yes'] },
      { key: 'days', label: 'Days since symptoms began', type: 'number', unit: 'days', min: 0, max: 20 },
    ],
  },
  {
    id: 'kidney',
    name: 'Kidney Disease Risk',
    description: 'Evaluates kidney function through creatinine, urea, and urine analysis markers.',
    fields: [
      { key: 'age', label: 'Age', type: 'number', unit: 'years', min: 1, max: 120 },
      { key: 'creatinine', label: 'Serum Creatinine', type: 'number', unit: 'mg/dL', min: 0.1, max: 20 },
      { key: 'urea', label: 'Blood Urea', type: 'number', unit: 'mg/dL', min: 5, max: 300 },
      { key: 'sodium', label: 'Sodium Level', type: 'number', unit: 'mEq/L', min: 100, max: 200 },
      { key: 'potassium', label: 'Potassium Level', type: 'number', unit: 'mEq/L', min: 2, max: 8 },
      { key: 'hemoglobin', label: 'Hemoglobin', type: 'number', unit: 'g/dL', min: 3, max: 20 },
      { key: 'diabetes', label: 'Diabetic?', type: 'select', options: ['No', 'Yes'] },
      { key: 'hypertension', label: 'Hypertension?', type: 'select', options: ['No', 'Yes'] },
    ],
  },
  {
    id: 'liver',
    name: 'Liver Disease Risk',
    description: 'Analyses liver enzymes, bilirubin and protein levels for early liver disease detection.',
    fields: [
      { key: 'age', label: 'Age', type: 'number', unit: 'years', min: 1, max: 120 },
      { key: 'bilirubin', label: 'Total Bilirubin', type: 'number', unit: 'mg/dL', min: 0.1, max: 50 },
      { key: 'direct_bilirubin', label: 'Direct Bilirubin', type: 'number', unit: 'mg/dL', min: 0, max: 25 },
      { key: 'alt', label: 'ALT (SGPT)', type: 'number', unit: 'U/L', min: 0, max: 2000 },
      { key: 'ast', label: 'AST (SGOT)', type: 'number', unit: 'U/L', min: 0, max: 2000 },
      { key: 'albumin', label: 'Albumin', type: 'number', unit: 'g/dL', min: 0, max: 10 },
      { key: 'alcohol', label: 'Alcohol consumption?', type: 'select', options: ['No', 'Occasionally', 'Regularly'] },
    ],
  },
  {
    id: 'lung',
    name: 'Lung Disease Risk',
    description: 'Predicts risk of COPD and pulmonary diseases based on smoking history, symptoms and exposure.',
    fields: [
      { key: 'age', label: 'Age', type: 'number', unit: 'years', min: 1, max: 120 },
      { key: 'smoking', label: 'Smoking?', type: 'select', options: ['Never', 'Ex-smoker', 'Current Smoker'] },
      { key: 'years_smoked', label: 'Years smoked (0 if never)', type: 'number', unit: 'years', min: 0, max: 60 },
      { key: 'breathlessness', label: 'Breathlessness?', type: 'select', options: ['No', 'On exertion', 'At rest'] },
      { key: 'cough', label: 'Chronic cough?', type: 'select', options: ['No', 'Yes'] },
      { key: 'dust_exposure', label: 'Occupational dust/chemical exposure?', type: 'select', options: ['No', 'Yes'] },
      { key: 'spo2', label: 'SpO2 (Oxygen Saturation)', type: 'number', unit: '%', min: 70, max: 100 },
    ],
  },
  {
    id: 'cancer',
    name: 'Cancer Risk Screening',
    description: 'Assesses general cancer risk based on lifestyle, family history and key biomarkers.',
    fields: [
      { key: 'age', label: 'Age', type: 'number', unit: 'years', min: 1, max: 120 },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
      { key: 'family_history', label: 'Family history of cancer?', type: 'select', options: ['No', 'Yes'] },
      { key: 'smoking', label: 'Smoking?', type: 'select', options: ['No', 'Occasionally', 'Daily'] },
      { key: 'alcohol', label: 'Alcohol?', type: 'select', options: ['No', 'Occasionally', 'Regularly'] },
      { key: 'obesity', label: 'Overweight/Obese?', type: 'select', options: ['No', 'Yes'] },
      { key: 'radiation', label: 'Radiation exposure history?', type: 'select', options: ['No', 'Yes'] },
    ],
  },
  {
    id: 'thyroid',
    name: 'Thyroid Risk',
    description: 'Evaluates thyroid function and risk of thyroid disorders using TSH, T3, T4 levels and symptoms.',
    fields: [
      { key: 'age', label: 'Age', type: 'number', unit: 'years', min: 1, max: 120 },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
      { key: 'tsh', label: 'TSH Level', type: 'number', unit: 'mIU/L', min: 0, max: 30 },
      { key: 't3', label: 'T3 Level', type: 'number', unit: 'ng/dL', min: 50, max: 250 },
      { key: 't4', label: 'T4 Level', type: 'number', unit: 'μg/dL', min: 1, max: 20 },
      { key: 'neck_swelling', label: 'Neck swelling / lump?', type: 'select', options: ['No', 'Yes'] },
      { key: 'fatigue', label: 'Chronic fatigue / weight changes?', type: 'select', options: ['No', 'Yes'] },
    ],
  },
  {
    id: 'asthma',
    name: 'Asthma Risk',
    description: 'Predicts asthma likelihood based on allergy history, breathing patterns and environment.',
    fields: [
      { key: 'age', label: 'Age', type: 'number', unit: 'years', min: 1, max: 120 },
      { key: 'wheeze', label: 'Wheezing?', type: 'select', options: ['Never', 'Rarely', 'Often'] },
      { key: 'cough_night', label: 'Nighttime cough?', type: 'select', options: ['No', 'Yes'] },
      { key: 'breathlessness', label: 'Breathlessness on exercise?', type: 'select', options: ['No', 'Mild', 'Severe'] },
      { key: 'allergies', label: 'Known allergies?', type: 'select', options: ['No', 'Yes'] },
      { key: 'family_asthma', label: 'Family history of asthma?', type: 'select', options: ['No', 'Yes'] },
      { key: 'pollution', label: 'Exposed to high pollution?', type: 'select', options: ['No', 'Yes'] },
    ],
  },
  {
    id: 'mental-health',
    name: 'Mental Health Risk',
    description: 'Screens for depression, anxiety and burnout based on sleep, mood and lifestyle patterns.',
    fields: [
      { key: 'age', label: 'Age', type: 'number', unit: 'years', min: 10, max: 100 },
      { key: 'sleep', label: 'Average sleep (hours/night)', type: 'number', unit: 'hours', min: 0, max: 16 },
      { key: 'mood', label: 'Mood most days?', type: 'select', options: ['Good', 'Neutral', 'Low', 'Very Low'] },
      { key: 'anxiety', label: 'Anxiety / Excessive worry?', type: 'select', options: ['No', 'Sometimes', 'Often'] },
      { key: 'interest', label: 'Lost interest in activities?', type: 'select', options: ['No', 'Somewhat', 'Yes'] },
      { key: 'stress', label: 'Stress level', type: 'select', options: ['Low', 'Moderate', 'High', 'Very High'] },
      { key: 'social', label: 'Social support / family?', type: 'select', options: ['Good', 'Limited', 'None'] },
    ],
  },
];

// GET /api/predict — return metadata with REAL patient counts from CSVs
router.get('/', async (req, res) => {
  try {
    const csvStats = getStats();

    const predictors = PREDICTORS_META.map(p => ({
      ...p,
      totalPatients: csvStats[p.id]?.rows || 0,
      dataFiles: csvStats[p.id]?.files || [],
    }));

    res.json({ success: true, predictors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/predict/stats — get CSV stats for a specific predictor
router.post('/stats', async (req, res) => {
  try {
    const { predictorId } = req.body;
    const csvStats = getStats();
    const s = csvStats[predictorId];
    if (!s) return res.status(404).json({ success: false, message: 'Predictor not found' });
    res.json({ success: true, stats: s });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
