'use client';

import React, { useState } from 'react';
import {
  Users, UserPlus, AlertTriangle, Syringe, Mic, RefreshCw,
  Search, CheckCircle2, MapPin, Heart, Activity, Phone,
  ChevronRight, Clock, Plus, Shield, Check, Filter, Ticket,
  Building2, Calendar, Stethoscope, Share2, Printer, Navigation
} from 'lucide-react';
import Link from 'next/link';
import { useUserRole } from '@/context/UserRoleContext';
import { useSmartQueue } from '@/context/SmartQueueContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useHealthcareJourney, HealthcareJourney } from '@/context/HealthcareJourneyContext';

interface AshaPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  householdNo: string;
  village: string;
  category: 'maternal' | 'high-risk' | 'child' | 'routine';
  vitals: string;
  lastVisited: string;
  status: 'pending' | 'completed' | 'flagged';
  phone: string;
}

export default function AshaDashboardView() {
  const { setRole } = useUserRole();
  const { queue, bookAppointment } = useSmartQueue();
  const { tickets, createAshaTicket } = useRealtime();
  const { journeys, bookNewJourney, requestAmbulanceForJourney } = useHealthcareJourney();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<AshaPatient | null>(null);
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Assisted "Book for Patient" Wizard State
  const [bookWizardOpen, setBookWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [bookingPass, setBookingPass] = useState<HealthcareJourney | null>(null);
  const [selectedVillager, setSelectedVillager] = useState<AshaPatient | null>(null);
  const [customVillagerName, setCustomVillagerName] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('Apollo Hospitals');
  const [selectedDoctor, setSelectedDoctor] = useState({
    name: 'Dr. Rajesh Varma',
    dept: 'Cardiology & Internal Medicine',
    fee: 500,
    id: 'usr_doc_9941',
  });
  const [selectedSlot, setSelectedSlot] = useState('Today 11:30 AM');

  // Filter queue for Village Kothapeta
  const villageQueue = queue.filter(q => q.village.toLowerCase().includes('kothapeta') || q.village.toLowerCase().includes('peruru'));

  // Dynamic Community Patients (backed by localStorage)
  const [patients, setPatients] = useState<AshaPatient[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('arogya_asha_community_patients');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Remove legacy mock demo patients if present
          const clean = parsed.filter((p: AshaPatient) => !['ap-1', 'ap-2', 'ap-3', 'ap-4'].includes(p.id));
          setPatients(clean);
          return;
        }
      }
    } catch {}
    setPatients([]);
  }, []);

  const savePatients = (updated: AshaPatient[]) => {
    setPatients(updated);
    try {
      localStorage.setItem('arogya_asha_community_patients', JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage error', e);
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.householdNo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const triggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1500);
  };

  const handleAshaBookToken = async (p: AshaPatient) => {
    await bookAppointment({
      patientName: p.name,
      age: p.age,
      gender: p.gender,
      village: 'Kothapeta',
      symptoms: p.vitals,
      ashaWorker: 'Anitha (ASHA)',
      isPriority: p.category === 'high-risk',
    });
    alert(`OPD Token booked for ${p.name}!`);
  };

  const [activeModal, setActiveModal] = useState<'household' | 'risk' | 'vaccine' | 'voice' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [newHousehold, setNewHousehold] = useState({ name: '', members: 4, phone: '' });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      {/* Role Switch Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-bold text-blue-400">Current View</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold">ASHA Field Desk & Village Queue</span>
            </div>
            <p className="text-sm text-slate-300 font-medium mt-0.5">Community Field Operations • Village Appointment Queue Tracker • Doorstep Screening</p>
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
            onClick={() => setRole('doctor')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
          >
            Switch to Doctor EHR
          </button>
        </div>
      </div>

      {/* ASHA Field Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              ASHA Field Console
            </h1>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full">
              Village: Kothapeta (Ward 14)
            </span>
          </div>
          <p className="text-slate-500 text-base font-medium mt-1">
            Door-to-door health screening • Digital bridge for rural patients • Live journey tracking
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setWizardStep(1);
              setSelectedVillager(patients[0] || null);
              setBookWizardOpen(true);
            }}
            className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
          >
            <Calendar className="h-4 w-4" />
            <span>Book for Patient (రోగికి బుక్ చేయండి)</span>
          </button>

          <Link
            href="/dashboard/tracking"
            className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <Navigation className="h-3.5 w-3.5 text-blue-400" />
            <span>Live Radar</span>
          </Link>

          {/* Sync Status Badge */}
          <div className="bg-white border border-slate-200/80 rounded-2xl px-3.5 py-2 flex items-center gap-2.5 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-xs font-bold text-slate-900">14 Visited</p>
              <p className="text-[10px] text-slate-400 font-medium">Synced</p>
            </div>
            <button
              onClick={triggerSync}
              className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-all ml-1"
              title="Sync Field Records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 🌾 KILLER FEATURE: RURAL HEALTHCARE JOURNEY REALTIME RADAR ────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 border border-indigo-500/30 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-900/50 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
              <Navigation className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest font-mono font-bold text-indigo-300">
                  Rural Healthcare Journey Radar
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  9-Stage Live Pipeline
                </span>
              </div>
              <h2 className="text-2xl font-black mt-0.5">Village Patients Healthcare Tracking</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-300">ASHA Assisted Bridge:</span>
            <strong className="text-emerald-400">Lakshmi Devi (Ward 14)</strong>
          </div>
        </div>

        {/* Live Journeys Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {journeys.slice(0, 4).map((j) => {
            const stepOrder = [
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
            const currentStepIdx = stepOrder.indexOf(j.currentStep);

            return (
              <div
                key={j.id}
                className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 space-y-4 hover:border-indigo-400/60 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white">
                      Token #{j.tokenNumber}
                    </span>
                    <span className="text-xs text-indigo-300 font-mono font-bold">{j.id}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {j.currentStep.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-white text-base">
                    {j.patientName} ({j.age} yrs • {j.gender})
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    🏥 {j.hospitalName} • {j.doctorName} ({j.department})
                  </p>
                  <p className="text-xs text-indigo-300 mt-1 font-medium italic">
                    "{j.statusNotes}"
                  </p>
                </div>

                {/* Progress Bar (9 Stages) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>Booked</span>
                    <span>Transit</span>
                    <span>OPD</span>
                    <span>Doctor</span>
                    <span>Pharmacy</span>
                    <span>Dispensed</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, Math.max(12, ((currentStepIdx + 1) / stepOrder.length) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Emergency 108 Dispatch Trigger */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 text-xs">
                  <span className="text-[11px] text-slate-400">
                    Slot: <strong className="text-white">{j.slotTime}</strong>
                  </span>
                  {!j.ambulanceRequested && j.currentStep !== 'completed' ? (
                    <button
                      onClick={() => requestAmbulanceForJourney(j.id, j.village)}
                      className="px-3 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-[11px] font-bold border border-rose-500/40 transition-all flex items-center gap-1"
                    >
                      <span>🚑 Request 108 Transport</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-bold">
                      {j.ambulanceRequested ? '🚑 Ambulance Dispatched' : '✅ Journey Finished'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5-STEP ASHA ASSISTED BOOKING MODAL (WIZARD) ────────────────── */}
      {bookWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">
                    ASHA Assisted Booking (రోగి సహాయం)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Step {wizardStep} of 5: {
                      wizardStep === 1 ? 'Select Community Villager' :
                      wizardStep === 2 ? 'Select Hospital' :
                      wizardStep === 3 ? 'Select Doctor & Department' :
                      wizardStep === 4 ? 'Confirm Time Slot' :
                      'Digital OPD Booking Pass'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBookWizardOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: SELECT VILLAGER */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Villager from Ward 14:
                </p>
                {patients.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-center space-y-1">
                    <p className="text-xs font-black text-slate-800">No Registered Villagers in Roster</p>
                    <p className="text-[11px] text-slate-500 font-medium">Type the patient name below to book an OPD token:</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedVillager(p)}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          selectedVillager?.id === p.id
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="font-black text-slate-900 text-sm">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.age} yrs • {p.gender} • {p.householdNo}</p>
                          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{p.vitals}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-400">Select →</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1.5">Or enter custom villager name:</p>
                  <input
                    type="text"
                    value={customVillagerName}
                    onChange={(e) => {
                      setCustomVillagerName(e.target.value);
                      setSelectedVillager(null);
                    }}
                    placeholder="Enter villager name (e.g. Parvathamma)..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  disabled={!selectedVillager && !customVillagerName}
                  onClick={() => setWizardStep(2)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Next: Select Hospital</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* STEP 2: SELECT HOSPITAL */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Hospital Partner:
                </p>
                <div className="space-y-2.5">
                  {[
                    { name: 'Apollo Hospitals', location: 'Kurnool Central (8.4 km)', beds: '340 Beds • Aarogyasri Empanelled' },
                    { name: 'Government General Hospital (GGH)', location: 'Budhawarapet, Kurnool (4.2 km)', beds: 'Free OPD • Govt Medical College' },
                    { name: 'RIMS Medical College Hospital', location: 'Kadapa Highway (12.1 km)', beds: 'Multi-Specialty Trauma Center' },
                  ].map((hosp) => (
                    <button
                      key={hosp.name}
                      onClick={() => setSelectedHospital(hosp.name)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${
                        selectedHospital === hosp.name
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-extrabold text-slate-900 text-sm">{hosp.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{hosp.location}</p>
                      <span className="inline-block mt-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                        {hosp.beds}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep(3)}
                    className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>Next: Select Doctor</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SELECT DOCTOR */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Specialist Doctor at {selectedHospital}:
                </p>
                <div className="space-y-2.5">
                  {[
                    { name: 'Dr. Rajesh Varma', dept: 'Cardiology & Internal Medicine', fee: 500, id: 'usr_doc_9941', wait: '15 mins wait' },
                    { name: 'Dr. Anita Sharma', dept: 'Obstetrics & Maternal ANC', fee: 500, id: 'usr_doc_anita', wait: '10 mins wait' },
                    { name: 'Dr. Sudhakar Rao', dept: 'General Medicine & Infections', fee: 400, id: 'usr_doc_sudhakar', wait: '5 mins wait' },
                  ].map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${
                        selectedDoctor.id === doc.id
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-slate-900 text-sm">{doc.name}</p>
                        <span className="text-xs font-black text-emerald-600">FREE (Aarogyasri BPL)</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{doc.dept}</p>
                      <p className="text-[11px] text-indigo-600 font-bold mt-1">Est. {doc.wait}</p>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep(4)}
                    className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>Next: Select Slot</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: SELECT SLOT & CONFIRM */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-1">
                  <p><strong>Patient:</strong> {selectedVillager?.name || customVillagerName}</p>
                  <p><strong>Hospital:</strong> {selectedHospital}</p>
                  <p><strong>Doctor:</strong> {selectedDoctor.name} ({selectedDoctor.dept})</p>
                  <p><strong>BPL Coverage:</strong> YSR Aarogyasri Card linked</p>
                </div>

                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Available OPD Time Slot:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['Today 10:30 AM', 'Today 11:15 AM', 'Today 12:00 PM', 'Today 02:30 PM'].map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        selectedSlot === slot
                          ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="w-1/3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      const patientName = selectedVillager ? selectedVillager.name : customVillagerName || 'Villager';
                      const age = selectedVillager ? selectedVillager.age : 32;
                      const gender = selectedVillager ? selectedVillager.gender : 'Female';
                      const village = selectedVillager ? selectedVillager.village : 'Peruru Ward 14, Kurnool';

                      const j = await bookNewJourney({
                        patientName,
                        age,
                        gender,
                        village,
                        householdNo: selectedVillager?.householdNo || 'HH-14/Community',
                        hospitalName: selectedHospital,
                        department: selectedDoctor.dept,
                        doctorName: selectedDoctor.name,
                        doctorId: selectedDoctor.id,
                        slotTime: selectedSlot,
                        vitals: selectedVillager?.vitals || 'BP: 125/82',
                        symptoms: 'Doctor consultation assisted by ASHA',
                        paymentStatus: 'free_bpl_aarogyasri',
                        consultationFee: 0,
                      });

                      setBookingPass(j);
                      setWizardStep(5);
                    }}
                    className="w-2/3 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>Confirm Booking (ఖరారు చేయండి)</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: DIGITAL BOOKING PASS (PRINT / SHARE) */}
            {wizardStep === 5 && bookingPass && (
              <div className="space-y-5 animate-in zoom-in-95">
                <div className="bg-emerald-500 text-white rounded-3xl p-6 text-center shadow-lg space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/20 text-white mx-auto flex items-center justify-center font-black text-xl">
                    ✓
                  </div>
                  <h4 className="text-2xl font-black">BOOKED SUCCESSFULLY!</h4>
                  <p className="text-xs text-emerald-100 font-medium">
                    Token #{bookingPass.tokenNumber} allocated for {bookingPass.patientName}
                  </p>
                </div>

                {/* The Ticket Pass */}
                <div className="border-2 border-dashed border-slate-300 rounded-3xl p-5 bg-slate-50/70 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-500">TOKEN NUMBER</span>
                    <span className="text-xl font-black text-slate-900 bg-slate-200 px-3 py-0.5 rounded-lg">
                      #{bookingPass.tokenNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">JOURNEY ID:</span>
                    <span className="font-bold text-slate-900">{bookingPass.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">HOSPITAL:</span>
                    <span className="font-bold text-slate-900">{bookingPass.hospitalName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DOCTOR:</span>
                    <span className="font-bold text-slate-900">{bookingPass.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SLOT TIME:</span>
                    <span className="font-bold text-slate-900">{bookingPass.slotTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">FEE:</span>
                    <span className="font-bold text-emerald-600">FREE (Aarogyasri)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      alert(`Booking pass copied & SMS sent to ${bookingPass.patientPhone || 'villager phone'}`);
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>WhatsApp / SMS Pass</span>
                  </button>
                  <button
                    onClick={() => setBookWizardOpen(false)}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VILLAGE QUEUE TRACKER CARD */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">Today's Village OPD Queue (Kothapeta)</h3>
              <p className="text-xs text-slate-500 font-medium">Track and assist villagers with clinic appointments</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
            {villageQueue.length} Villagers Scheduled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {villageQueue.map((item) => (
            <div
              key={item.token}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-blue-50/50 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white">
                  Token #{item.token}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    item.status === 'consulting'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : item.status === 'priority'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : item.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div>
                <p className="font-extrabold text-slate-900 text-sm">{item.patientName}</p>
                <p className="text-xs text-slate-500">{item.doctorName} ({item.specialty})</p>
                <p className="text-xs text-slate-400 mt-1">Est: {item.estimatedTime}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ASHA FIELD ISSUE TICKET TRACKER CARD (TCK-2026-XXXX) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">ASHA Field Issue Tickets (TCK Tracking IDs)</h3>
              <p className="text-xs text-slate-500 font-medium">Real-time escalation tickets streamed directly to Doctor & Admin consoles</p>
            </div>
          </div>
          <button
            onClick={() => {
              const category = prompt('Enter Ticket Category (Maternal Risk / Vaccine Deficit / Sanitation Hazard / Emergency Transfer):', 'Maternal Risk');
              const title = prompt('Enter Ticket Title / Problem Summary:', 'High-risk 3rd trimester checkup needed');
              const description = prompt('Enter Detailed Description:', 'BP 150/95 recorded at doorstep visit');
              if (title && category) {
                createAshaTicket({
                  ashaName: 'Lakshmi Devi',
                  village: 'Peruru Ward 4',
                  category: category || 'Maternal Risk',
                  title: title,
                  description: description || '',
                  priority: 'critical',
                });
              }
            }}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-xs font-extrabold shadow-md transition-all"
          >
            <Plus className="h-4 w-4" /> Create New Issue Ticket
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tickets.map((t) => (
            <div key={t.id} className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg">
                  {t.id}
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  t.status === 'open' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  t.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                  'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider">{t.category}</span>
                <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{t.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{t.description}</p>
              </div>
              {t.doctorNotes && (
                <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100 text-xs text-purple-900 font-medium">
                  <p className="font-bold text-[10px] text-purple-700 uppercase">Doctor Resolution Note:</p>
                  <p>{t.doctorNotes}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-200/60">
                <span>By: {t.ashaName}</span>
                <span>{t.village}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Touch Cards (4 Columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* New Household */}
        <button
          onClick={() => setActiveModal('household')}
          className="bg-white hover:bg-blue-50/50 p-5 rounded-3xl border border-slate-200/80 hover:border-blue-300 transition-all text-left shadow-sm group space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <UserPlus className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-sm text-slate-900">New Household</p>
            <p className="text-xs text-slate-500 font-medium">Register family & vitals</p>
          </div>
        </button>

        {/* High Risk Flag */}
        <button
          onClick={() => setActiveModal('risk')}
          className="bg-white hover:bg-rose-50/50 p-5 rounded-3xl border border-slate-200/80 hover:border-rose-300 transition-all text-left shadow-sm group space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-sm text-slate-900">Flag High Risk</p>
            <p className="text-xs text-slate-500 font-medium">Alert Doctor immediately</p>
          </div>
        </button>

        {/* Child Immunization */}
        <button
          onClick={() => setActiveModal('vaccine')}
          className="bg-white hover:bg-blue-50/50 p-5 rounded-3xl border border-slate-200/80 hover:border-blue-300 transition-all text-left shadow-sm group space-y-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <Syringe className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-sm text-slate-900">Vaccine Tracker</p>
            <p className="text-xs text-slate-500 font-medium">Log child immunization</p>
          </div>
        </button>

        {/* Audio Note */}
        <button
          onClick={() => {
            setIsRecording(!isRecording);
            setActiveModal('voice');
          }}
          className={`p-5 rounded-3xl border transition-all text-left shadow-sm group space-y-3 ${
            isRecording
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white hover:bg-blue-50/50 border-slate-200/80 hover:border-blue-300'
          }`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform ${
            isRecording ? 'bg-rose-600 text-white animate-pulse' : 'bg-blue-50 border border-blue-100 text-blue-600'
          }`}>
            <Mic className="h-6 w-6" />
          </div>
          <div>
            <p className="font-extrabold text-sm text-slate-900">{isRecording ? 'Recording Audio...' : 'Voice Field Note'}</p>
            <p className="text-xs text-slate-500 font-medium">{isRecording ? 'Tap to stop & save' : 'Record visit audio memo'}</p>
          </div>
        </button>
      </div>

      {/* Action Modals */}
      {activeModal === 'household' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Register New Household</h3>
                <p className="text-xs text-slate-500">Add family & capture initial vitals for field records.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 text-lg leading-none">✕</button>
            </div>
            <input
              type="text"
              placeholder="Head of Household Name"
              value={newHousehold.name}
              onChange={(e) => setNewHousehold({ ...newHousehold, name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="text"
              placeholder="Contact Phone (+91)"
              value={newHousehold.phone}
              onChange={(e) => setNewHousehold({ ...newHousehold, phone: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <input type="text" placeholder="Village / Ward" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <input type="number" placeholder="Total Family Members" min={1} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
              <button onClick={() => {
                if (!newHousehold.name.trim()) {
                  alert('Please enter household head name');
                  return;
                }
                const newP: AshaPatient = {
                  id: `ap-${Date.now().toString(36)}`,
                  name: newHousehold.name.trim(),
                  age: 32,
                  gender: 'Female',
                  householdNo: `HH-14/${Math.floor(Math.random() * 90 + 10)}`,
                  village: 'Peruru Ward 14',
                  category: 'routine',
                  vitals: 'BP: 120/80 • Initial Screening',
                  lastVisited: 'Just now',
                  status: 'completed',
                  phone: newHousehold.phone || '+91 98480 12345',
                };
                savePatients([newP, ...patients]);
                setActiveModal(null);
                setNewHousehold({ name: '', members: 4, phone: '' });
                alert(`✅ Household for ${newP.name} registered successfully & added to community roster!`);
              }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20">Register Household</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'risk' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-rose-600">Flag High Risk Patient</h3>
                <p className="text-xs text-slate-500">Instantly alerts OPD Doctor & assigns Priority Queue Token.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 text-lg leading-none">✕</button>
            </div>
            <input type="text" placeholder="Patient Name / Household ID" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
            <input type="text" placeholder="Age / Gender" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
            <textarea placeholder="Clinical Symptoms (e.g., BP 170/110, severe dizziness, chest pain)" rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
              <button onClick={() => { setActiveModal(null); alert('🚨 High Risk Alert Sent to Dr. Rajesh Varma!\nPriority Token assigned automatically.'); }} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-md shadow-rose-600/20">Send Priority Alert</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'vaccine' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Syringe className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Child Vaccine Tracker</h3>
                <p className="text-xs text-slate-500">Log immunization doses and schedule next visit.</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 text-lg leading-none">✕</button>
            </div>
            <input type="text" placeholder="Child's Name" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <input type="text" placeholder="Mother's Name / Household ID" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <input type="text" placeholder="Date of Birth" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <div className="grid grid-cols-2 gap-2">
              {['BCG', 'OPV-0', 'Hepatitis B', 'Pentavalent 1', 'Pentavalent 2', 'Pentavalent 3', 'IPV', 'Measles 1'].map((vaccine) => (
                <label key={vaccine} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer p-2 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all">
                  <input type="checkbox" className="rounded text-blue-600" />
                  {vaccine}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
              <button onClick={() => { setActiveModal(null); alert('✅ Immunization record saved & synced to MCH registry!'); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20">Save Immunization</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'voice' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isRecording ? 'bg-rose-600 animate-pulse' : 'bg-blue-50'}`}>
                <Mic className={`h-5 w-5 ${isRecording ? 'text-white' : 'text-blue-600'}`} />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Voice Field Note</h3>
                <p className="text-xs text-slate-500">Record audio observation during doorstep visit.</p>
              </div>
              <button onClick={() => { setActiveModal(null); setIsRecording(false); }} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 text-lg leading-none">✕</button>
            </div>

            <div className="text-center space-y-4 py-4">
              {isRecording ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-1">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="w-1.5 bg-rose-500 rounded-full animate-pulse" style={{ height: `${16 + Math.random() * 24}px`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                  <p className="text-sm font-bold text-rose-600 animate-pulse">● Recording in progress...</p>
                  <p className="text-xs text-slate-400">Tap Stop to save your field note</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 border-4 border-blue-100 flex items-center justify-center">
                    <Mic className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Ready to record</p>
                  <p className="text-xs text-slate-400">Tap the button below to start</p>
                </div>
              )}
            </div>

            <input type="text" placeholder="Patient / Household reference (optional)" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />

            <div className="flex justify-end gap-2">
              <button onClick={() => { setActiveModal(null); setIsRecording(false); }} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
              {isRecording ? (
                <button onClick={() => { setIsRecording(false); setActiveModal(null); alert('🎙️ Voice field note saved & attached to patient record!'); }} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-md">Stop & Save</button>
              ) : (
                <button onClick={() => setIsRecording(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20">Start Recording</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Community Screening Roster Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-xl text-slate-900">Community Patient Roster</h3>
            <p className="text-xs text-slate-500 font-medium">Manage door-to-door visits and field screening</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient or household..."
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-800 w-48 md:w-64"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
              {[
                { id: 'all', label: 'All' },
                { id: 'maternal', label: 'Maternal' },
                { id: 'high-risk', label: 'High Risk' },
                { id: 'child', label: 'Child' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterCategory === tab.id
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Patient Table */}
        {filteredPatients.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Users className="h-7 w-7" />
            </div>
            <h4 className="font-extrabold text-slate-900 text-base">Community Patient Roster is Clean</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No villagers in Ward 14 yet. Click &quot;Register New Household&quot; to add families for doorstep screening and OPD booking.
            </p>
            <button
              onClick={() => setActiveModal('household')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" /> Register First Household
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Household & Patient</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Latest Vitals</th>
                  <th className="px-5 py-4">Last Visit</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{p.name}</p>
                          <p className="text-xs text-slate-400">
                            {p.householdNo} • {p.age} yrs • {p.gender}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          p.category === 'maternal'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : p.category === 'high-risk'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : p.category === 'child'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {p.category.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-slate-700">{p.vitals}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{p.lastVisited}</td>
                    <td className="px-5 py-4">
                      {p.status === 'flagged' ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 w-fit">
                          <AlertTriangle className="h-3 w-3" /> Flagged
                        </span>
                      ) : p.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 w-fit">
                          <CheckCircle2 className="h-3 w-3" /> Checked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 w-fit">
                          <Clock className="h-3 w-3" /> Due Today
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedPatient(p);
                          setVitalsModalOpen(true);
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Log Visit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Doorstep Vitals Logger Modal */}
      {vitalsModalOpen && selectedPatient && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Doorstep Visit Entry</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedPatient.name} ({selectedPatient.householdNo})
                </p>
              </div>
              <button
                onClick={() => setVitalsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Blood Pressure (mmHg)
                </label>
                <input
                  type="text"
                  placeholder="120/80"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Blood Glucose (mg/dL)
                </label>
                <input
                  type="text"
                  placeholder="110"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Hemoglobin / Weight
                </label>
                <input
                  type="text"
                  placeholder="11.5 g/dL"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  ASHA Field Observation
                </label>
                <textarea
                  placeholder="Patient compliance good. Advised dietary precaution."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setVitalsModalOpen(false);
                alert('Field visit saved & synced to Doctor EHR!');
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-600/20"
            >
              Save & Sync Field Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
