// Service Worker for Arogya Raksha Push Notifications
// Handles: push events, notification clicks, background sync

const CACHE_NAME = 'arogya-v1';
const OFFLINE_URLS = [
  '/dashboard',
  '/dashboard/profile',
  '/dashboard/emergency',
];

// ── Install: cache offline essentials ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Push: show notification ────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Arogya Raksha', body: 'You have a health notification', icon: '/icon-192.png', badge: '/icon-96.png', url: '/dashboard', tag: 'arogya-notification' };

  if (event.data) {
    try { Object.assign(data, event.data.json()); } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon    || '/icon-192.png',
      badge:   data.badge   || '/icon-96.png',
      tag:     data.tag     || 'arogya-notification',
      data:    { url: data.url || '/dashboard' },
      actions: [
        { action: 'open',    title: '📱 Open App' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ],
      vibrate:   [200, 100, 200],
      requireInteraction: data.tag === 'emergency',
    })
  );
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Fetch: network-first for API, cache-first for static ─────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Skip non-GET and API requests
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/')) return;

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
