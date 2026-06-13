/**
 * Medical Cost Estimation Service
 * Uses the medical_costs.csv dataset to provide healthcare cost estimates
 * based on patient demographics (age, BMI, smoker status, etc.)
 */
const fs = require('fs');
const path = require('path');

let costData = null;

// ── Load & parse the medical cost dataset (lazy, once) ──
function loadCostData() {
  if (costData) return costData;

  const csvPath = path.join(__dirname, '..', 'data', 'medical_costs.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('⚠️  medical_costs.csv not found — cost estimation will use defaults');
    costData = [];
    return costData;
  }

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  costData = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (vals[idx] || '').trim();
    });
    costData.push({
      age: parseInt(row.age) || 0,
      sex: row.sex,
      bmi: parseFloat(row.bmi) || 0,
      children: parseInt(row.children) || 0,
      smoker: row.smoker === 'yes',
      region: row.region,
      charges: parseFloat(row.charges) || 0,
    });
  }

  console.log(`📊 Loaded ${costData.length} medical cost records for estimation`);
  return costData;
}

/**
 * Estimate medical costs based on patient profile
 * Uses k-nearest-neighbors approach on the dataset
 */
function estimateCost({ age, sex, bmi, smoker, children }) {
  const data = loadCostData();
  if (data.length === 0) {
    // Fallback: basic estimation
    let base = 5000;
    if (age > 50) base *= 2;
    if (smoker) base *= 2.5;
    if (bmi > 30) base *= 1.3;
    return {
      estimated_annual_cost_usd: Math.round(base),
      estimated_annual_cost_inr: Math.round(base * 83),
      confidence: 'low',
      source: 'fallback',
    };
  }

  // Find similar profiles (KNN with k=20)
  const scored = data.map(d => {
    const ageDiff = Math.abs(d.age - (age || 30)) / 50;
    const bmiDiff = Math.abs(d.bmi - (bmi || 25)) / 30;
    const smokerDiff = (d.smoker === smoker) ? 0 : 1;
    const sexDiff = (d.sex === sex) ? 0 : 0.3;
    const childDiff = Math.abs(d.children - (children || 0)) / 5;

    return {
      ...d,
      distance: ageDiff * 3 + bmiDiff * 2 + smokerDiff * 4 + sexDiff + childDiff,
    };
  });

  scored.sort((a, b) => a.distance - b.distance);

  const k = 20;
  const neighbors = scored.slice(0, k);
  const avgCost = neighbors.reduce((sum, n) => sum + n.charges, 0) / k;
  const minCost = Math.min(...neighbors.map(n => n.charges));
  const maxCost = Math.max(...neighbors.map(n => n.charges));

  // Convert USD to INR (approximate)
  const INR_RATE = 83;

  return {
    estimated_annual_cost_usd: Math.round(avgCost),
    estimated_annual_cost_inr: Math.round(avgCost * INR_RATE),
    cost_range_usd: { min: Math.round(minCost), max: Math.round(maxCost) },
    cost_range_inr: { min: Math.round(minCost * INR_RATE), max: Math.round(maxCost * INR_RATE) },
    monthly_emi_6: Math.round((avgCost * INR_RATE) / 6),
    monthly_emi_12: Math.round((avgCost * INR_RATE) / 12),
    monthly_emi_24: Math.round((avgCost * INR_RATE) / 24),
    confidence: 'high',
    source: 'dataset',
    similar_profiles_analyzed: k,
  };
}

/**
 * Diabetes risk screening based on the diabetes dataset
 */
function screenDiabetesRisk({ glucose, bloodPressure, bmi, age, pregnancies, insulin, skinThickness }) {
  // Simple logistic-regression-like scoring based on the dataset thresholds
  let riskScore = 0;

  if ((glucose || 0) > 140) riskScore += 3;
  else if ((glucose || 0) > 120) riskScore += 2;
  else if ((glucose || 0) > 100) riskScore += 1;

  if ((bmi || 0) > 35) riskScore += 3;
  else if ((bmi || 0) > 30) riskScore += 2;
  else if ((bmi || 0) > 25) riskScore += 1;

  if ((bloodPressure || 0) > 90) riskScore += 2;
  else if ((bloodPressure || 0) > 80) riskScore += 1;

  if ((age || 0) > 50) riskScore += 2;
  else if ((age || 0) > 40) riskScore += 1;

  if ((pregnancies || 0) > 4) riskScore += 1;
  if ((insulin || 0) > 200) riskScore += 2;

  const maxScore = 13;
  const riskPercent = Math.min(Math.round((riskScore / maxScore) * 100), 100);

  let riskLevel, recommendation;
  if (riskPercent < 20) {
    riskLevel = 'Low';
    recommendation = 'Your diabetes risk is low. Maintain a healthy lifestyle with regular exercise and balanced diet.';
  } else if (riskPercent < 50) {
    riskLevel = 'Moderate';
    recommendation = 'You have moderate diabetes risk. Consider regular blood sugar monitoring, increase physical activity, and reduce sugar intake.';
  } else if (riskPercent < 75) {
    riskLevel = 'High';
    recommendation = 'Your diabetes risk is high. Please consult a doctor for a comprehensive blood test (HbA1c). Lifestyle changes are strongly recommended.';
  } else {
    riskLevel = 'Very High';
    recommendation = 'Your diabetes risk is very high. Please see an endocrinologist immediately for proper diagnosis and treatment plan.';
  }

  return {
    risk_score: riskScore,
    risk_percent: riskPercent,
    risk_level: riskLevel,
    recommendation,
    factors: {
      glucose: glucose || 'Not provided',
      bmi: bmi || 'Not provided',
      blood_pressure: bloodPressure || 'Not provided',
      age: age || 'Not provided',
    },
  };
}

module.exports = { estimateCost, screenDiabetesRisk, loadCostData };
