import { NextRequest } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY_DOCTOR || '';
const MODEL = 'qwen/qwen3.8-27b';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userName, language } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'Groq API Key for Doctor is not configured.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)',
      kn: 'Kannada (ಕನ್ನಡ)', mr: 'Marathi (मराठी)', bn: 'Bengali (বাংলা)', bho: 'Bhojpuri (भोजपुरी)',
      gu: 'Gujarati (ગુજરાતી)', pa: 'Punjabi (ਪੰਜਾਬੀ)', or: 'Odia (ଓଡ଼ିଆ)', as: 'Assamese (অসমীয়া)',
      ur: 'Urdu (اردو)', ml: 'Malayalam (മലയാളം)', mai: 'Maithili (मैथिली)', sat: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)',
      kok: 'Konkani (कोंकणी)', doi: 'Dogri (डोगरी)', ks: 'Kashmiri (کٲشُر)', mni: 'Manipuri (মেইতেই)',
      ne: 'Nepali (नेपाली)', sd: 'Sindhi (سنڌي)', sa: 'Sanskrit (संस्कृतम्)',
    };
    const langName = LANG_NAMES[language || 'en'] || 'English';
    const isNonEnglish = language && language !== 'en';

    const langInstruction = isNonEnglish
      ? `⚠️ LANGUAGE RULE — HIGHEST PRIORITY ⚠️
You MUST write your ENTIRE response in ${langName} only.
Do NOT use English at all in your response.
Even if the user writes to you in English, reply in ${langName} using native script.
This applies to all greetings, clinical terms, tips, and disclaimers.\n\n`
      : '';

    const patientName = userName || 'User';
    const systemMessage = {
      role: 'system',
      content: `${langInstruction}You are "Arogya AI", an expert personal healthcare assistant and AI doctor for the Indian healthcare platform "Arogya Raksha".

Your capabilities:
- Answer medical, wellness, and health questions accurately and with deep empathy
- Analyze symptoms and suggest probable conditions with severity levels
- Suggest safe Indian OTC medicines, appropriate home remedies (Ayush / Indian remedies where suitable), and diet tips
- Explain medical terms, lab reports, and vitals in simple terms
- Provide clear red flags indicating when to immediately consult an in-person doctor
- Always maintain warmth and medical professionalism

Important Rules:
- Always recommend consulting a qualified doctor for definitive diagnosis and severe symptoms
- Never diagnose definitively — provide possibilities and clear guidance
- Consider Indian healthcare context (common ailments, local diet like khichdi/haldi milk, Indian OTC brands)
- Format with markdown bullets and bold headers for clarity and scannability
- Conclude with a helpful medical disclaimer.

You are speaking with patient ${patientName}. Address them warmly.`,
    };

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [systemMessage, ...messages],
        temperature: 0.6,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[Ask AI Doctor API Error]', groqRes.status, errText);
      return new Response(JSON.stringify({ error: `Groq AI Error (${groqRes.status}): ${errText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = groqRes.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
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
                } catch {
                  // skip unparseable SSE chunk
                }
              }
            }
          }
        } catch (streamErr) {
          console.error('[Ask AI Doctor Stream Error]', streamErr);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('[Ask AI Doctor Error]', error);
    return new Response(JSON.stringify({ error: error.message || 'Something went wrong.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
