'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Hospital, AlertTriangle, Clock, User, Activity,
  CheckCircle2, BedDouble, Ambulance, MapPin, PhoneCall,
  Heart, Stethoscope, ClipboardList, RefreshCw, Radio,
  ArrowRight, BadgeAlert, Building2, Shield, ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const HOSPITAL_ID = 'apollo_emergency';
const HOSPITAL_NAME = 'Apollo Emergency Care';

interface PatientNotification {
  id: string;
  incident_id: string;
  hospital: string;
  hospital_dept: string;
  sent_at: string;
  status: 'sent' | 'acknowledged' | 'bed_ready' | 'patient_arrived';
  acknowledged_at?: string;
  arrived_at?: string;
  bed_number?: string;
  hospital_responder?: string;
  eta_confirmation?: string;
  hospital_notes?: string;
  incident_status?: string;
  venue_type?: string;
  responder?: { name: string; role: string } | null;
  patient: {
    name: string;
    age: string;
    condition: string;
    icd10: string;
    severity: string;
    symptoms: string;
    action_taken: string;
    venue: string;
    estimated_arrival: string;
  };
  webhook: { endpoint: string; status: string };
}

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high:     'bg-orange-100 text-orange-700 border-orange-300',
  moderate: 'bg-amber-100 text-amber-700 border-amber-300',
  low:      'bg-green-100 text-green-700 border-green-300',
};

const STATUS_FLOW: Record<string, { label: string; color: string; next: string | null }> = {
  sent:            { label: 'Alert Received',   color: 'bg-blue-100 text-blue-700',    next: 'acknowledge' },
  acknowledged:    { label: 'Acknowledged',     color: 'bg-amber-100 text-amber-700',  next: 'bed-ready' },
  bed_ready:       { label: 'Bed Ready',        color: 'bg-violet-100 text-violet-700',next: 'patient-arrived' },
  patient_arrived: { label: 'Patient Arrived',  color: 'bg-emerald-100 text-emerald-700', next: null },
};

export default function HospitalPortal() {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [selected, setSelected] = useState<PatientNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bedInput, setBedInput] = useState('ER-A01');
  const [responderInput, setResponderInput] = useState('Dr. Sharma (ER)');
  const [notesInput, setNotesInput] = useState('');
  const [toasts, setToasts] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [caseStats, setCaseStats] = useState<{ total: number; acknowledged: number; bedReady: number; arrived: number; pending: number; avgResponseMinutes: number }>({ total: 0, acknowledged: 0, bedReady: 0, arrived: 0, pending: 0, avgResponseMinutes: 0 });
  const [caseHistory, setCaseHistory] = useState<any[]>([]);

  useEffect(() => { setIsMounted(true); }, []);

  const addToast = (msg: string) => {
    setToasts(q => [...q, msg]);
    setTimeout(() => setToasts(q => q.slice(1)), 4500);
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API}/api/crisis/hospital/notifications`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json());
      if (res.success) {
        setNotifications(res.notifications);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.warn('Hospital portal: backend not reachable yet', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/crisis/hospital/stats`, { signal: AbortSignal.timeout(8000) }).then(r => r.json());
      if (res.success) { setCaseStats(res.stats); setCaseHistory(res.cases || []); }
    } catch {}
  };

  // Socket.io — join hospital portal room
  useEffect(() => {
    const socket = io(API, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('hospital_join', HOSPITAL_ID);

    socket.on('incoming_patient', (notif: PatientNotification) => {
      setNotifications(prev => [notif, ...prev]);
      addToast(`🚨 NEW PATIENT: ${notif.patient.name} — ${notif.patient.condition} (${notif.patient.severity?.toUpperCase()})`);
      setLastUpdate(new Date());
    });

    socket.on('hospital_acknowledged', (data) => {
      setNotifications(prev => prev.map(n =>
        n.incident_id === data.incidentId ? { ...n, status: 'acknowledged', bed_number: data.bed_number } : n
      ));
      setSelected(sel => sel?.incident_id === data.incidentId ? { ...sel, status: 'acknowledged', bed_number: data.bed_number } : sel);
    });

    socket.on('hospital_bed_ready', (data) => {
      setNotifications(prev => prev.map(n =>
        n.incident_id === data.incidentId ? { ...n, status: 'bed_ready', bed_number: data.bed_number } : n
      ));
      setSelected(sel => sel?.incident_id === data.incidentId ? { ...sel, status: 'bed_ready' } : sel);
    });

    return () => { socket.disconnect(); };
  }, []);

  const acknowledge = async () => {
    if (!selected) return;
    const res = await fetch(`${API}/api/crisis/hospital/acknowledge/${selected.incident_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bed_number: bedInput, responder_name: responderInput, eta_confirmation: '10 min' }),
    }).then(r => r.json());
    if (res.success) {
      addToast(`✅ Acknowledged — Bed ${bedInput} confirmed`);
      fetchNotifications();
      setSelected(s => s ? { ...s, status: 'acknowledged', bed_number: bedInput } : s);
    }
  };

  const markBedReady = async () => {
    if (!selected) return;
    const res = await fetch(`${API}/api/crisis/hospital/bed-ready/${selected.incident_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bed_number: bedInput, notes: notesInput }),
    }).then(r => r.json());
    if (res.success) {
      addToast(`🛏️ Bed ${bedInput} marked ready`);
      fetchNotifications();
      setSelected(s => s ? { ...s, status: 'bed_ready' } : s);
    }
  };

  const markArrived = async () => {
    if (!selected) return;
    const res = await fetch(`${API}/api/crisis/hospital/patient-arrived/${selected.incident_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json());
    if (res.success) {
      addToast(`✅ ${selected.patient.name} marked as arrived — Loop closed`);
      fetchNotifications();
      setSelected(s => s ? { ...s, status: 'patient_arrived' } : s);
    }
  };

  const pendingCount = notifications.filter(n => n.status === 'sent').length;
  const activeCount  = notifications.filter(n => ['sent','acknowledged','bed_ready'].includes(n.status)).length;
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none max-w-sm">
        {toasts.map((t, i) => (
          <div key={i} className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold animate-in slide-in-from-right duration-300">
            {t}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div className={`${pendingCount > 0 ? 'bg-gradient-to-r from-red-700 to-rose-600' : 'bg-gradient-to-r from-emerald-700 to-teal-600'} text-white px-6 py-4 shadow-lg`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 border border-white/20">
              <Hospital className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold">{HOSPITAL_NAME}</h1>
              <p className="text-sm text-white/80 flex items-center gap-2">
                Emergency Incoming Patient Portal •{' '}
                <span className={`font-bold ${pendingCount > 0 ? 'text-yellow-300 animate-pulse' : 'text-emerald-300'}`}>
                  {pendingCount > 0 ? `${pendingCount} PENDING` : 'All Clear'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/70" suppressHydrationWarning>
              {isMounted && lastUpdate ? `Updated: ${lastUpdate.toLocaleTimeString()}` : 'Connecting...'}
            </span>
            <button onClick={fetchNotifications}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 border border-white/20 rounded-xl text-sm font-bold transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold bg-white/15 px-3 py-2 rounded-xl border border-white/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Live
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">

        {/* KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 sm:mb-6">
          {[
            { label: 'Incoming Alerts',  value: notifications.length, icon: AlertTriangle, color: 'rose'    },
            { label: 'Awaiting Action',  value: pendingCount,          icon: Radio,         color: 'orange'  },
            { label: 'Beds Prepared',    value: notifications.filter(n => n.status === 'bed_ready').length, icon: BedDouble, color: 'violet' },
            { label: 'Patients Arrived', value: notifications.filter(n => n.status === 'patient_arrived').length, icon: CheckCircle2, color: 'emerald' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className={`p-2 rounded-xl w-fit mb-2 ${
                s.color === 'rose' ? 'bg-rose-100' : s.color === 'orange' ? 'bg-orange-100' :
                s.color === 'violet' ? 'bg-violet-100' : 'bg-emerald-100'
              }`}>
                <s.icon className={`h-5 w-5 ${
                  s.color === 'rose' ? 'text-rose-600' : s.color === 'orange' ? 'text-orange-600' :
                  s.color === 'violet' ? 'text-violet-600' : 'text-emerald-600'
                }`} />
              </div>
              <p className="text-3xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Case History Analytics — Persistent from Supabase */}
        {caseStats.total > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-500" /> Case History Analytics
              </h3>
              <button onClick={() => setShowHistory(!showHistory)} className="text-xs font-bold text-indigo-600 hover:underline">
                {showHistory ? 'Hide History' : 'View All Cases →'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-blue-700">{caseStats.total}</p>
                <p className="text-[10px] font-bold text-blue-500">Total Cases</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-700">{caseStats.arrived}</p>
                <p className="text-[10px] font-bold text-emerald-500">Resolved</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-amber-700">{caseStats.pending}</p>
                <p className="text-[10px] font-bold text-amber-500">Pending</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-violet-700">{caseStats.avgResponseMinutes || '—'}</p>
                <p className="text-[10px] font-bold text-violet-500">Avg Response (min)</p>
              </div>
              <div className="bg-rose-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-rose-700">{caseStats.total > 0 ? Math.round((caseStats.arrived / caseStats.total) * 100) : 0}%</p>
                <p className="text-[10px] font-bold text-rose-500">Resolution Rate</p>
              </div>
            </div>

            {/* Case History Table */}
            {showHistory && caseHistory.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="text-left p-2 rounded-l-lg font-bold">ID</th>
                      <th className="text-left p-2 font-bold">Patient</th>
                      <th className="text-left p-2 font-bold">Condition</th>
                      <th className="text-left p-2 font-bold">Severity</th>
                      <th className="text-left p-2 font-bold">Status</th>
                      <th className="text-left p-2 rounded-r-lg font-bold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseHistory.map((c: any, i: number) => (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold text-slate-600">{c.incident_ref}</td>
                        <td className="p-2 text-slate-800">{c.patient_name || '—'}</td>
                        <td className="p-2 text-slate-600 max-w-[120px] truncate">{c.patient_condition || '—'}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${SEV_COLORS[c.severity] || 'bg-slate-100 text-slate-600'}`}>
                            {(c.severity || 'unknown').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${STATUS_FLOW[c.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_FLOW[c.status]?.label || c.status}
                          </span>
                        </td>
                        <td className="p-2 text-slate-400">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col xl:grid xl:grid-cols-3 gap-4 sm:gap-6">

          {/* ── LEFT: Incoming Patient List ── */}
          <div className="xl:col-span-1 space-y-3">
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('incomingPatients') || 'Incoming Patients'}</h2>

            {isLoading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
            ) : notifications.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                <p className="font-bold text-slate-600">No incoming patients</p>
                <p className="text-xs text-slate-400 mt-1">Alerts appear here instantly when a hotel triggers SOS</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[40vh] xl:max-h-[65vh] overflow-y-auto pr-1">
                {notifications.map(n => {
                  const st = STATUS_FLOW[n.status] || STATUS_FLOW['sent'];
                  return (
                    <button key={n.id} onClick={() => setSelected(n)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all hover:shadow-md ${
                        n.status === 'sent' ? 'bg-red-50 border-l-4 border-l-red-500' :
                        n.status === 'acknowledged' ? 'bg-amber-50 border-l-4 border-l-amber-400' :
                        n.status === 'bed_ready' ? 'bg-violet-50 border-l-4 border-l-violet-500' :
                        'bg-emerald-50 border-l-4 border-l-emerald-500'
                      } ${selected?.id === n.id ? 'ring-2 ring-blue-400/60' : ''}`}>
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="font-black text-slate-900 text-sm">{n.patient.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {n.patient.venue}
                          </p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${SEV_COLORS[n.patient.severity] || 'bg-slate-100 text-slate-600'}`}>
                          {n.patient.severity?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium truncate mb-2">{n.patient.condition}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${st.color}`}>{st.label}</span>
                        <span className="text-xs text-slate-400">ETA: {n.patient.estimated_arrival}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT: Patient Detail + Actions ── */}
          <div className="xl:col-span-2">
            {!selected ? (
              <div className="bg-white rounded-2xl border border-slate-100 min-h-[60vh] flex flex-col items-center justify-center p-8 shadow-sm">
                <Hospital className="h-12 w-12 text-slate-200 mb-4" />
                <p className="font-bold text-slate-400 text-lg">Select a patient alert</p>
                <p className="text-sm text-slate-400 mt-1 text-center">Click any incoming patient from the left to view full details and take action</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Patient header */}
                <div className={`rounded-2xl p-5 shadow-sm ${
                  selected.status === 'sent'            ? 'bg-red-50 border-l-4 border-red-500' :
                  selected.status === 'acknowledged'    ? 'bg-amber-50 border-l-4 border-amber-400' :
                  selected.status === 'bed_ready'       ? 'bg-violet-50 border-l-4 border-violet-500' :
                  'bg-emerald-50 border-l-4 border-emerald-500'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-black text-slate-900">{selected.patient.name}</h2>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${SEV_COLORS[selected.patient.severity]}`}>
                          {selected.patient.severity?.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" /> {selected.patient.venue}
                        <span>•</span>
                        <Clock className="h-3.5 w-3.5" /> ETA: {selected.patient.estimated_arrival}
                      </p>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-xl ${STATUS_FLOW[selected.status]?.color}`}>
                      {STATUS_FLOW[selected.status]?.label}
                    </span>
                  </div>
                </div>

                {/* Clinical data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-red-500" /> Clinical Data
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-400 w-20 flex-shrink-0">Condition</span>
                        <span className="text-sm font-bold text-slate-900">{selected.patient.condition}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-400 w-20 flex-shrink-0">ICD-10</span>
                        <span className="text-sm font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{selected.patient.icd10}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-400 w-20 flex-shrink-0">Department</span>
                        <span className="text-sm font-bold text-slate-800">{selected.hospital_dept}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-400 w-20 flex-shrink-0">Symptoms</span>
                        <span className="text-sm text-slate-700">{selected.patient.symptoms || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5 text-indigo-500" /> Pre-Hospital Care
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-400 w-24 flex-shrink-0">Action Taken</span>
                        <span className="text-sm text-slate-700">{selected.patient.action_taken}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-400 w-24 flex-shrink-0">Venue Staff</span>
                        <span className="text-sm text-slate-700">
                          {selected.responder ? `${selected.responder.name} (${selected.responder.role})` : 'Hotel Staff'}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-bold text-slate-400 w-24 flex-shrink-0">Venue Type</span>
                        <span className="text-sm font-bold text-slate-800 capitalize">{selected.venue_type || 'Hotel'}</span>
                      </div>
                      {selected.bed_number && (
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-bold text-slate-400 w-24 flex-shrink-0">Bed Assigned</span>
                          <span className="text-sm font-black text-violet-700">{selected.bed_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hospital Actions */}
                {selected.status !== 'patient_arrived' && (
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-emerald-500" /> Hospital Response Actions
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Bed / Room Number</label>
                        <input value={bedInput} onChange={e => setBedInput(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-emerald-500/30"
                          placeholder="ER-A01" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">ER Responder Name</label>
                        <input value={responderInput} onChange={e => setResponderInput(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                          placeholder="Dr. Sharma (ER)" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Hospital Notes (Optional)</label>
                        <input value={notesInput} onChange={e => setNotesInput(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
                          placeholder="e.g., Cardiovascular team on standby" />
                      </div>
                    </div>

                    {/* Action Buttons — sequential flow */}
                    <div className="flex flex-wrap gap-2">
                      {selected.status === 'sent' && (
                        <button onClick={acknowledge}
                          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-amber-500/25">
                          <CheckCircle2 className="h-4 w-4" /> 1. Acknowledge Alert
                        </button>
                      )}
                      {selected.status === 'acknowledged' && (
                        <button onClick={markBedReady}
                          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-violet-500/25">
                          <BedDouble className="h-4 w-4" /> 2. Mark Bed Ready
                        </button>
                      )}
                      {selected.status === 'bed_ready' && (
                        <button onClick={markArrived}
                          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-emerald-500/25">
                          <Hospital className="h-4 w-4" /> 3. Patient Arrived ✓
                        </button>
                      )}
                      <a href="tel:108"
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-sm rounded-xl transition-colors">
                        <PhoneCall className="h-4 w-4" /> Ambulance 108
                      </a>
                    </div>

                    {/* Status note */}
                    <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      Each action is sent back to the venue in real-time — staff and guest are notified instantly
                    </p>
                  </div>
                )}

                {/* Resolved state */}
                {selected.status === 'patient_arrived' && (
                  <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                    <p className="font-black text-emerald-800 text-lg">Loop Closed ✅</p>
                    <p className="text-sm text-emerald-700 mt-1">
                      {selected.patient.name} has been received and is under care. The venue incident is marked resolved.
                    </p>
                  </div>
                )}

                {/* Webhook info */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Integration Info</p>
                  <p className="text-xs text-slate-600 font-mono break-all">{selected.webhook?.endpoint}</p>
                  <p className="text-xs text-slate-500 mt-1">In production: this payload is POSTed to your Hospital Information System (HIS) API for automatic bed management</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How flow works footer */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mt-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Communication Flow: Venue → Hospital</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {[
              { icon: AlertTriangle, label: 'Guest SOS', color: 'text-red-600 bg-red-50' },
              { icon: ArrowRight, label: '', color: 'text-slate-400' },
              { icon: Activity, label: 'AI Enrichment (ICD-10)', color: 'text-indigo-600 bg-indigo-50' },
              { icon: ArrowRight, label: '', color: 'text-slate-400' },
              { icon: Hospital, label: 'Hospital Pre-Alert Sent', color: 'text-emerald-600 bg-emerald-50' },
              { icon: ArrowRight, label: '', color: 'text-slate-400' },
              { icon: CheckCircle2, label: 'Hospital Acknowledges', color: 'text-amber-600 bg-amber-50' },
              { icon: ArrowRight, label: '', color: 'text-slate-400' },
              { icon: BedDouble, label: 'Bed Ready Signal', color: 'text-violet-600 bg-violet-50' },
              { icon: ArrowRight, label: '', color: 'text-slate-400' },
              { icon: Heart, label: 'Patient Arrived → Resolved', color: 'text-rose-600 bg-rose-50' },
            ].map((step, i) => step.label ? (
              <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${step.color} font-bold`}>
                <step.icon className="h-3.5 w-3.5" /> {step.label}
              </div>
            ) : (
              <step.icon key={i} className={`h-4 w-4 ${step.color}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
