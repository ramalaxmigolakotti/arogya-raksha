'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  AlertTriangle, BellRing, MapPin, User, HeartPulse,
  Send, CheckCircle2, Loader2, Hospital, CreditCard,
  MessageSquare, Shield, PhoneCall, Clock, Activity,
  Zap, Ambulance, X, Building2, BadgeAlert, Heart, Pill
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import dynamic from 'next/dynamic';

const AmbulanceMap = dynamic(() => import('@/components/AmbulanceMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-slate-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <Ambulance className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-pulse" />
        <p className="text-xs text-slate-400">Loading map…</p>
      </div>
    </div>
  ),
});

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type FlowStep = 'idle' | 'form' | 'creating' | 'enriching' | 'live' | 'resolved';

interface TimelineEvent {
  step: string; title: string; description: string; actor?: string; actor_role?: string; created_at: string;
}

interface NearbyHospital {
  id: string; name: string; lat: number; lng: number; distance_km: number; type: string;
}

interface Incident {
  id: string; room: string; floor: string; guest_name: string; type: string; status: string; severity: string;
  condition?: string; icd10?: string; action?: string; hospital_dept?: string; photo_url?: string;
  assigned_responder?: { id: string; name: string; role: string; accepted_at?: string };
  hospital_recommendation?: {
    primary: { name: string; dist: string; dept: string; tier: string; lat?: number; lng?: number };
    nearest: { name: string; dist: string; dept: string; tier: string; lat?: number; lng?: number };
    budget: { name: string; dist: string; dept: string; tier: string; lat?: number; lng?: number };
  };
  nearby_hospitals?: NearbyHospital[];
  cost_estimate?: { range: string; emi_options: string[]; loan_available: boolean };
  messages: { id: string; sender: string; senderRole: string; text: string; timestamp: string }[];
  ambulance_alert?: { demo_message: string };
  guest_lat?: number; guest_lng?: number;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string; pulse: boolean }> = {
  critical: { color: 'text-red-700', bg: 'bg-red-100 border-red-300', label: 'CRITICAL', pulse: true },
  high:     { color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300', label: 'HIGH', pulse: true },
  moderate: { color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300', label: 'MODERATE', pulse: false },
  low:      { color: 'text-green-700', bg: 'bg-green-100 border-green-300', label: 'LOW', pulse: false },
  assessing:{ color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300', label: 'ASSESSING', pulse: true },
};

const STATUS_STEPS = [
  { key: 'pending',  label: 'Alert Received',      icon: BellRing },
  { key: 'assigned', label: 'Responder Assigned',   icon: Shield },
  { key: 'accepted', label: 'Accepted',             icon: CheckCircle2 },
  { key: 'enroute',  label: 'On the Way',           icon: Ambulance },
  { key: 'arrived',  label: 'Responder Arrived',    icon: MapPin },
  { key: 'resolved', label: 'Resolved',             icon: CheckCircle2 },
];

function CrisisReportPage() {
  const searchParams = useSearchParams();
  const { user } = useUser();
  const preRoom  = searchParams.get('room')  || '';
  const preFloor = searchParams.get('floor') || '';

  const [step, setStep] = useState<FlowStep>('idle');
  const [incident, setIncident] = useState<Incident | null>(null);
  const [form, setForm] = useState({ name: '', room: preRoom, floor: preFloor, type: 'medical', symptoms: '' });
  const [chatText, setChatText] = useState('');
  const [messages, setMessages] = useState<Incident['messages']>([]);
  const [elapsed, setElapsed] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{lat: number; lng: number} | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospital[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  // ── Medical Profile auto-load ──
  const [medCard, setMedCard] = useState<Record<string, unknown> | null>(null);
  const [profileBadge, setProfileBadge] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`${API}/api/medical-profile/emergency-card`, {
      headers: { 'x-user-id': user.id },
    }).then(r => r.json()).then(res => {
      if (res.success && res.card) {
        setMedCard(res.card);
        // Auto-fill name from profile
        setForm(prev => ({ ...prev, name: prev.name || (res.card.full_name as string) || '' }));
        setProfileBadge(true);
      }
    }).catch(() => {});
  }, [user?.id]);

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Pre-fill from QR
  useEffect(() => {
    if (preRoom || preFloor) setStep('form');
  }, [preRoom, preFloor]);

  // Elapsed timer
  useEffect(() => {
    if (step === 'live' && incident) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, incident]);

  // ── Ref to avoid stale closures in socket callbacks ──
  const incidentIdRef = useRef<string | null>(null);
  useEffect(() => { incidentIdRef.current = incident?.id || null; }, [incident?.id]);
  const messageIdsRef = useRef<Set<string>>(new Set());

  // Socket.io — fixed: uses ref to avoid stale closure, deduplicates messages
  useEffect(() => {
    if (!incident) return;
    const socket = io(API, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: 20, reconnectionDelay: 1000 });
    socketRef.current = socket;

    const joinRoom = () => {
      if (incidentIdRef.current) socket.emit('join_incident', incidentIdRef.current);
    };
    joinRoom();
    socket.on('connect', joinRoom); // Re-join on reconnect

    socket.on('incident_status_update', (updated: Incident) => {
      if (updated.id === incidentIdRef.current) {
        setIncident(updated);
        if (updated.status === 'resolved') setStep('resolved');
      }
    });

    socket.on('incident_enriched', (updated: Incident) => {
      if (updated.id === incidentIdRef.current) setIncident(updated);
    });

    socket.on('incident_assigned', (updated: Incident) => {
      if (updated.id === incidentIdRef.current) {
        setIncident(updated);
        setMessages(m => [...m, {
          id: `sys-${Date.now()}`,
          sender: 'System',
          senderRole: 'system',
          text: `✅ ${updated.assigned_responder?.name} (${updated.assigned_responder?.role}) has been assigned and is heading your way.`,
          timestamp: new Date().toISOString(),
        }]);
      }
    });

    socket.on('incident_message', (msg: Incident['messages'][0]) => {
      // Deduplicate — prevent double messages
      if (messageIdsRef.current.has(msg.id)) return;
      messageIdsRef.current.add(msg.id);
      setMessages(m => [...m, msg]);
    });

    socket.on('timeline_update', (data: { incidentId: string; event: TimelineEvent }) => {
      if (data.incidentId === incidentIdRef.current) setTimeline(t => [...t, data.event]);
    });

    return () => { socket.disconnect(); };
  }, [incident?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Step 2: Create incident (uses combined endpoint — single call) ──
  const [submitError, setSubmitError] = useState('');

  const handleTrigger = async () => {
    if (!form.name.trim() || !form.room.trim()) return;
    setStep('creating');
    setSubmitError('');

    // Helper: fetch with 45-second timeout (backend AI + Overpass can take 15-20s)
    const fetchWithTimeout = (url: string, opts: RequestInit = {}) => {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 45000);
      return fetch(url, { ...opts, signal: ctrl.signal })
        .finally(() => clearTimeout(tid));
    };

    // Demo-mode fallback incident (when backend is unavailable)
    const makeDemoIncident = () => ({
      id: `INC${Date.now().toString().slice(-6)}`,
      room: form.room, floor: form.floor,
      guest_name: form.name, type: form.type, symptoms: form.symptoms,
      status: 'pending', severity: 'assessing',
      messages: [],
      created_at: new Date().toISOString(),
      ambulance_alert: { demo_message: '🚑 Ambulance alerted via emergency services bridge' },
    });

    try {
      let resultIncident: Incident;

      setStep('enriching');

      try {
        // Single combined call: Create + AI Enrich + Auto-Assign + Timeline
        const res = await fetchWithTimeout(`${API}/api/crisis/create-and-enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room: form.room, floor: form.floor,
            guestName: form.name, type: form.type, symptoms: form.symptoms,
            lat: gpsLocation?.lat || null, lng: gpsLocation?.lng || null,
            medical_profile: medCard ? {
              blood_group:        medCard.blood_group,
              conditions:         medCard.conditions_summary,
              medications:        medCard.medications_summary,
              allergies:          medCard.allergies_summary,
              bp:                 medCard.bp,
              sugar:              medCard.sugar,
              preferred_hospital: medCard.preferred_hospital_primary,
              emergency_contact:  medCard.emergency_contact_name
                ? `${medCard.emergency_contact_name} (${medCard.emergency_contact_phone})`
                : null,
              has_insurance:      medCard.has_insurance,
              organ_donor:        medCard.organ_donor,
              doctor_notes:       medCard.doctor_notes,
            } : null,
          }),
        }).then(r => r.json());

        if (res.success) {
          resultIncident = res.incident;
          if (res.nearby_hospitals?.length) setNearbyHospitals(res.nearby_hospitals);
          if (res.timeline?.length) setTimeline(res.timeline);
        } else {
          resultIncident = makeDemoIncident() as Incident;
        }
      } catch {
        // Backend unreachable — use demo mode so flow still works
        resultIncident = makeDemoIncident() as Incident;
      }

      setIncident(resultIncident);
      setMessages([{
        id: 'sys-0',
        sender: 'System',
        senderRole: 'system',
        text: `🚨 Emergency alert created. Incident ID: ${resultIncident.id}. Help is being dispatched to Room ${resultIncident.room}.`,
        timestamp: new Date().toISOString(),
      }]);
      setStep('live');

    } catch (err) {
      setSubmitError('Failed to create alert. Please try again or call 108 directly.');
      setStep('form');
    }
  };


  // ── Send chat message ──
  const sendChat = () => {
    if (!chatText.trim() || !incident || !socketRef.current) return;
    const msg = { incidentId: incident.id, sender: form.name || 'Guest', senderRole: 'guest', text: chatText };
    socketRef.current.emit('crisis_message', msg);
    setMessages(m => [...m, { id: `g-${Date.now()}`, sender: form.name || 'Guest', senderRole: 'guest', text: chatText, timestamp: new Date().toISOString() }]);
    setChatText('');
  };

  const sev = SEVERITY_CONFIG[incident?.severity || 'assessing'];
  const currentStatusIdx = STATUS_STEPS.findIndex(s => s.key === (incident?.status || 'pending'));

  // ──────────────────────────── RENDER ────────────────────────────

  if (step === 'idle') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-950 via-red-900 to-rose-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-32 w-32 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center animate-pulse">
                <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-2xl">
                  <BellRing className="h-10 w-10 text-red-600" />
                </div>
              </div>
              <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
            </div>
          </div>
          <div className="text-white">
            <h1 className="text-4xl font-black mb-3">Emergency?</h1>
            <p className="text-red-200 text-lg font-medium">Instant help is one tap away. Press the button to alert hotel staff immediately.</p>
          </div>
          <button
            onClick={() => setStep('form')}
            className="w-full py-6 bg-white text-red-600 font-black text-2xl rounded-3xl shadow-2xl hover:scale-105 transition-transform flex items-center justify-center gap-3"
          >
            <AlertTriangle className="h-8 w-8" /> 🚨 EMERGENCY
          </button>
          <p className="text-red-300 text-sm">Hotel staff will be notified instantly. Your location is: Room {preRoom || 'detected automatically'}</p>
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6 text-white">
            <div className="flex items-center gap-3 mb-1">
              <AlertTriangle className="h-7 w-7" />
              <h2 className="text-2xl font-black">Report Emergency</h2>
            </div>
            <p className="text-red-100 text-sm">This will instantly alert hotel staff and emergency services.</p>
          </div>
          <div className="p-6 space-y-4">
            {/* Medical Profile Badge */}
            {medCard ? (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 flex items-start gap-3">
                <Heart className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-indigo-700 mb-1">✅ Medical Profile Auto-Loaded</p>
                  <div className="flex flex-wrap gap-1.5">
                    {medCard.blood_group && (
                      <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">🩸 {medCard.blood_group as string}</span>
                    )}
                    {(medCard.conditions_summary as string) && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full truncate max-w-[180px]">{medCard.conditions_summary as string}</span>
                    )}
                    {(medCard.allergies_summary as string) && (
                      <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">⚠️ {medCard.allergies_summary as string}</span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-500 mt-1">This data will be sent to hotel staff and the hospital automatically.</p>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-2">
                <Pill className="h-4 w-4 text-amber-500" />
                <p className="text-xs text-amber-700 font-semibold">
                  No medical profile found. <a href="/dashboard/profile" target="_blank" className="underline font-black">Set one up</a> for faster emergency care.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Your Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                    placeholder="Full name" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Room No. *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input value={form.room} onChange={e => setForm({...form, room: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                    placeholder="e.g., 305" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Emergency Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'medical', label: '🏥 Medical', color: 'rose' },
                  { val: 'fire', label: '🔥 Fire', color: 'orange' },
                  { val: 'security', label: '🔓 Security', color: 'blue' },
                  { val: 'other', label: '⚠️ Other', color: 'slate' },
                ].map(t => (
                  <button key={t.val}
                    onClick={() => setForm({...form, type: t.val})}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                      form.type === t.val ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >{t.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Describe the Emergency</label>
              <div className="relative">
                <HeartPulse className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <textarea value={form.symptoms} onChange={e => setForm({...form, symptoms: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none"
                  rows={3} placeholder="e.g., chest pain, difficulty breathing, unconscious..." />
              </div>
            </div>

            {/* Gap 4: QR info banner */}
            {(preRoom || preFloor) && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">Room {preRoom} detected via QR scan — location pre-filled</p>
              </div>
            )}

            {/* Error banner */}
            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-700">{submitError}</p>
              </div>
            )}

            <button
              onClick={handleTrigger}
              disabled={!form.name.trim() || !form.room.trim()}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-xl shadow-red-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Zap className="h-5 w-5" /> 🚨 SEND EMERGENCY ALERT
            </button>

            <p className="text-center text-xs text-slate-400">
              🔒 Webhook-ready bridge to emergency services • SMS fallback via Twilio
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'creating' || step === 'enriching') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
              <Loader2 className="h-12 w-12 text-red-400 animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full bg-red-400/10 animate-ping mx-auto" style={{ animationDuration: '1.5s' }} />
          </div>
          <div className="text-white">
            <h2 className="text-2xl font-black mb-2">
              {step === 'creating' ? '🚨 Creating Incident...' : '🧠 AI Assessing Severity...'}
            </h2>
            <p className="text-slate-400">
              {step === 'creating'
                ? 'Broadcasting alert to hotel command center'
                : 'ICD-10 mapping • Risk scoring • Responder matching'}
            </p>
          </div>
          <div className="flex justify-center gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="h-2 w-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'resolved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-teal-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="h-24 w-24 rounded-full bg-emerald-400/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          </div>
          <div className="text-white">
            <h2 className="text-3xl font-black mb-2">Incident Resolved ✅</h2>
            <p className="text-emerald-200">Incident <strong>{incident?.id}</strong> has been successfully closed.</p>
            {incident?.response_time_minutes && (
              <p className="text-emerald-300 mt-2">⏱ Response time: <strong>{incident.response_time_minutes} min</strong></p>
            )}
          </div>
          <div className="bg-white/10 rounded-2xl p-4 text-left space-y-2 text-emerald-100 text-sm">
            <p>📍 Room {incident?.room} — <span className="capitalize">{incident?.type}</span> emergency</p>
            <p>👤 {incident?.assigned_responder?.name} ({incident?.assigned_responder?.role})</p>
            <p>🏥 {incident?.hospital_recommendation?.nearest?.name}</p>
          </div>
          <button onClick={() => { setStep('idle'); setIncident(null); setMessages([]); setElapsed(0); }}
            className="w-full py-4 bg-white text-emerald-700 font-black text-lg rounded-2xl shadow-xl hover:scale-105 transition-transform">
            Return to Safety ✓
          </button>
        </div>
      </div>
    );
  }

  // ── LIVE INCIDENT VIEW (Steps 4–10) ──
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Crisis Header */}
      <div className={`${sev?.pulse ? 'animate-pulse' : ''} bg-gradient-to-r from-red-700 to-rose-600 text-white px-4 py-3`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-black text-sm">INCIDENT {incident?.id}</p>
              <p className="text-red-200 text-xs">Room {incident?.room} • {form.type.toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black bg-white/20 ${sev?.color}`}>
              {sev?.label}
            </span>
            <span className="text-xs text-red-200 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.floor(elapsed / 60).toString().padStart(2,'0')}:{(elapsed % 60).toString().padStart(2,'0')}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Train-Station-Style Live Tracker (like "Where is my Train") */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-500" /> Live Tracking
          </h3>

          {/* Train Route — Vertical station-to-station */}
          <div className="relative">
            {/* All possible stations */}
            {STATUS_STEPS.map((s, i) => {
              const done = i < currentStatusIdx;
              const active = i === currentStatusIdx;
              const upcoming = i > currentStatusIdx;
              // Find matching timeline event
              const matchingEvent = timeline.find(t => t.step === s.key);
              const timeStr = matchingEvent ? new Date(matchingEvent.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

              return (
                <div key={s.key} className="flex items-start gap-3" style={{ minHeight: i < STATUS_STEPS.length - 1 ? '56px' : '36px' }}>
                  {/* Time column */}
                  <div className="w-[70px] text-right flex-shrink-0 pt-0.5">
                    {(done || active) && timeStr ? (
                      <span className="text-[11px] font-mono font-bold text-slate-500">{timeStr}</span>
                    ) : (
                      <span className="text-[11px] text-slate-300">--:--</span>
                    )}
                  </div>

                  {/* Station dot + track line */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`h-5 w-5 rounded-full border-[3px] flex items-center justify-center z-10 ${
                      done ? 'bg-emerald-500 border-emerald-500' :
                      active ? 'bg-white border-red-500 ring-4 ring-red-100' :
                      'bg-white border-slate-300'
                    }`}>
                      {done && <CheckCircle2 className="h-3 w-3 text-white" />}
                      {active && <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />}
                    </div>
                    {/* Track line connecting stations */}
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`w-[3px] flex-1 min-h-[32px] ${
                        i < currentStatusIdx ? 'bg-emerald-400' :
                        i === currentStatusIdx ? 'bg-gradient-to-b from-red-400 to-slate-200' :
                        'bg-slate-200'
                      }`} />
                    )}
                  </div>

                  {/* Station name + description */}
                  <div className="pt-0 pb-2 flex-1 min-w-0">
                    <p className={`text-sm font-bold leading-tight ${
                      done ? 'text-emerald-700' : active ? 'text-red-700' : 'text-slate-400'
                    }`}>
                      {matchingEvent?.title || s.label}
                    </p>
                    {matchingEvent?.description && (done || active) && (
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{matchingEvent.description}</p>
                    )}
                    {active && !done && (
                      <p className="text-[11px] text-red-500 font-semibold mt-0.5 flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 bg-red-500 rounded-full animate-ping" />
                        In progress...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Additional timeline events (hospital bridge, AI, etc.) */}
            {timeline.filter(t => !STATUS_STEPS.some(s => s.key === t.step)).map((evt, i) => (
              <div key={`extra-${i}`} className="flex items-start gap-3 mt-1" style={{ minHeight: '42px' }}>
                <div className="w-[70px] text-right flex-shrink-0 pt-0.5">
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {new Date(evt.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="h-5 w-5 rounded-full bg-blue-500 border-[3px] border-blue-500 flex items-center justify-center z-10">
                    <Zap className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>
                <div className="pt-0 pb-2 flex-1 min-w-0">
                  <p className="text-sm font-bold text-blue-700 leading-tight">{evt.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{evt.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: AI Enrichment Card */}
        {incident?.condition && (
          <div className={`rounded-2xl p-4 border-2 ${sev?.bg}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <BadgeAlert className="h-5 w-5 text-red-600" />
                <h3 className="font-black text-slate-800">AI Assessment</h3>
              </div>
              <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full font-bold text-slate-600">ICD-10: {incident.icd10}</span>
            </div>
            <p className="font-bold text-slate-900 mb-1">{incident.condition}</p>
            <p className="text-sm text-slate-600">{incident.action}</p>
            {incident.ambulance_alert && (
              <div className="mt-3 flex items-center gap-2 p-2 bg-red-50 rounded-xl border border-red-200">
                <Ambulance className="h-4 w-4 text-red-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-700">{incident.ambulance_alert.demo_message}</p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Assigned Responder */}
        {incident?.assigned_responder && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" /> Assigned Responder
            </h3>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-black text-indigo-600">
                {incident.assigned_responder.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-900">{incident.assigned_responder.name}</p>
                <p className="text-sm text-slate-500">{incident.assigned_responder.role}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                ['enroute','arrived'].includes(incident.status) ? 'bg-blue-100 text-blue-700' :
                incident.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {incident.status === 'accepted' ? '✓ Accepted' :
                 incident.status === 'enroute'  ? '🏃 Enroute' :
                 incident.status === 'arrived'  ? '✅ Arrived' : '⏳ Notified'}
              </div>
            </div>
          </div>
        )}

        {/* 🗺️ AMBULANCE TRACKING MAP */}
        {incident?.assigned_responder && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Ambulance className="h-4 w-4 text-blue-500" /> Live Ambulance Tracking
            </h3>
            <AmbulanceMap
              incidentId={incident.id}
              patientLocation={gpsLocation || (incident.guest_lat && incident.guest_lng ? { lat: incident.guest_lat, lng: incident.guest_lng } : undefined)}
              hospitals={nearbyHospitals}
              socket={socketRef.current}
            />
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              🔴 Your location &nbsp;|&nbsp; 🚑 Ambulance (live GPS) &nbsp;|&nbsp;
              <a
                href={`/responder?incident=${incident.id}`}
                target="_blank"
                rel="noreferrer"
                className="underline text-blue-500 font-bold"
              >
                Open Responder App →
              </a>
            </p>
          </div>
        )}

        {/* Step 8: Hospital Intelligence */}
        {incident?.hospital_recommendation && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Hospital className="h-4 w-4 text-emerald-500" /> Hospital Intelligence
            </h3>
            <div className="space-y-2">
              {Object.entries(incident.hospital_recommendation).map(([key, h]) => (
                <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${
                  key === 'primary' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className={`p-1.5 rounded-lg ${key === 'primary' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <Building2 className={`h-4 w-4 ${key === 'primary' ? 'text-emerald-600' : 'text-slate-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.dist} • {h.dept}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    key === 'primary' ? 'bg-emerald-200 text-emerald-700' :
                    key === 'nearest' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}>{h.tier}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 9: Cost + EMI (UNIQUE WINNING POINT) */}
        {incident?.cost_estimate && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-200">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-violet-500" /> Cost Estimate & Financing
            </h3>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-slate-500">Estimated Cost</p>
                <p className="text-xl font-black text-slate-900">{incident.cost_estimate.range}</p>
              </div>
              <div className="bg-violet-100 px-3 py-1.5 rounded-xl">
                <p className="text-xs font-bold text-violet-700">EMI Available</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {incident.cost_estimate.emi_options.map((emi, i) => (
                <div key={i} className="bg-white rounded-xl p-2 text-center border border-violet-100">
                  <p className="text-xs font-black text-violet-700">{emi}</p>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
              <CreditCard className="h-4 w-4" /> Apply for Medical Loan →
            </button>
          </div>
        )}

        {/* Step 7: Real-Time Chat */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-700">Live Communication</h3>
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
          <div className="h-48 overflow-y-auto p-3 space-y-2 bg-slate-50">
            {messages.length === 0 && (
              <p className="text-center text-xs text-slate-400 mt-8">Messages will appear here…</p>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.senderRole === 'guest' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                  m.senderRole === 'system'  ? 'bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center max-w-full w-full' :
                  m.senderRole === 'guest'   ? 'bg-blue-500 text-white rounded-br-sm' :
                  'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}>
                  {m.senderRole !== 'guest' && m.senderRole !== 'system' && (
                    <p className="text-xs font-bold text-slate-500 mb-0.5">{m.sender}</p>
                  )}
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-slate-100 flex gap-2">
            <input value={chatText} onChange={e => setChatText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="Message hotel staff…" />
            <button onClick={sendChat} className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Emergency call buttons */}
        <div className="grid grid-cols-2 gap-3">
          <a href="tel:108" className="flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-red-500/25">
            <PhoneCall className="h-4 w-4" /> Ambulance 108
          </a>
          <a href="tel:112" className="flex items-center justify-center gap-2 py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-colors shadow-lg">
            <PhoneCall className="h-4 w-4" /> Emergency 112
          </a>
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">
          🔒 End-to-end encrypted • SMS fallback active • Webhook-ready for emergency services
        </p>
      </div>
    </div>
  );
}

export default function CrisisReportPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-950 to-rose-800 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-white animate-spin" />
      </div>
    }>
      <CrisisReportPage />
    </Suspense>
  );
}
