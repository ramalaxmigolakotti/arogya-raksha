'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle2, X } from 'lucide-react';

const VAPID_PUBLIC = 'BHOdQACKVJYWq4yqNIq84mhXHf3UJgL6Hc-ttnY-cQXLgO-J01YLPqWSO9nHlFk7-p3SD7jyb4qdrAaGOMRTuMY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

interface NotificationManagerProps {
  showBanner?: boolean; // show as floating banner if true
}

export default function NotificationManager({ showBanner = false }: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [dismissed, setDismissed]     = useState(false);
  const [swReady, setSwReady]         = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setPermission(Notification.permission);
    setDismissed(!!localStorage.getItem('push_banner_dismissed'));

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(async (reg) => {
          setSwReady(true);
          const existing = await reg.pushManager.getSubscription();
          if (existing) setSubscribed(true);
        })
        .catch(() => {});
    }
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as BufferSource,
      });

      await fetch('/api/push/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sub.toJSON()),
      });

      setSubscribed(true);

      // Send a welcome notification
      await fetch('/api/push/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '✅ Arogya Raksha Notifications',
          body:  "You'll now receive medicine reminders, health tips, and emergency alerts!",
          url:   '/dashboard/settings',
          tag:   'welcome',
        }),
      });
    } catch {}
    setLoading(false);
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {}
    setLoading(false);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('push_banner_dismissed', '1');
  };

  if (!swReady || typeof window === 'undefined' || !('Notification' in window)) return null;
  if (showBanner && (dismissed || subscribed || permission === 'denied')) return null;

  // ── Inline settings toggle ──────────────────────────────────────────────────
  if (!showBanner) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${subscribed ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            {subscribed ? <Bell className="h-4 w-4 text-emerald-600" /> : <BellOff className="h-4 w-4 text-slate-400" />}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Push Notifications</p>
            <p className="text-xs text-slate-400">{subscribed ? 'Active — medicine reminders & health tips' : 'Get medicine reminders, daily health tips & emergency alerts'}</p>
          </div>
        </div>
        <button
          onClick={subscribed ? unsubscribe : subscribe}
          disabled={loading || permission === 'denied'}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${subscribed ? 'bg-emerald-500' : 'bg-slate-200'} disabled:opacity-50`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${subscribed ? 'right-1' : 'left-1'}`} />
        </button>
      </div>
    );
  }

  // ── Floating Banner ─────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex items-center gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-xl flex-shrink-0">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">Enable Health Reminders</p>
          <p className="text-xs text-slate-500 truncate">Medicine reminders, daily tips & emergency alerts</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={subscribe} disabled={loading}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60">
            {loading ? '…' : 'Allow'}
          </button>
          <button onClick={dismiss} className="p-1.5 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
