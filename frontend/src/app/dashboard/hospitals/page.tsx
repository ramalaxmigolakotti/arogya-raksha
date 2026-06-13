'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MapPin, Phone, Star, Navigation, Loader2, MapPinned, Pill, Stethoscope,
  X, Calendar, Clock, User, Search, LocateFixed, Shield,
  Building2, AlertTriangle, CheckCircle2, ActivitySquare, Bed,
  Bot, MessageCircle, Sparkles, Copy, ExternalLink, Zap,
  Heart, Brain, Baby, Bone, Eye, Wind, Syringe, FlaskConical
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLocation } from '@/context/LocationContext';
import { useLanguage } from '@/context/LanguageContext';

const HospitalMap = dynamic(() => import('./HospitalMap'), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────
interface NearbyHospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  type: string;
  phone?: string;
  website?: string;
  // Real OSM live data
  openNow?: boolean | null;     // null = unknown
  openingHours?: string;
  emergency?: boolean;
  specialties: string[];
  bedCount?: number;
  operator?: string;
  rating: number;
  reviewCount: number;
  aiScore?: number;
  aiCondition?: string;
  // Doctor availability
  doctorCount: number;          // seeded, realistic
  doctorsAvailable: number;     // on-duty right now
  availabilityStatus: 'available' | 'limited' | 'unavailable';
}

interface BookingForm {
  name: string; phone: string; specialty: string;
  date: string; time: string; reason: string;
}

// ── Haversine ──────────────────────────────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Doctor Availability (seeded, deterministic — always 90% available for demo) ─────
function seedDoctorInfo(id: string, type: string, isEmergency: boolean): {
  doctorCount: number;
  doctorsAvailable: number;
  availabilityStatus: 'available' | 'limited' | 'unavailable';
} {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  const abs = Math.abs(h);

  // Doctor count by type
  const isHospital = type === 'Hospital';
  const doctorCount = isHospital
    ? 8  + (abs % 33)    // Hospitals: 8–40 doctors
    : 2  + (abs % 9);    // Clinics/Pharmacies: 2–10

  // Emergency hospitals — always available, full staff
  if (isEmergency) {
    const available = Math.max(3, Math.floor(doctorCount * 0.65) + (abs % 4));
    return { doctorCount, doctorsAvailable: Math.min(available, doctorCount), availabilityStatus: 'available' };
  }

  // Deterministic bucket — no time-of-day check (hackathon demo: always 90% available)
  const slot = abs % 10; // 0–9

  if (slot === 9) {
    // Only 10% → unavailable
    return { doctorCount, doctorsAvailable: 0, availabilityStatus: 'unavailable' };
  }

  if (slot === 8) {
    // ~10% → limited
    const available = Math.max(1, Math.floor(doctorCount * 0.3));
    return { doctorCount, doctorsAvailable: available, availabilityStatus: 'limited' };
  }

  // 80% → fully available (60–85% on duty)
  const pct = 0.55 + (abs % 7) * 0.05; // 55% – 85%
  const available = Math.max(1, Math.floor(doctorCount * pct));
  return { doctorCount, doctorsAvailable: Math.min(available, doctorCount), availabilityStatus: 'available' };
}

// ── Opening Hours Parser (real OSM opening_hours format) ───────────────────
function parseOpenNow(openingHours: string | undefined): boolean | null {
  if (!openingHours) return null;
  const raw = openingHours.toLowerCase().trim();
  if (raw === '24/7' || raw === 'mo-su 00:00-24:00' || raw === 'yes') return true;
  if (raw === 'no' || raw === 'closed') return false;

  const DAY_MAP: Record<string, number> = {
    mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6, su: 0,
  };
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun
  const currentMins = now.getHours() * 60 + now.getMinutes();

  // Try to parse simple patterns like "Mo-Sa 09:00-21:00"
  const rangePattern = /([a-z]{2})(?:-([a-z]{2}))?\s+(\d{2}):(\d{2})-(\d{2}):(\d{2})/g;
  let match;
  while ((match = rangePattern.exec(raw)) !== null) {
    const [, dayFrom, dayTo, h1, m1, h2, m2] = match;
    const from = DAY_MAP[dayFrom] ?? -1;
    const to = dayTo ? DAY_MAP[dayTo] ?? from : from;
    const open = parseInt(h1) * 60 + parseInt(m1);
    const close = parseInt(h2) * 60 + parseInt(m2);

    // Check if today is in day range (handling week wrap)
    let inDay = false;
    if (from <= to) {
      inDay = currentDay >= from && currentDay <= to;
    } else {
      inDay = currentDay >= from || currentDay <= to;
    }
    if (inDay && currentMins >= open && currentMins < close) return true;
    if (inDay) return false;
  }
  return null;
}

// ── Specialty Icon Mapper ──────────────────────────────────────────────────
const SPECIALTY_ICONS: Record<string, any> = {
  cardiology: Heart, neurology: Brain, paediatrics: Baby, pediatrics: Baby,
  orthopaedics: Bone, ophthalmology: Eye, pulmonology: Wind,
  oncology: Syringe, pathology: FlaskConical, general: Stethoscope,
};

function SpecialtyChip({ name }: { name: string }) {
  const key = name.toLowerCase().split(/[\s,]/)[0];
  const Icon = SPECIALTY_ICONS[key] || Stethoscope;
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
      <Icon className="h-2.5 w-2.5" /> {name}
    </span>
  );
}

// ── Consistent seed-based rating (deterministic per hospital) ──────────────
function seedRating(id: string): { rating: number; reviewCount: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  const rating = 3.5 + ((Math.abs(h) % 15) / 10); // 3.5–5.0
  const reviewCount = 50 + (Math.abs(h >> 4) % 950); // 50–1000
  return { rating: Math.round(rating * 10) / 10, reviewCount };
}

// ── Star Rating Component ──────────────────────────────────────────────────
function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={`h-3 w-3 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
      ))}
      <span className="text-xs font-bold text-slate-700 ml-0.5">{rating.toFixed(1)}</span>
      <span className="text-[10px] text-slate-400">({count.toLocaleString()})</span>
    </div>
  );
}

// ── Location Status ────────────────────────────────────────────────────────
function LocationStatus({ status, address }: { status: string; address: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'granted' ? (
        <>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-slate-600 font-medium truncate max-w-[340px]">
            <LocateFixed className="h-3.5 w-3.5 inline mr-1 text-emerald-600" />
            {address || 'Location detected'}
          </span>
        </>
      ) : status === 'loading' ? (
        <><Loader2 className="h-4 w-4 animate-spin text-blue-500" /><span className="text-slate-500 font-medium">Detecting location…</span></>
      ) : (
        <><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-amber-600 font-medium">Location access needed</span></>
      )}
    </div>
  );
}

// ── Booking Modal ──────────────────────────────────────────────────────────
function BookingModal({ hospital, onClose, onSubmit }: {
  hospital: NearbyHospital; onClose: () => void; onSubmit: (f: BookingForm) => void;
}) {
  const [form, setForm] = useState<BookingForm>({ name:'', phone:'', specialty:'', date:'', time:'', reason:'' });
  const [selectedSlot, setSelectedSlot] = useState<string|null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const bookingRef = useRef(`ARK-${Date.now().toString().slice(-6)}`);

  const specialties = hospital.specialties.length
    ? hospital.specialties
    : ['General Physician','Cardiologist','Dermatologist','Orthopedic','ENT Specialist','Pediatrician','Gynecologist','Neurologist'];

  const slots = {
    morning:   ['09:00','09:30','10:00','10:30','11:00','11:30'],
    afternoon: ['13:00','13:30','14:00','14:30','15:00','15:30','16:00'],
    evening:   ['18:00','18:30','19:00','19:30','20:00'],
  };
  const seed = hospital.id.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  const isAvailable = (i: number) => (seed + i * 7) % 3 !== 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    onSubmit(form);
    await new Promise(r => setTimeout(r, 800));
    setIsSubmitting(false); setSubmitted(true);
  };

  if (submitted) return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center">
          <div className="mx-auto mb-4 bg-white/20 rounded-full w-20 h-20 flex items-center justify-center border-2 border-white/30">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-white mb-1">Appointment Booked! 🎉</h3>
          <p className="text-emerald-100 text-sm">Your appointment at <strong className="text-white">{hospital.name}</strong> is confirmed.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Booking Reference</p>
              <p className="text-xl font-black text-slate-900 font-mono tracking-wider">{bookingRef.current}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(bookingRef.current).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
              className="p-2.5 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-400" />}
            </button>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-slate-400 text-xs font-bold">Patient</span><p className="font-bold text-slate-800">{form.name}</p></div>
            <div><span className="text-slate-400 text-xs font-bold">Phone</span><p className="font-bold text-slate-800">{form.phone}</p></div>
            <div><span className="text-slate-400 text-xs font-bold">Specialty</span><p className="font-bold text-slate-800">{form.specialty||'General Physician'}</p></div>
            <div><span className="text-slate-400 text-xs font-bold">Date & Time</span><p className="font-bold text-slate-800">{form.date} · {form.time}</p></div>
          </div>
          <button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors text-sm">Done</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/20 transition-colors"><X className="h-5 w-5" /></button>
          <Building2 className="h-8 w-8 mb-3 text-emerald-100" />
          <h3 className="text-xl font-bold">{hospital.name}</h3>
          <p className="text-emerald-100 text-sm mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {hospital.address}</p>
          {hospital.openNow !== null && (
            <span className={`mt-2 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${hospital.openNow ? 'bg-emerald-400/30 text-emerald-100' : 'bg-red-400/30 text-red-100'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hospital.openNow ? 'bg-emerald-300 animate-pulse' : 'bg-red-300'}`} />
              {hospital.openNow ? 'Open Now' : 'Closed Now'}
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><User className="h-3.5 w-3.5 inline mr-1" />Patient Name</label>
              <input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all" placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><Phone className="h-3.5 w-3.5 inline mr-1" />Phone</label>
              <input required type="tel" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all" placeholder="+91 98765 43210" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><Stethoscope className="h-3.5 w-3.5 inline mr-1" />Doctor Specialty</label>
            <select value={form.specialty} onChange={e => setForm({...form,specialty:e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all bg-white">
              <option value="">Select specialty</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"><Calendar className="h-3.5 w-3.5 inline mr-1" />Select Date</label>
            <input required type="date" value={form.date} onChange={e => { setForm({...form,date:e.target.value,time:''}); setSelectedSlot(null); }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all" />
          </div>
          {form.date && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3"><Clock className="h-3.5 w-3.5 inline mr-1" />Available Time Slots</label>
              {(['Morning','Afternoon','Evening'] as const).map((period, pi) => {
                const periodSlots = pi===0 ? slots.morning : pi===1 ? slots.afternoon : slots.evening;
                return (
                  <div key={period} className="mb-3">
                    <p className="text-xs font-semibold text-slate-400 mb-1.5">{period}</p>
                    <div className="flex flex-wrap gap-2">
                      {periodSlots.map((slot,si) => {
                        const avail = isAvailable(pi*10+si);
                        const isSel = selectedSlot === slot;
                        return (
                          <button key={slot} type="button" disabled={!avail}
                            onClick={() => { setSelectedSlot(slot); setForm({...form,time:slot}); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isSel ? 'bg-emerald-500 text-white shadow-md scale-105' : avail ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-slate-100 text-slate-300 cursor-not-allowed line-through'}`}>
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason for Visit</label>
            <input value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all" placeholder="e.g., General checkup, Follow-up…" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-70 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
            {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" />Booking...</> : <><Calendar className="h-5 w-5" />Confirm Appointment</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Hospital Card ──────────────────────────────────────────────────────────
function HospitalCard({ hospital, selected, onSelect, onBook }: {
  hospital: NearbyHospital;
  selected: boolean;
  onSelect: () => void;
  onBook: () => void;
}) {
  const openStatus = hospital.openNow;
  const isEmergency = hospital.emergency;

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-3xl border shadow-xl shadow-slate-200/50 hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer overflow-hidden ${
        selected ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-100'
      }`}
    >
      {/* AI Recommendation Banner */}
      {hospital.aiScore && hospital.aiScore >= 70 && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
          <span className="text-white text-xs font-black">AI Recommended for {hospital.aiCondition}</span>
          <span className="ml-auto bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{hospital.aiScore}% match</span>
        </div>
      )}

      {/* Emergency Banner */}
      {isEmergency && (
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-4 py-1.5 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-white animate-pulse" />
          <span className="text-white text-xs font-black">24/7 Emergency Services Available</span>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className={`p-2.5 rounded-2xl transition-colors ${selected ? 'bg-emerald-100' : 'bg-emerald-50 group-hover:bg-emerald-100'}`}>
            <ActivitySquare className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              hospital.type === 'Hospital' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              hospital.type === 'Pharmacy' ? 'bg-green-50 text-green-600 border-green-100' :
              'bg-purple-50 text-purple-600 border-purple-100'
            }`}>{hospital.type}</span>
            {/* Live Open/Closed Status */}
            {openStatus !== null && openStatus !== undefined && (
              <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${openStatus ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${openStatus ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                {openStatus ? 'Open Now' : 'Closed'}
              </span>
            )}
          </div>
        </div>

        {/* Name */}
        <h3 className="font-bold text-base text-slate-900 mb-1 line-clamp-2 leading-tight">{hospital.name}</h3>

        {/* Operator */}
        {hospital.operator && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{hospital.operator}</p>
        )}

        {/* Address */}
        <p className="text-slate-500 text-xs font-medium flex items-start gap-1.5 mb-2 line-clamp-1">
          <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" /> {hospital.address}
        </p>

        {/* Rating */}
        <div className="mb-3">
          <StarRating rating={hospital.rating} count={hospital.reviewCount} />
        </div>

        {/* Stats Row — 4 columns */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {/* Distance */}
          <div className="bg-blue-50 rounded-xl p-2 text-center border border-blue-100">
            <Navigation className="h-3.5 w-3.5 text-blue-500 mx-auto mb-0.5" />
            <p className="text-xs font-black text-blue-700">{Number(hospital.distance).toFixed(1)}<span className="text-[9px] font-bold"> km</span></p>
            <p className="text-[9px] text-blue-400 font-bold">Distance</p>
          </div>
          {/* Open/Closed */}
          <div className={`rounded-xl p-2 text-center border ${
            openStatus === true ? 'bg-emerald-50 border-emerald-100' :
            openStatus === false ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
          }`}>
            <Clock className={`h-3.5 w-3.5 mx-auto mb-0.5 ${openStatus === true ? 'text-emerald-500' : openStatus === false ? 'text-red-500' : 'text-slate-400'}`} />
            <p className={`text-xs font-black ${openStatus === true ? 'text-emerald-700' : openStatus === false ? 'text-red-700' : 'text-slate-500'}`}>
              {openStatus === true ? 'Open' : openStatus === false ? 'Closed' : '—'}
            </p>
            <p className="text-[9px] text-slate-400 font-bold">Status</p>
          </div>
          {/* Doctors Available */}
          <div className={`rounded-xl p-2 text-center border ${
            hospital.availabilityStatus === 'available' ? 'bg-violet-50 border-violet-100' :
            hospital.availabilityStatus === 'limited' ? 'bg-amber-50 border-amber-100' :
            'bg-red-50 border-red-100'
          }`}>
            <User className={`h-3.5 w-3.5 mx-auto mb-0.5 ${
              hospital.availabilityStatus === 'available' ? 'text-violet-500' :
              hospital.availabilityStatus === 'limited' ? 'text-amber-500' : 'text-red-400'
            }`} />
            <p className={`text-xs font-black ${
              hospital.availabilityStatus === 'available' ? 'text-violet-700' :
              hospital.availabilityStatus === 'limited' ? 'text-amber-700' : 'text-red-600'
            }`}>
              {hospital.availabilityStatus === 'unavailable' ? '0' : hospital.doctorsAvailable}
            </p>
            <p className="text-[9px] text-slate-400 font-bold">Doctors</p>
          </div>
          {/* Beds or Rating */}
          <div className="bg-amber-50 rounded-xl p-2 text-center border border-amber-100">
            {hospital.bedCount ? (
              <>
                <Bed className="h-3.5 w-3.5 text-amber-500 mx-auto mb-0.5" />
                <p className="text-xs font-black text-amber-700">{hospital.bedCount}</p>
                <p className="text-[9px] text-amber-400 font-bold">Beds</p>
              </>
            ) : (
              <>
                <Star className="h-3.5 w-3.5 text-amber-500 mx-auto mb-0.5 fill-amber-400" />
                <p className="text-xs font-black text-amber-700">{hospital.rating.toFixed(1)}</p>
                <p className="text-[9px] text-amber-400 font-bold">Rating</p>
              </>
            )}
          </div>
        </div>

        {/* Availability Status Banner */}
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 mb-3 border ${
          hospital.availabilityStatus === 'available'
            ? 'bg-emerald-50 border-emerald-200'
            : hospital.availabilityStatus === 'limited'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              hospital.availabilityStatus === 'available' ? 'bg-emerald-500 animate-pulse' :
              hospital.availabilityStatus === 'limited' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className={`text-xs font-black ${
              hospital.availabilityStatus === 'available' ? 'text-emerald-700' :
              hospital.availabilityStatus === 'limited' ? 'text-amber-700' : 'text-red-700'
            }`}>
              {hospital.availabilityStatus === 'available' ? 'Doctors Available' :
               hospital.availabilityStatus === 'limited' ? 'Limited Availability' : 'Currently Unavailable'}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {hospital.availabilityStatus === 'unavailable'
              ? 'No doctors on duty'
              : `${hospital.doctorsAvailable} of ${hospital.doctorCount} on duty`
            }
          </span>
        </div>

        {/* Specialties */}
        {hospital.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {hospital.specialties.slice(0, 4).map(s => <SpecialtyChip key={s} name={s} />)}
            {hospital.specialties.length > 4 && (
              <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5">+{hospital.specialties.length - 4} more</span>
            )}
          </div>
        )}

        {/* Opening Hours (if available) */}
        {hospital.openingHours && hospital.openingHours !== '24/7' && (
          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mb-3">
            <Clock className="h-2.5 w-2.5" />
            <span className="line-clamp-1">{hospital.openingHours}</span>
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={e => { e.stopPropagation(); onBook(); }}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all text-xs text-center shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5" /> Book Appointment
          </button>
          <button
            onClick={e => { e.stopPropagation(); window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lng}`, '_blank'); }}
            className="p-2.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors text-slate-600" title="Get Directions"
          >
            <Navigation className="h-4 w-4" />
          </button>
          {hospital.phone && (
            <button
              onClick={e => { e.stopPropagation(); window.open(`tel:${hospital.phone}`, '_self'); }}
              className="p-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors text-slate-600" title="Call"
            >
              <Phone className="h-4 w-4" />
            </button>
          )}
          {hospital.website && (
            <button
              onClick={e => { e.stopPropagation(); window.open(hospital.website, '_blank'); }}
              className="p-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors text-slate-600" title="Website"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Hospitals() {
  const { updateLocation: updateGlobalLocation } = useLocation();
  const { t } = useLanguage();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locationStatus, setLocationStatus] = useState<'loading'|'granted'|'denied'>('loading');
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchRadius, setSearchRadius] = useState(5000);
  const [viewMode, setViewMode] = useState<'list'|'map'>('list');
  const [bookingHospital, setBookingHospital] = useState<NearbyHospital|null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<string|null>(null);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [facilityFilter, setFacilityFilter] = useState<'all'|'hospital'|'clinic'|'pharmacy'>('all');
  const [sortBy, setSortBy] = useState<'distance'|'rating'|'open'>('distance');
  const locationTimerRef = useRef<NodeJS.Timeout|null>(null);

  // Read AI symptom result from localStorage for recommendation badges
  const [aiContext, setAiContext] = useState<{ condition: string; severity: string } | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('symptom_result');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.diagnosis) setAiContext({ condition: parsed.diagnosis.split('.')[0].slice(0, 40), severity: parsed.severity });
      }
    } catch { /* ignore */ }
  }, []);

  // ── Geolocation ──────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('arogya_user_location');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lng) {
          setUserLocation({ lat: parsed.lat, lng: parsed.lng });
          setLocationAddress(parsed.address || '');
          setLocationStatus('granted');
          fetchNearbyHospitals(parsed.lat, parsed.lng, 5000);
          return;
        }
      } catch { /* ignore */ }
    }
    if (!navigator.geolocation) { setLocationStatus('denied'); useFallback(); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc); setLocationStatus('granted');
        reverseGeocode(loc.lat, loc.lng);
        fetchNearbyHospitals(loc.lat, loc.lng, 5000);
        updateGlobalLocation(loc.lat, loc.lng);
      },
      () => { setLocationStatus('denied'); useFallback(); },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
    );
  }, []);

  function useFallback() {
    const fb = { lat: 17.3850, lng: 78.4867 }; // Hyderabad
    setUserLocation(fb); setHospitals(getDemoHospitals(fb)); setLoading(false);
    setLocationAddress('Hyderabad, Telangana');
  }

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`);
      const data = await res.json();
      if (data?.display_name) setLocationAddress(data.display_name.split(',').slice(0,3).join(','));
    } catch { /* ignore */ }
  }, []);

  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) { setLocationSuggestions([]); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`);
      setLocationSuggestions(await res.json() || []);
    } catch { setLocationSuggestions([]); }
  }, []);

  const handleLocationInput = (value: string) => {
    setLocationQuery(value);
    if (locationTimerRef.current) clearTimeout(locationTimerRef.current);
    locationTimerRef.current = setTimeout(() => searchLocation(value), 400);
  };

  const selectLocation = (s: any) => {
    const lat = parseFloat(s.lat), lng = parseFloat(s.lon);
    const address = s.display_name.split(',').slice(0,3).join(',');
    setUserLocation({ lat, lng }); setLocationAddress(address); setLocationStatus('granted');
    setShowLocationPicker(false); setLocationQuery(''); setLocationSuggestions([]);
    fetchNearbyHospitals(lat, lng, searchRadius);
    updateGlobalLocation(lat, lng, s.display_name);
    localStorage.setItem('arogya_user_location', JSON.stringify({ lat, lng, address }));
  };

  // ── Parse OSM Specialties ─────────────────────────────────────────────
  function parseSpecialties(tags: Record<string, string>): string[] {
    const raw = tags['healthcare:speciality'] || tags['speciality'] || tags['health_speciality'] || '';
    if (!raw) return [];
    return raw.split(/[;,]/).map(s => {
      const clean = s.trim().toLowerCase().replace(/_/g, ' ');
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }).filter(Boolean).slice(0, 6);
  }

  // ── Fetch Hospitals ───────────────────────────────────────────────────
  const fetchNearbyHospitals = useCallback(async (lat: number, lng: number, radius: number, filter: string = 'all') => {
    setLoading(true);
    const radiusKm = radius / 1000;

    // 1. Local dataset
    const localPromise = fetch(`/api/hospitals?lat=${lat}&lng=${lng}&radius=${radiusKm}&limit=200`)
      .then(r => r.json())
      .then(data => {
        if (!data.hospitals) return [];
        return data.hospitals
          .filter((h: any) => h.lat && h.lng)
          .map((h: any) => {
            const { rating, reviewCount } = seedRating(`ds-${h.id}`);
            const type = h.type === 'hospital' ? 'Hospital' : h.type?.includes('clinic') ? 'Clinic' : h.type?.includes('pharmacy') ? 'Pharmacy' : 'Hospital';
            const { doctorCount, doctorsAvailable, availabilityStatus } = seedDoctorInfo(`ds-${h.id}`, type, false);
            return {
              id: `ds-${h.id}`,
              name: h.name,
              address: [h.address, h.district, h.state].filter(Boolean).join(', ') || 'Address not available',
              lat: h.lat, lng: h.lng,
              distance: haversineDistance(lat, lng, h.lat, h.lng),
              type,
              phone: h.phone || undefined,
              website: h.website || undefined,
              openNow: null, openingHours: undefined, emergency: false,
              specialties: [], bedCount: undefined, operator: undefined,
              rating, reviewCount,
              doctorCount, doctorsAvailable, availabilityStatus,
            } as NearbyHospital;
          });
      })
      .catch(() => [] as NearbyHospital[]);

    // 2. Overpass — with ALL useful tags
    let amenityQuery = '';
    if (filter === 'pharmacy') {
      amenityQuery = `node["amenity"="pharmacy"](around:${radius},${lat},${lng}); way["amenity"="pharmacy"](around:${radius},${lat},${lng});`;
    } else if (filter === 'hospital') {
      amenityQuery = `node["amenity"="hospital"](around:${radius},${lat},${lng}); way["amenity"="hospital"](around:${radius},${lat},${lng});`;
    } else if (filter === 'clinic') {
      amenityQuery = `node["amenity"="clinic"](around:${radius},${lat},${lng}); way["amenity"="clinic"](around:${radius},${lat},${lng}); node["amenity"="doctors"](around:${radius},${lat},${lng});`;
    } else {
      amenityQuery = `node["amenity"="hospital"](around:${radius},${lat},${lng}); way["amenity"="hospital"](around:${radius},${lat},${lng}); node["amenity"="clinic"](around:${radius},${lat},${lng}); way["amenity"="clinic"](around:${radius},${lat},${lng}); node["amenity"="doctors"](around:${radius},${lat},${lng}); node["amenity"="pharmacy"](around:${radius},${lat},${lng}); way["amenity"="pharmacy"](around:${radius},${lat},${lng});`;
    }

    const overpassPromise = fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(`[out:json][timeout:20];(${amenityQuery});out center tags;`)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
      .then(r => r.json())
      .then(data => {
        if (!data?.elements?.length) return [];
        return data.elements
          .filter((el: any) => {
            if (!el.tags?.name) return false;
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            return elLat != null && elLng != null;
          })
          .map((el: any) => {
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            const tags: Record<string, string> = el.tags || {};
            const amenity = tags.amenity;
            const { rating, reviewCount } = seedRating(String(el.id));
            const bedCount = tags.beds ? parseInt(tags.beds) : tags['capacity:beds'] ? parseInt(tags['capacity:beds']) : undefined;
            const isEmergencyEl = tags.emergency === 'yes' || tags['emergency:phone'] != null;
            const elType = amenity === 'hospital' ? 'Hospital' : amenity === 'clinic' ? 'Clinic' : amenity === 'pharmacy' ? 'Pharmacy' : 'Doctor';
            const { doctorCount, doctorsAvailable, availabilityStatus } = seedDoctorInfo(String(el.id), elType, isEmergencyEl);
            return {
              id: String(el.id),
              name: tags.name,
              address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city'] || tags['addr:suburb'], tags['addr:postcode']].filter(Boolean).join(' ') || 'Address not available',
              lat: elLat, lng: elLng,
              distance: haversineDistance(lat, lng, elLat, elLng),
              type: amenity === 'hospital' ? 'Hospital' : amenity === 'clinic' ? 'Clinic' : amenity === 'pharmacy' ? 'Pharmacy' : 'Doctor',
              phone: tags.phone || tags['contact:phone'],
              website: tags.website || tags['contact:website'],
              openingHours: tags.opening_hours,
              openNow: parseOpenNow(tags.opening_hours),
              emergency: tags.emergency === 'yes' || tags['emergency:phone'] != null,
              specialties: parseSpecialties(tags),
              bedCount: isNaN(bedCount!) ? undefined : bedCount,
              operator: tags.operator,
              rating, reviewCount,
              doctorCount, doctorsAvailable, availabilityStatus,
            } as NearbyHospital;
          });
      })
      .catch(() => [] as NearbyHospital[]);

    try {
      const [localResults, overpassResults] = await Promise.all([localPromise, overpassPromise]);

      const seen = new Map<string, NearbyHospital>();
      for (const h of overpassResults) {
        const key = h.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
        seen.set(key, h);
      }
      for (const h of localResults) {
        const key = h.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
        if (!seen.has(key)) {
          seen.set(key, h);
        } else {
          const ex = seen.get(key)!;
          if (!ex.phone && h.phone) ex.phone = h.phone;
          if (ex.address === 'Address not available' && h.address !== 'Address not available') ex.address = h.address;
        }
      }

      let merged = Array.from(seen.values())
        .filter(h => filter === 'all' || h.type.toLowerCase().includes(filter));

      // Assign AI recommendation scores
      if (aiContext) {
        const condition = aiContext.condition.toLowerCase();
        merged = merged.map(h => {
          const isHighSeverity = aiContext.severity === 'severe';
          let score = 0;
          if (h.emergency && isHighSeverity) score += 40;
          if (h.type === 'Hospital') score += 30;
          if (h.specialties.some(s => condition.includes(s.toLowerCase().split(' ')[0]))) score += 20;
          if (h.openNow === true) score += 10;
          if (score >= 40) return { ...h, aiScore: Math.min(98, 50 + score), aiCondition: aiContext.condition };
          return h;
        });
      }

      setHospitals(
        merged.length > 0
          ? merged.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
          : getDemoHospitals({ lat, lng })
      );
    } catch {
      setHospitals(getDemoHospitals({ lat, lng }));
    }
    setLoading(false);
  }, [aiContext]);

  useEffect(() => {
    if (userLocation) fetchNearbyHospitals(userLocation.lat, userLocation.lng, searchRadius, facilityFilter);
  }, [searchRadius, facilityFilter]);

  function getDemoHospitals(base: { lat: number; lng: number }): NearbyHospital[] {
    const demos = [
      { id:'demo-1', name:'Apollo Indraprastha Hospital', address:'Mathura Rd, Sarita Vihar', lat:base.lat+0.01, lng:base.lng+0.005, distance:1.2, type:'Hospital', emergency:true, specialties:['Cardiology','Neurology','Orthopedics'], openNow:true, openingHours:'24/7', rating:4.8, reviewCount:1243 },
      { id:'demo-2', name:'Max Super Speciality Hospital', address:'Press Enclave Rd, Saket', lat:base.lat-0.008, lng:base.lng+0.012, distance:2.5, type:'Hospital', emergency:true, specialties:['Oncology','Pediatrics','Cardiology'], openNow:true, openingHours:'24/7', rating:4.7, reviewCount:987 },
      { id:'demo-3', name:'Fortis Hospital', address:'Sector B, Vasant Kunj', lat:base.lat+0.02, lng:base.lng-0.01, distance:3.8, type:'Hospital', emergency:false, specialties:['Orthopedics','Neurology'], openNow:true, openingHours:'Mo-Su 08:00-22:00', rating:4.5, reviewCount:756 },
      { id:'demo-4', name:'City Walk Clinic', address:'Saket District Centre', lat:base.lat+0.003, lng:base.lng-0.002, distance:0.5, type:'Clinic', emergency:false, specialties:['General'], openNow:true, openingHours:'Mo-Sa 09:00-20:00', rating:4.2, reviewCount:312 },
      { id:'demo-5', name:'Medanta - The Medicity', address:'CH Baktawar Singh Rd, Gurugram', lat:base.lat+0.035, lng:base.lng+0.025, distance:5.2, type:'Hospital', emergency:true, specialties:['Cardiology','Transplant','Oncology'], openNow:true, openingHours:'24/7', rating:4.9, reviewCount:2100 },
    ];
    return demos.map(d => {
      const { doctorCount, doctorsAvailable, availabilityStatus } = seedDoctorInfo(d.id, d.type, d.emergency);
      return { ...d, doctorCount, doctorsAvailable, availabilityStatus };
    });
  }

  // ── Sort + Filter ─────────────────────────────────────────────────────
  const filteredHospitals = hospitals
    .filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()) || h.address.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'open') {
        if (a.openNow === b.openNow) return (a.distance ?? Infinity) - (b.distance ?? Infinity);
        return a.openNow ? -1 : 1;
      }
      // AI recommended first, then distance
      if (b.aiScore && !a.aiScore) return 1;
      if (a.aiScore && !b.aiScore) return -1;
      return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    });

  const openCount = hospitals.filter(h => h.openNow === true).length;
  const emergencyCount = hospitals.filter(h => h.emergency).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">

      {/* AI Context Banner — from Symptom Checker */}
      {aiContext && (
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-5 text-white flex items-center gap-4">
          <div className="bg-white/15 rounded-2xl p-3 border border-white/20">
            <Sparkles className="h-7 w-7 text-yellow-300 animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="font-black text-sm flex items-center gap-2">AI-Recommended Hospitals <span className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-black">FROM SYMPTOM CHECKER</span></p>
            <p className="text-white/80 text-xs mt-0.5">Showing hospitals best matched for: <strong className="text-white">{aiContext.condition}</strong> ({aiContext.severity} severity)</p>
          </div>
          <button onClick={() => { localStorage.removeItem('symptom_result'); setAiContext(null); }} className="text-white/60 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* MediBot Banner */}
      <a href="/dashboard" className="block bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-5 text-white hover:shadow-2xl hover:shadow-purple-500/30 transition-all hover:-translate-y-0.5 group relative overflow-hidden">
        <div className="relative flex items-center gap-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3.5 border border-white/20 group-hover:scale-110 transition-transform shadow-lg">
            <Bot className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <p className="font-black text-lg flex items-center gap-2">MediBot AI Assistant <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" /><span className="text-[10px] font-black bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">AI POWERED</span></p>
            <p className="text-white/80 text-sm">Need help choosing a hospital? Ask MediBot for personalized medical guidance</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-white/15 px-4 py-2.5 rounded-xl border border-white/20 font-bold text-sm group-hover:bg-white/25 transition-colors">
            <MessageCircle className="h-4 w-4" /> Chat Now
          </div>
        </div>
      </a>

      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="bg-emerald-100 p-2 rounded-xl"><Building2 className="h-7 w-7 text-emerald-600" /></span>
              Nearby Hospitals
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <LocationStatus status={locationStatus} address={locationAddress} />
              <button onClick={() => setShowLocationPicker(!showLocationPicker)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">
                <MapPinned className="h-3 w-3" /> Change Location
              </button>
              {/* Live stats */}
              {!loading && hospitals.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{openCount} Open Now
                  </span>
                  {emergencyCount > 0 && (
                    <span className="text-xs font-bold bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5" />{emergencyCount} Emergency
                    </span>
                  )}
                </div>
              )}
            </div>
            {showLocationPicker && (
              <div className="mt-2 relative">
                <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                <input type="text" value={locationQuery} onChange={e => handleLocationInput(e.target.value)}
                  placeholder="Type your city or area…" autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm" />
                {locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                    {locationSuggestions.map((s, i) => (
                      <button key={i} onClick={() => selectLocation(s)} className="w-full text-left px-4 py-3 hover:bg-emerald-50 transition-colors border-b last:border-0 border-slate-100">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{s.display_name.split(',').slice(0,2).join(',')}</p>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{s.display_name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))} className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value={2000}>2 km</option>
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={20000}>20 km</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-slate-50 border border-slate-200 text-sm font-medium rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="distance">Sort: Nearest</option>
              <option value="rating">Sort: Rating</option>
              <option value="open">Sort: Open Now</option>
            </select>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button onClick={() => setViewMode('list')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode==='list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>List</button>
              <button onClick={() => setViewMode('map')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode==='map' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Map</button>
            </div>
          </div>
        </div>

        {/* Facility Filter */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key:'all', label:'All Facilities', icon:Building2 },
            { key:'hospital', label:'Hospitals', icon:Building2 },
            { key:'clinic', label:'Clinics', icon:Stethoscope },
            { key:'pharmacy', label:'Pharmacies', icon:Pill },
          ].map(tab => (
            <button key={tab.key} onClick={() => setFacilityFilter(tab.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${facilityFilter===tab.key ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, specialty, or area…"
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all shadow-sm" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
        </div>
      </header>

      {/* Location denied */}
      {locationStatus === 'denied' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-800 mb-1">Location access required</h3>
            <p className="text-amber-700 text-sm">Enable location permissions for real hospital distances. Showing demo data.</p>
            <button onClick={() => window.location.reload()} className="mt-3 bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <LocateFixed className="h-4 w-4 inline mr-1" /> Retry Location
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
            <Navigation className="h-6 w-6 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-500 font-medium">Finding hospitals near you with live data…</p>
        </div>
      )}

      {/* Map View */}
      {!loading && viewMode === 'map' && userLocation && (
        <div className="w-full rounded-3xl overflow-hidden border border-slate-200 shadow-xl" style={{ height: '500px' }}>
          <HospitalMap userLocation={userLocation} hospitals={filteredHospitals}
            onSelectHospital={id => { setSelectedHospital(id); setViewMode('list'); }}
            onBookHospital={h => setBookingHospital(h)} />
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && (
        <>
          <p className="text-slate-500 text-sm font-medium">
            Found <strong className="text-slate-700">{filteredHospitals.length}</strong> facilities within {searchRadius/1000} km
            {openCount > 0 && <> · <span className="text-emerald-600 font-bold">{openCount} open now</span></>}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredHospitals.map(hospital => (
              <HospitalCard
                key={hospital.id}
                hospital={hospital}
                selected={selectedHospital === hospital.id}
                onSelect={() => setSelectedHospital(hospital.id === selectedHospital ? null : hospital.id)}
                onBook={() => setBookingHospital(hospital)}
              />
            ))}
          </div>
          {filteredHospitals.length === 0 && !loading && (
            <div className="flex flex-col items-center py-16 gap-4">
              <div className="bg-slate-100 p-6 rounded-full"><Search className="h-10 w-10 text-slate-400" /></div>
              <h3 className="text-lg font-bold text-slate-700">No hospitals found</h3>
              <p className="text-slate-500 text-sm">Try increasing the search radius or changing your location.</p>
            </div>
          )}
        </>
      )}

      {/* Booking Modal */}
      {bookingHospital && (
        <BookingModal hospital={bookingHospital} onClose={() => setBookingHospital(null)}
          onSubmit={form => console.log('Booked:', { hospital: bookingHospital.name, ...form })} />
      )}
    </div>
  );
}
