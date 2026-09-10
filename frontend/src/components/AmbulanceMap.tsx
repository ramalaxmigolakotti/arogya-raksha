'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Ambulance, MapPin, Radio, Navigation2 } from 'lucide-react';

const MapContainer   = dynamic(() => import('react-leaflet').then(m => m.MapContainer),   { ssr: false });
const TileLayer      = dynamic(() => import('react-leaflet').then(m => m.TileLayer),      { ssr: false });
const Marker         = dynamic(() => import('react-leaflet').then(m => m.Marker),         { ssr: false });
const Popup          = dynamic(() => import('react-leaflet').then(m => m.Popup),          { ssr: false });
const Polyline       = dynamic(() => import('react-leaflet').then(m => m.Polyline),       { ssr: false });

interface LatLng { lat: number; lng: number }
interface Hospital { id: string; name: string; lat: number; lng: number; distance_km: number; type: string; }

interface AmbulanceMapProps {
  incidentId: string;
  patientLocation?: LatLng;
  hospitals?: Hospital[];
  socket?: any;
}

export default function AmbulanceMap({ incidentId, patientLocation, hospitals = [], socket }: AmbulanceMapProps) {
  const [patientPos, setPatientPos] = useState<LatLng | null>(patientLocation || null);
  const [responderPos, setResponderPos] = useState<LatLng | null>(null);
  const [eta, setEta] = useState<number>(0);
  const [status, setStatus] = useState<'waiting' | 'dispatched' | 'en_route' | 'arriving' | 'arrived'>('waiting');
  const [leafletReady, setLeafletReady] = useState(false);
  const [L, setL] = useState<any>(null);

  // Get browser geolocation if no patient location provided
  useEffect(() => {
    if (patientLocation) { setPatientPos(patientLocation); return; }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPatientPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setPatientPos({ lat: 17.3850, lng: 78.4867 }), // Fallback: Hyderabad
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setPatientPos({ lat: 17.3850, lng: 78.4867 });
    }
  }, [patientLocation]);

  // Load Leaflet
  useEffect(() => {
    import('leaflet').then(leaflet => {
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setL(leaflet);
      setLeafletReady(true);
    });
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Listen for real responder GPS via Socket.io
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { incidentId: string; lat: number; lng: number; eta: number; status: string }) => {
      if (data.incidentId !== incidentId) return;
      setResponderPos({ lat: data.lat, lng: data.lng });
      setEta(data.eta);
      setStatus(data.status as any);
    };
    socket.on('responder_location', handler);
    return () => socket.off('responder_location', handler);
  }, [socket, incidentId]);

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    waiting:    { label: '📡 Waiting for Responder', color: 'text-slate-600 bg-slate-50 border-slate-200' },
    dispatched: { label: '🚑 Responder Dispatched',  color: 'text-amber-600 bg-amber-50 border-amber-200' },
    en_route:   { label: '🚑 En Route to You',       color: 'text-blue-600 bg-blue-50 border-blue-200' },
    arriving:   { label: '🚨 Almost There!',          color: 'text-orange-600 bg-orange-50 border-orange-200' },
    arrived:    { label: '✅ Responder Arrived',       color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  };

  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.waiting;
  const center = patientPos || { lat: 17.385, lng: 78.4867 };

  return (
    <div className="space-y-3">
      {/* Status Banner */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${statusInfo.color}`}>
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 animate-pulse" />
          <span className="font-black text-sm">{statusInfo.label}</span>
        </div>
        {eta > 0 && (
          <div className="text-right">
            <p className="text-xs opacity-70">ETA</p>
            <p className="font-black text-lg leading-none">{eta} min</p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg" style={{ height: '380px' }}>
        {leafletReady && patientPos ? (
          <MapContainer center={[center.lat, center.lng]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Patient marker */}
            {L && (
              <Marker position={[patientPos.lat, patientPos.lng]} icon={L.divIcon({
                html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4))">📍</div>`,
                className: '', iconAnchor: [14, 28],
              })}>
                <Popup><div className="font-bold text-sm text-red-700">🚨 Your Location</div></Popup>
              </Marker>
            )}
            {/* Responder marker (only if GPS data received) */}
            {L && responderPos && (
              <Marker position={[responderPos.lat, responderPos.lng]} icon={L.divIcon({
                html: `<div style="font-size:32px;line-height:1;animation:bounce 0.8s infinite;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">🚑</div>
                       <style>@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}</style>`,
                className: '', iconAnchor: [16, 32],
              })}>
                <Popup><div className="font-bold text-sm text-blue-700">🚑 Responder</div><div className="text-xs">ETA: {eta} min</div></Popup>
              </Marker>
            )}
            {/* Real hospital markers */}
            {L && hospitals.map((h) => (
              <Marker key={h.id} position={[h.lat, h.lng]} icon={L.divIcon({
                html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3))">🏥</div>`,
                className: '', iconAnchor: [11, 22],
              })}>
                <Popup>
                  <div className="font-bold text-sm text-indigo-700">{h.name}</div>
                  <div className="text-xs text-slate-500">{h.distance_km} km • {h.type}</div>
                </Popup>
              </Marker>
            ))}
            {/* Route line: responder → patient */}
            {responderPos && (
              <Polyline positions={[[responderPos.lat, responderPos.lng], [patientPos.lat, patientPos.lng]]}
                color="#3b82f6" weight={3} dashArray="8 6" opacity={0.7} />
            )}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <div className="text-center">
              <Ambulance className="h-10 w-10 text-slate-300 mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-slate-400">{patientPos ? 'Loading map…' : 'Getting your location…'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5"><span className="text-base">📍</span> Your location</div>
        {responderPos && <div className="flex items-center gap-1.5"><span className="text-base">🚑</span> Responder (live)</div>}
        {hospitals.length > 0 && <div className="flex items-center gap-1.5"><span className="text-base">🏥</span> Real hospitals ({hospitals.length})</div>}
      </div>
    </div>
  );
}
