'use client';

import React, { useState } from 'react';
import { Ambulance, MapPin, Phone, AlertTriangle, Navigation, Clock, CheckCircle2, Radio, Users, Zap, Play, Square, Wifi } from 'lucide-react';
import Link from 'next/link';
import { useUserRole } from '@/context/UserRoleContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useHealthcareJourney } from '@/context/HealthcareJourneyContext';

const HOSPITALS_NEARBY = [
  { name: 'Govt. District Hospital', distance: '2.1 km', beds: 12, speciality: 'General + ICU' },
  { name: 'King George Hospital', distance: '4.7 km', beds: 3, speciality: 'Trauma & Cardiac' },
  { name: 'AIIMS Mangalagiri', distance: '18 km', beds: 8, speciality: 'Multi-Speciality' },
];

export default function AmbulanceDashboardView() {
  const { setRole } = useUserRole();
  const { journeys } = useHealthcareJourney();
  const {
    activeAmbulanceStream,
    isBroadcastingGps,
    startAmbulanceGpsBroadcast,
    stopAmbulanceGpsBroadcast,
    updateAmbulanceLocation,
    activeSosAlerts,
    sendCrossPanelToast,
  } = useRealtime();

  const emergencyJourneys = journeys.filter(j => j.currentStep === 'transit' || j.id.startsWith('EMR'));

  // Build and deduplicate live emergency calls with guaranteed valid unique IDs
  const liveCalls = React.useMemo(() => {
    const rawCalls = [
      ...activeSosAlerts.map((alert, idx) => ({
        id: alert.dispatchId || (alert as any).id || `SOS-ALERT-${idx}`,
        patient: alert.patientName || 'Emergency Patient',
        location: alert.location || alert.village || (alert as any).locationName || 'Ward 14, Peruru',
        type: alert.message || (alert as any).emergencyType || 'Cardiac Emergency',
        distance: '1.2 km',
        eta: alert.eta || '4 min',
        status: 'en_route',
        priority: alert.priority || ('critical' as const),
        vehicleNo: alert.vehicleNo || 'AP-39-AMB-108',
      })),
      ...emergencyJourneys.map((j, idx) => ({
        id: j.id || `EMR-JOURNEY-${idx}`,
        patient: j.patientName,
        location: j.village,
        type: j.symptoms || 'OPD Emergency Transfer',
        distance: '2.4 km',
        eta: '7 min',
        status: 'en_route',
        priority: 'high' as const,
        vehicleNo: 'AP-39-AMB-108',
      })),
    ];

    // Deduplicate by ID to guarantee unique keys
    const seen = new Set<string>();
    return rawCalls.filter(call => {
      if (!call.id || seen.has(call.id)) return false;
      seen.add(call.id);
      return true;
    });
  }, [activeSosAlerts, emergencyJourneys]);

  const [activeCall, setActiveCall] = useState<string>('EMR-2026-0412');
  const currentCallId = liveCalls[0]?.id || activeCall;

  const handleToggleBroadcast = () => {
    if (isBroadcastingGps) {
      stopAmbulanceGpsBroadcast();
      sendCrossPanelToast({
        targetRole: 'doctor',
        type: 'info',
        title: '🚑 Ambulance GPS Update',
        message: `Ambulance AP-39-AMB-108 paused GPS broadcast`,
      });
    } else {
      startAmbulanceGpsBroadcast(activeCall);
      sendCrossPanelToast({
        targetRole: 'doctor',
        type: 'warning',
        title: '🚨 Live GPS Telemetry Active',
        message: `Ambulance AP-39-AMB-108 is broadcasting live location for Dispatch #${activeCall}`,
      });
    }
  };

  const handleStatusChange = (newStatus: 'en_route' | 'arrived_scene' | 'transporting' | 'arrived_hospital') => {
    updateAmbulanceLocation({
      dispatchId: activeCall,
      status: newStatus,
    });
    sendCrossPanelToast({
      type: 'info',
      title: `🚑 Dispatch #${activeCall} Status Changed`,
      message: `Status updated to '${newStatus.toUpperCase().replace('_', ' ')}'`,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">

      {/* Role Switch Banner */}
      <div className="bg-rose-950 text-white rounded-3xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-rose-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg">
            <Ambulance className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-bold text-rose-300">Current View</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Wifi className="h-3 w-3 text-emerald-400 animate-pulse" />
                Live Realtime Dispatch Console
              </span>
            </div>
            <p className="text-sm text-rose-200 font-medium mt-0.5">Emergency Response · Real-Time GPS Tracking · Hospital Bed Routing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setRole('patient')} className="px-4 py-2.5 bg-rose-900 hover:bg-rose-800 text-rose-200 rounded-xl text-xs font-bold transition-all border border-rose-700">Patient View</button>
          <button onClick={() => setRole('doctor')} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md">Doctor EHR</button>
        </div>
      </div>

      {/* Live GPS Broadcast Console */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 border border-rose-500/30 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-900/50 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-full text-xs font-mono font-bold">
                ID: {activeAmbulanceStream?.dispatchId || 'EMR-2026-0412'}
              </span>
              <span className="text-xs text-slate-300 font-semibold">Vehicle: {activeAmbulanceStream?.vehicleNo || 'AP-39-AMB-108'}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
              Live Ambulance Telemetry Broadcast
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleBroadcast}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-extrabold transition-all shadow-lg ${
                isBroadcastingGps
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/30 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isBroadcastingGps ? (
                <>
                  <Square className="h-4 w-4 fill-white" /> Stop Live GPS Stream
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" /> Start Live GPS Stream
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Telemetry Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Lat / Lng</span>
            <p className="font-mono text-sm font-bold text-rose-400">
              {activeAmbulanceStream?.lat.toFixed(4)}, {activeAmbulanceStream?.lng.toFixed(4)}
            </p>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Speed</span>
            <p className="font-mono text-lg font-black text-emerald-400">{activeAmbulanceStream?.speed || 48} km/h</p>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ETA to Patient</span>
            <p className="font-mono text-lg font-black text-amber-400">{activeAmbulanceStream?.eta || 4} mins</p>
          </div>
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Status</span>
            <p className="font-extrabold text-sm uppercase tracking-wide text-cyan-400">
              {activeAmbulanceStream?.status.replace('_', ' ') || 'EN ROUTE'}
            </p>
          </div>
        </div>

        {/* Status Stage Switcher */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-bold text-slate-400 mr-2">Update Stage:</span>
          {[
            { id: 'en_route', label: '1. En Route' },
            { id: 'arrived_scene', label: '2. Arrived Scene' },
            { id: 'transporting', label: '3. Transporting' },
            { id: 'arrived_hospital', label: '4. Hospital Arrival' },
          ].map(stage => (
            <button
              key={stage.id}
              onClick={() => handleStatusChange(stage.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                activeAmbulanceStream?.status === stage.id
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Dispatches', value: `${liveCalls.length}`, sub: 'Live SOS Calls', icon: Radio, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
          { label: 'Avg Response', value: '4.8 min', sub: 'Today', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Completed', value: '0', sub: 'Today', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Crew On-Duty', value: '3', sub: 'Drivers active', icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} border ${s.border} flex items-center justify-center`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-bold text-slate-500">{s.label}</p>
              <p className="text-[10px] text-slate-400 font-medium">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Emergency Calls Queue */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-xl text-slate-900">Live Emergency Queue (EMR Tracking IDs)</h3>
            <p className="text-xs text-slate-500 font-medium">Incoming dispatch calls — synchronized live with Patient & Doctor panels</p>
          </div>
          <span className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            REALTIME SOCKET
          </span>
        </div>

        <div className="space-y-3">
          {liveCalls.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <Ambulance className="h-7 w-7" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">Emergency Queue Standby — No Active 108 Calls</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All 108 ambulance units are stationed and ready in Kurnool district. When an emergency SOS is triggered from the patient app or ASHA field console, live dispatches will appear here.
              </p>
              <Link
                href="/dashboard/emergency"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
              >
                <AlertTriangle className="h-4 w-4" /> Trigger Test Emergency SOS
              </Link>
            </div>
          ) : (
            liveCalls.map((call, idx) => (
              <div
                key={call.id || `dispatch-${idx}`}
                onClick={() => {
                  setActiveCall(call.id);
                  updateAmbulanceLocation({ dispatchId: call.id, patientName: call.patient, locationName: call.location });
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  currentCallId === call.id
                    ? 'border-rose-300 bg-rose-50/50 ring-2 ring-rose-200'
                    : 'border-slate-200/80 hover:border-rose-200 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      call.priority === 'critical' ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-slate-900">{call.patient}</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          call.priority === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>{call.priority}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">{call.id}</span>
                        <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">{call.vehicleNo}</span>
                      </div>
                      <p className="text-sm font-bold text-rose-600">{call.type}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{call.location}</span>
                        <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />{call.distance}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />ETA {call.eta}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all">
                      <Phone className="h-3.5 w-3.5" /> Call
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startAmbulanceGpsBroadcast(call.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      <Navigation className="h-3.5 w-3.5" /> Stream GPS
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Nearby Hospitals with Available Beds */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-5">
        <div>
          <h3 className="font-extrabold text-xl text-slate-900">Nearby Hospitals — Live Bed Status</h3>
          <p className="text-xs text-slate-500 font-medium">Route patient to nearest available hospital</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {HOSPITALS_NEARBY.map((h) => (
            <div key={h.name} className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-extrabold text-slate-900 text-sm leading-snug">{h.name}</p>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                  h.beds > 5 ? 'bg-emerald-100 text-emerald-800' : h.beds > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>{h.beds} beds</span>
              </div>
              <div className="space-y-1 text-xs text-slate-500 font-medium">
                <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{h.distance}</p>
                <p className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-slate-400" />{h.speciality}</p>
              </div>
              <button
                onClick={() => {
                  sendCrossPanelToast({
                    targetRole: 'doctor',
                    type: 'info',
                    title: '🏥 Hospital Reserved',
                    message: `Ambulance AP-39-AMB-108 reserved ICU bed at ${h.name}`,
                  });
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Reserve ICU Bed
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

