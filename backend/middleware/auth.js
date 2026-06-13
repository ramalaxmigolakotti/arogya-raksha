const jwt = require('jsonwebtoken');
const { verifyToken, clerkClient } = require('@clerk/express');
const User = require('../models/User');

// In-memory cache for Clerk user lookups — avoids hitting Clerk API on every request
const clerkUserCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedClerkUser(clerkUserId) {
  const cached = clerkUserCache.get(clerkUserId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.user;
  }
  clerkUserCache.delete(clerkUserId);
  return null;
}

function setCachedClerkUser(clerkUserId, user) {
  // Prevent unbounded cache growth
  if (clerkUserCache.size > 500) {
    const oldest = clerkUserCache.keys().next().value;
    clerkUserCache.delete(oldest);
  }
  clerkUserCache.set(clerkUserId, { user, timestamp: Date.now() });
}

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    // Strategy 1: Try Clerk token verification first (primary auth flow)
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const clerkUserId = payload.sub;
      if (clerkUserId) {
        // Check cache first
        let userObj = getCachedClerkUser(clerkUserId);
        if (!userObj) {
          // Fetch from Clerk API and cache
          const clerkUser = await clerkClient.users.getUser(clerkUserId);
          const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
          const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User';
          const role = clerkUser.publicMetadata?.role || 'patient';
          userObj = {
            id: clerkUserId,
            clerk_id: clerkUserId,
            name,
            email,
            role,
            avatar: clerkUser.imageUrl || null,
          };
          setCachedClerkUser(clerkUserId, userObj);
        }

        req.user = userObj;
        req.userId = clerkUserId;
        return next();
      }
    } catch {
      // Clerk verification failed — fall through to JWT
    }

    // Strategy 2: Fall back to legacy JWT verification
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    next();
  };
};

module.exports = { auth, authorize };
