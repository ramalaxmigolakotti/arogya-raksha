import { NextRequest, NextResponse } from 'next/server';
import { callGroq, parseGroqJSON, GROQ_MODELS } from '@/lib/groqClient';

export async function POST(req: NextRequest) {
  try {
    const { topic, language } = await req.json();

    if (!topic) return NextResponse.json({ error: 'Topic is required.' }, { status: 400 });

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)',
      kn: 'Kannada (ಕನ್ನಡ)', mr: 'Marathi (मराठी)', bn: 'Bengali (বাংলা)', bho: 'Bhojpuri (भोजपुरी)',
      gu: 'Gujarati (ગુજરાતી)', pa: 'Punjabi (ਪੰਜਾਬੀ)', or: 'Odia (ଓଡ଼ିଆ)', as: 'Assamese (অসমীয়া)',
      ur: 'Urdu (اردو)', ml: 'Malayalam (മലയാളം)', mai: 'Maithili (मैथिली)', sat: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)',
      kok: 'Konkani (कोंकणी)', doi: 'Dogri (डोगरी)', ks: 'Kashmiri (کٲشُر)', mni: 'Manipuri (মেইতেই)',
      ne: 'Nepali (नेपाली)', sd: 'Sindhi (سنڌي)', sa: 'Sanskrit (संस्कृतम्)',
    };
    const langName = LANG_NAMES[language || 'en'] || 'English';
    const langInstruction = language && language !== 'en'
      ? `\n\nCRITICAL: Write ALL questions, options and explanations ENTIRELY in ${langName} using native script.` : '';

    const prompt = `Generate a health quiz about "${topic}" for Indian users of Arogya Raksha health app.

Respond ONLY with valid JSON:
{
  "categoryName": "${topic}",
  "categoryIcon": "🩺",
  "questions": [
    {
      "question": "<clear health question about ${topic}>",
      "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"],
      "correctAnswer": 0,
      "explanation": "<brief explanation why the answer is correct with health tip>"
    }
  ]
}

Rules:
- Generate 5 to 7 high-quality questions
- Questions must be educational and India-relevant
- Mix easy, medium and hard questions
- correctAnswer is 0-indexed number (0, 1, 2, or 3)
- Explanations should be informative (1-2 sentences)
- Cover different aspects of ${topic}${langInstruction}`;

    let content = '';

    try {
      const res = await callGroq('quiz', {
        model: GROQ_MODELS.QUIZ,
        messages: [
          { role: 'system', content: 'You are an expert health education AI. Respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 1600,
        response_format: { type: 'json_object' }
      });
      content = res.content;
    } catch (groqErr: any) {
      if (groqErr.message?.includes('429') || groqErr.message?.includes('rate_limit') || groqErr.message?.includes('OTPM')) {
        console.warn('[Quiz API] Primary model rate-limited, switching to high-throughput secondary model (openai/gpt-oss-20b)');
        const fallbackRes = await callGroq('quiz', {
          model: 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: 'You are an expert health education AI. Respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 1600,
          response_format: { type: 'json_object' }
        });
        content = fallbackRes.content;
      } else {
        throw groqErr;
      }
    }

    const parsed = parseGroqJSON(content);

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
    console.error('[Quiz API Error]', error.message);
    return NextResponse.json({ error: error.message || 'Failed to generate quiz' }, { status: 500 });
  }
}
