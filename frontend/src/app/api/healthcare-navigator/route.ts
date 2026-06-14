import { NextRequest, NextResponse } from 'next/server';
import { getSarvamKeyManager } from '@/lib/sarvamKeyManager';

const SARVAM_API_URL = 'https://api.sarvam.ai/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symptoms, location, language, urgency } = body;

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil',
      kn: 'Kannada', mr: 'Marathi', bn: 'Bengali', bho: 'Bhojpuri',
    };
    const langName = LANG_NAMES[language || 'en'] || 'English';
    const langInstruction = language && language !== 'en'
      ? `\n\nCRITICAL: Respond ENTIRELY in ${langName}.` : '';

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
              {
                role: 'system',
                content: `You are a Healthcare Navigator AI for Arogya Raksha — an intelligent guide for India's tiered healthcare system.${langInstruction}

Your role: Guide patients to the RIGHT level of care based on their symptoms and urgency.

Healthcare Tiers (India):
1. Sub-Centre (SC) — Basic first aid, immunization
2. Primary Health Centre (PHC) — OPD, basic treatments, maternal care
3. Community Health Centre (CHC) — 30-bed hospital, specialist visits
4. District Hospital — Full specialist care, surgery
5. Medical College Hospital — Tertiary care, complex cases
6. Private Specialists — If public system unavailable

Provide:
1. Recommended care tier and why
2. What to do RIGHT NOW (immediate steps)
3. Red flag symptoms requiring emergency
4. Nearest facility type to seek
5. What to bring/prepare
6. Estimated wait times at each level`,
              },
              {
                role: 'user',
                content: `Patient Symptoms: ${symptoms || 'Not specified'}\nLocation: ${location || 'India'}\nUrgency Level: ${urgency || 'moderate'}\n\nGuide me to the appropriate healthcare facility.`,
              },
            ],
            temperature: 0.5,
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

    if (!response) return NextResponse.json({ error: 'Navigator unavailable.' }, { status: 502 });
    const content = response.choices?.[0]?.message?.content || '';
    return NextResponse.json({ guidance: content, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
