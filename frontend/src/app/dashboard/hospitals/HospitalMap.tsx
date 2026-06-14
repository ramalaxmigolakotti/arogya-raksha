'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface NearbyHospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  type: string;
  phone?: string;
}

interface HospitalMapProps {
  userLocation: { lat: number; lng: number };
  hospitals: NearbyHospital[];
  onSelectHospital: (id: string) => void;
  onBookHospital: (hospital: NearbyHospital) => void;
}

export default function HospitalMap({ userLocation, hospitals, onSelectHospital, onBookHospital }: HospitalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 13,
      zoomControl: true,
    });

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // User location marker (pulsing blue dot)
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

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<strong>📍 Your Location</strong>');

    // Hospital markers
    hospitals.forEach((h) => {
      const hospitalIcon = L.divIcon({
        html: `
          <div style="background: #10b981; color: white; padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 11px; box-shadow: 0 2px 8px rgba(16,185,129,0.4); cursor: pointer; white-space: nowrap; text-align: center; min-width: 20px;">
            🏥
          </div>
        `,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon }).addTo(map);

      marker.bindPopup(`
        <div style="min-width: 200px; font-family: system-ui, sans-serif;">
          <h3 style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #1e293b;">${h.name}</h3>
          <p style="margin: 0 0 6px; font-size: 12px; color: #64748b;">📍 ${h.address}</p>
          <p style="margin: 0 0 8px; font-size: 12px; color: #3b82f6; font-weight: 600;">📏 ${h.distance.toFixed(1)} km away</p>
          <div style="display: flex; gap: 6px;">
            <button onclick="window.__bookHospital__('${h.id}')" style="flex: 1; background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
              Book Appointment
            </button>
            <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}', '_blank')" style="background: #f1f5f9; border: none; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px;">
              🧭
            </button>
          </div>
        </div>
      `);
    });

    // Add radius circle
    L.circle([userLocation.lat, userLocation.lng], {
      radius: 5000,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.04,
      weight: 1,
      opacity: 0.3,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation, hospitals]);

  // Global handler for popup book buttons
  useEffect(() => {
    (window as any).__bookHospital__ = (id: string) => {
      const h = hospitals.find((h) => h.id === id);
      if (h) onBookHospital(h);
    };
    return () => { delete (window as any).__bookHospital__; };
  }, [hospitals, onBookHospital]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
}
