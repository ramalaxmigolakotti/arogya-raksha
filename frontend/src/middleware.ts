import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ONLY these routes need auth — everything else passes through instantly
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip auth check entirely for non-dashboard routes (fast path)
  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }
  // Only protect dashboard routes
  await auth.protect();
});

export const config = {
  // ONLY run middleware on dashboard routes — skip everything else for speed
  matcher: [
    '/',
    '/dashboard/:path*',
    '/sign-in/:path*',
    '/sign-up/:path*',
  ],
};
