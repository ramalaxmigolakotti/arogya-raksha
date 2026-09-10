/**
 * Lightweight in-memory + sessionStorage API cache.
 * Eliminates redundant re-fetches when navigating back to a page.
 */

const MEM_CACHE = new Map<string, { data: unknown; ts: number }>();

/**
 * Fetch with stale-while-revalidate caching.
 * @param url     Full URL to fetch
 * @param options RequestInit options (headers etc.)
 * @param ttlMs   How long the cache is considered fresh (default 30s)
 */
export async function cachedFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
  ttlMs = 30_000
): Promise<T> {
  const key = url + JSON.stringify(options.headers || {});
  const now = Date.now();

  // 1. Memory hit (fastest)
  const mem = MEM_CACHE.get(key);
  if (mem && now - mem.ts < ttlMs) {
    return mem.data as T;
  }

  // 2. sessionStorage hit (survives re-renders, cleared on tab close)
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const { data, ts } = JSON.parse(stored);
      if (now - ts < ttlMs) {
        MEM_CACHE.set(key, { data, ts });
        return data as T;
      }
    }
  } catch { /* sessionStorage unavailable (SSR) */ }

  // 3. Network fetch
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json() as T;

  // Store
  const entry = { data, ts: now };
  MEM_CACHE.set(key, entry);
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch { /* storage quota */ }

  return data;
}

/** Manually bust the cache for a URL prefix */
export function bustCache(prefix: string) {
  for (const key of MEM_CACHE.keys()) {
    if (key.startsWith(prefix)) MEM_CACHE.delete(key);
  }
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefix)) sessionStorage.removeItem(k);
    }
  } catch { /* noop */ }
}
