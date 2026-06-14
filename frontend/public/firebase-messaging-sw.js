// Firebase Cloud Messaging Service Worker
// Place this at: public/firebase-messaging-sw.js
// This runs in the background to handle push notifications when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Replace these with your actual Firebase config values
firebase.initializeApp({
  apiKey:            "AIzaSyB3PIhU4YtLD3iUn84AsM1LhBp6plV0i4g",
  authDomain:        "health-aa1b2.firebaseapp.com",
  projectId:         "health-aa1b2",
  storageBucket:     "health-aa1b2.firebasestorage.app",
  messagingSenderId: "931360436117",
  appId:             "1:931360436117:web:a73eb4749398521dfd509c",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message:', payload);

  const { title, body, icon, data } = payload.notification || {};

  self.registration.showNotification(title || '🚨 Arogya Raksha Alert', {
    body:  body  || 'Emergency alert received',
    icon:  icon  || '/icon-192.png',
    badge: '/icon-192.png',
    tag:   data?.incidentId || 'arogya-alert',
    data:  data,
    actions: [
      { action: 'view',    title: '👁️ View Alert' },
      { action: 'dismiss', title: '✖️ Dismiss' },
    ],
    requireInteraction: true, // keeps notification visible until user acts
    vibrate: [200, 100, 200, 100, 200], // SOS pattern
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/hospital/portal';
    event.waitUntil(clients.openWindow(url));
  }
});
