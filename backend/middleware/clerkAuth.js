const { clerkClient, verifyToken } = require('@clerk/express');

/**
 * Clerk Auth Middleware
 * 
 * Verifies the Clerk session token from the Authorization header,
 * fetches the Clerk user, and attaches a user-like object to req.user
 * so downstream routes work without changes.
 */
const clerkAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    // Verify the Clerk session token
    let payload;
    try {
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch (verifyErr) {
      console.error('Clerk token verification failed:', verifyErr.message);
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    const clerkUserId = payload.sub;
    if (!clerkUserId) {
      return res.status(401).json({ success: false, message: 'Invalid token payload.' });
    }

    // Fetch Clerk user details
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(clerkUserId);
    } catch (fetchErr) {
      console.error('Failed to fetch Clerk user:', fetchErr.message);
      return res.status(401).json({ success: false, message: 'Could not fetch user details.' });
    }

    // Build a user object compatible with existing route handlers
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'User';
    const role = clerkUser.publicMetadata?.role || 'patient';

    req.user = {
      id: clerkUserId,
      clerk_id: clerkUserId,
      name,
      email,
      role,
      avatar: clerkUser.imageUrl || null,
    };
    req.userId = clerkUserId;

    next();
  } catch (error) {
    console.error('Clerk auth middleware error:', error);
    res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
};

module.exports = { clerkAuth };

