'use client';

import { useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const FIREBASE_CONFIGURED = !!(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

/**
 * usePushNotifications — registers device for FCM push and saves token to backend
 * Safe to use without Firebase keys (silently skips if not configured)
 */
export function usePushNotifications() {
  const { user } = useUser();

  const register = useCallback(async () => {
    if (!user || !FIREBASE_CONFIGURED) return;
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    try {
      // Dynamically import to avoid SSR issues
      const { requestFCMToken } = await import('@/lib/firebase');
      const token = await requestFCMToken();
      if (!token) return;

      // Send token to backend for storage against this user
      await fetch(`${API}/api/notifications/register-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, token, platform: 'web' }),
      });

      console.log('[FCM] Token registered');
    } catch (err) {
      // Non-fatal — app works without push
      console.warn('[FCM] Push registration failed (non-fatal):', err);
    }
  }, [user]);

  useEffect(() => {
    register();
  }, [register]);
}

/**
 * useForegroundNotifications — shows toast when push arrives while app is open
 */
export function useForegroundNotifications(
  onMessage: (title: string, body: string, data?: any) => void
) {
  useEffect(() => {
    if (!FIREBASE_CONFIGURED) return;

    let unsub: (() => void) | undefined;

    (async () => {
      try {
        const { onForegroundMessage } = await import('@/lib/firebase');
        unsub = await onForegroundMessage((payload) => {
          const title = payload.notification?.title || '🚨 Emergency Alert';
          const body  = payload.notification?.body  || 'New SOS incident reported';
          onMessage(title, body, payload.data);
        });
      } catch (err) {
        console.warn('[FCM] Foreground listener failed:', err);
      }
    })();

    return () => { if (unsub) unsub(); };
  }, [onMessage]);
}
