import { NextRequest, NextResponse } from 'next/server';
import { callGroqStream, GROQ_MODELS } from '@/lib/groqClient';
import { getSarvamKeyManager } from '@/lib/sarvamKeyManager';

/**
 * AI Doctor Voice Agent
 *
 * Flow:
 *   Patient speaks ANY Indian language
 *       ↓
 *   Sarvam AI  (Speech-to-Text)         ← handled by /api/speech-to-text
 *       ↓
 *   Llama 3.3 70B via Groq Key 3        ← THIS ROUTE
 *   (AI Doctor: diagnosis + severity + hospital + medicine info)
 *       ↓
 *   Sarvam AI  (Voice Reply / TTS)      ← handled by /api/text-to-speech
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, language, agentContext, patientInfo } = body;

    if (!messages?.length) {
      return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
    }

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil',
      kn: 'Kannada', mr: 'Marathi', bn: 'Bengali', bho: 'Bhojpuri',
      gu: 'Gujarati', pa: 'Punjabi', or: 'Odia', ml: 'Malayalam',
      as: 'Assamese', ur: 'Urdu',
    };
    const langName = LANG_NAMES[language || 'en'] || 'English';
    const langInstruction = language && language !== 'en'
      ? `\n\nCRITICAL LANGUAGE INSTRUCTION: You MUST respond ENTIRELY in ${langName}. Every word must be in ${langName} script.`
      : '';

    const systemPrompt = `You are Dr. Arogya — an intelligent AI doctor voice assistant for Arogya Raksha, India's healthcare platform.${langInstruction}

${agentContext ? `Context: ${agentContext}` : ''}
${patientInfo ? `Patient Info: ${patientInfo}` : ''}

Your role is to:
1. 🩺 ASSESS SYMPTOMS — Listen carefully and identify possible conditions
2. ⚠️  SEVERITY — Classify as Mild / Moderate / Severe / Emergency
3. 🏥 HOSPITAL RECOMMENDATION — Suggest when to visit which type (PHC, District Hospital, Emergency)
4. 💊 MEDICINE INFORMATION — Suggest safe OTC medicines with dosage (Indian brands)
5. 🥗 WELLNESS ADVICE — Diet, rest, home remedies relevant to India

RESPONSE FORMAT (keep responses SHORT — 2-4 sentences — they will be spoken aloud):
- Be warm, empathetic, and clear
- Mention severity clearly (e.g., "This seems mild and can be managed at home")
- Always end with a safety disclaimer for serious symptoms
- Use simple language a rural Indian patient can understand
- For EMERGENCY situations, immediately say "Please call 108 now"`;

    // Stream from Groq Llama 3.3 70B using Doctor key
    const groqRes = await callGroqStream('doctor', {
      model:       GROQ_MODELS.LLAMA_33_70B,
      messages:    [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.6,
      max_tokens:  400,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[Voice Agent] Groq error:', errText);
      return NextResponse.json({ error: 'AI doctor unavailable. Please try again.' }, { status: 502 });
    }

    // Pipe the SSE stream back to the client
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqRes.body?.getReader();
        if (!reader) { controller.close(); return; }
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.trim());
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  break;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch { /* skip malformed */ }
              }
            }
          }
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Voice Agent]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
