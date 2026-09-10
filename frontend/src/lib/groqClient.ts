/**
 * groqClient.ts
 * Lightweight Groq API client for Next.js API routes (server-side only).
 *
 * Dedicated Groq Key assignment:
 *   GROQ_API_KEY_DOCTOR   → Ask AI Doctor / MediBot Agent
 *   GROQ_API_KEY_QUIZ     → Health Tracker Quiz
 *   GROQ_API_KEY_SCANNER  → Medicine Scanner
 *   GROQ_API_KEY_SYMPTOMS → Symptom Checker
 *   GROQ_API_KEY_REPORTS  → Report Analyzer
 *
 * Dynamic Models:
 *   - Complex clinical reasoning & deep report analysis: openai/gpt-oss-120b
 *   - Multilingual general consultation, tools & quiz:    qwen/qwen3.8-27b
 *   - Fast sub-second navigation & simple queries:       openai/gpt-oss-20b
 *   - Multimodal OCR & packaging vision:                 qwen/qwen3.8-27b
 */

const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';

export type GroqKeySlot = 'scanner' | 'symptoms' | 'doctor' | 'quiz' | 'reports';

const KEY_MAP: Record<GroqKeySlot, string> = {
  doctor:   process.env.GROQ_API_KEY_DOCTOR   || '',
  quiz:     process.env.GROQ_API_KEY_QUIZ     || '',
  scanner:  process.env.GROQ_API_KEY_SCANNER  || '',
  symptoms: process.env.GROQ_API_KEY_SYMPTOMS || '',
  reports:  process.env.GROQ_API_KEY_REPORTS  || '',
};

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

export interface GroqOptions {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: 'json_object' | 'text' };
  tools?: any[];
  tool_choice?: string | any;
}

/** Call Groq and return the full response object */
export async function callGroq(
  slot: GroqKeySlot,
  options: GroqOptions
): Promise<{ content: string; raw: any }> {
  const apiKey = KEY_MAP[slot] || KEY_MAP['doctor'];
  if (!apiKey) throw new Error(`No Groq API key configured for slot: ${slot}`);

  let res = await fetch(GROQ_BASE, {
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
      ...(options.tools && { tools: options.tools, tool_choice: options.tool_choice || 'auto' }),
    }),
  });

  // Multi-tier rate-limit failover:
  // 1. If Qwen hits OTPM limit -> try GPT-OSS 120B
  if (res.status === 429 && options.model.includes('qwen')) {
    console.warn(`[callGroq] ${options.model} rate-limited on slot ${slot}, auto-failing over to openai/gpt-oss-120b`);
    res = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'openai/gpt-oss-120b',
        messages:    options.messages,
        temperature: options.temperature ?? 0.4,
        max_tokens:  options.max_tokens  ?? 2048,
        ...(options.response_format && { response_format: options.response_format }),
        ...(options.tools && { tools: options.tools, tool_choice: options.tool_choice || 'auto' }),
      }),
    });
  }

  // 2. If 120B hits TPM limit -> try GPT-OSS 20B (fast, lightweight, separate token bucket)
  if (res.status === 429) {
    console.warn(`[callGroq] Rate-limited on slot ${slot}, auto-failing over to openai/gpt-oss-20b`);
    res = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       options.model || 'qwen/qwen3.8-27b',
        messages:    options.messages,
        temperature: options.temperature ?? 0.4,
        max_tokens:  options.max_tokens  ?? 1500,
        ...(options.response_format && { response_format: options.response_format }),
        ...(options.tools && { tools: options.tools, tool_choice: options.tool_choice || 'auto' }),
      }),
    });
  }

  // 3. If Groq rejects strict json_object validation (code: json_validate_failed), retry without response_format
  if (res.status === 400 && options.response_format) {
    console.warn(`[callGroq] JSON validation failed on slot ${slot}, retrying without response_format`);
    res = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       options.model,
        messages:    options.messages,
        temperature: options.temperature ?? 0.2,
        max_tokens:  options.max_tokens  ?? 1500,
      }),
    });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return { content, raw: data };
}

/** Parse JSON from Groq response — strips markdown fences, preambles, and extracts JSON cleanly */
export function parseGroqJSON<T = any>(content: string): T {
  if (!content) return {} as T;
  try {
    const clean = content.replace(/```json|```/gi, '').trim();
    return JSON.parse(clean) as T;
  } catch {
    // Extract first { ... } block
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(content.slice(firstBrace, lastBrace + 1)) as T;
      } catch {}
    }
    // Extract first [ ... ] block
    const firstBracket = content.indexOf('[');
    const lastBracket = content.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(content.slice(firstBracket, lastBracket + 1)) as T;
      } catch {}
    }
    throw new Error('Failed to parse JSON from model output');
  }
}

/** Stream response from Groq — returns a ReadableStream of SSE chunks */
export async function callGroqStream(
  slot: GroqKeySlot,
  options: GroqOptions
): Promise<Response> {
  const apiKey = KEY_MAP[slot] || KEY_MAP['doctor'];
  if (!apiKey) throw new Error(`No Groq API key configured for slot: ${slot}`);

  let res = await fetch(GROQ_BASE, {
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

  if (res.status === 429 && options.model.includes('qwen')) {
    console.warn(`[callGroqStream] ${options.model} rate-limited on slot ${slot}, streaming failover to openai/gpt-oss-120b`);
    res = await fetch(GROQ_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'openai/gpt-oss-120b',
        messages:    options.messages,
        temperature: options.temperature ?? 0.6,
        max_tokens:  options.max_tokens  ?? 512,
        stream:      true,
      }),
    });
  }

  return res;
}

// ─── Model constants ────────────────────────────────────────────────────────
export const GROQ_MODELS = {
  // Vision OCR & Medical Image Analysis (Qwen 3.8 27B Vision, OTPM cap: 1000, safe max_tokens: 650)
  VISION:            'qwen/qwen3.8-27b',
  // Fast low-latency for simple routing & greetings
  FAST:              'openai/gpt-oss-20b',
  // High-accuracy balanced model with Indian multilingual mastery
  BALANCED:          'qwen/qwen3.8-27b',
  // Deep clinical reasoning, complex differential diagnosis & lab reports (2000+ token capacity)
  REASONING_COMPLEX: 'openai/gpt-oss-120b',
  // Medical quiz generation
  QUIZ:              'qwen/qwen3.8-27b',

  // Backward compatibility aliases
  LLAMA_33_70B:      'openai/gpt-oss-120b',
  LLAMA_4_SCOUT:     'openai/gpt-oss-20b',
} as const;

/**
 * callGroqVision — passes a real base64 image to Qwen 3.8 27B Vision for OCR/identification.
 * Includes automatic multi-key failover across all 5 key slots and safe token capping.
 *
 * @param imageDataUrl  - full data URL: "data:image/jpeg;base64,/9j/..."
 * @param textPrompt    - instruction to the model
 * @param systemPrompt  - optional system message
 * @param slot          - primary key slot (scanner or reports)
 * @param maxTokens     - max output tokens (default 650 to stay strictly under Groq 1000 OTPM limit)
 */
export async function callGroqVision(
  imageDataUrl: string,
  textPrompt: string,
  systemPrompt?: string,
  slot: GroqKeySlot = 'scanner',
  maxTokens: number = 650
): Promise<{ content: string; raw: any }> {
  // Order of keys to try: primary slot first, then fallback across other slots
  const allSlots: GroqKeySlot[] = [slot, 'reports', 'scanner', 'doctor', 'symptoms', 'quiz'];
  const uniqueKeys = Array.from(
    new Set(allSlots.map((s) => KEY_MAP[s]).filter(Boolean))
  );

  if (uniqueKeys.length === 0) {
    throw new Error('No Groq API key configured for vision processing');
  }

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

  // Keep tokens safely under 700 to prevent OTPM (Output Tokens Per Minute) 1000 cap
  const safeTokens = Math.min(Math.max(200, maxTokens), 650);
  let lastError: any = null;

  for (let i = 0; i < uniqueKeys.length; i++) {
    const apiKey = uniqueKeys[i];
    try {
      const res = await fetch(GROQ_BASE, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model:       GROQ_MODELS.VISION,
          messages,
          temperature: 0.1,   // very low — accurate OCR
          max_tokens:  safeTokens,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        return { content, raw: data };
      }

      const errText = await res.text();
      console.warn(`[callGroqVision] Key slot #${i} returned status ${res.status}: ${errText.slice(0, 150)}`);

      // If OTPM rate limit hit on this key, continue to next key slot
      if (res.status === 429) {
        lastError = new Error(`Groq Vision rate limit (429): ${errText}`);
        continue;
      }

      lastError = new Error(`Groq Vision API error ${res.status}: ${errText}`);
    } catch (fetchErr: any) {
      console.warn(`[callGroqVision] Fetch failed on key #${i}:`, fetchErr.message);
      lastError = fetchErr;
    }
  }

  throw lastError || new Error('Groq Vision API failed across all available keys.');
}
