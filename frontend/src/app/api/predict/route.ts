import { NextRequest, NextResponse } from 'next/server';
import { getSarvamKeyManager } from '@/lib/sarvamKeyManager';

const SARVAM_API_URL = 'https://api.sarvam.ai/v1/chat/completions';
const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ── Predictor metadata (fields + descriptions) ───────────────
const PREDICTORS_META = [
  {
    id: 'diabetes-heart',
    name: 'Diabetes & Heart Risk',
    description: 'Analyzes glucose levels, BMI, blood pressure and lifestyle to predict diabetes & cardiovascular risk.',
    totalPatients: 253680,
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
    description: 'Assesses dengue fever risk based on symptoms, platelet count and exposure history.',
    totalPatients: 41000,
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
    totalPatients: 400,
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
    totalPatients: 583,
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
    description: 'Predicts risk of COPD and pulmonary diseases based on exposure history and symptoms.',
    totalPatients: 768,
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
    totalPatients: 569,
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
    description: 'Evaluates thyroid function and risk of thyroid disorders including cancer.',
    totalPatients: 7200,
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
    totalPatients: 1500,
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
    totalPatients: 1100,
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

// ── GET — fetch metadata + REAL patient counts from backend CSV service ──
export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/predict`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      // Merge backend real counts into our metadata
      const merged = PREDICTORS_META.map(p => {
        const backendP = data.predictors?.find((b: any) => b.id === p.id);
        return { ...p, totalPatients: backendP?.totalPatients || p.totalPatients || 0 };
      });
      return NextResponse.json({ predictors: merged, success: true });
    }
  } catch { /* fallback below */ }
  // Fallback: return metadata with default patient counts
  return NextResponse.json({ predictors: PREDICTORS_META, success: true });
}

// ── POST — run AI prediction ──────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { predictor: predictorId, inputs, language } = body;

    const meta = PREDICTORS_META.find(p => p.id === predictorId);
    if (!meta) {
      return NextResponse.json({ error: 'Unknown predictor type.' }, { status: 400 });
    }

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)',
      kn: 'Kannada (ಕನ್ನಡ)', mr: 'Marathi (मराठी)', bn: 'Bengali (বাংলা)', bho: 'Bhojpuri (भोजपुरी)',
      gu: 'Gujarati (ગુજરાતી)', pa: 'Punjabi (ਪੰਜਾਬੀ)', or: 'Odia (ଓଡ଼િଆ)', as: 'Assamese (অসমীয়া)',
      ur: 'Urdu (اردو)', ml: 'Malayalam (മലയാളം)', mai: 'Maithili (मैथिली)', sat: 'Santali (ᱥᱟᱱᱛﺎᱲᱤ)',
      kok: 'Konkani (कोंकणी)', doi: 'Dogri (डोगरी)', ks: 'Kashmiri (کٲشُر)', mni: 'Manipuri (মেইতেই)',
      ne: 'Nepali (नेपाली)', sd: 'Sindhi (سنڌي)', sa: 'Sanskrit (संस्कृतम्)',
    };
    const langName = LANG_NAMES[language || 'en'] || 'English';
    const langInstruction = language && language !== 'en'
      ? `\n\nCRITICAL: Respond ENTIRELY in ${langName} using native script for all text explanations (advice, summary, factor names). Keep JSON keys standard.`
      : '';

    const prompt = `You are a medical AI for Arogya Raksha. Analyze this ${meta.name} risk assessment.

Patient data: ${JSON.stringify(inputs)}

Respond ONLY with a valid JSON object in this exact format (no extra text, no markdown):
{
  "predictor": "${meta.name}",
  "riskScore": <integer 0-100>,
  "riskLevel": "<Low|Medium|High|Critical>",
  "totalPatientsAnalyzed": ${meta.totalPatients},
  "factors": [
    { "name": "<factor name>", "value": "<patient value>", "impact": "<increases|decreases|neutral>" }
  ],
  "advice": [
    "<actionable advice point 1>",
    "<actionable advice point 2>",
    "<actionable advice point 3>",
    "<actionable advice point 4>"
  ],
  "summary": "<2-3 sentence plain language summary>"
}

Rules:
- riskScore: 0-19 = Low, 20-39 = Medium, 40-69 = High, 70-100 = Critical
- List 4-6 key factors from the patient data
- Give 4 specific, actionable advice points
- Always recommend consulting a doctor${langInstruction}`;

    const manager = getSarvamKeyManager();
    let response: any = null;

    for (let attempt = 0; attempt < manager.keyCount; attempt++) {
      const apiKey = manager.getNextKey();
      try {
        const res = await fetch(SARVAM_API_URL, {
          method: 'POST',
          headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'sarvam-30b',
            messages: [
              { role: 'system', content: 'You are a health risk analysis AI. Always respond with valid JSON only.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (res.ok) {
          manager.reportSuccess(apiKey);
          response = await res.json();
          break;
        }
        if (res.status === 429) { manager.reportRateLimit(apiKey); continue; }
        manager.reportFailure(apiKey);
      } catch (err: any) {
        manager.reportFailure(apiKey);
      }
    }

    if (!response) {
      // Fallback: return a basic local risk estimate if AI is unavailable
      return NextResponse.json({
        predictor: meta.name,
        riskScore: 35,
        riskLevel: 'Medium',
        totalPatientsAnalyzed: meta.totalPatients,
        factors: Object.entries(inputs).slice(0, 4).map(([k, v]) => ({
          name: k.replace(/_/g, ' '),
          value: String(v),
          impact: 'neutral',
        })),
        advice: [
          'Consult a qualified doctor for a proper diagnosis.',
          'Maintain a balanced diet and regular exercise.',
          'Monitor your vitals regularly.',
          'Get routine blood tests done annually.',
        ],
        summary: 'AI service is temporarily unavailable. Please consult a doctor for accurate assessment.',
        _fallback: true,
      });
    }

    const content = response.choices?.[0]?.message?.content || '';

    // Try to parse JSON from AI response
    let parsed: any;
    try {
      // Strip any markdown code fences if present
      const clean = content.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      // If JSON parse fails, return raw AI text as summary
      parsed = {
        predictor: meta.name,
        riskScore: 30,
        riskLevel: 'Medium',
        totalPatientsAnalyzed: meta.totalPatients,
        factors: [],
        advice: [content],
        summary: content,
      };
    }

    return NextResponse.json({ ...parsed, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
