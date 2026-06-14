'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import api from '@/lib/api';

/**
 * ClerkApiProvider
 * 
 * Bridges Clerk authentication with the backend API client.
 * Must be rendered inside <ClerkProvider> (already in root layout).
 * Registers Clerk's getToken() as the dynamic token getter on the API client
 * so every backend request automatically includes a valid session token.
 */
export default function ClerkApiProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to fully initialize

    // Register Clerk's getToken as the API client's token source
    api.setTokenGetter(async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.warn('[ClerkApiProvider] getToken() returned null — user may not be signed in');
        }
        return token;
      } catch (err) {
        console.error('[ClerkApiProvider] getToken() error:', err);
        return null;
      }
    });

    if (isSignedIn) {
      console.log('[ClerkApiProvider] Clerk session active — API client ready');
    }
  }, [getToken, isLoaded, isSignedIn]);

  return <>{children}</>;
}
