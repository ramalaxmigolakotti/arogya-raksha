import { NextRequest, NextResponse } from 'next/server';
import { getSarvamKeyManager } from '@/lib/sarvamKeyManager';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';

const SARVAM_STT_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
  mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN',
  or: 'od-IN', ml: 'ml-IN', en: 'en-IN', bho: 'hi-IN',
  ur: 'ur-IN', as: 'as-IN', kok: 'kok-IN',
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const rawLang = (formData.get('language') as string) || 'hi';
    const languageCode = SARVAM_STT_LANG_MAP[rawLang] || (rawLang.includes('-') ? rawLang : 'hi-IN');

    if (!audioFile) return NextResponse.json({ error: 'Audio file required' }, { status: 400 });

    const keyManager = getSarvamKeyManager();
    let responseData: any = null;
    let lastError = '';

    const buffer = Buffer.from(await audioFile.arrayBuffer());

    for (let i = 0; i < keyManager.keyCount; i++) {
      const apiKey = keyManager.getNextKey();
      try {
        const sarvamForm = new FormData();
        const fileExt = audioFile.type?.includes('webm') ? 'audio.webm' : (audioFile.name?.endsWith('.webm') ? 'audio.webm' : 'audio.wav');
        const blob = new Blob([buffer], { type: audioFile.type || 'audio/webm' });
        sarvamForm.append('file', blob, fileExt);
        sarvamForm.append('model', 'saaras:v3');
        sarvamForm.append('language_code', languageCode);
        sarvamForm.append('with_timestamps', 'false');

        const res = await fetch(SARVAM_STT_URL, {
          method: 'POST',
          headers: { 'api-subscription-key': apiKey },
          body: sarvamForm,
        });

        if (res.ok) {
          keyManager.reportSuccess(apiKey);
          responseData = await res.json();
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

    if (!responseData) {
      return NextResponse.json({ error: 'STT failed after key rotation', details: lastError }, { status: 502 });
    }

    return NextResponse.json({ transcript: responseData.transcript || '', success: true, languageCode });
  } catch (error: any) {
    console.error('[STT API Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
