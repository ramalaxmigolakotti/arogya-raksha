import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// All routes are PUBLIC — no login required to access the app
// Users can optionally sign in for personalized features
export default clerkMiddleware(async (auth, req) => {
  // Never block any route — just pass through
  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
