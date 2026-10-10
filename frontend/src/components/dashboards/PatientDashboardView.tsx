'use client';

import React, { useState } from 'react';
import {
  Heart, Activity, Droplets, ShieldAlert, Calendar, Clock,
  ArrowRight, Sparkles, CheckCircle2, ChevronRight, Stethoscope,
  Pill, AlertCircle, PhoneCall, FileText, User, Ticket, Plus, X,
  Navigation, ShieldCheck
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';
import { useSmartQueue } from '@/context/SmartQueueContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useHealthcareJourney } from '@/context/HealthcareJourneyContext';
import RazorpayCheckout from '@/components/RazorpayCheckout';
import { persistMedicalRecord } from '@/lib/medicalHistoryService';
import AmbulanceMap from '@/components/AmbulanceMap';

import Link from 'next/link';

export default function PatientDashboardView() {
  const { t } = useLanguage();
  const { user, setRole } = useUserRole();
  const { myToken, currentConsultingToken, currentlyConsulting, totalWaiting, queue, bookAppointment } = useSmartQueue();
  const { activeAmbulanceStream, orders, createOrder, socket } = useRealtime();
  const { bookNewJourney, activeJourney, journeys } = useHealthcareJourney();
  const [symptomInput, setSymptomInput] = useState('');
  const [medsTaken, setMedsTaken] = useState<Record<string, boolean>>({
    m1: true,
    m2: false,
    m3: false,
  });


  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<'details' | 'payment'>('details');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    patientName: user?.name || '',
    age: 32,
    gender: 'Male',
    village: user?.village || 'Kothapeta',
    doctorName: 'Dr. Rajesh Varma',
    symptoms: 'Mild Fever & Headache',
    isPriority: false,
  });

  React.useEffect(() => {
    if (user?.name) {
      setBookingForm(prev => ({
        ...prev,
        patientName: user.name,
        village: user.village || prev.village,
      }));
    }
  }, [user]);

  const toggleMed = (id: string) => {
    setMedsTaken((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStep('payment');
  };

  const handleCompleteBooking = async (paymentIdOverride?: string, statusOverride?: 'paid' | 'free_bpl_aarogyasri') => {
    setIsBookingSubmitting(true);
    const finalPaymentStatus = statusOverride || 'paid';
    const finalAmount = finalPaymentStatus === 'free_bpl_aarogyasri' ? 0 : 500;
    const finalPaymentId = paymentIdOverride || (finalPaymentStatus === 'paid' ? `rzp_${Date.now().toString(36)}` : 'AAROGYASRI-FREE-BPL');
    const orderNumber = `ORD-OPD-${Date.now().toString().slice(-6)}`;
    const apptId = `APT-${Date.now().toString().slice(-5)}`;

    try {
      const createdItem = await bookAppointment({
        ...bookingForm,
        appointmentId: apptId,
        orderId: orderNumber,
        hospitalName: 'Apollo Hospitals OPD Clinic',
        paymentStatus: finalPaymentStatus,
        paymentAmount: finalAmount,
      });

      // Persist to lifetime medical records
      persistMedicalRecord(user?.id || 'usr_pat_8812', {
        type: 'hospital_appointment',
        title: `OPD Token #${createdItem?.token || 21}: ${bookingForm.doctorName}`,
        userQuery: `Booked OPD consultation token for ${bookingForm.patientName} (${bookingForm.symptoms})`,
        aiResponse: `Confirmed Token #${createdItem?.token || 21}. Consultation Fee: ${finalPaymentStatus === 'paid' ? '₹500 PAID' : 'FREE BPL'}. Payment ID: ${finalPaymentId}`,
        summary: `OPD Token #${createdItem?.token || 21} • Dr. Rajesh Varma`,
        metadata: {
          tokenNumber: createdItem?.token || 21,
          appointmentId: apptId,
          orderId: orderNumber,
          patientName: bookingForm.patientName,
          doctorName: bookingForm.doctorName,
          symptoms: bookingForm.symptoms,
          paymentStatus: finalPaymentStatus,
          paymentAmount: finalAmount,
          paymentId: finalPaymentId,
        },
      }).catch(() => {});

      // Connect to unified 9-Stage Healthcare Journey
      await bookNewJourney({
        patientName: bookingForm.patientName,
        age: bookingForm.age,
        gender: bookingForm.gender as any,
        village: bookingForm.village,
        hospitalName: 'Apollo Hospitals OPD Clinic',
        department: 'General Medicine & OPD',
        doctorName: bookingForm.doctorName,
        doctorId: 'usr_doc_9941',
        slotTime: 'Today 11:30 AM',
        bookingSource: 'patient_self',
        symptoms: bookingForm.symptoms,
        paymentStatus: finalPaymentStatus,
        consultationFee: finalAmount,
        paymentId: finalPaymentId,
      });
    } catch (err) {
      console.warn('Booking error:', err);
    } finally {
      setIsBookingSubmitting(false);
      setShowBookingModal(false);
      setBookingStep('details');
    }
  };

  // Active user token info or default fallback token #14
  const activeTokenNumber = myToken ? myToken.token : 14;
  const activeApptId = myToken ? myToken.appointmentId : 'APT-2026-00821';
  const activeStatus = myToken ? myToken.status : 'waiting';
  const curToken = currentConsultingToken || 11;
  const patientsAhead = Math.max(0, activeTokenNumber - curToken - 1);
  const estWaitMins = myToken ? myToken.estimatedTime : `~${Math.max(5, patientsAhead * 8)} mins`;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-12">
      {/* Role Switch Banner — Warm Clean Aesthetic */}
      <div className="bg-[#FAF7F2] text-stone-900 rounded-3xl p-4 md:p-6 border border-[#EFE8DE] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center font-bold text-white shadow-sm">
            <User className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-black text-amber-800">Current View</span>
              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-bold">Patient Experience & Smart Queue</span>
            </div>
            <p className="text-xs text-stone-500 font-medium mt-0.5">Live OPD Queue Tracking • Instant Appointment Token • Care Flow Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setRole('asha')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 rounded-xl text-xs font-bold transition-all border border-[#EBE4D8] shadow-sm"
          >
            Switch to ASHA Worker
          </button>
          <button
            onClick={() => setRole('doctor')}
            className="flex-1 md:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/20"
          >
            Switch to Doctor EHR
          </button>
        </div>
      </div>

      {/* Patient Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE8DE] pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-stone-900 tracking-tight">
            Good Morning, {user?.name || 'Patient'} 👋
          </h1>
          <p className="text-stone-500 text-base font-medium mt-1">
            Here is your health summary and real-time appointment status for today.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/tracking"
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-105"
          >
            <Navigation className="h-4 w-4 animate-pulse" /> Live Tracking Center
          </Link>
          <button
            onClick={() => setShowBookingModal(true)}
            className="flex items-center gap-2 bg-[#FAF6F0] hover:bg-[#F2ECE0] text-stone-800 border border-[#EBE4D8] px-5 py-3 rounded-2xl font-black text-xs shadow-sm transition-all hover:scale-105"
          >
            <Ticket className="h-4 w-4 text-amber-600" /> Book OPD Queue Token
          </button>
          <Link
            href="/dashboard/emergency"
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-md shadow-rose-600/20 transition-all hover:-translate-y-0.5"
          >
            <ShieldAlert className="h-4 w-4" /> Emergency SOS
          </Link>
        </div>
      </div>

      {/* ================= SMART LIVE QUEUE CARD — CLEAN LIGHT WARM THEME ================= */}
      {myToken ? (
        <div className="bg-white text-stone-900 rounded-3xl p-6 md:p-8 shadow-xl shadow-stone-200/50 border border-[#EFE8DE] relative overflow-hidden space-y-6">
          {/* Card Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EFE8DE] pb-5 relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  APPOINTMENT CONFIRMED
                </span>
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Socket Connected
                </span>
              </div>
              <h2 className="text-2xl font-black text-stone-900 mt-1">General Medicine OPD Clinic</h2>
              <p className="text-xs text-stone-500 font-medium">Apollo Clinic • Room #4 • {myToken.doctorName || 'Dr. Rajesh Varma'}</p>
            </div>

            <div className="bg-[#FAF7F2] px-4 py-2.5 rounded-2xl border border-[#EFE8DE] flex items-center justify-between gap-4 shadow-sm">
              <div>
                <p className="text-[10px] font-bold text-stone-500 uppercase">Appointment ID</p>
                <p className="text-sm font-black text-stone-900 tracking-wider">{myToken.appointmentId || 'APT-LIVE'}</p>
              </div>
              <Ticket className="h-6 w-6 text-amber-600" />
            </div>
          </div>

          {/* Queue Metrics Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EFE8DE]">
              <p className="text-[10px] font-extrabold text-stone-500 uppercase">Your Queue Token</p>
              <p className="text-3xl font-black text-stone-900 mt-1">#{myToken.token}</p>
              <p className="text-[10px] text-amber-800 font-bold mt-0.5">Status: {myToken.status.toUpperCase()}</p>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EFE8DE]">
              <p className="text-[10px] font-extrabold text-stone-500 uppercase">Currently Consulting</p>
              <p className="text-3xl font-black text-emerald-700 mt-1">{currentConsultingToken ? `#${currentConsultingToken}` : 'Ready'}</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">In Clinic Room #4</p>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EFE8DE]">
              <p className="text-[10px] font-extrabold text-stone-500 uppercase">Patients Ahead</p>
              <p className="text-3xl font-black text-amber-600 mt-1">{Math.max(0, myToken.token - (currentConsultingToken || 0) - 1)}</p>
              <p className="text-[10px] text-amber-700 font-bold mt-0.5">{Math.max(0, myToken.token - (currentConsultingToken || 0) - 1) === 0 ? 'YOU ARE NEXT!' : 'Waiting in Lobby'}</p>
            </div>

            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EFE8DE]">
              <p className="text-[10px] font-extrabold text-stone-500 uppercase">Estimated Wait Time</p>
              <p className="text-2xl font-black text-stone-900 mt-1.5">{myToken.estimatedTime || `~${Math.max(5, Math.max(0, myToken.token - (currentConsultingToken || 0) - 1) * 8)} mins`}</p>
              <p className="text-[10px] text-stone-500 font-medium mt-0.5">~8 min / patient avg</p>
            </div>
          </div>

          {/* Live Stepper Queue Status Progression */}
          <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#EBE4D8] space-y-3 relative z-10">
            <p className="text-xs font-bold text-stone-600 uppercase tracking-wider flex items-center justify-between">
              <span>Live Queue Progress Stepper</span>
              <span>Refreshes Automatically</span>
            </p>

            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#EBE4D8] text-xs flex-shrink-0 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-bold text-stone-900">#{currentConsultingToken || '—'} Consulting</span>
              </div>

              <ChevronRight className="h-4 w-4 text-stone-400 flex-shrink-0" />

              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-extrabold flex-shrink-0 shadow-sm ${
                Math.max(0, myToken.token - (currentConsultingToken || 0) - 1) === 0
                  ? 'bg-emerald-600 text-white animate-bounce'
                  : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white'
              }`}>
                <Ticket className="h-3.5 w-3.5" />
                <span>#{myToken.token} {Math.max(0, myToken.token - (currentConsultingToken || 0) - 1) === 0 ? 'YOU ARE NEXT!' : 'YOUR TOKEN'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white text-stone-900 rounded-3xl p-6 md:p-8 shadow-xl shadow-stone-200/50 border border-[#EFE8DE] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
              <Ticket className="h-3.5 w-3.5 text-amber-600" /> OPD Queue Ready
            </div>
            <h2 className="text-2xl font-black text-stone-900">No Active OPD Token Booked</h2>
            <p className="text-stone-600 text-sm max-w-xl">
              You haven&apos;t booked an appointment token for today yet. Book your OPD consultation token now to skip long physical queues and track live doctor consultation status.
            </p>
          </div>
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-6 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-black text-sm rounded-2xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 shrink-0 hover:scale-105"
          >
            <Ticket className="h-4 w-4" />
            <span>Book OPD Queue Token</span>
          </button>
        </div>
      )}

      {/* ================= ACTIVE HEALTHCARE JOURNEY & LIVE DOCTOR/ASHA FEED ================= */}
      {activeJourney && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Live Care Journey: {activeJourney.id}
                  </span>
                  {activeJourney.bookingSource === 'asha_assisted' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ASHA Assisted ({activeJourney.ashaWorkerName || 'Community Worker'})
                    </span>
                  )}
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Doctor & Hospital Sync
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {activeJourney.doctorName} • {activeJourney.hospitalName}
                </h3>
              </div>
            </div>

            <Link
              href="/dashboard/tracking"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all self-start sm:self-auto"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Full 9-Stage Tracking Radar →</span>
            </Link>
          </div>

          {/* Current Step Banner */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse shrink-0" />
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Current Care Stage</p>
                <p className="text-sm font-black text-indigo-900 uppercase">
                  {activeJourney.currentStep.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {activeJourney.statusNotes || 'In consultation with medical team.'}
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
              Slot: {activeJourney.slotTime}
            </span>
          </div>

          {/* If Doctor has issued Digital Prescription */}
          {activeJourney.prescription && (
            <div className="bg-[#FAF7F2] text-stone-900 rounded-2xl p-5 border border-[#EFE8DE] space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EFE8DE] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-stone-900">Digital Prescription Issued by {activeJourney.prescription.doctorName}</h4>
                    <p className="text-[10px] text-stone-500">Prescription ID: {activeJourney.prescription.id}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  {activeJourney.prescription.status.toUpperCase()}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-stone-600">
                  <strong className="text-stone-900">Clinical Diagnosis:</strong> {activeJourney.prescription.diagnosis}
                </p>
                {activeJourney.prescription.instructions && (
                  <p className="text-amber-800 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                    &ldquo;{activeJourney.prescription.instructions}&rdquo;
                  </p>
                )}
              </div>

              {activeJourney.prescription.medicines && activeJourney.prescription.medicines.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-stone-500">Prescribed Medications:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {activeJourney.prescription.medicines.map((med, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl border border-[#EFE8DE] text-xs shadow-xs">
                        <p className="font-extrabold text-stone-900 flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5 text-amber-500" />
                          {med.name}
                        </p>
                        <p className="text-[10px] text-stone-500 mt-1">{med.dosage} • {med.frequency}</p>
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{med.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= REALTIME AMBULANCE & ORDER TRACKING ROW ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ambulance Live GPS Tracking Card */}
        {activeAmbulanceStream ? (
          <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Ambulance Live Tracking</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {activeAmbulanceStream.dispatchId}</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Live GPS
              </span>
            </div>

            <div className="bg-[#FAF7F2] text-stone-900 rounded-2xl p-4 space-y-3 border border-[#EFE8DE]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 font-bold">Vehicle: <span className="text-stone-900">{activeAmbulanceStream.vehicleNo}</span></span>
                <span className="text-stone-500 font-bold">Driver: <span className="text-stone-900">{activeAmbulanceStream.driverName}</span></span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#EFE8DE]">
                <div>
                  <p className="text-[10px] font-bold text-stone-500 uppercase">Status Stage</p>
                  <p className="text-xs font-black text-emerald-700 uppercase">{activeAmbulanceStream.status.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-stone-500 uppercase">Estimated Arrival</p>
                  <p className="text-lg font-black text-amber-700 leading-none">{activeAmbulanceStream.eta} mins</p>
                </div>
              </div>
            </div>

            <AmbulanceMap incidentId={activeAmbulanceStream.dispatchId} socket={socket} />
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">108 Emergency Ambulance</h3>
                  <p className="text-xs text-slate-500">Government Rapid Emergency Service</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Emergency response fleet is on 24/7 standby in Kurnool. In case of trauma, accident, or acute medical distress, trigger SOS for instant GPS dispatch.
              </p>
            </div>
            <Link
              href="/dashboard/emergency"
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert className="h-4 w-4" /> Emergency SOS Dispatch →
            </Link>
          </div>
        )}

        {/* Medicine Order Tracker */}
        {orders && orders.length > 0 ? (
          <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">Medicine Order Tracker</h3>
                    <p className="text-xs text-slate-500 font-mono">ID: {orders[0].orderNumber}</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  {orders[0].status?.replace('_', ' ')}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Prescription Medicine Delivery</span>
                  <span className="text-blue-600 font-extrabold">₹{orders[0].totalAmount}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Delivery Agent: {orders[0].deliveryAgent || 'Pharma Express'} • ETA: {orders[0].eta || '20 mins'}</p>
              </div>
            </div>

            <Link
              href="/dashboard/medicines"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-extrabold rounded-2xl text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Pill className="h-4 w-4 text-white" /> View Medicine Store →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">PM Jan Aushadhi Kendra</h3>
                  <p className="text-xs text-slate-500">Affordable Generic Medicines</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Save up to 80% on genuine generic medicines. Search any medicine name or composition to order for doorstep delivery or pickup.
              </p>
            </div>
            <Link
              href="/dashboard/medicines"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Pill className="h-4 w-4" /> Order Medicines Online →
            </Link>
          </div>
        )}
      </div>

      {/* Vitals Grid — Restrained Blue & Grey */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Heart Rate */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Heart className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              Normal
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Heart Rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">72</span>
            <span className="text-sm font-semibold text-slate-500">bpm</span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-3 flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" /> Measured 15 mins ago
          </p>
        </div>

        {/* Blood Pressure */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              Optimal
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Blood Pressure</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">120/80</span>
            <span className="text-sm font-semibold text-slate-500">mmHg</span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-3 flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" /> Measured today at 8:00 AM
          </p>
        </div>

        {/* Fasting Glucose */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Droplets className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
              Fasting
            </span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Fasting Glucose</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">98</span>
            <span className="text-sm font-semibold text-slate-500">mg/dL</span>
          </div>
          <p className="text-xs text-slate-400 font-medium mt-3 flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400" /> Measured yesterday
          </p>
        </div>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: AI Symptom Search & Medication Checklist */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Symptom & Health Search Bar */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">AI Health Triage</h3>
                  <p className="text-xs text-slate-500 font-medium">Describe your symptoms for instant guidance</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                Gemini AI Active
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                placeholder="e.g. Mild fever since morning, sore throat..."
                className="w-full pl-5 pr-28 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
              <button
                onClick={() => {
                  if (symptomInput) {
                    window.location.href = `/dashboard/symptoms?q=${encodeURIComponent(symptomInput)}`;
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <span>Analyze</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick symptom chips */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-slate-400 font-bold mr-1">Quick Suggestions:</span>
              {['Headache & Fatigue', 'Cold & Cough', 'Stomach Pain', 'Skin Rash'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => setSymptomInput(chip)}
                  className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-xl transition-colors border border-slate-200/60"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Medication Schedule Checklist */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Today's Prescription Schedule</h3>
                  <p className="text-xs text-slate-500 font-medium">3 medicines scheduled for today</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500">2 of 3 Taken</span>
            </div>

            <div className="space-y-3">
              {[
                { id: 'm1', name: 'Dolo 650mg', dose: '1 Tablet • After Breakfast', time: '08:30 AM' },
                { id: 'm2', name: 'Metformin 500mg', dose: '1 Tablet • After Lunch', time: '02:00 PM' },
                { id: 'm3', name: 'Atorvastatin 10mg', dose: '1 Tablet • Before Bedtime', time: '09:30 PM' },
              ].map((med) => {
                const isTaken = medsTaken[med.id];
                return (
                  <div
                    key={med.id}
                    onClick={() => toggleMed(med.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      isTaken
                        ? 'bg-slate-50 border-slate-200 text-slate-500'
                        : 'bg-white border-blue-200/80 hover:border-blue-400 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          isTaken ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'
                        }`}
                      >
                        {isTaken && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isTaken ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {med.name}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">{med.dose}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                      {med.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Quick Access */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Quick Healthcare Access</h4>

            <div className="grid grid-cols-2 gap-3">
              <a
                href="/dashboard/reports"
                className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 transition-all group"
              >
                <FileText className="h-5 w-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-xs text-slate-800">Lab Reports</p>
                <p className="text-[10px] text-slate-400 mt-0.5">AI OCR Analyzer</p>
              </a>

              <a
                href="/dashboard/scanner"
                className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 transition-all group"
              >
                <Pill className="h-5 w-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-xs text-slate-800">Scan Medicine</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Camera OCR</p>
              </a>

              <a
                href="/dashboard/doctors"
                className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200/80 hover:border-blue-300 transition-all group"
              >
                <Stethoscope className="h-5 w-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-xs text-slate-800">Find Specialist</p>
                <p className="text-[10px] text-slate-400 mt-0.5">250+ Doctors</p>
              </a>

              <a
                href="/dashboard/emergency"
                className="p-4 rounded-2xl bg-slate-50 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-300 transition-all group"
              >
                <ShieldAlert className="h-5 w-5 text-rose-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="font-bold text-xs text-slate-800">Crisis Desk</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Hospital SOS</p>
              </a>
            </div>
          </div>
        </div>
      </div>



      {/* Booking Modal with Payment Integration */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {bookingStep === 'payment' && (
                  <button
                    onClick={() => setBookingStep('details')}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 text-xs font-bold"
                  >
                    ← Back
                  </button>
                )}
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {bookingStep === 'details' ? 'Book OPD Queue Token' : 'Consultation Fee Checkout'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {bookingStep === 'details'
                      ? 'Step 1 of 2: Patient Info & Clinical Vitals'
                      : 'Step 2 of 2: Secure Payment & Real-Time Token Generation'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setBookingStep('details');
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bookingStep === 'details' ? (
              <form onSubmit={handleProceedToPayment} className="space-y-4 text-xs font-bold text-slate-700">
                <div>
                  <label className="block mb-1 text-slate-600">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.patientName}
                    onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-slate-600">Age (years)</label>
                    <input
                      type="number"
                      value={bookingForm.age}
                      onChange={(e) => setBookingForm({ ...bookingForm, age: parseInt(e.target.value) || 30 })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600">Village / Locality</label>
                    <input
                      type="text"
                      value={bookingForm.village}
                      onChange={(e) => setBookingForm({ ...bookingForm, village: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-slate-600">Chief Symptoms / Reason for Visit</label>
                  <input
                    type="text"
                    value={bookingForm.symptoms}
                    onChange={(e) => setBookingForm({ ...bookingForm, symptoms: e.target.value })}
                    placeholder="e.g. Fever, Blood Pressure Check"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-semibold text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="priorityCheck"
                    checked={bookingForm.isPriority}
                    onChange={(e) => setBookingForm({ ...bookingForm, isPriority: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="priorityCheck" className="text-xs text-rose-600 font-extrabold cursor-pointer">
                    Flag as Emergency / High Priority
                  </label>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="px-5 py-3 bg-slate-100 text-slate-600 rounded-xl font-extrabold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-lg shadow-blue-600/20 flex items-center gap-2"
                  >
                    <span>Proceed to Payment (₹500)</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Order Summary */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Patient:</span>
                    <span className="font-extrabold text-slate-800">{bookingForm.patientName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Clinic & Doctor:</span>
                    <span className="font-extrabold text-slate-800">Apollo OPD • {bookingForm.doctorName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Locality / Village:</span>
                    <span className="font-semibold text-slate-700">{bookingForm.village}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-extrabold text-slate-800 text-sm">Consultation Fee:</span>
                    <span className="text-emerald-600 font-black text-lg">₹500</span>
                  </div>
                </div>

                {/* Razorpay Gateway */}
                <div className="space-y-3">
                  <RazorpayCheckout
                    amount={500}
                    itemName="Apollo OPD Consultation Queue Token"
                    itemDescription={`OPD Consultation for ${bookingForm.patientName} with ${bookingForm.doctorName}`}
                    userName={bookingForm.patientName}
                    buttonText="Pay ₹500 via Razorpay"
                    buttonClassName="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    onSuccess={(paymentId) => handleCompleteBooking(paymentId, 'paid')}
                  />

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR ZERO-COST GOVT COVERAGE</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button
                    type="button"
                    disabled={isBookingSubmitting}
                    onClick={() => handleCompleteBooking('AAROGYASRI-FREE-BPL', 'free_bpl_aarogyasri')}
                    className="w-full py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>YSR Aarogyasri / PM-JAY Free OPD Token (₹0)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
