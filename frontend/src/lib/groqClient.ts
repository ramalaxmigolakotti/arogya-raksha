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
        model:       'openai/gpt-oss-20b',
        messages:    options.messages,
        temperature: options.temperature ?? 0.4,
        max_tokens:  options.max_tokens  ?? 1500,
        ...(options.response_format && { response_format: options.response_format }),
        ...(options.tools && { tools: options.tools, tool_choice: options.tool_choice || 'auto' }),
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
  // Vision OCR & Medical Image Analysis
  VISION:            'qwen/qwen3.8-27b',
  // Fast low-latency for simple routing & greetings
  FAST:              'openai/gpt-oss-20b',
  // High-accuracy balanced model with Indian multilingual mastery
  BALANCED:          'qwen/qwen3.8-27b',
  // Deep clinical reasoning, complex differential diagnosis & lab reports
  REASONING_COMPLEX: 'openai/gpt-oss-120b',
  // Medical quiz generation
  QUIZ:              'qwen/qwen3.8-27b',

  // Backward compatibility aliases
  LLAMA_33_70B:      'qwen/qwen3.8-27b',
  LLAMA_4_SCOUT:     'qwen/qwen3.8-27b',
} as const;

/**
 * callGroqVision — passes a real base64 image to Qwen 3.8 27B Vision for OCR/identification.
 *
 * @param imageDataUrl  - full data URL: "data:image/jpeg;base64,/9j/..."
 * @param textPrompt    - instruction to the model
 * @param systemPrompt  - optional system message
 * @param slot          - key slot (scanner or reports)
 */
export async function callGroqVision(
  imageDataUrl: string,
  textPrompt: string,
  systemPrompt?: string,
  slot: GroqKeySlot = 'scanner'
): Promise<{ content: string; raw: any }> {
  const apiKey = KEY_MAP[slot] || KEY_MAP['scanner'];
  if (!apiKey) throw new Error(`No Groq API key configured for ${slot} slot`);

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
      model:       GROQ_MODELS.VISION,
      messages,
      temperature: 0.1,   // very low — accurate OCR
      max_tokens:  1200,
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
