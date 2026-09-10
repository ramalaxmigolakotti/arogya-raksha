'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Stethoscope, User, Activity, AlertTriangle, FileText, Pill,
  CheckCircle2, Sparkles, Clock, Send, Shield, ChevronRight,
  TrendingUp, Download, Eye, Plus, ArrowUpRight, ArrowUp, ArrowDown,
  PhoneCall, Play, Pause, SkipForward, AlertCircle, RefreshCw, QrCode
} from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import { useSmartQueue } from '@/context/SmartQueueContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useHealthcareJourney } from '@/context/HealthcareJourneyContext';

interface TriagePatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  triage: 'critical' | 'urgent' | 'stable';
  chiefComplaint: string;
  vitals: { bp: string; hr: number; temp: string; glucose: string; hba1c: string };
  waitTime: string;
  history: string;
}

export default function DoctorDashboardView() {
  const { setRole, user } = useUserRole();
  const { queue, currentConsultingToken, currentlyConsulting, nextToken, totalWaiting, doctorAction } = useSmartQueue();
  const { activeAmbulanceStream, tickets, updateAshaTicket } = useRealtime();
  const { journeys, completeConsultationAndPrescribe, startConsultation } = useHealthcareJourney();

  // Dynamically map real healthcare journeys to active patients list
  const activePatients: TriagePatient[] = journeys
    .filter((j) => ['booked', 'checked_in', 'consulting', 'prescribed'].includes(j.currentStep))
    .map((j) => ({
      id: j.id,
      name: j.patientName,
      age: j.age || 35,
      gender: j.gender || 'Not specified',
      triage: j.ambulanceRequested ? 'critical' : j.currentStep === 'consulting' ? 'urgent' : 'stable',
      chiefComplaint: j.symptoms || j.statusNotes || 'OPD Consultation',
      vitals: {
        bp: j.vitals?.match(/\d+\/\d+/)?.[0] || '120/80',
        hr: 76,
        temp: '36.8 °C',
        glucose: '100 mg/dL',
        hba1c: '5.6%',
      },
      waitTime: j.currentStep === 'consulting' ? 'IN CONSULTATION' : `Token #${j.tokenNumber}`,
      history: `${j.village} • ${j.hospitalName}`,
    }));

  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const selectedPatient = activePatients.find((p) => p.id === selectedPatientId) || activePatients[0] || null;

  const [prescriptions, setPrescriptions] = useState<Array<{ name: string; dose: string; freq: string; dur: string }>>([
    { name: 'Telmisartan 40mg', dose: '1 Tablet', freq: 'Once Daily (Morning)', dur: '30 Days' },
    { name: 'Amlodipine 5mg', dose: '1 Tablet', freq: 'Once Daily (Night)', dur: '30 Days' },
  ]);
  const [newMed, setNewMed] = useState({ name: '', dose: '1 Tablet', freq: 'Twice Daily', dur: '7 Days' });

  const addPrescription = () => {
    if (!newMed.name) return;
    setPrescriptions([...prescriptions, newMed]);
    setNewMed({ name: '', dose: '1 Tablet', freq: 'Twice Daily', dur: '7 Days' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      {/* Role Switch Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-bold text-blue-400">Current View</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold">Doctor Clinical EHR & Smart Queue</span>
            </div>
            <p className="text-sm text-slate-300 font-medium mt-0.5">Clinical Decision Support • Real-time Smart OPD Queue • e-Prescription Writer</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setRole('patient')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            Switch to Patient
          </button>
          <button
            onClick={() => setRole('asha')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            Switch to ASHA Worker
          </button>
        </div>
      </div>

      {/* Physician Header & Live Queue Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Physician EHR & Queue Console
          </h1>
          <p className="text-slate-500 text-base font-medium mt-1">
            Dr. Rajesh Varma, MD (Cardiology) • OPD Clinic Room #4
          </p>
        </div>

        {/* Smart Queue Counters & Quick Call Next Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-blue-200 rounded-2xl px-4 py-2 flex items-center gap-4 shadow-sm">
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Consulting</p>
              <p className="text-xl font-extrabold text-blue-700">#{currentConsultingToken || 11}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Next Token</p>
              <p className="text-xl font-extrabold text-emerald-600">#{nextToken || 12}</p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase">Waiting</p>
              <p className="text-xl font-extrabold text-amber-600">{totalWaiting || 4}</p>
            </div>
          </div>

          <Link
            href="/dashboard/scanner?mode=patient_qr"
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <QrCode className="h-4 w-4" /> Scan Patient QR Passport
          </Link>

          <button
            onClick={() => doctorAction('call_next')}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <PhoneCall className="h-4 w-4" /> Call Next Patient
          </button>
        </div>
      </div>

      {/* ================= REALTIME CRISIS MONITOR & ASHA TICKET DESK ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real-time Emergency & Ambulance Dispatch Monitor */}
        <div className="bg-gradient-to-r from-slate-900 to-rose-950 text-white rounded-3xl p-6 border border-rose-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-rose-900/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-600/30 border border-rose-400/30 flex items-center justify-center text-rose-300 font-bold">
                🚨
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Live Emergency & Ambulance Telemetry</h3>
                <p className="text-xs text-rose-300 font-mono">Dispatch ID: {activeAmbulanceStream?.dispatchId || 'EMR-2026-0412'}</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-rose-600 text-white rounded-full animate-pulse">
              LIVE RADAR
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Incoming Patient</span>
              <p className="font-extrabold text-white">{activeAmbulanceStream?.patientName || 'Ramesh Rao'}</p>
              <p className="text-[10px] text-rose-300 font-semibold">{activeAmbulanceStream?.locationName || 'Ward 14, Peruru'}</p>
            </div>
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle & ETA</span>
              <p className="font-mono text-sm font-bold text-amber-400">{activeAmbulanceStream?.vehicleNo || 'AP-39-AMB-108'}</p>
              <p className="text-xs font-black text-emerald-400">ETA: {activeAmbulanceStream?.eta || 4} mins</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-900/40">
            <span className="text-slate-300 font-bold">Stage: <span className="text-cyan-400 uppercase font-black">{activeAmbulanceStream?.status.replace('_', ' ') || 'EN ROUTE'}</span></span>
            <button
              onClick={() => alert(`ICU Resuscitation Bay #2 reserved for ${activeAmbulanceStream?.patientName || 'Emergency Patient'}`)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-extrabold transition-all"
            >
              Prepare Trauma Bay #2
            </button>
          </div>
        </div>

        {/* ASHA Field Issue Ticket Resolution Desk (TCK-2026-XXXX) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 font-bold">
                🎫
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">ASHA Issue Ticket Resolution Desk</h3>
                <p className="text-xs text-slate-500 font-medium">Field escalations requiring clinical instructions</p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              {tickets.filter(t => t.status === 'open').length} Open Tickets
            </span>
          </div>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {tickets.map((t) => (
              <div key={t.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                    {t.id}
                  </span>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {t.category}
                  </span>
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-xs">{t.title}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{t.description}</p>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 font-bold">ASHA: {t.ashaName} ({t.village})</span>
                  <button
                    onClick={() => {
                      const notes = prompt(`Provide clinical resolution note for Ticket ${t.id}:`, 'Approved emergency transfer to District Hospital. Advised sublingual Nifedipine.');
                      if (notes) {
                        updateAshaTicket(t.id, {
                          status: 'resolved',
                          doctorNotes: notes,
                          assignedDoctor: 'Dr. Rajesh Varma',
                        });
                      }
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-extrabold shadow-sm transition-all"
                  >
                    Respond & Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2-Column Clinical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Smart Queue Live Console */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" /> Today's Smart Queue
            </h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Live Socket Sync
            </span>
          </div>

          <div className="space-y-3">
            {queue.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium space-y-2">
                <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">OPD Queue is Empty</p>
                <p>No patients currently waiting. When you book an appointment in Patient Portal or ASHA desk, it will show up here instantly in real time.</p>
              </div>
            ) : (
              queue.map((item, idx) => {
                const isConsulting = item.status === 'consulting';
                const isPriority = item.status === 'priority';
                const isHold = item.status === 'hold';
                const isCompleted = item.status === 'completed';

                return (
                  <div
                    key={item.token}
                    className={`p-4 rounded-3xl border transition-all space-y-3 ${
                      isConsulting
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : isPriority
                        ? 'bg-rose-50/70 border-rose-400'
                        : isHold
                        ? 'bg-amber-50/50 border-amber-300'
                        : isCompleted
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black px-3 py-1 rounded-2xl bg-slate-900 text-white shadow-sm">
                          #{item.token}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isConsulting
                              ? 'bg-blue-600 text-white border-blue-600'
                              : isPriority
                              ? 'bg-rose-600 text-white border-rose-600'
                              : isHold
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <span className="text-xs text-slate-500 font-bold">
                        {item.estimatedTime}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <h4 className="font-extrabold text-sm text-slate-900">{item.patientName}</h4>
                        {item.hospitalName && (
                          <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            🏥 {item.hospitalName}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 font-mono mt-0.5">
                        <span className="font-bold text-slate-700">{item.appointmentId}</span>
                        {item.orderId && <span>• {item.orderId}</span>}
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {item.paymentStatus === 'paid' ? `PAID ₹${item.paymentAmount || 500}` : 'UNPAID'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {item.age} yrs • {item.gender} • Loc: <span className="font-bold text-slate-700">{item.village}</span>
                      </p>
                      <p className="text-xs text-slate-600 italic mt-0.5">"{item.symptoms}"</p>
                    </div>

                    {/* Doctor Control Buttons */}
                    {!isCompleted && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
                        {!isConsulting && (
                          <button
                            onClick={() => doctorAction('start', item.token)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1"
                          >
                            <Play className="h-3 w-3" /> Start
                          </button>
                        )}

                        {isConsulting && (
                          <button
                            onClick={() => doctorAction('complete', item.token)}
                            className="px-2.5 py-1 bg-emerald-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Complete
                          </button>
                        )}

                        {!isPriority && (
                          <button
                            onClick={() => doctorAction('priority', item.token)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[10px] rounded-lg border border-rose-200"
                          >
                            Priority
                          </button>
                        )}

                        <button
                          onClick={() => doctorAction('hold', item.token)}
                          className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-[10px] rounded-lg border border-amber-200"
                        >
                          Hold
                        </button>

                        <button
                          onClick={() => doctorAction('skip', item.token)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg"
                        >
                          Skip
                        </button>

                        {idx > 0 && (
                          <button
                            onClick={() => doctorAction('reorder', item.token, idx - 1)}
                            title="Move Up"
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md ml-auto"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                        )}
                        {idx < queue.length - 1 && (
                          <button
                            onClick={() => doctorAction('reorder', item.token, idx + 1)}
                            title="Move Down"
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Columns: Active Patient EHR Workspace & AI Decision Support */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedPatient ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 mx-auto flex items-center justify-center text-3xl">
                🩺
              </div>
              <h3 className="text-xl font-bold text-slate-900">OPD Consultation Room Ready</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                No active patient currently in consultation. As patients book OPD appointments or arrive at reception, they will appear here. Click "Call Next Patient" above to call the next token.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-slate-900">{selectedPatient.name}</h2>
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                      {selectedPatient.gender}, {selectedPatient.age} yrs
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    History: {selectedPatient.history}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-200">
                    OPD Visit ID: #{selectedPatient.id}
                  </span>
                </div>
              </div>

            {/* Live Vitals Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Blood Pressure</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{selectedPatient.vitals.bp}</p>
                <p className="text-[10px] text-rose-600 font-bold">Stage 2 High</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Heart Rate</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{selectedPatient.vitals.hr} bpm</p>
                <p className="text-[10px] text-slate-500 font-bold">Normal sinus</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Fasting Glucose</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{selectedPatient.vitals.glucose}</p>
                <p className="text-[10px] text-amber-600 font-bold">Elevated</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <p className="text-[10px] font-bold text-slate-400 uppercase">HbA1c</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{selectedPatient.vitals.hba1c}</p>
                <p className="text-[10px] text-amber-600 font-bold">Uncontrolled</p>
              </div>
            </div>
          </div>

          {/* AI Clinical Differential Assistant */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">AI Clinical Decision Support</h3>
                  <p className="text-xs text-slate-500 font-medium">Differential diagnosis & drug safety evaluation</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                Gemini Clinical Assist
              </span>
            </div>

            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 space-y-3">
              <p className="text-xs font-bold text-blue-950 uppercase tracking-wider">Suggested Differential Diagnoses:</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-200 text-xs">
                  <span className="font-bold text-slate-900">1. Hypertensive Crisis with Mild Angina</span>
                  <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">88% Probability</span>
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-900">2. Essential Hypertension with Uncontrolled Diabetes</span>
                  <span className="font-extrabold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md">72% Probability</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium pt-1">
                <strong>Recommended Diagnostic Workup:</strong> 12-Lead ECG, Serum Creatinine, Trop-I rapid card test, Repeat Lipid Panel.
              </p>
            </div>
          </div>

          {/* e-Prescription Writer */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Digital e-Prescription</h3>
                  <p className="text-xs text-slate-500 font-medium">Add medications and send directly to patient phone</p>
                </div>
              </div>
            </div>

            {/* Existing Rx List */}
            <div className="space-y-2">
              {prescriptions.map((rx, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                  <div>
                    <p className="font-extrabold text-slate-900">{rx.name}</p>
                    <p className="text-slate-500 font-medium">{rx.dose} • {rx.freq}</p>
                  </div>
                  <span className="font-bold text-slate-700 bg-white px-3 py-1 rounded-xl border border-slate-200">
                    {rx.dur}
                  </span>
                </div>
              ))}
            </div>

            {/* Add Medicine Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <input
                type="text"
                value={newMed.name}
                onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                placeholder="Medicine / Salt name (e.g. Metformin)"
                className="sm:col-span-2 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-blue-500"
              />
              <select
                value={newMed.freq}
                onChange={(e) => setNewMed({ ...newMed, freq: e.target.value })}
                className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-blue-500 bg-white"
              >
                <option value="Once Daily (Morning)">Once Daily (Morning)</option>
                <option value="Twice Daily">Twice Daily</option>
                <option value="Thrice Daily">Thrice Daily</option>
                <option value="Once Daily (Night)">Once Daily (Night)</option>
              </select>
              <button
                onClick={addPrescription}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Rx
              </button>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={async () => {
                  const targetJourney =
                    journeys.find((j) =>
                      j.patientName.toLowerCase().includes(selectedPatient.name.toLowerCase().split(' ')[0])
                    ) || journeys[0];

                  if (targetJourney) {
                    const formattedMeds = prescriptions.map((p) => ({
                      name: p.name,
                      dosage: p.dose,
                      frequency: p.freq,
                      duration: p.dur,
                      price: 120,
                    }));

                    await completeConsultationAndPrescribe(targetJourney.id, {
                      doctorName: user.name || 'Dr. Rajesh Varma',
                      hospitalName: user.hospitalName || 'Apollo Hospitals',
                      patientName: selectedPatient.name,
                      patientAge: selectedPatient.age,
                      patientGender: selectedPatient.gender,
                      diagnosis: selectedPatient.chiefComplaint,
                      medicines: formattedMeds,
                      instructions: 'Take medications strictly on schedule after meals. Low sodium diet.',
                      followUpDate: '2026-09-24',
                      totalCost: formattedMeds.length * 120,
                    });
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-600/20"
              >
                <Send className="h-4 w-4" /> Sign & Issue e-Prescription (Stream to Pharmacy)
              </button>
            </div>
          </div>
        </>
      )}
        </div>
      </div>
    </div>
  );
}
