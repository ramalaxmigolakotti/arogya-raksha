import { NextRequest, NextResponse } from 'next/server';
import { callGroq, parseGroqJSON, GROQ_MODELS } from '@/lib/groqClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symptoms, age, gender, bpSystolic, bpDiastolic, isDiabetic, isPregnant, language } = body;

    if (!symptoms) return NextResponse.json({ error: 'Symptoms are required.' }, { status: 400 });

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)',
      kn: 'Kannada (ಕನ್ನಡ)', mr: 'Marathi (मराठी)', bn: 'Bengali (বাংলা)', bho: 'Bhojpuri (भोजपुरी)',
      gu: 'Gujarati (ગુજરાતી)', pa: 'Punjabi (ਪੰਜਾਬੀ)', or: 'Odia (ଓଡ଼ିଆ)', as: 'Assamese (অসমীয়া)',
      ur: 'Urdu (اردو)', ml: 'Malayalam (മലയാളം)', mai: 'Maithili (मैथिली)', sat: 'Santali (ᱥᱟᱱᱛﺎᱲᱤ)',
      kok: 'Konkani (कोंकणी)', doi: 'Dogri (डोगरी)', ks: 'Kashmiri (کٲشُر)', mni: 'Manipuri (মেইতেই)',
      ne: 'Nepali (नेपाली)', sd: 'Sindhi (سنڌي)', sa: 'Sanskrit (संस्कृतम्)',
    };
    const targetLangName = LANG_NAMES[language || 'en'] || 'English';
    const langInstruction = language && language !== 'en'
      ? `\n\nCRITICAL: Respond ENTIRELY in ${targetLangName} using native script for all explanation fields (diagnosis, foodAdvice, exerciseAdvice, lifestyleAdvice, generalAdvice, whenToSeeDoctor, disclaimer). Keep JSON structure and keys intact.` : '';

    const patientContext = [
      age     && `Age: ${age}`,
      gender  && `Gender: ${gender}`,
      bpSystolic && bpDiastolic && `BP: ${bpSystolic}/${bpDiastolic} mmHg`,
      isDiabetic  && `Diabetic: Yes`,
      isPregnant  && `Pregnant: Yes`,
    ].filter(Boolean).join(', ');

    const systemPrompt = `You are an expert medical AI for Arogya Raksha, an Indian healthcare platform.
Analyze patient symptoms and respond ONLY with valid JSON — no markdown, no extra text.${langInstruction}`;

    const userPrompt = `Patient: ${patientContext || 'Not provided'}
Symptoms: ${symptoms}

Return this exact JSON structure:
{
  "diagnosis": "<2-3 sentence assessment of probable condition>",
  "severity": "<mild|moderate|severe>",
  "medicines": [
    {
      "name": "<generic name>",
      "brandName": "<common Indian brand e.g. Crocin, Dolo 650, Combiflam, Gelusil>",
      "form": "<tablet|capsule|syrup|injection>",
      "power": "<e.g. 500mg>",
      "dosage": "<e.g. 1 tablet>",
      "frequency": "<e.g. Every 8 hours>",
      "duration": "<e.g. 5 days>",
      "timing": "<e.g. After food>",
      "purpose": "<one line: what this relieves>",
      "warnings": ["<warning>"],
      "contraindications": ["<contraindication>"]
    }
  ],
  "foodAdvice": "<exactly 3 sentences about what Indian foods to eat and avoid for recovery>",
  "exerciseAdvice": "<exactly 3 sentences about physical activity — rest, walking, yoga based on severity>",
  "lifestyleAdvice": "<exactly 3 sentences about lifestyle changes and Indian home remedies>",
  "generalAdvice": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "whenToSeeDoctor": "<specific red-flag symptoms requiring immediate doctor visit>",
  "disclaimer": "This is AI-generated advice. Always consult a qualified doctor."
}

Rules:
- 3-5 medicines, preferably OTC, India-appropriate
- Consider age, gender, BP, diabetes, pregnancy
- foodAdvice / exerciseAdvice / lifestyleAdvice: EXACTLY 3 sentences each
- Use very common Indian brands (Crocin, Dolo, Combiflam, Gelusil, ORS, Vicks, Zincovit, etc.)`;

    const { content } = await callGroq('symptoms', {
      model:      GROQ_MODELS.LLAMA_33_70B,
      messages:   [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens:  2500,
      response_format: { type: 'json_object' },
    });

    let parsed: any;
    try {
      parsed = parseGroqJSON(content);
    } catch {
      parsed = {
        diagnosis:       content.slice(0, 300) || 'Unable to analyze symptoms.',
        severity:        'moderate',
        medicines:       [],
        foodAdvice:      'Drink plenty of fluids like coconut water and clear soups. Eat light foods like khichdi, dal, and boiled vegetables. Avoid spicy, oily, or heavy foods until you recover.',
        exerciseAdvice:  'Rest as much as possible and avoid strenuous activity. Light walking for 10 minutes may help if you feel comfortable. Stop any activity immediately if symptoms worsen.',
        lifestyleAdvice: 'Get 7-8 hours of sleep to allow your body to heal. Stay warm and avoid exposure to cold air or rain. Haldi milk at night can help boost immunity naturally.',
        generalAdvice:   ['Stay hydrated', 'Monitor symptoms closely', 'Consult a doctor if no improvement in 2 days'],
        whenToSeeDoctor: 'Seek medical attention if symptoms worsen or persist beyond 2-3 days.',
        disclaimer:      'This is AI-generated advice. Always consult a qualified doctor.',
      };
    }

    return NextResponse.json({ ...parsed, success: true });
  } catch (error: any) {
    console.error('[Symptoms API]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
