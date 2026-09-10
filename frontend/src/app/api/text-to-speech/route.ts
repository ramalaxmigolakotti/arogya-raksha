import { NextRequest, NextResponse } from 'next/server';

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

const SARVAM_LANG_CODES: Record<string, string> = {
  hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
  mr: 'mr-IN', bn: 'bn-IN', en: 'en-IN', bho: 'hi-IN',
};

export async function POST(req: NextRequest) {
  try {
    const { text, language } = await req.json();
    if (!text) return NextResponse.json({ error: 'Text is required' }, { status: 400 });

    const apiKey = process.env.SARVAM_API_KEY_1;
    if (!apiKey) return NextResponse.json({ error: 'TTS not configured' }, { status: 500 });

    const langCode = SARVAM_LANG_CODES[language || 'en'] || 'en-IN';

    const res = await fetch(SARVAM_TTS_URL, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: [text.slice(0, 500)],
        target_language_code: langCode,
        speaker: 'meera',
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: 'bulbul:v1',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'TTS failed', details: err }, { status: 502 });
    }

    const data = await res.json();
    const audioBase64 = data.audios?.[0] || '';
    return NextResponse.json({ audio: audioBase64, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
