import { NextRequest, NextResponse } from 'next/server';

const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'hi-IN';

    if (!audioFile) return NextResponse.json({ error: 'Audio file required' }, { status: 400 });

    const apiKey = process.env.SARVAM_API_KEY_1;
    if (!apiKey) return NextResponse.json({ error: 'STT not configured' }, { status: 500 });

    const sarvamForm = new FormData();
    sarvamForm.append('file', audioFile, 'audio.wav');
    sarvamForm.append('model', 'saarika:v2');
    sarvamForm.append('language_code', language);
    sarvamForm.append('with_timestamps', 'false');

    const res = await fetch(SARVAM_STT_URL, {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body: sarvamForm,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'STT failed', details: err }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ transcript: data.transcript || '', success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
