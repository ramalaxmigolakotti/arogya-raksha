const Redis = require('ioredis');

// ── Redis Client ──
const redisUrl = process.env.REDIS_URL;

let redis = null;
let isConnected = false;

if (redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying after 5 attempts
      return Math.min(times * 200, 2000);
    },
    connectTimeout: 10000,
    lazyConnect: false,
  });

  redis.on('connect', () => {
    isConnected = true;
    console.log('✅ Connected to Redis Cloud');
  });

  redis.on('error', (err) => {
    console.warn('⚠️  Redis error:', err.message);
    isConnected = false;
  });

  redis.on('close', () => {
    isConnected = false;
  });
} else {
  console.warn('⚠️  REDIS_URL not set — caching disabled');
}

// ── Cache helpers ──

/**
 * Get a cached value by key. Returns parsed JSON or null.
 */
async function cacheGet(key) {
  if (!redis || !isConnected) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('Redis GET error:', err.message);
    return null;
  }
}

/**
 * Set a cached value with optional TTL (seconds). Default 5 minutes.
 */
async function cacheSet(key, value, ttlSeconds = 300) {
  if (!redis || !isConnected) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.warn('Redis SET error:', err.message);
  }
}

/**
 * Delete a cached key or keys matching a pattern.
 */
async function cacheDel(pattern) {
  if (!redis || !isConnected) return;
  try {
    if (pattern.includes('*')) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    } else {
      await redis.del(pattern);
    }
  } catch (err) {
    console.warn('Redis DEL error:', err.message);
  }
}

/**
 * Express middleware — caches GET responses.
 * Usage: router.get('/path', cacheMiddleware(60), handler)
 */
function cacheMiddleware(ttlSeconds = 300) {
  return async (req, res, next) => {
    if (!redis || !isConnected) return next();

    const key = `cache:${req.originalUrl}`;
    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch { /* fall through */ }

    // Intercept res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redis.set(key, JSON.stringify(body), 'EX', ttlSeconds).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Redis-based rate limiter.
 * @param {number} windowMs - Window in milliseconds
 * @param {number} maxRequests - Max requests per window
 */
function redisRateLimit(windowMs = 60000, maxRequests = 30) {
  return async (req, res, next) => {
    if (!redis || !isConnected) return next(); // fallback to no limiting

    const ip = req.ip || req.connection.remoteAddress;
    const key = `ratelimit:${ip}:${Math.floor(Date.now() / windowMs)}`;

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));

      if (current > maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please slow down.',
        });
      }
    } catch { /* fall through on error */ }

    next();
  };
}

/**
 * Health check — returns connection status.
 */
async function redisHealth() {
  if (!redis || !isConnected) return { status: 'disconnected' };
  try {
    const pong = await redis.ping();
    return { status: 'connected', ping: pong };
  } catch {
    return { status: 'error' };
  }
}

module.exports = {
  redis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheMiddleware,
  redisRateLimit,
  redisHealth,
};
