'use client';
 
import { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, Phone, Star, Clock, GraduationCap, Building2,
  Stethoscope, User, Filter, ChevronDown, X, IndianRupee,
  PhoneCall, Languages, Video, MessageCircle, Crown, Sparkles, Calendar,
  CheckCircle2, ShieldCheck, Ticket, ArrowRight, Loader2
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';
import RazorpayCheckout from '@/components/RazorpayCheckout';
import { useHealthcareJourney } from '@/context/HealthcareJourneyContext';
import { persistMedicalRecord } from '@/lib/medicalHistoryService';
import FeaturePastHistoryModal from '@/components/FeaturePastHistoryModal';

interface Doctor {
  id: string;
  name: string;
  phone: string;
  location: string;
  specialization: string;
  qualification: string;
  experience: number;
  consultation_fee: number;
  hospital_name: string;
  hospital_image: string;
  profile_image: string;
  bio: string;
  languages: string[];
  rating: number;
  total_reviews: number;
  is_available: boolean;
  created_at: string;
}

/* ─── Top Doctors (hardcoded featured doctors) ─── */
const TOP_DOCTORS = [
  {
    id: 'top-bindhu',
    name: 'Bindhu',
    phone: '8790276166',
    specialization: 'General Medicine',
    qualification: 'MBBS, MD',
    experience: 12,
    location: 'Hyderabad',
    hospital_name: 'City Care Hospital',
    consultation_fee: 500,
    rating: 4.9,
    total_reviews: 248,
    bio: 'Experienced physician with expertise in general medicine, preventive healthcare, and chronic disease management.',
    languages: ['Telugu', 'Hindi', 'English'],
    image: '/assets/doctors/dr_bindhu.png',
    is_available: true,
  },
  {
    id: 'top-rama-lakshmi',
    name: 'Rama Lakshmi',
    phone: '9505926375',
    specialization: 'Gynecology',
    qualification: 'MBBS, MS (OBG)',
    experience: 15,
    location: 'Hyderabad',
    hospital_name: 'Women & Child Hospital',
    consultation_fee: 600,
    rating: 4.8,
    total_reviews: 312,
    bio: 'Senior gynecologist specializing in maternal health, high-risk pregnancies, and women\'s wellness.',
    languages: ['Telugu', 'Hindi', 'English'],
    image: '/assets/doctors/dr_rama_lakshmi.png',
    is_available: true,
  },
  {
    id: 'top-sameer',
    name: 'Sameer',
    phone: '7981502973',
    specialization: 'Cardiology',
    qualification: 'MBBS, DM (Cardiology)',
    experience: 10,
    location: 'Hyderabad',
    hospital_name: 'Heart & Vascular Institute',
    consultation_fee: 800,
    rating: 4.9,
    total_reviews: 189,
    bio: 'Interventional cardiologist with expertise in cardiac catheterization, angioplasty, and preventive cardiology.',
    languages: ['Telugu', 'Hindi', 'English', 'Urdu'],
    image: '/assets/doctors/dr_sameer.png',
    is_available: true,
  },
];

const SPECIALIZATION_FILTERS = [
  'All', 'General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics',
  'Neurology', 'Orthopedics', 'Gynecology', 'ENT', 'Ophthalmology',
  'Dentistry', 'Psychiatry', 'Oncology'
];

/* ─── Contact Action Buttons Component ─── */
function ContactButtons({
  phone,
  doctorName,
  size = 'md',
  onBook,
}: {
  phone: string;
  doctorName?: string;
  size?: 'sm' | 'md';
  onBook?: () => void;
}) {
  const cleanPhone = phone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/91${cleanPhone}`;
  const callUrl = `tel:+91${cleanPhone}`;
  const videoCallUrl = `/dashboard/video-call?phone=${cleanPhone}`;

  const btnBase = size === 'sm'
    ? 'flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5 shadow-md'
    : 'flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 shadow-lg';

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`${btnBase} bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-500/25`}
        onClick={(e) => {
          e.stopPropagation();
          onBook?.();
        }}
      >
        <Calendar className={iconSize} /> Book
      </button>
      <a href={callUrl}
        className={`${btnBase} bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/25`}
        onClick={e => e.stopPropagation()}>
        <PhoneCall className={iconSize} /> Call
      </a>
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
        className={`${btnBase} bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/25`}
        onClick={e => e.stopPropagation()}>
        <MessageCircle className={iconSize} /> WhatsApp
      </a>
      <a href={videoCallUrl}
        className={`${btnBase} bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/25`}
        onClick={e => e.stopPropagation()}>
        <Video className={iconSize} /> Video
      </a>
    </div>
  );
}

/* ─── Doctor Direct Booking Modal with Razorpay Checkout ─── */
function DoctorBookingModal({
  doctor,
  onClose,
}: {
  doctor: { name: string; phone: string; consultation_fee?: number; hospital_name?: string; specialization?: string };
  onClose: () => void;
}) {
  const { user } = useUserRole();
  const { bookNewJourney } = useHealthcareJourney();
  const [date, setDate] = useState('Today');
  const [slot, setSlot] = useState('11:30 AM');
  const [mode, setMode] = useState<'opd' | 'video'>('opd');
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [reason, setReason] = useState('Routine Medical Consultation');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [bookingPass, setBookingPass] = useState<any>(null);

  const fee = doctor.consultation_fee || 500;

  const handleBookingConfirmed = async (paymentId: string, status: 'paid' | 'free_bpl_aarogyasri') => {
    setIsSubmitting(true);
    const finalFee = status === 'free_bpl_aarogyasri' ? 0 : fee;
    try {
      const journey = await bookNewJourney({
        patientName: name,
        patientPhone: phone,
        doctorName: `Dr. ${doctor.name}`,
        doctorId: `doc_${doctor.name.toLowerCase().replace(/\s+/g, '_')}`,
        hospitalName: doctor.hospital_name || 'City Care Hospital',
        department: doctor.specialization || 'General Medicine',
        slotTime: `${date} ${slot}`,
        symptoms: `${mode === 'video' ? '[Video Teleconsult]' : '[In-Person OPD]'} ${reason}`,
        paymentStatus: status,
        consultationFee: finalFee,
        paymentId,
        bookingSource: 'patient_self',
      });

      persistMedicalRecord(user?.id || 'usr_pat_8812', {
        type: 'doctor_consultation',
        title: `Doctor Appointment: Dr. ${doctor.name}`,
        userQuery: `Booked ${mode === 'video' ? 'Video' : 'OPD'} consultation with Dr. ${doctor.name} for ${date} (${slot})`,
        aiResponse: `Confirmed Token #${journey.tokenNumber}. Fee: ${status === 'paid' ? `₹${fee} PAID` : 'AAROGYASRI FREE'}. Payment ID: ${paymentId}`,
        summary: `Dr. ${doctor.name} (${doctor.specialization}) • Token #${journey.tokenNumber}`,
        metadata: {
          tokenNumber: journey.tokenNumber,
          doctorName: doctor.name,
          slotTime: `${date} ${slot}`,
          paymentStatus: status,
          paymentAmount: finalFee,
          paymentId,
        },
      }).catch(() => {});

      setBookingPass(journey);
      setStep('success');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-2xl">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Book Doctor Consultation</h3>
              <p className="text-violet-100 text-xs">Dr. {doctor.name} • {doctor.specialization || 'General Medicine'}</p>
            </div>
          </div>
        </div>

        {step === 'form' ? (
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Mode selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Consultation Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('opd')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    mode === 'opd'
                      ? 'border-violet-600 bg-violet-50/70 ring-2 ring-violet-500/20 text-violet-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-extrabold text-xs">🏥 Hospital OPD Visit</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">In-person clinical examination</p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('video')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    mode === 'video'
                      ? 'border-violet-600 bg-violet-50/70 ring-2 ring-violet-500/20 text-violet-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-extrabold text-xs">📹 Video Consultation</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Encrypted WebRTC HD call</p>
                </button>
              </div>
            </div>

            {/* Date & Slot selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                <select
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-violet-500 bg-white"
                >
                  <option value="Today">Today (Sep 8)</option>
                  <option value="Tomorrow">Tomorrow (Sep 9)</option>
                  <option value="Wednesday">Wednesday (Sep 10)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Slot Time</label>
                <select
                  value={slot}
                  onChange={(e) => setSlot(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-violet-500 bg-white"
                >
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="02:30 PM">02:30 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                </select>
              </div>
            </div>

            {/* Patient Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Patient Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Symptoms / Purpose</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief reason for consultation..."
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-violet-500"
              />
            </div>

            {/* Fee summary card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>Doctor Consultation Fee:</span>
                <span className="font-bold text-slate-800">₹{fee}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Hospital / Facility:</span>
                <span className="font-bold text-slate-800">{doctor.hospital_name || 'City Care Hospital'}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-black text-slate-900 text-sm">Total Amount Due:</span>
                <span className="text-emerald-600 font-black text-lg">₹{fee}</span>
              </div>
            </div>

            {/* Razorpay Gateway Checkout */}
            <div className="space-y-3 pt-1">
              <RazorpayCheckout
                amount={fee}
                itemName={`Consultation: Dr. ${doctor.name}`}
                itemDescription={`${mode === 'video' ? 'Video Teleconsultation' : 'OPD Visit'} on ${date} at ${slot}`}
                userName={name}
                userPhone={phone}
                buttonText={`Pay ₹${fee} via Razorpay`}
                buttonClassName="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-violet-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                onSuccess={(paymentId) => handleBookingConfirmed(paymentId, 'paid')}
              />

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR ZERO-COST GOVT COVERAGE</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleBookingConfirmed('AAROGYASRI-FREE-BPL', 'free_bpl_aarogyasri')}
                className="w-full py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>YSR Aarogyasri / PM-JAY Free OPD (₹0)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-7 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900">Appointment Confirmed!</h4>
              <p className="text-xs text-slate-500 mt-1">
                Your appointment with Dr. {doctor.name} has been transmitted to Doctor EHR.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Allocated Token:</span>
                <span className="font-mono font-black text-blue-600">#{bookingPass?.tokenNumber || 22}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Slot Time:</span>
                <span className="font-extrabold text-slate-800">{date} · {slot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Payment Status:</span>
                <span className="font-bold text-emerald-600">
                  {bookingPass?.paymentStatus === 'free_bpl_aarogyasri' ? 'Aarogyasri Free (₹0)' : `₹${fee} PAID (${bookingPass?.paymentId})`}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/dashboard/tracking"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-xs shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
              >
                <span>Track in Real-Time Radar</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const { t, language } = useLanguage();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedTopDoctor, setSelectedTopDoctor] = useState<typeof TOP_DOCTORS[0] | null>(null);
  const [bookingDoctor, setBookingDoctor] = useState<any | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (specialization !== 'All') params.specialization = specialization;
      const res = await api.getDoctorProfiles(params);
      if (res.success) setDoctors(res.doctors || []);
    } catch {
      console.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  }, [search, specialization]);

  useEffect(() => {
    const timer = setTimeout(fetchDoctors, 300);
    return () => clearTimeout(timer);
  }, [fetchDoctors]);

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl -ml-36 -mb-36" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-xl">
              <Stethoscope className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Find a Doctor</h1>
          </div>
          <p className="text-white/80 text-lg max-w-2xl">
            Browse our verified doctors. Search by name, location, or specialization.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="bg-white/15 backdrop-blur-md rounded-xl px-5 py-3 text-white">
              <span className="text-2xl font-bold">{doctors.length + TOP_DOCTORS.length}</span>
              <span className="text-white/70 text-sm ml-2">Doctors Available</span>
            </div>
            <FeaturePastHistoryModal
              featureTitle="Doctor Consultations"
              types={['doctor_consultation']}
              icon="👨‍⚕️"
              buttonLabel="My Past Bookings"
              className="bg-white/20 hover:bg-white text-white hover:text-purple-900 border-white/30 backdrop-blur-md px-5 py-3.5 rounded-xl text-sm font-bold"
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ✨ TOP DOCTORS SECTION                             */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-2 rounded-xl shadow-lg shadow-amber-500/25">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Top Doctors</h2>
            <p className="text-sm text-slate-500">Our most trusted and experienced specialists</p>
          </div>
          <div className="ml-auto">
            <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOP_DOCTORS.map((doc, idx) => (
            <div key={doc.id}
              onClick={() => setSelectedTopDoctor(doc)}
              className="group relative bg-white rounded-2xl border-2 border-amber-200/60 shadow-lg shadow-amber-500/5 hover:shadow-2xl hover:shadow-amber-500/15 hover:border-amber-300 transition-all duration-300 cursor-pointer hover:-translate-y-2 overflow-hidden">
              
              {/* Gold Rank Badge */}
              <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                <Crown className="h-3 w-3" /> #{idx + 1} Top Doctor
              </div>

              {/* Doctor Image */}
              <div className="relative h-72 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 overflow-hidden">
                <Image
                  src={doc.image}
                  alt={`Dr. ${doc.name}`}
                  fill
                  className="object-contain object-top group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                {/* Rating */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full">
                  <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-white text-xs font-bold">{doc.rating}</span>
                  <span className="text-white/60 text-xs">({doc.total_reviews})</span>
                </div>

                {/* Available */}
                <span className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                  ● Available Now
                </span>
              </div>

              {/* Info */}
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="text-xl font-black text-slate-800 group-hover:text-amber-600 transition-colors">
                    Dr. {doc.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                    <Stethoscope className="h-3 w-3" /> {doc.specialization}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-amber-500" />
                    <span>{doc.location} · {doc.hospital_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>{doc.experience} years experience</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
                    <span>{doc.qualification}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-100">
                  <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                    <IndianRupee className="h-3.5 w-3.5" /> {doc.consultation_fee}
                  </span>
                </div>

                {/* Contact Buttons */}
                <ContactButtons phone={doc.phone} doctorName={doc.name} size="sm" onBook={() => setBookingDoctor(doc)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* 🩺 ALL DOCTORS SECTION                             */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-violet-500/25">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">All Doctors</h2>
            <p className="text-sm text-slate-500">Doctors who have created their profiles</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, location, or hospital..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all text-sm"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-5 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:border-violet-300 transition-all">
            <Filter className="h-4 w-4" /> Filter
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Specialization Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mb-4 animate-in slide-in-from-top-4 duration-300">
            {SPECIALIZATION_FILTERS.map(s => (
              <button key={s} onClick={() => setSpecialization(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  specialization === s
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-violet-300'
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Doctor Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse overflow-hidden">
                <div className="h-48 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <Stethoscope className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">No doctors found</h3>
            <p className="text-slate-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {doctors.map(doctor => (
              <div key={doctor.id}
                onClick={() => setSelectedDoctor(doctor)}
                className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-200 transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden">

                {/* Doctor Image / Hospital Image */}
                <div className="relative h-56 bg-gradient-to-br from-violet-50 to-purple-50 overflow-hidden">
                  {doctor.profile_image ? (
                    <img src={doctor.profile_image} alt={doctor.name}
                      className="w-full h-full object-contain object-top group-hover:scale-105 transition-transform duration-500" />
                  ) : doctor.hospital_image ? (
                    <img src={doctor.hospital_image} alt={doctor.hospital_name}
                      className="w-full h-full object-contain object-top group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-xl">
                        <User className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Availability badge */}
                  {doctor.is_available && (
                    <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      ✅ Available
                    </span>
                  )}

                  {/* Rating */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full">
                    <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-xs font-bold">{doctor.rating}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 group-hover:text-violet-600 transition-colors">
                      Dr. {doctor.name}
                    </h3>
                    {doctor.specialization && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                        <Stethoscope className="h-3 w-3" /> {doctor.specialization}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{doctor.location}</span>
                    </div>
                    {doctor.hospital_name && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{doctor.hospital_name}</span>
                      </div>
                    )}
                    {doctor.experience > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{doctor.experience} years experience</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    {doctor.consultation_fee > 0 && (
                      <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                        <IndianRupee className="h-3.5 w-3.5" /> {doctor.consultation_fee}
                      </span>
                    )}
                    <span className="text-xs text-violet-500 font-bold group-hover:translate-x-1 transition-transform">
                      View Profile →
                    </span>
                  </div>

                  {/* Contact Buttons for all doctors with phone */}
                  {doctor.phone && (
                    <ContactButtons phone={doctor.phone} doctorName={doctor.name} size="sm" onBook={() => setBookingDoctor(doctor)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* Doctor Detail Modal (for profile doctors)          */}
      {/* ═══════════════════════════════════════════════════ */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedDoctor(null)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header Image */}
            <div className="relative h-72 bg-gradient-to-br from-violet-100 to-purple-100">
              {selectedDoctor.profile_image ? (
                <img src={selectedDoctor.profile_image} alt={selectedDoctor.name}
                  className="w-full h-full object-contain object-top" />
              ) : selectedDoctor.hospital_image ? (
                <img src={selectedDoctor.hospital_image} alt={selectedDoctor.hospital_name}
                  className="w-full h-full object-contain object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
                    <User className="h-14 w-14 text-white" />
                  </div>
                </div>
              )}
              <button onClick={() => setSelectedDoctor(null)}
                className="absolute top-4 right-4 bg-white/90 backdrop-blur-md hover:bg-white rounded-full p-2 shadow-lg transition">
                <X className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Dr. {selectedDoctor.name}</h2>
                {selectedDoctor.specialization && (
                  <span className="inline-flex items-center gap-1 mt-1 text-sm font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                    <Stethoscope className="h-4 w-4" /> {selectedDoctor.specialization}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-violet-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-violet-700">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> {selectedDoctor.rating}
                  </div>
                  <p className="text-xs text-violet-500 mt-0.5">Rating</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-emerald-700">{selectedDoctor.experience}+</div>
                  <p className="text-xs text-emerald-500 mt-0.5">Years Exp.</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-0.5 text-lg font-bold text-amber-700">
                    ₹{selectedDoctor.consultation_fee || 'Free'}
                  </div>
                  <p className="text-xs text-amber-500 mt-0.5">Consult Fee</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <span>{selectedDoctor.location}</span>
                </div>
                {selectedDoctor.hospital_name && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Building2 className="h-4 w-4 text-violet-500 flex-shrink-0" />
                    <span>{selectedDoctor.hospital_name}</span>
                  </div>
                )}
                {selectedDoctor.qualification && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <GraduationCap className="h-4 w-4 text-violet-500 flex-shrink-0" />
                    <span>{selectedDoctor.qualification}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <span>{selectedDoctor.phone}</span>
                </div>
              </div>

              {/* Languages */}
              {selectedDoctor.languages?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5 text-violet-500" /> Languages
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedDoctor.languages.map(l => (
                      <span key={l} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {selectedDoctor.bio && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-1">About</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{selectedDoctor.bio}</p>
                </div>
              )}

              {/* Hospital Image */}
              {selectedDoctor.hospital_image && selectedDoctor.profile_image && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Hospital</h4>
                  <img src={selectedDoctor.hospital_image} alt={selectedDoctor.hospital_name}
                    className="w-full h-40 object-cover rounded-xl" />
                </div>
              )}

              {/* Contact Actions */}
              {selectedDoctor.phone && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Contact Doctor</h4>
                  <ContactButtons
                    phone={selectedDoctor.phone}
                    doctorName={selectedDoctor.name}
                    size="md"
                    onBook={() => {
                      const d = selectedDoctor;
                      setSelectedDoctor(null);
                      setBookingDoctor(d);
                    }}
                  />
                </div>
              )}

              <button onClick={() => setSelectedDoctor(null)}
                className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* Top Doctor Detail Modal                            */}
      {/* ═══════════════════════════════════════════════════ */}
      {selectedTopDoctor && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedTopDoctor(null)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header Image */}
            <div className="relative h-80 bg-gradient-to-br from-amber-50 to-orange-50">
              <Image
                src={selectedTopDoctor.image}
                alt={`Dr. ${selectedTopDoctor.name}`}
                fill
                className="object-contain object-top"
                sizes="(max-width: 768px) 100vw, 672px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <button onClick={() => setSelectedTopDoctor(null)}
                className="absolute top-4 right-4 bg-white/90 backdrop-blur-md hover:bg-white rounded-full p-2 shadow-lg transition">
                <X className="h-5 w-5 text-slate-700" />
              </button>
              <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                <Crown className="h-3 w-3" /> Top Doctor
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Dr. {selectedTopDoctor.name}</h2>
                <span className="inline-flex items-center gap-1 mt-1 text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                  <Stethoscope className="h-4 w-4" /> {selectedTopDoctor.specialization}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-lg font-bold text-amber-700">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> {selectedTopDoctor.rating}
                  </div>
                  <p className="text-xs text-amber-500 mt-0.5">{selectedTopDoctor.total_reviews} reviews</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-emerald-700">{selectedTopDoctor.experience}+</div>
                  <p className="text-xs text-emerald-500 mt-0.5">Years Exp.</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-0.5 text-lg font-bold text-violet-700">
                    ₹{selectedTopDoctor.consultation_fee}
                  </div>
                  <p className="text-xs text-violet-500 mt-0.5">Consult Fee</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span>{selectedTopDoctor.location}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Building2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span>{selectedTopDoctor.hospital_name}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <GraduationCap className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span>{selectedTopDoctor.qualification}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span>{selectedTopDoctor.phone}</span>
                </div>
              </div>

              {/* Languages */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-amber-500" /> Languages
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTopDoctor.languages.map(l => (
                    <span key={l} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">{l}</span>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-1">About</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{selectedTopDoctor.bio}</p>
              </div>

              {/* Contact Actions */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Contact Doctor</h4>
                <ContactButtons
                  phone={selectedTopDoctor.phone}
                  doctorName={selectedTopDoctor.name}
                  size="md"
                  onBook={() => {
                    const d = selectedTopDoctor;
                    setSelectedTopDoctor(null);
                    setBookingDoctor(d);
                  }}
                />
              </div>

              <button onClick={() => setSelectedTopDoctor(null)}
                className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Booking Modal with Razorpay Checkout */}
      {bookingDoctor && (
        <DoctorBookingModal
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
        />
      )}
    </div>
  );
}
