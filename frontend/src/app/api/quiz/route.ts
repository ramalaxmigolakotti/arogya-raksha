import { NextRequest, NextResponse } from 'next/server';
import { getSarvamKeyManager } from '@/lib/sarvamKeyManager';

const SARVAM_API_URL = 'https://api.sarvam.ai/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { topic, language } = await req.json();

    if (!topic) return NextResponse.json({ error: 'Topic is required.' }, { status: 400 });

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)',
      kn: 'Kannada (ಕನ್ನಡ)', mr: 'Marathi (मराठी)', bn: 'Bengali (বাংলা)', bho: 'Bhojpuri (भोजपुरी)',
      gu: 'Gujarati (ગુજરાતી)', pa: 'Punjabi (ਪੰਜਾਬੀ)', or: 'Odia (ଓଡ଼ିଆ)', as: 'Assamese (অসমীয়া)',
      ur: 'Urdu (اردو)', ml: 'Malayalam (മലയാളം)', mai: 'Maithili (मैथिली)', sat: 'Santali (ᱥᱟᱱᱛﺎᱲᱤ)',
      kok: 'Konkani (कोंकणी)', doi: 'Dogri (डोगरी)', ks: 'Kashmiri (کٲشُر)', mni: 'Manipuri (মেইতেই)',
      ne: 'Nepali (नेपाली)', sd: 'Sindhi (سنڌي)', sa: 'Sanskrit (संस्कृतम्)',
    };
    const langName = LANG_NAMES[language || 'en'] || 'English';
    const langInstruction = language && language !== 'en'
      ? `\n\nCRITICAL: Write ALL questions, options and explanations ENTIRELY in ${langName} using native script.` : '';

    const prompt = `Generate a health quiz about "${topic}" for Indian users of Arogya Raksha health app.

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "categoryName": "<topic name>",
  "categoryIcon": "<single relevant emoji>",
  "questions": [
    {
      "question": "<clear health question about ${topic}>",
      "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
      "correctAnswer": <0|1|2|3>,
      "explanation": "<brief explanation of why the answer is correct, with health tip>"
    }
  ]
}

Rules:
- Generate exactly 10 questions
- Questions must be educational and India-relevant
- Mix easy, medium and hard questions
- correctAnswer is the index (0=A, 1=B, 2=C, 3=D) of the correct option
- Explanations should be informative (1-2 sentences)
- Cover different aspects of ${topic}${langInstruction}`;

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
              { role: 'system', content: 'You are a health education AI. Generate quiz JSON only. No markdown.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 3000,
          }),
        });

        if (res.ok) { manager.reportSuccess(apiKey); response = await res.json(); break; }
        if (res.status === 429) { manager.reportRateLimit(apiKey); continue; }
        manager.reportFailure(apiKey);
      } catch { manager.reportFailure(apiKey); }
    }

    if (!response) return NextResponse.json({ error: 'Quiz generation unavailable. Please try again.' }, { status: 502 });

    const content = response.choices?.[0]?.message?.content || '';

    let parsed: any;
    try {
      const clean = content.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'Failed to parse quiz. Please try again.' }, { status: 500 });
    }

    // Validate structure
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return NextResponse.json({ error: 'Invalid quiz format. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      categoryName: parsed.categoryName || topic,
      categoryIcon: parsed.categoryIcon || '🧠',
      questions: parsed.questions,
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
