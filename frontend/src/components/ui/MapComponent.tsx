'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

const defaultCenter: [number, number] = [28.6139, 77.209]; // New Delhi fallback

export default function LiveLocationMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initMap = (center: [number, number], isLive: boolean) => {
      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center,
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // User location marker
      const userIcon = L.divIcon({
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="position: absolute; inset: 0; background: rgba(59,130,246,0.2); border-radius: 50%; animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(59,130,246,0.5);"></div>
          </div>
          <style>@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }</style>
        `,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker(center, { icon: userIcon })
        .addTo(map)
        .bindPopup(isLive ? '<strong>📍 Your Live Location</strong>' : '<strong>📍 Default Location (Delhi)</strong>');

      // Radius circle
      L.circle(center, {
        radius: 500,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.05,
        weight: 1,
        opacity: 0.3,
      }).addTo(map);

      mapRef.current = map;
      setLoading(false);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => initMap([pos.coords.latitude, pos.coords.longitude], true),
        () => {
          setError('Unable to get your location. Showing default.');
          initMap(defaultCenter, false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      setError('Geolocation not supported.');
      initMap(defaultCenter, false);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[400px] bg-slate-50 flex flex-col items-center justify-center rounded-3xl border border-slate-100">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Initializing Map…</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-3xl overflow-hidden">
      {error && (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          ⚠️ {error}
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
    </div>
  );
}
