'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  Ambulance, MapPin, Radio, CheckCircle2, Navigation2,
  AlertTriangle, User, HeartPulse, Shield, Activity,
  Clock, PhoneCall, Loader2
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface IncidentInfo {
  id: string;
  room: string;
  floor: string;
  guest_name: string;
  type: string;
  status: string;
  severity: string;
  condition?: string;
  action?: string;
  symptoms?: string;
  assigned_responder?: { id: string; name: string; role: string };
}

const SEV_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-500/20 border-red-400/40', text: 'text-red-400' },
  high:     { bg: 'bg-orange-500/20 border-orange-400/40', text: 'text-orange-400' },
  moderate: { bg: 'bg-amber-500/20 border-amber-400/40', text: 'text-amber-400' },
  low:      { bg: 'bg-green-500/20 border-green-400/40', text: 'text-green-400' },
  assessing:{ bg: 'bg-blue-500/20 border-blue-400/40', text: 'text-blue-400' },
};

// ─── Inner component: useSearchParams() must be inside Suspense ───────────────
function ResponderInner() {
  const params = useSearchParams();
  const incidentId = params.get('incident') || '';

  const [incidentInfo, setIncidentInfo] = useState<IncidentInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('assigned');
  const [arrived,  setArrived]  = useState(false);
  const [coords,   setCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [eta,      setEta]      = useState<number | null>(5);
  const [error,    setError]    = useState('');
  const socketRef = useRef<Socket | null>(null);
  const watchRef  = useRef<number | null>(null);

  // Fetch incident details so responder knows what they're heading to
  useEffect(() => {
    if (!incidentId) { setInfoLoading(false); return; }
    fetch(`${API}/api/crisis/incidents/${incidentId}`, { signal: AbortSignal.timeout(10000) })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.incident) {
          setIncidentInfo(res.incident);
          setCurrentStatus(res.incident.status || 'assigned');
        }
      })
      .catch(() => {})
      .finally(() => setInfoLoading(false));
  }, [incidentId]);

  useEffect(() => {
    const socket = io(API, { transports: ['websocket', 'polling'], reconnection: true });
    socketRef.current = socket;
    if (incidentId) socket.emit('join_incident', incidentId);
    socket.on('connect', () => { if (incidentId) socket.emit('join_incident', incidentId); });
    return () => { socket.disconnect(); };
  }, [incidentId]);

  // Call backend status API to advance incident status
  const advanceStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`${API}/api/crisis/status/${incidentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).then(r => r.json());
      if (res.success) {
        setCurrentStatus(newStatus);
        setIncidentInfo(prev => prev ? { ...prev, status: newStatus } : prev);
      }
    } catch (e) {
      console.warn('Status advance failed:', e);
    }
  };

  const startTracking = async () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }

    // Accept + mark enroute
    if (currentStatus === 'assigned') await advanceStatus('accepted');
    await advanceStatus('enroute');

    setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        socketRef.current?.emit('responder_location', {
          incidentId, lat, lng, eta: eta || 5, status: 'en_route',
        });
      },
      (err) => setError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 }
    );
  };

  const stopTracking = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
  };

  const markArrived = async () => {
    socketRef.current?.emit('responder_location', {
      incidentId, lat: coords?.lat, lng: coords?.lng, eta: 0, status: 'arrived',
    });
    await advanceStatus('arrived');
    stopTracking();
    setArrived(true);
  };

  const markResolved = async () => {
    await advanceStatus('resolved');
    setCurrentStatus('resolved');
  };

  const sev = SEV_COLORS[incidentInfo?.severity || 'assessing'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-4">

        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-4">
            <Ambulance className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Responder View</h1>
          <p className="text-blue-300 text-sm mt-1">
            {incidentId ? `Incident: ${incidentId}` : 'No incident ID — check URL'}
          </p>
        </div>

        {/* Incident Details Card */}
        {infoLoading ? (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
            <span className="text-blue-300 text-sm">Loading incident...</span>
          </div>
        ) : incidentInfo ? (
          <div className={`rounded-2xl p-4 border ${sev?.bg || 'bg-white/10 border-white/20'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-white/70" />
                  <span className="text-white font-bold text-sm">{incidentInfo.guest_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-white/50" />
                  <span className="text-white/70 text-xs">Room {incidentInfo.room} {incidentInfo.floor ? `• Floor ${incidentInfo.floor}` : ''}</span>
                </div>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-white/10 ${sev?.text || 'text-white'}`}>
                {(incidentInfo.severity || 'assessing').toUpperCase()}
              </span>
            </div>
            {incidentInfo.condition && (
              <div className="mb-2">
                <p className="text-white font-bold text-sm">{incidentInfo.condition}</p>
              </div>
            )}
            {incidentInfo.action && (
              <div className="bg-white/5 rounded-xl p-2.5 mb-2">
                <div className="flex items-start gap-2">
                  <HeartPulse className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-white/80 text-xs">{incidentInfo.action}</p>
                </div>
              </div>
            )}
            {incidentInfo.symptoms && (
              <p className="text-white/60 text-xs">Symptoms: {incidentInfo.symptoms}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Activity className="h-3 w-3 text-white/40" />
              <span className="text-white/50 text-xs">Type: <span className="capitalize">{incidentInfo.type}</span></span>
              <span className="text-white/30">•</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                currentStatus === 'resolved' ? 'bg-emerald-500/30 text-emerald-300' :
                currentStatus === 'arrived' ? 'bg-violet-500/30 text-violet-300' :
                currentStatus === 'enroute' ? 'bg-blue-500/30 text-blue-300' :
                'bg-amber-500/30 text-amber-300'
              }`}>{currentStatus.toUpperCase()}</span>
            </div>
          </div>
        ) : incidentId ? (
          <div className="bg-amber-500/20 border border-amber-400/40 rounded-2xl p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-300 text-sm font-bold">Could not load incident details</p>
            <p className="text-amber-200/60 text-xs mt-1">Backend may be starting up. You can still start tracking.</p>
          </div>
        ) : null}

        {/* Resolved State */}
        {currentStatus === 'resolved' && (
          <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-black text-lg">Incident Resolved ✅</p>
            <p className="text-emerald-300 text-sm mt-1">Patient and hospital have been notified</p>
          </div>
        )}

        {arrived && currentStatus !== 'resolved' && (
          <div className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-black text-lg">Marked as Arrived</p>
            <p className="text-emerald-300 text-sm mt-1">Patient and hospital have been notified</p>
          </div>
        )}

        {coords && !arrived && currentStatus !== 'resolved' && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 text-xs font-bold uppercase tracking-wider">Live GPS</span>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400 font-bold">Broadcasting</span>
              </span>
            </div>
            <p className="text-white font-mono text-sm">
              {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
          </div>
        )}

        {!arrived && currentStatus !== 'resolved' && (
          <div>
            <label className="block text-xs font-bold text-blue-300 mb-1.5 uppercase tracking-wider">ETA (minutes)</label>
            <input
              type="number"
              value={eta || ''}
              onChange={e => setEta(Number(e.target.value))}
              placeholder="e.g. 7"
              className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400/40 placeholder:text-white/40"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-400/40 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {!arrived && currentStatus !== 'resolved' && (
          <div className="space-y-3">
            {!tracking ? (
              <button onClick={startTracking}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-2xl transition-colors shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-3">
                <Navigation2 className="h-6 w-6" /> Accept & Start Tracking
              </button>
            ) : (
              <button onClick={stopTracking}
                className="w-full py-4 bg-slate-600 hover:bg-slate-700 text-white font-black text-lg rounded-2xl transition-colors flex items-center justify-center gap-3">
                <Radio className="h-6 w-6 animate-pulse" /> Stop Tracking
              </button>
            )}
            {tracking && coords && (
              <button onClick={markArrived}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl transition-colors shadow-2xl shadow-emerald-900/50 flex items-center justify-center gap-3">
                <CheckCircle2 className="h-6 w-6" /> Mark Arrived ✓
              </button>
            )}
          </div>
        )}

        {arrived && currentStatus !== 'resolved' && (
          <button onClick={markResolved}
            className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-black text-lg rounded-2xl transition-colors shadow-2xl shadow-violet-900/50 flex items-center justify-center gap-3">
            <CheckCircle2 className="h-6 w-6" /> Mark Resolved ✅
          </button>
        )}

        {/* Emergency Call */}
        <a href="tel:108" className="flex items-center justify-center gap-2 py-3 bg-red-600/20 border border-red-500/30 hover:bg-red-600/30 text-red-300 font-bold rounded-2xl transition-colors text-sm">
          <PhoneCall className="h-4 w-4" /> Call Ambulance 108
        </a>

        <p className="text-center text-xs text-white/30">
          Arogya Raksha · Responder App · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

// ─── Default export: Suspense wrapper required for useSearchParams ─────────────
export default function ResponderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Ambulance className="h-12 w-12 mx-auto mb-3 animate-pulse" />
          <p className="text-blue-300">Loading responder view…</p>
        </div>
      </div>
    }>
      <ResponderInner />
    </Suspense>
  );
}
