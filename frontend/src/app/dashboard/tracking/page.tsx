'use client';

import React, { useState } from 'react';
import {
  Navigation, Ambulance, Calendar, Pill, ShieldAlert,
  Clock, CheckCircle2, MapPin, Search, ArrowRight, Phone,
  Radio, Copy, ExternalLink, Ticket, Building2, User,
  Activity, Package, Truck, Stethoscope, FileText, Check
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRealtime } from '@/context/RealtimeContext';
import { useSmartQueue } from '@/context/SmartQueueContext';
import { useUserRole } from '@/context/UserRoleContext';
import { useHealthcareJourney, JourneyStep } from '@/context/HealthcareJourneyContext';

const AmbulanceMap = dynamic(() => import('@/components/AmbulanceMap'), { ssr: false });

export default function RealtimeTrackingPage() {
  const { setRole } = useUserRole();
  const { activeAmbulanceStream, orders, socket, triggerEmergencySos, createOrder } = useRealtime();
  const { myToken, currentConsultingToken, totalWaiting, queue } = useSmartQueue();
  const {
    journeys,
    activeJourney,
    setActiveJourneyId,
    checkInPatient,
    startConsultation,
    verifyAndAcceptPrescription,
    packMedicines,
    dispatchMedicines,
    completeJourney,
    requestAmbulanceForJourney,
  } = useHealthcareJourney();

  const [activeTab, setActiveTab] = useState<'journey' | 'ambulance' | 'appointments' | 'orders'>('journey');
  const [searchId, setSearchId] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const currentJourney =
    journeys.find(
      (j) =>
        j.id.toLowerCase().includes(searchId.toLowerCase()) ||
        j.appointmentId.toLowerCase().includes(searchId.toLowerCase())
    ) ||
    activeJourney ||
    journeys[0];

  const activeToken = myToken?.token || 14;
  const activeApptId = myToken?.appointmentId || 'APT-APOLLO-2026-0821';
  const curConsulting = currentConsultingToken || 11;
  const patientsAhead = Math.max(0, activeToken - curConsulting - 1);
  const activeHospital = myToken?.hospitalName || 'Apollo Hospitals';
  const activeOrderId = myToken?.orderId || orders[0]?.orderNumber || 'ORD-HOSP-2026-9041';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-16">
      {/* Top Role Switcher Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
            <Navigation className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-bold text-indigo-400">Hospital Realtime Tracking Radar</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Socket Connected
              </span>
            </div>
            <p className="text-sm text-slate-300 font-medium mt-0.5">
              Rural Healthcare Journey • Live Ambulance GPS • OPD Tokens • Pharmacy Orders
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={() => setRole('hospital_admin')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Hospital Admin View
          </button>
        </div>
      </div>

      {/* Quick Search / Lookup Bar */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Search by Tracking ID (e.g. JRN-2026-8812, EMR-2026-0412, APT-APOLLO-2026-0821, ORD-HOSP-2026-9041)..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all font-mono"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              if (!searchId) return;
              if (searchId.toUpperCase().includes('JRN')) setActiveTab('journey');
              else if (searchId.toUpperCase().includes('EMR')) setActiveTab('ambulance');
              else if (searchId.toUpperCase().includes('APT')) setActiveTab('appointments');
              else if (searchId.toUpperCase().includes('ORD')) setActiveTab('orders');
            }}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <span>Track ID</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Domain Navigation Tabs */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl text-xs font-bold max-w-2xl mx-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('journey')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'journey'
              ? 'bg-white text-indigo-600 shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Healthcare Journey</span>
          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">JRN</span>
        </button>

        <button
          onClick={() => setActiveTab('ambulance')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'ambulance'
              ? 'bg-white text-rose-600 shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ambulance className="h-4 w-4" />
          <span>Ambulance GPS</span>
          <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">EMR</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'appointments'
              ? 'bg-white text-blue-600 shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ticket className="h-4 w-4" />
          <span>Hospital Queue</span>
          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">APT</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-white text-emerald-600 shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Pill className="h-4 w-4" />
          <span>Medicine Orders</span>
          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">ORD</span>
        </button>
      </div>

      {/* ── TAB: RURAL HEALTHCARE JOURNEY (9-STAGE PIPELINE) ─────────────── */}
      {activeTab === 'journey' && currentJourney && (
        <div className="space-y-6">
          {/* Main Journey Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 border border-indigo-500/30 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-900/50 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg font-black text-xl">
                  #{currentJourney.tokenNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest font-mono font-bold text-indigo-300">
                      JOURNEY ID: {currentJourney.id}
                    </span>
                    <button
                      onClick={() => copyText(currentJourney.id)}
                      className="p-1 hover:bg-white/10 rounded-md transition-colors"
                      title="Copy ID"
                    >
                      {copiedId === currentJourney.id ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-indigo-300" />
                      )}
                    </button>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                      {currentJourney.bookingSource === 'asha_assisted' ? 'ASHA Assisted' : 'Self-Booked'}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black mt-0.5">
                    {currentJourney.patientName}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    {currentJourney.age} yrs • {currentJourney.gender} • 📍 {currentJourney.village}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <Radio className="h-3.5 w-3.5 animate-pulse text-indigo-200" />
                  <span>STEP: {currentJourney.currentStep.replace('_', ' ')}</span>
                </span>
              </div>
            </div>

            {/* Quick Switcher of Journeys */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0">
                Switch Patient:
              </span>
              {journeys.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setActiveJourneyId(j.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    currentJourney.id === j.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  #{j.tokenNumber} {j.patientName.split(' ')[0]} ({j.currentStep.replace('_', ' ')})
                </button>
              ))}
            </div>

            {/* Hospital & Doctor Metadata Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Hospital</span>
                <p className="font-extrabold text-white mt-0.5">{currentJourney.hospitalName}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Consulting Doctor</span>
                <p className="font-extrabold text-white mt-0.5">{currentJourney.doctorName}</p>
                <p className="text-[10px] text-slate-400">{currentJourney.department}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Slot Time</span>
                <p className="font-extrabold text-indigo-300 mt-0.5">{currentJourney.slotTime}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Billing Status</span>
                <p className="font-extrabold text-emerald-400 mt-0.5">
                  {currentJourney.paymentStatus === 'free_bpl_aarogyasri'
                    ? 'AAROGYASRI FREE (₹0)'
                    : `₹${currentJourney.consultationFee || 500} PAID ${currentJourney.paymentId ? `• ${currentJourney.paymentId}` : '• Razorpay Verified'}`}
                </p>
              </div>
            </div>

            {/* 9-STAGE PROGRESSION TIMELINE */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-200">
                  End-to-End Healthcare Journey Timeline
                </h3>
                <span className="text-xs text-slate-400 font-medium italic">
                  Live Status: "{currentJourney.statusNotes}"
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    step: 'booked',
                    title: '1. Appointment Booked',
                    desc: `Token #${currentJourney.tokenNumber} issued. Scheduled for ${currentJourney.slotTime}.`,
                    icon: Calendar,
                  },
                  {
                    step: 'transit',
                    title: '2. Travel / 108 Transit',
                    desc: currentJourney.ambulanceRequested
                      ? '108 Emergency Ambulance en-route to hospital.'
                      : 'Patient traveling from village to hospital.',
                    icon: Ambulance,
                  },
                  {
                    step: 'checked_in',
                    title: '3. Reception Check-In',
                    desc: 'Arrived at OPD Reception. Allocated to Waiting Lounge.',
                    icon: Building2,
                  },
                  {
                    step: 'consulting',
                    title: '4. Doctor Consultation',
                    desc: `Called into ${currentJourney.department} OPD Room.`,
                    icon: Stethoscope,
                  },
                  {
                    step: 'prescribed',
                    title: '5. Digital Prescription',
                    desc: 'Doctor recorded clinical diagnosis & prescribed medications.',
                    icon: FileText,
                  },
                  {
                    step: 'pharmacy_processing',
                    title: '6. Pharmacy Processing',
                    desc: 'Hospital Central Pharmacy verifying stock & preparing doses.',
                    icon: Pill,
                  },
                  {
                    step: 'medicines_packed',
                    title: '7. Medicines Packed',
                    desc: 'Medications labelled with dosage instructions.',
                    icon: Package,
                  },
                  {
                    step: 'out_for_delivery',
                    title: '8. Out for Delivery / Counter',
                    desc: 'Rural Courier departing for village or ready at Counter #2.',
                    icon: Truck,
                  },
                  {
                    step: 'completed',
                    title: '9. Treatment Completed',
                    desc: 'Handover complete. Follow-up reminder active.',
                    icon: CheckCircle2,
                  },
                ].map((item, idx) => {
                  const stepKeys: JourneyStep[] = [
                    'booked',
                    'transit',
                    'checked_in',
                    'consulting',
                    'prescribed',
                    'pharmacy_processing',
                    'medicines_packed',
                    'out_for_delivery',
                    'completed',
                  ];
                  const currentIdx = stepKeys.indexOf(currentJourney.currentStep);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.step}
                      className={`p-4 rounded-2xl border transition-all space-y-2 ${
                        isCurrent
                          ? 'bg-indigo-600/30 border-indigo-400 shadow-lg ring-1 ring-indigo-400'
                          : isDone
                          ? 'bg-slate-800/80 border-emerald-500/40 text-slate-200'
                          : 'bg-slate-900/40 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isCurrent
                              ? 'bg-indigo-500 text-white animate-pulse'
                              : isDone
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        {isDone ? (
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            COMPLETED
                          </span>
                        ) : isCurrent ? (
                          <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full animate-pulse">
                            ACTIVE STAGE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600">UPCOMING</span>
                        )}
                      </div>

                      <div>
                        <p className={`font-extrabold text-xs ${isCurrent ? 'text-white' : isDone ? 'text-slate-200' : 'text-slate-500'}`}>
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DIGITAL PRESCRIPTION ACCORDION (IF ISSUED) */}
            {currentJourney.prescription && (
              <div className="bg-slate-800/90 rounded-2xl p-5 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    <h4 className="font-extrabold text-sm text-white">
                      Digital Prescription ({currentJourney.prescription.id})
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-md">
                    Status: {currentJourney.prescription.status.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-300">
                    <strong>Diagnosis:</strong> {currentJourney.prescription.diagnosis}
                  </p>
                  <p className="text-slate-300 italic">
                    "{currentJourney.prescription.instructions}"
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Prescribed Medications:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {currentJourney.prescription.medicines.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs">
                        <p className="font-bold text-white">{m.name}</p>
                        <p className="text-[10px] text-slate-400">{m.dosage} • {m.frequency}</p>
                        <p className="text-[10px] text-indigo-300 mt-1">{m.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SIMULATOR QUICK ACTIONS (CROSS-ROLE CONTROLS) */}
            <div className="border-t border-indigo-900/60 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-medium">
                Simulate Cross-Panel State Advance:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {currentJourney.currentStep === 'booked' && (
                  <button
                    onClick={() => checkInPatient(currentJourney.id)}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
                  >
                    Hospital Reception: Check-In
                  </button>
                )}
                {currentJourney.currentStep === 'checked_in' && (
                  <button
                    onClick={() => startConsultation(currentJourney.id)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
                  >
                    Doctor: Start Consultation
                  </button>
                )}
                {currentJourney.currentStep === 'prescribed' && (
                  <button
                    onClick={() => verifyAndAcceptPrescription(currentJourney.id)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all"
                  >
                    Pharmacy: Verify Stock
                  </button>
                )}
                {currentJourney.currentStep === 'pharmacy_processing' && (
                  <button
                    onClick={() => packMedicines(currentJourney.id)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all"
                  >
                    Pharmacy: Pack Medicines
                  </button>
                )}
                {currentJourney.currentStep === 'medicines_packed' && (
                  <button
                    onClick={() => dispatchMedicines(currentJourney.id, 'village_delivery')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all"
                  >
                    Pharmacy: Dispatch to Village
                  </button>
                )}
                {currentJourney.currentStep === 'out_for_delivery' && (
                  <button
                    onClick={() => completeJourney(currentJourney.id)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all"
                  >
                    Complete Handover
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: AMBULANCE LIVE GPS RADAR ─────────────────────────────────── */}
      {activeTab === 'ambulance' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 border border-rose-500/30 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-900/50 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest font-mono font-bold text-rose-300">
                      ID: {activeAmbulanceStream?.dispatchId || 'EMR-2026-0412'}
                    </span>
                    <button
                      onClick={() => copyText(activeAmbulanceStream?.dispatchId || 'EMR-2026-0412')}
                      className="p-1 hover:bg-white/10 rounded-md transition-colors"
                      title="Copy ID"
                    >
                      {copiedId === (activeAmbulanceStream?.dispatchId || 'EMR-2026-0412') ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-rose-300" />
                      )}
                    </button>
                  </div>
                  <h2 className="text-2xl font-black mt-0.5">Emergency Ambulance Telemetry Radar</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-rose-600 text-white rounded-full text-xs font-bold uppercase animate-pulse flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5" /> LIVE GPS FEED
                </span>
              </div>
            </div>

            {/* Vehicle & Telemetry Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Ambulance Vehicle</p>
                <p className="text-base font-mono font-black text-rose-400">{activeAmbulanceStream?.vehicleNo || 'AP-39-AMB-108'}</p>
                <p className="text-[10px] text-slate-400">Driver: {activeAmbulanceStream?.driverName || 'Rajesh Kumar'}</p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Estimated Arrival</p>
                <p className="text-2xl font-black text-amber-400">{activeAmbulanceStream?.eta || 4} mins</p>
                <p className="text-[10px] text-amber-200/80 font-medium">Distance ~1.2 km</p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Current Speed</p>
                <p className="text-2xl font-black text-emerald-400">{activeAmbulanceStream?.speed || 48} km/h</p>
                <p className="text-[10px] text-emerald-200/80 font-medium">En route via NH-16</p>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400">Dispatch Status</p>
                <p className="text-sm font-black text-cyan-400 uppercase tracking-wide">
                  {activeAmbulanceStream?.status.replace('_', ' ') || 'EN ROUTE'}
                </p>
                <p className="text-[10px] text-slate-400">Patient: {activeAmbulanceStream?.patientName || 'Emergency Patient'}</p>
              </div>
            </div>

            {/* Live Map */}
            <div className="bg-white rounded-2xl overflow-hidden p-2">
              <AmbulanceMap incidentId={activeAmbulanceStream?.dispatchId || 'EMR-2026-0412'} socket={socket} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-rose-200">
                Ambulance is broadcasting live GPS telemetry directly to your device and Doctor Trauma Bay #2.
              </span>
              <button
                onClick={() => triggerEmergencySos({ message: 'Urgent priority escalation from patient tracker' })}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
              >
                Send SOS Priority Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: HOSPITAL APPOINTMENT & SMART QUEUE ───────────────────────── */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 border border-blue-500/30 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/50 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Ticket className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest font-mono font-bold text-blue-300">
                      {activeApptId}
                    </span>
                    <button
                      onClick={() => copyText(activeApptId)}
                      className="p-1 hover:bg-white/10 rounded-md transition-colors"
                      title="Copy ID"
                    >
                      {copiedId === activeApptId ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-blue-300" />
                      )}
                    </button>
                    <span className="text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full">
                      🏥 {activeHospital}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black mt-0.5">Hospital Appointment & Live Queue Token</h2>
                </div>
              </div>

              <span className="text-xs font-extrabold px-3 py-1 bg-emerald-500 text-white rounded-full uppercase">
                🟢 PAID ₹500
              </span>
            </div>

            {/* Queue Counter Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                <p className="text-[10px] font-bold text-blue-200 uppercase">Your Token Number</p>
                <p className="text-3xl font-black text-white mt-1">#{activeToken}</p>
                <p className="text-[10px] text-blue-300 font-bold mt-0.5">Clinic Room #4</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                <p className="text-[10px] font-bold text-blue-200 uppercase">Currently Consulting</p>
                <p className="text-3xl font-black text-emerald-400 mt-1">#{curConsulting}</p>
                <p className="text-[10px] text-emerald-300 font-bold mt-0.5">Dr. Rajesh Varma</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                <p className="text-[10px] font-bold text-blue-200 uppercase">Patients Ahead</p>
                <p className="text-3xl font-black text-amber-400 mt-1">{patientsAhead}</p>
                <p className="text-[10px] text-amber-300 font-bold mt-0.5">
                  {patientsAhead === 0 ? 'YOU ARE NEXT!' : 'Waiting in Lobby'}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                <p className="text-[10px] font-bold text-blue-200 uppercase">Estimated Wait Time</p>
                <p className="text-2xl font-black text-white mt-1.5">~{Math.max(5, patientsAhead * 8)} mins</p>
                <p className="text-[10px] text-blue-200 font-medium mt-0.5">~8 min / patient</p>
              </div>
            </div>

            {/* Live Queue Progress Stepper */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider flex items-center justify-between">
                <span>Real-Time Calling Stepper (Doctor EHR Synced)</span>
                <span className="text-emerald-400 font-bold">Auto-Updating</span>
              </p>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <div className="flex items-center gap-2 bg-blue-600/30 border border-blue-400 px-3.5 py-2 rounded-xl text-xs font-bold flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                  <span>#{curConsulting} In Room #4</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 flex-shrink-0">
                  <span>#{curConsulting + 1} Next in Line</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 shadow-lg shadow-emerald-600/30">
                  <Ticket className="h-4 w-4" />
                  <span>#{activeToken} YOUR TOKEN {patientsAhead === 0 ? '(NEXT!)' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: MEDICINE E-COMMERCE ORDER TRACKER ────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                  <Pill className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest font-mono font-bold text-slate-600">
                      {activeOrderId}
                    </span>
                    <button
                      onClick={() => copyText(activeOrderId)}
                      className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                      title="Copy ID"
                    >
                      {copiedId === activeOrderId ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      Out for Delivery
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">Medicine & Healthcare Order Delivery</h2>
                </div>
              </div>

              <button
                onClick={() => createOrder({ patientName: 'Rahul Varma', totalAmount: 450 })}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Pill className="h-4 w-4" /> Place New Medicine Order
              </button>
            </div>

            {/* Order Items & Agent */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Items in Package</span>
                <p className="text-sm font-extrabold text-slate-800">Paracetamol 500mg Strip (2x), ORS Sachet (5x)</p>
                <p className="text-xs font-bold text-blue-600">Total Paid: ₹140 (Digital Payment Confirmed)</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Agent & ETA</span>
                <p className="text-sm font-extrabold text-slate-800">Kishore (Pharma Express)</p>
                <p className="text-xs text-slate-500 font-medium">Estimated Arrival: 15 mins • Contact: +91 98480 33445</p>
              </div>
            </div>

            {/* 4-Step Progress Bar */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Live Delivery Progression</p>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
                {[
                  { step: 'placed', label: '1. Order Placed' },
                  { step: 'packed', label: '2. Packed by Pharmacy' },
                  { step: 'out_for_delivery', label: '3. Out for Delivery' },
                  { step: 'delivered', label: '4. Delivered' },
                ].map((s, idx) => (
                  <div
                    key={s.step}
                    className={`py-3 px-2 rounded-2xl border transition-all ${
                      idx <= 2
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-md font-black'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
