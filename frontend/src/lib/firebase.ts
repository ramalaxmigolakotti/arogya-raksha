// Firebase Cloud Messaging configuration
// Fill these values from: console.firebase.google.com → Project Settings → General → Your apps → Web app
// Then Cloud Messaging tab → Web Push certificates → VAPID key

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY        || '',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN    || '',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID     || '',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID      || '',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID         || '',
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

// Init app (singleton pattern for Next.js hot-reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export async function getMessagingInstance() {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
}

/** Request permission and return the FCM registration token */
export async function requestFCMToken(): Promise<string | null> {
  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Register service worker manually to avoid default 10s timeout
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch {
        console.warn('[FCM] Service worker registration failed, skipping push notifications');
        return null;
      }
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });
    return token || null;
  } catch (err) {
    console.warn('[FCM] requestFCMToken skipped:', (err as Error)?.message);
    return null;
  }
}

/** Listen for foreground messages */
export async function onForegroundMessage(callback: (payload: any) => void) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

export { app };
