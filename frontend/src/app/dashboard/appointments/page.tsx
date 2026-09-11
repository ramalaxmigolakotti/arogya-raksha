'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Calendar, Clock, User, Stethoscope, Pill, Truck, CheckCircle2,
  AlertCircle, MapPin, Ticket, ArrowRight, ChevronRight, Plus,
  Phone, ShieldCheck, FileText, Sparkles, Radio, Activity,
  Building2, ExternalLink, History, RefreshCw, Navigation,
  ShieldAlert, Check, ShoppingBag, Eye, HeartHandshake
} from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import { useSmartQueue } from '@/context/SmartQueueContext';
import { useHealthcareJourney, JourneyStep } from '@/context/HealthcareJourneyContext';
import { useRealtime } from '@/context/RealtimeContext';
import { persistMedicalRecord, getUserMedicalHistoryCount } from '@/lib/medicalHistoryService';
import FeaturePastHistoryModal from '@/components/FeaturePastHistoryModal';
import RazorpayCheckout from '@/components/RazorpayCheckout';
import toast from 'react-hot-toast';

const AmbulanceMap = dynamic(() => import('@/components/AmbulanceMap'), { ssr: false });

export default function AppointmentsCareFlowPage() {
  const { user } = useUserRole();
  const { myToken, currentConsultingToken, totalWaiting, bookAppointment } = useSmartQueue();
  const { journeys, activeJourney, setActiveJourneyId, bookNewJourney } = useHealthcareJourney();
  const { activeAmbulanceStream, orders, socket } = useRealtime();

  const [activeTab, setActiveTab] = useState<'all' | 'appointments' | 'prescriptions' | 'medicines' | 'ambulance'>('all');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);

  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<'details' | 'payment'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    patientName: user?.name || 'Rahul Sharma',
    age: 32,
    gender: 'Male',
    village: user?.village || 'Peruru',
    doctorName: 'Dr. Rajesh Varma',
    department: 'General Medicine & OPD',
    hospitalName: 'Apollo Clinics & Community Health Centre',
    slotTime: 'Today 11:30 AM',
    symptoms: 'Fever, cough & general fatigue',
    isPriority: false,
    requestAmbulance: false,
  });

  // Sync user info into booking form
  useEffect(() => {
    if (user?.name) {
      setBookingForm((prev) => ({
        ...prev,
        patientName: user.name,
        village: user.village || prev.village,
      }));
    }
  }, [user]);

  // Load history count
  const loadCount = async () => {
    try {
      const cnt = await getUserMedicalHistoryCount(user?.id || 'usr_pat_8812', 'hospital_appointment');
      setHistoryCount(cnt);
    } catch {
      setHistoryCount(0);
    }
  };

  useEffect(() => {
    loadCount();
    const handleRefresh = () => loadCount();
    window.addEventListener('medicalRecordsUpdated', handleRefresh);
    window.addEventListener('medical-history-updated', handleRefresh);
    return () => {
      window.removeEventListener('medicalRecordsUpdated', handleRefresh);
      window.removeEventListener('medical-history-updated', handleRefresh);
    };
  }, [user]);

  // Handle appointment booking
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStep('payment');
  };

  const handleCompleteBooking = async (paymentIdOverride?: string, statusOverride?: 'paid' | 'free_bpl_aarogyasri') => {
    setIsSubmitting(true);
    const finalPaymentStatus = statusOverride || 'paid';
    const finalAmount = finalPaymentStatus === 'free_bpl_aarogyasri' ? 0 : 500;
    const finalPaymentId = paymentIdOverride || (finalPaymentStatus === 'paid' ? `rzp_${Date.now().toString(36)}` : 'AAROGYASRI-FREE-BPL');
    const orderNumber = `ORD-OPD-${Date.now().toString().slice(-6)}`;
    const apptId = `APT-${Date.now().toString().slice(-5)}`;

    try {
      // 1. Book in Smart Queue
      const createdItem = await bookAppointment({
        patientName: bookingForm.patientName,
        age: bookingForm.age,
        gender: bookingForm.gender,
        village: bookingForm.village,
        doctorName: bookingForm.doctorName,
        symptoms: bookingForm.symptoms,
        isPriority: bookingForm.isPriority,
        appointmentId: apptId,
        orderId: orderNumber,
        hospitalName: bookingForm.hospitalName,
        paymentStatus: finalPaymentStatus,
        paymentAmount: finalAmount,
      });

      const tokenNum = createdItem?.token || 21;

      // 2. Persist to Lifetime Medical Records Vault
      await persistMedicalRecord(user?.id || 'usr_pat_8812', {
        userEmail: user?.email,
        type: 'hospital_appointment',
        title: `OPD Token #${tokenNum}: ${bookingForm.doctorName}`,
        userQuery: `Booked OPD appointment for ${bookingForm.patientName} (${bookingForm.symptoms}) at ${bookingForm.hospitalName}`,
        aiResponse: `Appointment Confirmed! Token #${tokenNum}. Estimated Wait Time: ~15 mins. Billing: ${finalPaymentStatus === 'paid' ? '₹500 PAID' : 'FREE BPL'}. Payment ID: ${finalPaymentId}`,
        summary: `OPD Token #${tokenNum} • ${bookingForm.doctorName} • ${bookingForm.hospitalName}`,
        metadata: {
          tokenNumber: tokenNum,
          appointmentId: apptId,
          orderId: orderNumber,
          patientName: bookingForm.patientName,
          doctorName: bookingForm.doctorName,
          hospitalName: bookingForm.hospitalName,
          slotTime: bookingForm.slotTime,
          symptoms: bookingForm.symptoms,
          paymentStatus: finalPaymentStatus,
          paymentAmount: finalAmount,
          paymentId: finalPaymentId,
          user_email: user?.email,
          email: user?.email,
        },
      });

      // 3. Connect to unified 9-Stage Care Flow
      await bookNewJourney({
        patientName: bookingForm.patientName,
        age: bookingForm.age,
        gender: bookingForm.gender as any,
        village: bookingForm.village,
        hospitalName: bookingForm.hospitalName,
        department: bookingForm.department,
        doctorName: bookingForm.doctorName,
        doctorId: 'usr_doc_9941',
        slotTime: bookingForm.slotTime,
        bookingSource: 'patient_self',
        symptoms: bookingForm.symptoms,
        paymentStatus: finalPaymentStatus,
        consultationFee: finalAmount,
        paymentId: finalPaymentId,
        ambulanceRequested: bookingForm.requestAmbulance,
      });

      toast.success(`Token #${tokenNum} Booked! All data synced in real time.`);
      loadCount();
    } catch (err) {
      console.warn('Booking error:', err);
      toast.error('Failed to book appointment.');
    } finally {
      setIsSubmitting(false);
      setShowBookingModal(false);
      setBookingStep('details');
    }
  };

  // Active Journey & OPD Token metrics
  const activeTokenNumber = myToken?.token || (activeJourney ? activeJourney.tokenNumber : 20);
  const curToken = currentConsultingToken || 11;
  const patientsAhead = Math.max(0, activeTokenNumber - curToken - 1);
  const estWaitMins = myToken?.estimatedTime || `~${Math.max(5, patientsAhead * 8)} mins`;

  // Pipeline stages for end-to-end flow
  const currentStep = activeJourney?.currentStep || 'booked';
  const pipelineSteps: { key: JourneyStep; label: string; icon: any; desc: string }[] = [
    { key: 'booked', label: '1. Booked', icon: Calendar, desc: 'Token issued & schedule confirmed' },
    { key: 'transit', label: '2. Transit', icon: Truck, desc: 'En-route / 108 Ambulance' },
    { key: 'checked_in', label: '3. Check-In', icon: Building2, desc: 'Reception verified' },
    { key: 'consulting', label: '4. Consultation', icon: Stethoscope, desc: 'Doctor examining in OPD Room' },
    { key: 'prescribed', label: '5. Prescription', icon: FileText, desc: 'Digital Rx issued' },
    { key: 'pharmacy_processing', label: '6. Pharmacy', icon: Pill, desc: 'Stock verification & packing' },
    { key: 'out_for_delivery', label: '7. Dispensing', icon: ShoppingBag, desc: 'Doorstep delivery or counter pickup' },
    { key: 'completed', label: '8. Completed', icon: CheckCircle2, desc: 'Care complete & records saved' },
  ];

  const currentStepIndex = pipelineSteps.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-16">
      {/* ── Top Header Banner ────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-blue-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/40 rounded-full flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-blue-400 animate-pulse" />
                <span>REAL-TIME CARE STREAM</span>
              </span>
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Socket Connected • 0s Latency
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white">
              Appointments & Realtime Care Flow
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
              Every appointment, prescription, medicine order, and ambulance dispatch syncs here from end-to-end. 
              Track your complete healthcare journey live without manual refreshes.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <FeaturePastHistoryModal
              featureTitle="Appointments & Care Flow History"
              types={['hospital_appointment', 'doctor_consultation']}
              icon="📅"
              buttonLabel="Past Appointments History"
            />

            <button
              onClick={() => setShowBookingModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              <span>Book OPD Appointment</span>
            </button>
          </div>
        </div>

        {/* Real-time Status Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15 text-xs relative z-10">
          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400">Active OPD Token</span>
            <p className="text-xl font-black text-white mt-0.5">#{activeTokenNumber}</p>
            <p className="text-[10px] text-blue-300 font-medium">Room #4 • Apollo Clinic</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400">Doctor Status</span>
            <p className="text-xl font-black text-emerald-400 mt-0.5">#{curToken} Consulting</p>
            <p className="text-[10px] text-emerald-300 font-medium">{patientsAhead} patients ahead ({estWaitMins})</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400">Digital Prescription</span>
            <p className="text-xl font-black text-indigo-300 mt-0.5">
              {activeJourney?.prescription ? '1 Active Rx' : 'Pending Exam'}
            </p>
            <p className="text-[10px] text-indigo-200 font-medium">
              {activeJourney?.prescription ? `${activeJourney.prescription.medicines.length} Medicines` : 'Doctor reviewing'}
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-slate-400">Pharmacy Delivery</span>
            <p className="text-xl font-black text-amber-300 mt-0.5">
              {orders && orders.length > 0 ? orders[0].status.replace('_', ' ').toUpperCase() : 'Ready'}
            </p>
            <p className="text-[10px] text-amber-200 font-medium">
              {orders && orders.length > 0 ? `ETA: ${orders[0].eta || '15 mins'}` : 'Counter Pickup Available'}
            </p>
          </div>
        </div>
      </div>

      {/* ── End-to-End Real-time Care Pipeline Stepper ─────────────────────── */}
      <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>End-to-End Realtime Sync Pipeline (A to Z Care Flow)</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Synchronized with Doctor EHR, ASHA field logs, Pharmacy dispensing desk, and 108 Emergency.
            </p>
          </div>
          <Link
            href="/dashboard/tracking"
            className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Open 9-Stage Tracking Radar</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Interactive Timeline Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
          {pipelineSteps.map((step, idx) => {
            const isDone = idx < (currentStepIndex === -1 ? 0 : currentStepIndex);
            const isCurrent = idx === (currentStepIndex === -1 ? 0 : currentStepIndex);
            const Icon = step.icon;

            return (
              <div
                key={step.key}
                className={`p-3 rounded-2xl border transition-all space-y-1.5 ${
                  isCurrent
                    ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : isDone
                    ? 'bg-slate-50 border-emerald-500/40 text-slate-700'
                    : 'bg-slate-50/50 border-slate-200/60 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                      isCurrent
                        ? 'bg-blue-600 text-white animate-pulse'
                        : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {isDone ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  ) : null}
                </div>

                <div>
                  <p className={`text-xs font-black leading-tight ${isCurrent ? 'text-blue-900' : isDone ? 'text-slate-800' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter Tabs: All Services Synchronized ─────────────────────────── */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl text-xs font-bold max-w-2xl mx-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'all' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>All Sync Stream</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'appointments' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>OPD Tokens & Doctors</span>
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'prescriptions' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Digital Prescriptions</span>
        </button>

        <button
          onClick={() => setActiveTab('medicines')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'medicines' ? 'bg-white text-emerald-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Pill className="h-3.5 w-3.5" />
          <span>Medicine Delivery</span>
        </button>

        <button
          onClick={() => setActiveTab('ambulance')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'ambulance' ? 'bg-white text-rose-600 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          <span>108 Ambulance GPS</span>
        </button>
      </div>

      {/* ── Main Synchronized Data Panels ─────────────────────────────────── */}
      <div className="space-y-6">
        {/* PANEL 1: OPD APPOINTMENTS & LIVE QUEUE */}
        {(activeTab === 'all' || activeTab === 'appointments') && (
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Live Doctor OPD Consultation Token
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Apollo Clinics & Community Health Centre • Room #4
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Real-time OPD Sync
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                <span className="text-[10px] font-black uppercase text-blue-600">Your OPD Token</span>
                <p className="text-3xl font-black text-blue-950 mt-1">#{activeTokenNumber}</p>
                <p className="text-xs text-blue-700 font-medium mt-0.5">Status: Waiting in Lobby</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                <span className="text-[10px] font-black uppercase text-emerald-700">Currently Consulting</span>
                <p className="text-3xl font-black text-emerald-950 mt-1">#{curToken}</p>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">In Clinic Room #4</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <span className="text-[10px] font-black uppercase text-amber-700">Patients Ahead</span>
                <p className="text-3xl font-black text-amber-950 mt-1">{patientsAhead}</p>
                <p className="text-xs text-amber-700 font-medium mt-0.5">{patientsAhead === 0 ? 'YOU ARE NEXT!' : 'Moving swiftly'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-black uppercase text-slate-500">Estimated Wait</span>
                <p className="text-2xl font-black text-slate-900 mt-1.5">{estWaitMins}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">~8 mins per consultation</p>
              </div>
            </div>

            {/* Doctor & Appointment Details Strip */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  DR
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">Dr. Rajesh Varma • General Medicine</p>
                  <p className="text-[11px] text-slate-500 font-medium">Slot: Today 11:30 AM • Symptoms: Mild fever & headache</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/dashboard/video-call"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                >
                  Join Tele-Consultation
                </Link>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Reschedule / New
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PANEL 2: DIGITAL PRESCRIPTIONS FROM DOCTORS */}
        {(activeTab === 'all' || activeTab === 'prescriptions') && (
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Synchronized Digital Prescription (EHR)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Automatically signed by doctor and transferred to central pharmacy.
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="h-3 w-3 text-indigo-600" /> Prescribed by Dr. Rajesh Varma
              </span>
            </div>

            {activeJourney?.prescription ? (
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 border border-indigo-500/30 space-y-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-300 font-mono">
                      RX ID: {activeJourney.prescription.id}
                    </span>
                    <h4 className="text-base font-black text-white mt-0.5">
                      Diagnosis: {activeJourney.prescription.diagnosis}
                    </h4>
                    <p className="text-xs text-slate-300 italic mt-0.5">
                      &ldquo;{activeJourney.prescription.instructions}&rdquo;
                    </p>
                  </div>

                  <span className="text-xs font-black uppercase px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full self-start sm:self-auto">
                    Status: {activeJourney.prescription.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-200">
                    Prescribed Dosage & Regimen:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {activeJourney.prescription.medicines.map((m, idx) => (
                      <div key={idx} className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 text-xs space-y-1">
                        <p className="font-extrabold text-white flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5 text-indigo-300" />
                          {m.name}
                        </p>
                        <p className="text-[11px] text-slate-300 font-medium">{m.dosage} • {m.frequency}</p>
                        <p className="text-[10px] text-emerald-300 font-bold">{m.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs flex-wrap gap-2">
                  <span className="text-slate-400">Total Pharmacy Cost: <strong className="text-emerald-400">₹{activeJourney.prescription.totalCost || 140}</strong></span>
                  <Link
                    href="/dashboard/medicines"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center gap-1.5"
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Order All from PM Jan Aushadhi Kendra</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
                <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No active prescription for this token yet.</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  When the consulting doctor signs your digital prescription during examination, it will appear here instantly in real time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PANEL 3: CENTRAL PHARMACY & MEDICINE DELIVERY ORDERS */}
        {(activeTab === 'all' || activeTab === 'medicines') && (
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Central Pharmacy Realtime Dispensing & Delivery
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    PM Jan Aushadhi Kendra • Affordable Generics • Doorstep Village Delivery
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/medicines"
                className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Browse Medicines Store</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {orders && orders.length > 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      ORDER #{orders[0].orderNumber}
                    </span>
                    <h4 className="text-sm font-black text-slate-900 mt-0.5">
                      Prescription Medicines Dispatch
                    </h4>
                    <p className="text-xs text-slate-600">
                      Delivery Courier: <strong>{orders[0].deliveryAgent || 'Pharma Express'}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      {orders[0].status?.replace('_', ' ').toUpperCase()}
                    </span>
                    <p className="text-xs font-black text-blue-600 mt-1">₹{orders[0].totalAmount || 140} PAID</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Estimated Delivery</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">{orders[0].eta || '15 mins'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Packaging Status</span>
                    <p className="font-extrabold text-emerald-700 mt-0.5">Double Verified & Sealed</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Village Drop-off</span>
                    <p className="font-extrabold text-slate-900 mt-0.5">{user?.village || 'Peruru'} Community Centre</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
                <ShoppingBag className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No active medicine orders.</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Order your prescribed medicines online with PM Jan Aushadhi Kendra for up to 80% savings and free doorstep delivery.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PANEL 4: 108 AMBULANCE TELEMETRY & GPS STREAM */}
        {(activeTab === 'all' || activeTab === 'ambulance') && (
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-black">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    108 Emergency Ambulance Telemetry GPS
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Government Rapid Emergency Transit Fleet • 24/7 Standby
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/emergency"
                className="text-xs font-extrabold text-rose-600 hover:text-rose-700 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Emergency SOS Center</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {activeAmbulanceStream ? (
              <div className="space-y-4">
                <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-rose-400 uppercase">
                      DISPATCH #{activeAmbulanceStream.dispatchId}
                    </span>
                    <h4 className="text-sm font-black text-white mt-0.5">
                      Vehicle: {activeAmbulanceStream.vehicleNo} • Driver: {activeAmbulanceStream.driverName}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-400/30 rounded-full">
                      {activeAmbulanceStream.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <p className="text-sm font-black text-amber-400 mt-1">ETA: {activeAmbulanceStream.eta} mins</p>
                  </div>
                </div>

                <AmbulanceMap incidentId={activeAmbulanceStream.dispatchId} socket={socket} />
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
                <Truck className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No active emergency ambulance requested.</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  If you need urgent patient transport from your village to hospital, tap the Emergency SOS button.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── BOOKING MODAL (OPD TOKEN & DOCTOR APPOINTMENT) ───────────────── */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Book OPD Queue Token</h3>
                  <p className="text-xs text-slate-500">Real-time sync to Doctor EHR & Reception</p>
                </div>
              </div>
              <button
                onClick={() => setShowBookingModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            {bookingStep === 'details' ? (
              <form onSubmit={handleProceedToPayment} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.patientName}
                    onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Age</label>
                    <input
                      type="number"
                      required
                      value={bookingForm.age}
                      onChange={(e) => setBookingForm({ ...bookingForm, age: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Gender</label>
                    <select
                      value={bookingForm.gender}
                      onChange={(e) => setBookingForm({ ...bookingForm, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500 focus:bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Village / Location</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.village}
                    onChange={(e) => setBookingForm({ ...bookingForm, village: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Doctor & Department</label>
                  <select
                    value={bookingForm.doctorName}
                    onChange={(e) => setBookingForm({ ...bookingForm, doctorName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value="Dr. Rajesh Varma">Dr. Rajesh Varma (General Medicine)</option>
                    <option value="Dr. Priya Nair">Dr. Priya Nair (Pediatrics & Child Care)</option>
                    <option value="Dr. Arvind Swamy">Dr. Arvind Swamy (Cardiology)</option>
                    <option value="Dr. Sunita Rao">Dr. Sunita Rao (Gynecology)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Symptoms / Chief Complaint</label>
                  <textarea
                    rows={2}
                    required
                    value={bookingForm.symptoms}
                    onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
                    placeholder="Describe symptoms briefly..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <input
                    type="checkbox"
                    id="reqAmb"
                    checked={bookingForm.requestAmbulance}
                    onChange={(e) => setBookingForm({ ...bookingForm, requestAmbulance: e.target.checked })}
                    className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="reqAmb" className="font-bold text-rose-900 cursor-pointer text-xs">
                    Request 108 Emergency Ambulance for Hospital Transit
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Proceed to Confirmation & Payment</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Patient:</span>
                    <strong className="text-slate-900">{bookingForm.patientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Doctor:</span>
                    <strong className="text-slate-900">{bookingForm.doctorName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hospital:</span>
                    <strong className="text-slate-900">{bookingForm.hospitalName}</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-700 font-bold">Consultation Fee:</span>
                    <strong className="text-blue-600 text-sm">₹500</strong>
                  </div>
                </div>

                <RazorpayCheckout
                  amount={500}
                  onSuccess={(paymentId) => handleCompleteBooking(paymentId, 'paid')}
                  onBplFreeSelect={() => handleCompleteBooking(undefined, 'free_bpl_aarogyasri')}
                />

                <button
                  type="button"
                  onClick={() => setBookingStep('details')}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  ← Back to Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
