/**
 * groqClient.ts
 * Lightweight Groq API client for Next.js API routes (server-side only).
 *
 * Key assignment:
 *   GROQ_API_KEY_SCANNER  → Medicine Scanner (Llama 4 Scout VISION + Llama 3.3 70B)
 *   GROQ_API_KEY_SYMPTOMS → Symptom Checker  (Llama 3.3 70B)
 *   GROQ_API_KEY_DOCTOR   → AI Voice Doctor   (Llama 3.3 70B + Sarvam STT/TTS)
 *
 * Vision support:
 *   Llama 4 Scout on Groq supports multimodal image input via image_url content type.
 *   Use callGroqVision() to pass actual base64 images for real OCR/identification.
 */

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';

export type GroqKeySlot = 'scanner' | 'symptoms' | 'doctor';

const KEY_MAP: Record<GroqKeySlot, string> = {
  scanner:  process.env.GROQ_API_KEY_SCANNER  || '',
  symptoms: process.env.GROQ_API_KEY_SYMPTOMS || '',
  doctor:   process.env.GROQ_API_KEY_DOCTOR   || '',
};

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqOptions {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' | 'text' };
}

/** Call Groq and return the full response object */
export async function callGroq(
  slot: GroqKeySlot,
  options: GroqOptions
): Promise<{ content: string; raw: any }> {
  const apiKey = KEY_MAP[slot];
  if (!apiKey) throw new Error(`No Groq API key configured for slot: ${slot}`);

  const res = await fetch(GROQ_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       options.model,
      messages:    options.messages,
      temperature: options.temperature ?? 0.4,
      max_tokens:  options.max_tokens  ?? 2048,
      ...(options.response_format && { response_format: options.response_format }),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return { content, raw: data };
}

/** Parse JSON from Groq response — strips markdown fences if present */
export function parseGroqJSON<T = any>(content: string): T {
  const clean = content.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as T;
}

/** Stream response from Groq — returns a ReadableStream of SSE chunks */
export async function callGroqStream(
  slot: GroqKeySlot,
  options: GroqOptions
): Promise<Response> {
  const apiKey = KEY_MAP[slot];
  if (!apiKey) throw new Error(`No Groq API key configured for slot: ${slot}`);

  return fetch(GROQ_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       options.model,
      messages:    options.messages,
      temperature: options.temperature ?? 0.6,
      max_tokens:  options.max_tokens  ?? 512,
      stream:      true,
    }),
  });
}

// ─── Model constants ────────────────────────────────────────────────────────
export const GROQ_MODELS = {
  LLAMA_4_SCOUT: 'meta-llama/llama-4-scout-17b-16e-instruct',
  LLAMA_33_70B:  'llama-3.3-70b-versatile',
} as const;

/**
 * callGroqVision — passes a real base64 image to Llama 4 Scout for OCR/identification.
 * The image MUST be passed as a proper multimodal content array (not text).
 *
 * @param imageDataUrl  - full data URL: "data:image/jpeg;base64,/9j/..."
 * @param textPrompt    - instruction to the model
 * @param systemPrompt  - optional system message
 */
export async function callGroqVision(
  imageDataUrl: string,
  textPrompt: string,
  systemPrompt?: string
): Promise<{ content: string; raw: any }> {
  const apiKey = KEY_MAP['scanner'];
  if (!apiKey) throw new Error('No Groq API key configured for scanner slot');

  const messages: any[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Multimodal user message — image + text together
  messages.push({
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: { url: imageDataUrl },
      },
      {
        type: 'text',
        text: textPrompt,
      },
    ],
  });

  const res = await fetch(GROQ_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       GROQ_MODELS.LLAMA_4_SCOUT,
      messages,
      temperature: 0.1,   // very low — we want factual OCR, not creativity
      max_tokens:  600,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq Vision API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return { content, raw: data };
}
