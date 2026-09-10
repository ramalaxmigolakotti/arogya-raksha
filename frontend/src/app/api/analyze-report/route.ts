import { NextRequest, NextResponse } from 'next/server';
import { callGroqVision, callGroq, parseGroqJSON, GROQ_MODELS } from '@/lib/groqClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageData, pdfText, reportType, language } = body;

    if (!imageData && !pdfText) {
      return NextResponse.json({ error: 'Image or PDF text is required.' }, { status: 400 });
    }

    const LANG_MAP: Record<string, { name: string; native: string }> = {
      en: { name: 'English', native: 'English' },
      hi: { name: 'Hindi', native: 'हिंदी' },
      te: { name: 'Telugu', native: 'తెలుగు' },
      ta: { name: 'Tamil', native: 'தமிழ்' },
      kn: { name: 'Kannada', native: 'ಕನ್ನಡ' },
      mr: { name: 'Marathi', native: 'मराठी' },
      bn: { name: 'Bengali', native: 'বাংলা' },
      bho: { name: 'Bhojpuri', native: 'भोजपुरी' },
      gu: { name: 'Gujarati', native: 'ગુજરાતી' },
      pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
      or: { name: 'Odia', native: 'ଓଡ଼ିଆ' },
      as: { name: 'Assamese', native: 'অসমীয়া' },
      ur: { name: 'Urdu', native: 'اردو' },
      ml: { name: 'Malayalam', native: 'മലയാളം' },
      mai: { name: 'Maithili', native: 'मैथिली' },
      sat: { name: 'Santali', native: 'ᱥᱟᱱᱛﺎᱲᱤ' },
      kok: { name: 'Konkani', native: 'कोंकणी' },
      doi: { name: 'Dogri', native: 'डोगरी' },
      ks: { name: 'Kashmiri', native: 'کٲشُر' },
      mni: { name: 'Manipuri', native: 'মেইতেই' },
      ne: { name: 'Nepali', native: 'नेपाली' },
      sd: { name: 'Sindhi', native: 'سنڌي' },
      sa: { name: 'Sanskrit', native: 'संस्कृतम्' },
    };

    const targetLang = LANG_MAP[language || 'en'] || LANG_MAP['en'];
    const isNonEnglish = language && language !== 'en';
    const langRule = isNonEnglish
      ? `\nIMPORTANT LANGUAGE RULE: Write ALL human-readable text fields (overallStatus, summary, interpretation, concern, recommendations, doctorConsultReason, disclaimer) in ${targetLang.name} (${targetLang.native}) using native script. Keep JSON keys and parameter names standard.`
      : '';

    let rawExtracted = '';

    // ── STEP 1: Extract data from image via Groq Vision ──────────────────────
    if (imageData) {
      const visionPrompt = `You are a medical lab report OCR expert. Carefully read EVERY value in this lab report image.

Extract ALL test parameters, their values, reference ranges, and units.
Look for: patient info, test names, values, reference ranges, units, lab name, date.

Return ONLY valid JSON:
{
  "patientName": "",
  "labName": "",
  "reportDate": "",
  "reportType": "CBC|Lipid|LFT|KFT|Thyroid|Glucose|Urine|Xray|Other",
  "parameters": [
    { "name": "Hemoglobin", "value": "14.2", "unit": "g/dL", "referenceRange": "13.0-17.0", "status": "normal" }
  ],
  "rawText": "<all text you could read>"
}
Status must be: "normal", "high", "low", or "critical"`;

      const { content } = await callGroqVision(
        imageData,
        visionPrompt,
        'You are a medical OCR system. Extract lab values exactly as printed. Return JSON only.'
      );
      const parsed = parseGroqJSON(content);
      rawExtracted = JSON.stringify(parsed);
    } else if (pdfText) {
      rawExtracted = pdfText;
    }

    // ── STEP 2: Deep AI Analysis ──────────────────────────────────────────────
    const analysisPrompt = `You are a senior medical doctor analyzing a lab report for an Indian patient.${langRule}

Raw report data:
${rawExtracted}
${reportType ? `Report type hint: ${reportType}` : ''}

Analyze this thoroughly and return ONLY valid JSON:
{
  "reportTitle": "Complete Blood Count (CBC)",
  "urgencyLevel": "normal|review|urgent|critical",
  "overallStatus": "All values normal. No immediate concerns.",
  "summary": "2-3 sentence plain-English summary for the patient",
  "parameters": [
    {
      "name": "Hemoglobin",
      "value": "14.2",
      "unit": "g/dL",
      "referenceRange": "13.0–17.0",
      "status": "normal",
      "interpretation": "Your hemoglobin is healthy — good oxygen-carrying capacity."
    }
  ],
  "abnormalFindings": [
    {
      "parameter": "LDL Cholesterol",
      "value": "145 mg/dL",
      "concern": "Borderline high — above 130 is a risk factor for heart disease.",
      "severity": "moderate"
    }
  ],
  "recommendations": [
    "Reduce saturated fat intake",
    "30 minutes of brisk walking daily"
  ],
  "followUpTests": ["Repeat lipid profile in 3 months"],
  "doctorConsult": true,
  "doctorConsultReason": "Borderline LDL warrants dietary counseling",
  "disclaimer": "This is an AI analysis. Always consult a qualified doctor."
}`;

    const { content: analysis } = await callGroq('doctor', {
      model: GROQ_MODELS.LLAMA_33_70B,
      messages: [
        {
          role: 'system',
          content: 'You are a senior physician AI. Analyze lab reports accurately for Indian patients. Always return valid JSON. Be clear, compassionate, and medically accurate.',
        },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const result = parseGroqJSON(analysis);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error('[analyze-report]', err.message);
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}
