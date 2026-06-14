'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Shield, CheckCircle2, Clock, MapPin,
  User, BellRing, Ambulance, Hospital, CreditCard,
  MessageSquare, Send, Activity, RefreshCw, BadgeAlert,
  Building2, Zap, PhoneCall, X, ChevronDown, ChevronUp,
  Radio, BarChart3, Users, TrendingUp, QrCode
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { io, Socket } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Incident {
  id: string;
  room: string;
  floor: string;
  guest_name: string;
  type: string;
  status: string;
  severity: string;
  condition?: string;
  icd10?: string;
  action?: string;
  assigned_responder?: { id: string; name: string; role: string };
  hospital_recommendation?: Record<string, { name: string; dist: string; dept: string; tier: string }>;
  cost_estimate?: { range: string; emi_options: string[]; loan_available: boolean };
  hospital_notification?: {
    id: string;
    hospital: string;
    hospital_dept: string;
    sent_at: string;
    status: 'sent' | 'acknowledged' | 'bed_ready' | 'patient_arrived';
    bed_number?: string;
    hospital_responder?: string;
    eta_confirmation?: string;
  };
  messages: { id: string; sender: string; senderRole: string; text: string; timestamp: string }[];
  ambulance_alert?: { demo_message: string };
  created_at: string;
  response_time_minutes?: number;
}

interface Responder {
  id: string;
  name: string;
  role: string;
  status: 'available' | 'busy' | 'off-duty';
  location: { floor: number; zone: string };
}

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high:     'bg-orange-100 text-orange-700 border-orange-300',
  moderate: 'bg-amber-100 text-amber-700 border-amber-300',
  low:      'bg-green-100 text-green-700 border-green-300',
  assessing:'bg-blue-100 text-blue-700 border-blue-300',
};

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-red-50 border-l-4 border-l-red-500',
  assigned: 'bg-amber-50 border-l-4 border-l-amber-400',
  accepted: 'bg-blue-50 border-l-4 border-l-blue-400',
  enroute:  'bg-indigo-50 border-l-4 border-l-indigo-500',
  arrived:  'bg-violet-50 border-l-4 border-l-violet-500',
  resolved: 'bg-emerald-50 border-l-4 border-l-emerald-500',
};

const STATUS_FLOW = ['pending', 'assigned', 'accepted', 'enroute', 'arrived', 'resolved'];

export default function CrisisDashboard() {
  const { t, language } = useLanguage();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [chatText, setChatText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [expanded, setExpanded] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [notifQueue, setNotifQueue] = useState<string[]>([]);

  const activeCount   = incidents.filter(i => !['resolved'].includes(i.status)).length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;
  const criticalCount = incidents.filter(i => ['critical','high'].includes(i.severity) && i.status !== 'resolved').length;
  const availableCount = responders.filter(r => r.status === 'available').length;

  // Initial fetch
  const fetchAll = async () => {
    try {
      const [incRes, rspRes] = await Promise.all([
        fetch(`${API}/api/crisis/incidents`).then(r => r.json()),
        fetch(`${API}/api/crisis/responders`).then(r => r.json()),
      ]);
      if (incRes.success) setIncidents(incRes.incidents);
      if (rspRes.success) setResponders(rspRes.responders);
      setLastUpdate(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Socket real-time updates
  useEffect(() => {
    const socket = io(API, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('new_incident', (incident: Incident) => {
      setIncidents(prev => [incident, ...prev]);
      setNotifQueue(q => [...q, `🚨 NEW: Room ${incident.room} — ${incident.type}`]);
      setLastUpdate(new Date());
    });

    socket.on('incident_enriched', (updated: Incident) => {
      setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
      setSelected(sel => sel?.id === updated.id ? updated : sel);
      setLastUpdate(new Date());
    });

    socket.on('incident_assigned', (updated: Incident) => {
      setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
      setSelected(sel => sel?.id === updated.id ? updated : sel);
      setNotifQueue(q => [...q, `✅ ${updated.assigned_responder?.name} assigned to Room ${updated.room}`]);
      setLastUpdate(new Date());
    });

    socket.on('incident_status_update', (updated: Incident) => {
      setIncidents(prev => prev.map(i => i.id === updated.id ? updated : i));
      setSelected(sel => sel?.id === updated.id ? updated : sel);
      if (updated.status === 'resolved')
        setNotifQueue(q => [...q, `✅ RESOLVED: Incident ${updated.id} — ${updated.response_time_minutes} min`]);
      setLastUpdate(new Date());
    });

    socket.on('incident_message', (msg: Incident['messages'][0]) => {
      setSelected(sel => sel ? { ...sel, messages: [...sel.messages, msg] } : sel);
    });

    socket.on('hospital_acknowledged', (data: { incidentId: string; bed_number: string; hospital: string; eta_confirmation: string }) => {
      setIncidents(prev => prev.map(i => i.id === data.incidentId
        ? { ...i, hospital_notification: { ...i.hospital_notification!, status: 'acknowledged', bed_number: data.bed_number } } : i
      ));
      setSelected(sel => sel?.id === data.incidentId
        ? { ...sel, hospital_notification: { ...sel.hospital_notification!, status: 'acknowledged', bed_number: data.bed_number } } : sel
      );
      setNotifQueue(q => [...q, `🏥 ${data.hospital} acknowledged — Bed ${data.bed_number} ready`]);
    });

    socket.on('hospital_bed_ready', (data: { incidentId: string; bed_number: string }) => {
      setSelected(sel => sel?.id === data.incidentId
        ? { ...sel, hospital_notification: { ...sel.hospital_notification!, status: 'bed_ready', bed_number: data.bed_number } } : sel
      );
    });

    return () => { socket.disconnect(); };
  }, []);

  // Clear notifications after 5s
  useEffect(() => {
    if (notifQueue.length > 0) {
      const t = setTimeout(() => setNotifQueue(q => q.slice(1)), 4000);
      return () => clearTimeout(t);
    }
  }, [notifQueue]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  // Join selected incident room
  useEffect(() => {
    if (selected && socketRef.current) {
      socketRef.current.emit('join_incident', selected.id);
    }
  }, [selected?.id]);

  const updateStatus = async (incidentId: string, status: string) => {
    await fetch(`${API}/api/crisis/status/${incidentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchAll();
  };

  const assignResponder = async (incidentId: string, responderId?: string) => {
    await fetch(`${API}/api/crisis/assign/${incidentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responderId }),
    });
    fetchAll();
  };

  const sendChat = async () => {
    if (!chatText.trim() || !selected) return;
    const msg = { incidentId: selected.id, sender: 'Admin', senderRole: 'admin', text: chatText };
    await fetch(`${API}/api/crisis/chat/${selected.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
    if (socketRef.current) socketRef.current.emit('crisis_message', msg);
    setSelected(sel => sel ? { ...sel, messages: [...sel.messages, {
      id: `a-${Date.now()}`, sender: 'Admin', senderRole: 'admin', text: chatText, timestamp: new Date().toISOString(),
    }]} : sel);
    setChatText('');
  };

  const getNextStatus = (current: string) => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">

      {/* ── Toast Notifications ── */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {notifQueue.map((n, i) => (
          <div key={i} className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold animate-in slide-in-from-right duration-300 max-w-xs">
            {n}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${activeCount > 0 ? 'bg-red-100 border-red-200 animate-pulse' : 'bg-slate-100 border-slate-200'}`}>
            <Radio className={`h-6 w-6 ${activeCount > 0 ? 'text-red-600' : 'text-slate-500'}`} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Crisis Command Center</h1>
            <p className="text-sm text-slate-500 font-medium">
              Last updated: {lastUpdate.toLocaleTimeString()} •{' '}
              <span className={`font-bold ${activeCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {activeCount > 0 ? `${activeCount} ACTIVE` : 'All Clear'}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <Link href="/dashboard/crisis/qr" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-500/25">
            <QrCode className="h-4 w-4" /> QR Codes
          </Link>
          <a href="/hospital/portal" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-500/25">
            <Hospital className="h-4 w-4" /> Hospital Portal
          </a>
          <a href="/crisis/report" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-500/25">
            <AlertTriangle className="h-4 w-4" /> Guest SOS
          </a>
        </div>
      </header>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Incidents', value: activeCount, icon: AlertTriangle, color: 'rose', pulse: activeCount > 0 },
          { label: 'Critical / High', value: criticalCount, icon: BadgeAlert, color: 'orange', pulse: criticalCount > 0 },
          { label: 'Resolved Today', value: resolvedCount, icon: CheckCircle2, color: 'emerald', pulse: false },
          { label: 'Staff Available', value: availableCount, icon: Users, color: 'blue', pulse: false },
        ].map((stat, i) => (
          <div key={i} className={`bg-white rounded-2xl p-4 border border-slate-100 shadow-sm ${stat.pulse ? 'ring-2 ring-red-300/50' : ''}`}>
            <div className={`p-2 rounded-xl w-fit mb-3 ${
              stat.color === 'rose' ? 'bg-rose-100' : stat.color === 'orange' ? 'bg-orange-100' :
              stat.color === 'emerald' ? 'bg-emerald-100' : 'bg-blue-100'
            }`}>
              <stat.icon className={`h-5 w-5 ${
                stat.color === 'rose' ? 'text-rose-600' : stat.color === 'orange' ? 'text-orange-600' :
                stat.color === 'emerald' ? 'text-emerald-600' : 'text-blue-600'
              } ${stat.pulse ? 'animate-pulse' : ''}`} />
            </div>
            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── LEFT: Incident List ── */}
        <div className="xl:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Live Incidents</h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{incidents.length} total</span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
              <p className="font-bold text-slate-700">All Clear</p>
              <p className="text-sm text-slate-400 mt-1">No active incidents</p>
              <a href="/crisis/report" target="_blank" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600">
                Test Guest SOS →
              </a>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {incidents.map(inc => (
                <button key={inc.id}
                  onClick={() => setSelected(sel => sel?.id === inc.id ? null : inc)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all hover:shadow-md ${STATUS_COLORS[inc.status] || 'bg-white border-slate-200'} ${selected?.id === inc.id ? 'ring-2 ring-blue-400/60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{inc.id}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> Room {inc.room} • {inc.type}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${SEV_COLORS[inc.severity] || 'bg-slate-100 text-slate-600'}`}>
                      {inc.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{inc.guest_name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      inc.status === 'pending'  ? 'bg-red-100 text-red-700' :
                      inc.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{inc.status.toUpperCase()}</span>
                  </div>
                  {inc.condition && (
                    <p className="text-xs text-slate-500 mt-1.5 truncate">{inc.condition}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Incident Detail Panel ── */}
        <div className="xl:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-slate-100 h-full min-h-[60vh] flex flex-col items-center justify-center p-8 shadow-sm">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-slate-300" />
              </div>
              <p className="font-bold text-slate-500">Select an incident to manage</p>
              <p className="text-sm text-slate-400 mt-1 text-center">Click any incident from the left panel to view details, assign responders, and communicate.</p>

              {/* Responder Status Overview */}
              <div className="mt-6 w-full max-w-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Staff Status</h3>
                <div className="space-y-2">
                  {responders.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                        r.status === 'available' ? 'bg-emerald-400' :
                        r.status === 'busy' ? 'bg-red-400' : 'bg-slate-300'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.role} • Floor {r.location.floor}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'busy' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                      }`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Detail Header */}
              <div className={`rounded-2xl p-4 ${STATUS_COLORS[selected.status] || 'bg-white border border-slate-100'} shadow-sm`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-slate-900 text-lg">{selected.id}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${SEV_COLORS[selected.severity]}`}>
                        {selected.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" /> Room {selected.room} • {selected.guest_name} •
                      <span className="capitalize">{selected.type}</span>
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-white/50 rounded-lg transition-colors">
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {selected.status === 'pending' && (
                    <button onClick={() => assignResponder(selected.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">
                      <Zap className="h-3.5 w-3.5" /> Auto-Assign Responder
                    </button>
                  )}
                  {getNextStatus(selected.status) && selected.status !== 'pending' && (
                    <button onClick={() => updateStatus(selected.id, getNextStatus(selected.status)!)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Mark: {getNextStatus(selected.status)?.toUpperCase()}
                    </button>
                  )}
                  {selected.status === 'arrived' && (
                    <button onClick={() => updateStatus(selected.id, 'resolved')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark RESOLVED
                    </button>
                  )}
                  <a href="tel:108" className="flex items-center gap-1.5 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold rounded-xl transition-colors">
                    <PhoneCall className="h-3.5 w-3.5" /> 108
                  </a>
                </div>
              </div>

              {/* 2-col grid for AI + Responder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AI Assessment */}
                {selected.condition && (
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <BadgeAlert className="h-3.5 w-3.5 text-red-500" /> AI Assessment
                    </h3>
                    <p className="font-bold text-slate-900 text-sm mb-1">{selected.condition}</p>
                    <p className="text-xs text-slate-500 mb-2">{selected.action}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">ICD-10: {selected.icd10}</span>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{selected.hospital_dept}</span>
                    </div>
                    {selected.ambulance_alert && (
                      <div className="mt-2 p-2 bg-red-50 rounded-xl border border-red-100 flex items-center gap-2">
                        <Ambulance className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <p className="text-xs text-red-600 font-medium">{selected.ambulance_alert.demo_message}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Responder Panel */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-indigo-500" /> Responder
                  </h3>
                  {selected.assigned_responder ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center font-black text-indigo-700">
                        {selected.assigned_responder.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{selected.assigned_responder.name}</p>
                        <p className="text-xs text-slate-500">{selected.assigned_responder.role}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500 mb-2">Assign a responder:</p>
                      {responders.filter(r => r.status === 'available').map(r => (
                        <button key={r.id}
                          onClick={() => assignResponder(selected.id, r.id)}
                          className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 transition-all text-left"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <div>
                            <p className="text-sm font-bold text-slate-800">{r.name}</p>
                            <p className="text-xs text-slate-500">{r.role} • Floor {r.location.floor}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Hospital Intelligence */}
              {selected.hospital_recommendation && (
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Hospital className="h-3.5 w-3.5 text-emerald-500" /> Hospital Intelligence
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {Object.entries(selected.hospital_recommendation).map(([key, h]) => (
                      <div key={key} className={`p-3 rounded-xl border text-sm ${key === 'primary' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Building2 className={`h-3.5 w-3.5 ${key === 'primary' ? 'text-emerald-600' : 'text-slate-500'}`} />
                          <span className={`text-xs font-black uppercase ${key === 'primary' ? 'text-emerald-700' : 'text-slate-500'}`}>{key}</span>
                        </div>
                        <p className="font-bold text-slate-900 leading-tight text-xs">{h.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{h.dist} • {h.tier}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hospital Bridge — Hotel ↔ Hospital Communication */}
              {selected.hospital_notification && (
                <div className={`rounded-2xl p-4 border shadow-sm ${
                  selected.hospital_notification.status === 'patient_arrived' ? 'bg-emerald-50 border-emerald-200' :
                  selected.hospital_notification.status === 'bed_ready'       ? 'bg-violet-50 border-violet-200' :
                  selected.hospital_notification.status === 'acknowledged'    ? 'bg-amber-50 border-amber-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <Hospital className="h-3.5 w-3.5 text-emerald-600" /> Hotel → Hospital Bridge
                    </span>
                    <a href="/hospital/portal" target="_blank"
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold underline">
                      Open Hospital Portal →
                    </a>
                  </h3>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm font-bold text-slate-900">{selected.hospital_notification.hospital}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs text-slate-600">Dept: {selected.hospital_notification.hospital_dept}</span>
                      </div>
                      {selected.hospital_notification.bed_number && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" />
                          <span className="text-xs font-bold text-violet-700">Bed: {selected.hospital_notification.bed_number}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${
                        selected.hospital_notification.status === 'patient_arrived' ? 'bg-emerald-100 text-emerald-700' :
                        selected.hospital_notification.status === 'bed_ready'       ? 'bg-violet-100 text-violet-700' :
                        selected.hospital_notification.status === 'acknowledged'    ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {selected.hospital_notification.status === 'sent'            ? '📤 Alert Sent' :
                         selected.hospital_notification.status === 'acknowledged'    ? '✅ Acknowledged' :
                         selected.hospital_notification.status === 'bed_ready'       ? '🛏️ Bed Ready' :
                         '✅ Patient Arrived'}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(selected.hospital_notification.sent_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cost + EMI (UNIQUE) */}
              {selected.cost_estimate && (
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-violet-500" /> Cost Estimate & Finance Options
                  </h3>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-slate-500">Estimated Range</p>
                      <p className="text-2xl font-black text-slate-900">{selected.cost_estimate.range}</p>
                    </div>
                    <span className="bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-xl">Loan Available</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {selected.cost_estimate.emi_options.map((emi, i) => (
                      <div key={i} className="bg-white rounded-xl p-2 text-center border border-violet-100">
                        <p className="text-xs font-black text-violet-700">{emi}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-time Chat */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-700">Incident Communication</h3>
                  <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                  </span>
                </div>
                <div className="h-40 overflow-y-auto p-3 space-y-2 bg-slate-50">
                  {(selected.messages || []).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 mt-6">No messages yet</p>
                  ) : (selected.messages || []).map(m => (
                    <div key={m.id} className={`flex ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        m.senderRole === 'system'  ? 'bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center max-w-full w-full' :
                        m.senderRole === 'admin'   ? 'bg-indigo-500 text-white rounded-br-sm' :
                        m.senderRole === 'guest'   ? 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm' :
                        'bg-slate-100 text-slate-700 rounded-bl-sm'
                      }`}>
                        {!['admin','system'].includes(m.senderRole) && (
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
                    placeholder="Message to guest or responder…" />
                  <button onClick={sendChat} className="p-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
