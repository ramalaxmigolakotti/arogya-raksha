// ============================================================
// GROQ API KEY ROTATION MANAGER
// Distributes load across multiple API keys with automatic
// fallback on rate limit errors (429) or failures.
// ============================================================

interface KeyState {
  key: string;
  failCount: number;
  lastFailTime: number;
  rateLimitedUntil: number;
}

class GroqKeyManager {
  private keys: KeyState[] = [];
  private currentIndex: number = 0;

  constructor() {
    // Load all 4 keys from environment
    const keyEnvVars = [
      'GROQ_API_KEY_1',
      'GROQ_API_KEY_2',
      'GROQ_API_KEY_3',
      'GROQ_API_KEY_4',
    ];

    for (const envVar of keyEnvVars) {
      const key = process.env[envVar];
      if (key && key.length > 10 && !key.includes('your-')) {
        this.keys.push({
          key,
          failCount: 0,
          lastFailTime: 0,
          rateLimitedUntil: 0,
        });
      }
    }

    // Fallback: also check the old env vars for backward compatibility
    const legacyVars = [
      'GROQ_API_KEY',
      'GROQ_API_KEY_ASSISTANT',
      'GROQ_API_KEY_EXPLAIN',
      'GROQ_API_KEY_IMAGE',
      'GROQ_API_KEY_QUIZ',
    ];

    for (const envVar of legacyVars) {
      const key = process.env[envVar];
      if (key && key.length > 10 && !key.includes('your-')) {
        // Don't add duplicates
        if (!this.keys.some(k => k.key === key)) {
          this.keys.push({
            key,
            failCount: 0,
            lastFailTime: 0,
            rateLimitedUntil: 0,
          });
        }
      }
    }

    if (this.keys.length === 0) {
      console.error('⚠️ No Groq API keys configured! Add GROQ_API_KEY_1 through GROQ_API_KEY_4 to .env.local');
    } else {
      console.log(`✅ Groq Key Manager initialized with ${this.keys.length} API key(s)`);
    }
  }

  /**
   * Get the next available API key using round-robin with rate-limit awareness
   */
  getNextKey(): string {
    if (this.keys.length === 0) {
      throw new Error('No Groq API keys configured. Add GROQ_API_KEY_1 to GROQ_API_KEY_4 in .env.local');
    }

    const now = Date.now();
    const startIndex = this.currentIndex;
    let attempts = 0;

    // Try to find a non-rate-limited key
    while (attempts < this.keys.length) {
      const keyState = this.keys[this.currentIndex];

      // If this key isn't rate-limited, use it
      if (now >= keyState.rateLimitedUntil) {
        const key = keyState.key;
        // Advance index for next call (round-robin)
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        return key;
      }

      // Move to next key
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      attempts++;
    }

    // All keys are rate-limited — return the one that will be unblocked soonest
    let soonestIdx = 0;
    let soonestTime = Infinity;
    for (let i = 0; i < this.keys.length; i++) {
      if (this.keys[i].rateLimitedUntil < soonestTime) {
        soonestTime = this.keys[i].rateLimitedUntil;
        soonestIdx = i;
      }
    }

    this.currentIndex = (soonestIdx + 1) % this.keys.length;
    return this.keys[soonestIdx].key;
  }

  /**
   * Get all available keys for retry operations
   */
  getAllKeys(): string[] {
    const now = Date.now();
    // Sort: non-rate-limited keys first, then by soonest unblock
    return [...this.keys]
      .sort((a, b) => {
        const aBlocked = now < a.rateLimitedUntil;
        const bBlocked = now < b.rateLimitedUntil;
        if (aBlocked && !bBlocked) return 1;
        if (!aBlocked && bBlocked) return -1;
        return a.failCount - b.failCount;
      })
      .map(k => k.key);
  }

  /**
   * Report that a key was rate-limited (429 error)
   */
  reportRateLimit(key: string, retryAfterMs: number = 60000) {
    const keyState = this.keys.find(k => k.key === key);
    if (keyState) {
      keyState.rateLimitedUntil = Date.now() + retryAfterMs;
      keyState.failCount++;
      keyState.lastFailTime = Date.now();
      console.warn(`🔄 Groq key ${key.slice(0, 12)}... rate-limited for ${retryAfterMs / 1000}s. Rotating to next key.`);
    }
  }

  /**
   * Report a general failure for a key
   */
  reportFailure(key: string) {
    const keyState = this.keys.find(k => k.key === key);
    if (keyState) {
      keyState.failCount++;
      keyState.lastFailTime = Date.now();
    }
  }

  /**
   * Report success — reset fail count
   */
  reportSuccess(key: string) {
    const keyState = this.keys.find(k => k.key === key);
    if (keyState) {
      keyState.failCount = 0;
    }
  }

  /**
   * Get the total number of configured keys
   */
  get keyCount(): number {
    return this.keys.length;
  }
}

// Singleton instance
let _instance: GroqKeyManager | null = null;

export function getGroqKeyManager(): GroqKeyManager {
  if (!_instance) {
    _instance = new GroqKeyManager();
  }
  return _instance;
}

/**
 * Helper: Make a Groq API call with automatic key rotation and retry.
 * Uses fetch-based approach (for route handlers that use raw fetch).
 */
export async function groqFetchWithRetry(
  url: string,
  body: object,
  options?: { maxRetries?: number }
): Promise<Response> {
  const manager = getGroqKeyManager();
  const maxRetries = options?.maxRetries ?? manager.keyCount;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = manager.getNextKey();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        manager.reportSuccess(apiKey);
        return response;
      }

      if (response.status === 429) {
        // Rate limited — parse retry-after header if available
        const retryAfter = response.headers.get('retry-after');
        const retryMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        manager.reportRateLimit(apiKey, retryMs);
        console.warn(`⏳ Key ${apiKey.slice(0, 12)}... rate-limited (attempt ${attempt + 1}/${maxRetries}). Trying next key...`);
        continue; // Try next key
      }

      if (response.status === 401 || response.status === 403) {
        // Invalid key — mark it as failed for longer
        manager.reportRateLimit(apiKey, 300000); // 5 minutes
        console.error(`❌ Key ${apiKey.slice(0, 12)}... is invalid (${response.status}). Trying next key...`);
        continue;
      }

      // Other error — return the response as-is (let caller handle)
      manager.reportFailure(apiKey);
      return response;
    } catch (error: any) {
      manager.reportFailure(apiKey);
      lastError = error;
      console.error(`❌ Request failed with key ${apiKey.slice(0, 12)}...: ${error.message}. Trying next key...`);
    }
  }

  throw lastError || new Error('All Groq API keys exhausted. Please try again later.');
}

export default GroqKeyManager;
