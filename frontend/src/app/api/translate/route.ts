import { NextRequest, NextResponse } from 'next/server';

const SARVAM_TRANSLATE_URL = 'https://api.sarvam.ai/translate';

const LANG_CODES: Record<string, string> = {
  hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
  mr: 'mr-IN', bn: 'bn-IN', en: 'en-IN', bho: 'hi-IN',
};

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLang, targetLang } = await req.json();
    if (!text || !targetLang) {
      return NextResponse.json({ error: 'text and targetLang are required' }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY_1;
    if (!apiKey) return NextResponse.json({ error: 'Translation not configured' }, { status: 500 });

    const source = LANG_CODES[sourceLang || 'en'] || 'en-IN';
    const target = LANG_CODES[targetLang] || 'hi-IN';

    if (source === target) return NextResponse.json({ translatedText: text, success: true });

    const res = await fetch(SARVAM_TRANSLATE_URL, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: text,
        source_language_code: source,
        target_language_code: target,
        speaker_gender: 'Female',
        mode: 'formal',
        model: 'mayura:v1',
        enable_preprocessing: false,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Translation failed', details: err }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ translatedText: data.translated_text || text, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
