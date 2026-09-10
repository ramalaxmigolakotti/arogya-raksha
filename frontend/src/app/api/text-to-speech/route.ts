import { NextRequest, NextResponse } from 'next/server';
import { getSarvamKeyManager } from '@/lib/sarvamKeyManager';

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

const SARVAM_TTS_LANG_CODES: Record<string, string> = {
  hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
  mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN',
  or: 'od-IN', ml: 'ml-IN', en: 'en-IN', bho: 'hi-IN',
  ur: 'ur-IN', as: 'as-IN', kok: 'kok-IN', mai: 'hi-IN',
};

export async function POST(req: NextRequest) {
  try {
    const { text, language } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Clean markdown, brackets, and emojis for smooth audio speech synthesis
    const cleanText = text
      .replace(/[\*\_#`~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .trim()
      .slice(0, 500);

    if (!cleanText) {
      return NextResponse.json({ audio: '', success: true });
    }

    const keyManager = getSarvamKeyManager();
    const langCode = SARVAM_TTS_LANG_CODES[language || 'en'] || (language?.includes('-') ? language : 'en-IN');

    let audioBase64 = '';
    let lastError = '';

    for (let i = 0; i < keyManager.keyCount; i++) {
      const apiKey = keyManager.getNextKey();
      try {
        const res = await fetch(SARVAM_TTS_URL, {
          method: 'POST',
          headers: {
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: [cleanText],
            target_language_code: langCode,
            speaker: 'priya',
            pitch: 0,
            pace: 1.05,
            loudness: 1.5,
            speech_sample_rate: 22050,
            enable_preprocessing: true,
            model: 'bulbul:v3',
          }),
        });

        if (res.ok) {
          keyManager.reportSuccess(apiKey);
          const data = await res.json();
          audioBase64 = data.audios?.[0] || '';
          break;
        }

        lastError = await res.text();
        if (res.status === 429) {
          keyManager.reportRateLimit(apiKey);
          continue;
        }
        keyManager.reportFailure(apiKey);
      } catch (err: any) {
        lastError = err.message;
        keyManager.reportFailure(apiKey);
      }
    }

    if (!audioBase64) {
      return NextResponse.json({ error: 'TTS synthesis failed', details: lastError }, { status: 502 });
    }

    return NextResponse.json({ audio: audioBase64, success: true, cleanText, languageCode: langCode });
  } catch (error: any) {
    console.error('[TTS API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
