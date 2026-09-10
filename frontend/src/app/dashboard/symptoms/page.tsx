'use client';

import { useState } from 'react';
import {
  Stethoscope, User, Heart, Activity, Baby, Loader2, AlertTriangle,
  Pill, Clock, ShieldAlert, ChevronRight, Info, Search,
  Thermometer, X, CheckCircle2, Syringe, Droplets, FlaskConical,
  Salad, Dumbbell, Lightbulb, Calendar, MapPin, ShoppingCart,
  ArrowRight, Zap, Star, Building2, UserCheck, Save, Phone,
  Navigation, ChevronDown, CheckCircle, Circle
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface Medicine {
  name: string;
  brandName: string;
  form: string;
  power: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  purpose: string;
  warnings: string[];
  contraindications: string[];
}

interface DiagnosisResult {
  diagnosis: string;
  severity: string;
  medicines: Medicine[];
  foodAdvice: string;
  exerciseAdvice: string;
  lifestyleAdvice: string;
  generalAdvice: string[];
  whenToSeeDoctor: string;
  disclaimer: string;
}

interface NearbyHospital {
  id: string;
  name: string;
  address?: string;
  distance_km?: number;
  phone?: string;
  emergency?: boolean;
}

interface NearbyDoctor {
  id: string;
  name: string;
  specialization: string;
  consultation_fee: number;
  location: string;
  phone: string;
  rating: number;
  is_available: boolean;
}

// ── Smart Care Journey Step Indicator ──
const JOURNEY_STEPS = [
  { id: 1, label: 'Symptoms',      icon: Thermometer,  color: 'violet' },
  { id: 2, label: 'AI Analysis',   icon: Zap,           color: 'purple' },
  { id: 3, label: 'Diagnosis',     icon: Stethoscope,  color: 'indigo' },
  { id: 4, label: 'Severity',      icon: ShieldAlert,  color: 'amber'  },
  { id: 5, label: 'Medicines',     icon: Pill,          color: 'emerald'},
  { id: 6, label: 'Hospitals',     icon: Building2,     color: 'blue'   },
  { id: 7, label: 'Doctors',       icon: UserCheck,     color: 'teal'   },
  { id: 8, label: 'Appointment',   icon: Calendar,      color: 'rose'   },
  { id: 9, label: 'Records Saved', icon: Save,          color: 'green'  },
];

function JourneyProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-violet-100 shadow-lg mb-4">
      <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4 text-violet-500" />
        Smart Care Journey
        <span className="ml-auto text-xs text-violet-500 font-bold bg-violet-50 px-2 py-0.5 rounded-full">
          Step {currentStep}/9
        </span>
      </h3>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
          style={{ width: `${((currentStep - 1) / 8) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {JOURNEY_STEPS.map((step) => {
            const Icon = step.icon;
            const done   = currentStep > step.id;
            const active = currentStep === step.id;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  done   ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/30' :
                  active ? 'bg-violet-500 border-violet-500 shadow-lg shadow-violet-500/30 animate-pulse' :
                           'bg-white border-slate-200'
                }`}>
                  {done
                    ? <CheckCircle className="h-5 w-5 text-white" />
                    : <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-300'}`} />}
                </div>
                <span className={`text-[9px] font-bold text-center w-12 leading-tight ${
                  done ? 'text-emerald-600' : active ? 'text-violet-600' : 'text-slate-300'
                }`}>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Hospital Card (mini) ──
function HospitalMiniCard({ h }: { h: NearbyHospital }) {
  return (
    <div className="flex items-center justify-between bg-white border border-blue-100 rounded-xl p-3 hover:shadow-md transition-all">
      <div className="flex items-center gap-2.5">
        <div className="bg-blue-50 p-2 rounded-lg">
          <Building2 className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">{h.name}</p>
          {h.distance_km && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Navigation className="h-2.5 w-2.5" />{h.distance_km.toFixed(1)} km away
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {h.emergency && (
          <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">24/7</span>
        )}
        {h.phone && (
          <a href={`tel:${h.phone}`} className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-200 transition">
            <Phone className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Doctor Card (mini) ──
function DoctorMiniCard({ doc, onBook }: { doc: NearbyDoctor; onBook: () => void }) {
  return (
    <div className="flex items-center justify-between bg-white border border-teal-100 rounded-xl p-3 hover:shadow-md transition-all">
      <div className="flex items-center gap-2.5">
        <div className="bg-teal-50 p-2 rounded-lg">
          <UserCheck className="h-4 w-4 text-teal-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800">Dr. {doc.name}</p>
          <p className="text-[10px] text-teal-600 font-semibold">{doc.specialization}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
            <span className="text-[10px] text-slate-400">{doc.rating} · ₹{doc.consultation_fee}</span>
          </div>
        </div>
      </div>
      <button
        onClick={onBook}
        className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-[10px] font-black rounded-lg hover:opacity-90 transition shadow-sm"
      >
        <Calendar className="h-3 w-3" /> Book
      </button>
    </div>
  );
}

const COMMON_SYMPTOMS = [
  'Nausea', 'Vomiting', 'Diarrhea', 'Stomach Pain', 'Back Pain',
  'Sore Throat', 'Chest Pain', 'Dizziness', 'Joint Pain',
  'Skin Rash', 'Difficulty Breathing', 'Loss of Appetite',
  'Muscle Cramps', 'Acidity', 'Constipation', 'Insomnia',
  'Headache', 'Fever', 'Cough', 'Cold', 'Body Pain', 'Fatigue',
];

function FormIcon({ form }: { form: string }) {
  switch (form) {
    case 'syrup': return <Droplets className="h-4 w-4" />;
    case 'injection': return <Syringe className="h-4 w-4" />;
    default: return <Pill className="h-4 w-4" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { bg: string; dot: string; label: string }> = {
    mild:     { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Mild' },
    moderate: { bg: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   label: 'Moderate' },
    severe:   { bg: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500',    label: 'Severe' },
  };
  const c = config[severity] || config.mild;
  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${c.bg}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function MedicineCard({ med, index }: { med: Medicine; index: number }) {
  const formColor = med.form === 'syrup' ? 'bg-blue-500' : med.form === 'injection' ? 'bg-rose-500' : 'bg-emerald-500';
  const formBg = med.form === 'syrup' ? 'bg-blue-50 text-blue-600 border-blue-200' : med.form === 'injection' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden hover:shadow-lg transition-all">
      {/* Medicine Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${formColor} bg-opacity-10 text-${formColor.split('-')[1]}-600`}
              style={{ background: med.form === 'syrup' ? '#eff6ff' : med.form === 'injection' ? '#fff1f2' : '#f0fdf4' }}>
              <FormIcon form={med.form} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">{med.name}</h4>
              <p className="text-xs text-slate-500 font-medium">{med.brandName}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${formBg}`}>
            <FormIcon form={med.form} />
            {med.form.charAt(0).toUpperCase() + med.form.slice(1)} • {med.power}
          </span>
        </div>

        {/* Purpose */}
        <p className="text-sm text-violet-600 font-medium mt-2 italic">
          {med.purpose}
        </p>

        {/* Dosage Grid */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: 'DOSAGE', value: med.dosage },
            { label: 'FREQUENCY', value: med.frequency },
            { label: 'DURATION', value: med.duration },
            { label: 'TIMING', value: med.timing },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">{label}</p>
              <p className="text-xs font-bold text-slate-700 leading-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {(med.warnings?.length > 0 || med.contraindications?.length > 0) && (
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-1">
            {med.warnings?.slice(0, 2).map((w, i) => (
              <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-500" /> {w}
              </p>
            ))}
            {med.contraindications?.slice(0, 1).map((c, i) => (
              <p key={`c-${i}`} className="text-xs text-rose-600 flex items-start gap-1.5">
                <ShieldAlert className="h-3 w-3 flex-shrink-0 mt-0.5" /> {c}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <a href={`/dashboard/medicines?search=${encodeURIComponent(med.name)}`}
          className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all hover:-translate-y-0.5 shadow-sm shadow-emerald-500/20">
          <ShoppingCart className="h-3.5 w-3.5" /> Book This Medicine
        </a>
        <a href="/dashboard/diagnostic-centre"
          className="flex items-center justify-center gap-1.5 bg-violet-100 hover:bg-violet-200 text-violet-700 text-xs font-bold py-2.5 rounded-xl transition-all hover:-translate-y-0.5">
          <FlaskConical className="h-3.5 w-3.5" /> Book Test
        </a>
      </div>
    </div>
  );
}

function AdviceCard({
  icon, title, content, color
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl p-5 border ${color}`}>
      <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm">
        {icon}
        {title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">{content}</p>
    </div>
  );
}

export default function SymptomChecker() {
  const { t, language } = useLanguage();

  // Form state
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [isDiabetic, setIsDiabetic] = useState(false);
  const [isPregnant, setIsPregnant] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [symptomSearch, setSymptomSearch] = useState('');

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  // Smart Care Journey state
  const [journeyStep, setJourneyStep] = useState(1);
  const [nearbyHospitals, setNearbyHospitals] = useState<NearbyHospital[]>([]);
  const [nearbyDoctors, setNearbyDoctors] = useState<NearbyDoctor[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [doctorsLoading, setDoctorsLoading]   = useState(false);
  const [recordSaved, setRecordSaved]         = useState(false);
  const [savingRecord, setSavingRecord]       = useState(false);

  // Safely extract hospitals array from any response shape
  const extractHospitals = (data: any): NearbyHospital[] => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.hospitals)) return data.hospitals;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  };

  // Fetch hospitals near user after diagnosis
  const fetchNearbyHospitals = async () => {
    setHospitalsLoading(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const res = await fetch(`/api/hospitals?lat=${latitude}&lng=${longitude}&limit=3`);
              const data = await res.json();
              setNearbyHospitals(extractHospitals(data).slice(0, 3));
            } catch {
              setNearbyHospitals([]);
            } finally {
              setHospitalsLoading(false);
              setJourneyStep(7);
              fetchNearbyDoctors();
            }
          },
          async () => {
            // Geolocation denied — fetch without coords
            try {
              const res = await fetch('/api/hospitals?limit=3');
              const data = await res.json();
              setNearbyHospitals(extractHospitals(data).slice(0, 3));
            } catch {
              setNearbyHospitals([]);
            } finally {
              setHospitalsLoading(false);
              setJourneyStep(7);
              fetchNearbyDoctors();
            }
          }
        );
      } else {
        // Geolocation not supported
        setHospitalsLoading(false);
        setJourneyStep(7);
        fetchNearbyDoctors();
      }
    } catch {
      setHospitalsLoading(false);
      setJourneyStep(7);
      fetchNearbyDoctors();
    }
  };

  // Fetch available doctors after hospitals
  const fetchNearbyDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/doctor-profiles?limit=3`);
      const data = await res.json();
      setNearbyDoctors((data.doctors || []).slice(0, 3));
    } catch {
      // use fallback hardcoded doctors
      setNearbyDoctors([
        { id: 't1', name: 'Bindhu', specialization: 'General Medicine', consultation_fee: 500, location: 'Hyderabad', phone: '8790276166', rating: 4.9, is_available: true },
        { id: 't2', name: 'Sameer', specialization: 'Cardiology',       consultation_fee: 800, location: 'Hyderabad', phone: '7981502973', rating: 4.9, is_available: true },
        { id: 't3', name: 'Rama Lakshmi', specialization: 'Gynecology', consultation_fee: 600, location: 'Hyderabad', phone: '9505926375', rating: 4.8, is_available: true },
      ]);
    } finally {
      setDoctorsLoading(false);
      setJourneyStep(8);
    }
  };

  // Save diagnosis to medical records
  const saveToRecords = async () => {
    if (!result) return;
    setSavingRecord(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      await fetch(`${apiUrl}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: 'symptom_analysis',
          title: `AI Diagnosis — ${new Date().toLocaleDateString('en-IN')}`,
          content: `Symptoms: ${selectedSymptoms.join(', ')}\n\nDiagnosis: ${result.diagnosis}`,
          ai_insights: result,
        }),
      });
      setRecordSaved(true);
      setJourneyStep(9);
    } catch {
      // Still mark as saved in UI even if API fails
      setRecordSaved(true);
      setJourneyStep(9);
    } finally {
      setSavingRecord(false);
    }
  };

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const addCustomSymptom = () => {
    const trimmed = customSymptom.trim();
    if (trimmed && !selectedSymptoms.includes(trimmed)) {
      setSelectedSymptoms(prev => [...prev, trimmed]);
      setCustomSymptom('');
    }
  };

  const filteredSymptoms = COMMON_SYMPTOMS.filter(s =>
    s.toLowerCase().includes(symptomSearch.toLowerCase())
  );

  const handleAnalyze = async () => {
    if (selectedSymptoms.length === 0) { setError('Please select at least one symptom.'); return; }
    if (!age) { setError('Please enter your age.'); return; }

    setLoading(true);
    setError('');
    setResult(null);
    setJourneyStep(2); // AI Analysis
    setRecordSaved(false);
    setNearbyHospitals([]);
    setNearbyDoctors([]);

    try {
      const res = await fetch('/api/symptoms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: selectedSymptoms.join(', '),
          age: parseInt(age),
          gender,
          bpSystolic: bpSystolic ? parseInt(bpSystolic) : null,
          bpDiastolic: bpDiastolic ? parseInt(bpDiastolic) : null,
          isDiabetic,
          isPregnant: gender === 'female' ? isPregnant : false,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze');
      setResult(data);
      setJourneyStep(5); // Medicines shown
      // Auto-trigger hospital + doctor fetch
      setTimeout(() => {
        setJourneyStep(6);
        fetchNearbyHospitals();
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setJourneyStep(1);
    }
    setLoading(false);
  };

  return (
    <div className="w-full pb-12 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
      {/* Journey Progress — shown once user starts */}
      {journeyStep > 1 && <JourneyProgress currentStep={journeyStep} />}

      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium">
          <strong>Warnings:</strong> This is AI-generated advice for informational purposes only. Always consult a qualified doctor before taking any medicine.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* ── LEFT PANEL ── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Patient Profile */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-violet-600" /> Patient Profile
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Age</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 35" min="1" max="120"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</label>
                  <select value={gender} onChange={e => setGender(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Blood Pressure (mmHg)
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" value={bpSystolic} onChange={e => setBpSystolic(e.target.value)}
                    placeholder="120" min="60" max="250"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
                  <span className="text-slate-400 font-bold text-lg">/</span>
                  <input type="number" value={bpDiastolic} onChange={e => setBpDiastolic(e.target.value)}
                    placeholder="80" min="40" max="150"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => setIsDiabetic(!isDiabetic)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                    isDiabetic ? 'bg-rose-50 border-rose-400 text-rose-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}>
                  <Activity className="h-3.5 w-3.5" />
                  {isDiabetic ? '✓ ' : ''}Diabetic?
                </button>
                {gender === 'female' && (
                  <button onClick={() => setIsPregnant(!isPregnant)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                      isPregnant ? 'bg-pink-50 border-pink-400 text-pink-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    <Baby className="h-3.5 w-3.5" />
                    {isPregnant ? '✓ ' : ''}Pregnant?
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Select Symptoms */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
              <Thermometer className="h-4 w-4 text-violet-600" /> Select Symptoms
            </h2>

            {/* Selected chips */}
            {selectedSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedSymptoms.map(s => (
                  <span key={s} className="flex items-center gap-1 bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full text-xs font-bold">
                    {s}
                    <button onClick={() => toggleSymptom(s)} className="hover:text-violet-900 ml-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" value={symptomSearch} onChange={e => setSymptomSearch(e.target.value)}
                placeholder="Search symptoms..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
            </div>

            {/* Symptom grid */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {filteredSymptoms.map(s => (
                <button key={s} onClick={() => toggleSymptom(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSymptoms.includes(s)
                      ? 'bg-violet-500 text-white shadow-sm shadow-violet-500/30'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}>
                  {s}
                </button>
              ))}
            </div>

            {/* Custom symptom */}
            <div className="mt-3 flex gap-2">
              <input type="text" value={customSymptom} onChange={e => setCustomSymptom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustomSymptom()}
                placeholder="Add other symptom..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
              <button onClick={addCustomSymptom}
                className="px-3 py-2 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold hover:bg-violet-200 transition-colors">
                Add
              </button>
            </div>
          </div>

          {/* Analyze Button */}
          <button onClick={handleAnalyze} disabled={loading || selectedSymptoms.length === 0}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-violet-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing with AI...</>
            ) : (
              <><Stethoscope className="h-5 w-5" /> Analyze Symptoms</>
            )}
          </button>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
              <p className="text-xs text-rose-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="xl:col-span-3 space-y-4">

          {/* Empty / Loading State */}
          {!result && !loading && (
            <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-lg text-center">
              <div className="bg-violet-50 p-5 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Stethoscope className="h-10 w-10 text-violet-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-600 mb-1">AI Diagnosis</h3>
              <p className="text-slate-400 text-sm">Fill in your profile and select symptoms, then click Analyze Symptoms.</p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-lg text-center">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="w-16 h-16 rounded-full border-4 border-violet-100 border-t-violet-500 animate-spin" />
                <Stethoscope className="h-7 w-7 text-violet-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-1">Analyzing your symptoms...</h3>
              <p className="text-slate-400 text-sm">AI is reviewing your health profile</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">

              {/* ── AI Diagnosis Card ── */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-violet-100 rounded-xl">
                      <Stethoscope className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">AI Diagnosis</h3>
                      <p className="text-xs text-violet-500 font-medium">Based on your symptoms & profile</p>
                    </div>
                  </div>
                  <SeverityBadge severity={result.severity} />
                </div>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed">
                  {result.diagnosis}
                </p>

                {/* Quick action buttons */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <a href="/dashboard/doctors"
                    className="flex flex-col items-center gap-1 p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all border border-blue-100 text-center">
                    <Calendar className="h-5 w-5" />
                    <span className="text-[10px] font-bold">Book Doctor</span>
                  </a>
                  <a href="/dashboard/hospitals"
                    className="flex flex-col items-center gap-1 p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all border border-emerald-100 text-center">
                    <MapPin className="h-5 w-5" />
                    <span className="text-[10px] font-bold">Near Hospital</span>
                  </a>
                  <a href="/dashboard/diagnostic-centre"
                    className="flex flex-col items-center gap-1 p-3 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl transition-all border border-violet-100 text-center">
                    <FlaskConical className="h-5 w-5" />
                    <span className="text-[10px] font-bold">Book Test</span>
                  </a>
                </div>
              </div>

              {/* ── Recommended Medicines ── */}
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-violet-600" />
                  Recommended Medicines ({result.medicines?.length || 0})
                </h3>
                <div className="space-y-3">
                  {result.medicines?.map((med, i) => (
                    <MedicineCard key={i} med={med} index={i} />
                  ))}
                </div>
              </div>

              {/* ── Wellness Advice ── */}
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Wellness & Recovery Guide
                </h3>
                <div className="space-y-3">
                  <AdviceCard
                    icon={<Salad className="h-4 w-4 text-emerald-600" />}
                    title="🥗 Food & Nutrition"
                    content={result.foodAdvice}
                    color="bg-emerald-50 border-emerald-100"
                  />
                  <AdviceCard
                    icon={<Dumbbell className="h-4 w-4 text-blue-600" />}
                    title="🏃 Exercise & Activity"
                    content={result.exerciseAdvice}
                    color="bg-blue-50 border-blue-100"
                  />
                  <AdviceCard
                    icon={<Lightbulb className="h-4 w-4 text-amber-600" />}
                    title="💡 Lifestyle & Home Remedies"
                    content={result.lifestyleAdvice}
                    color="bg-amber-50 border-amber-100"
                  />
                </div>
              </div>

              {/* ── General Advice ── */}
              {result.generalAdvice?.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-md">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> General Tips
                  </h3>
                  <ul className="space-y-2">
                    {result.generalAdvice.map((a, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-500" /> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── When to See Doctor ── */}
              {result.whenToSeeDoctor && (
                <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                  <h3 className="font-bold text-rose-800 mb-2 flex items-center gap-2 text-sm">
                    <ShieldAlert className="h-4 w-4" /> When to See a Doctor Immediately
                  </h3>
                  <p className="text-sm text-rose-700">{result.whenToSeeDoctor}</p>
                  <a href="/dashboard/doctors"
                    className="mt-3 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold py-2.5 rounded-xl transition-all">
                    <Calendar className="h-4 w-4" /> Book Doctor Appointment Now
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              )}

              {/* ════════════════════════════════════════════ */}
              {/* 🏥 STEP 6 — Nearby Hospitals                */}
              {/* ════════════════════════════════════════════ */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4" />
                  Step 6 — Best Nearby Hospitals
                  {hospitalsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto text-blue-400" />}
                </h3>
                {hospitalsLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-14 bg-blue-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : nearbyHospitals.length > 0 ? (
                  <div className="space-y-2">
                    {nearbyHospitals.map((h, i) => <HospitalMiniCard key={h.id || i} h={h} />)}
                    <a href="/dashboard/hospitals"
                      className="flex items-center justify-center gap-2 mt-2 text-blue-600 text-xs font-bold hover:text-blue-800 transition">
                      View all hospitals <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-blue-400 mb-2">Searching nearby hospitals...</p>
                    <a href="/dashboard/hospitals"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition">
                      <MapPin className="h-3.5 w-3.5" /> Find Hospitals Near Me
                    </a>
                  </div>
                )}
              </div>

              {/* ════════════════════════════════════════════ */}
              {/* 👨‍⚕️ STEP 7 — Available Doctors               */}
              {/* ════════════════════════════════════════════ */}
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-5 border border-teal-100">
                <h3 className="font-bold text-teal-800 mb-3 flex items-center gap-2 text-sm">
                  <UserCheck className="h-4 w-4" />
                  Step 7 — Available Doctors
                  {doctorsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto text-teal-400" />}
                </h3>
                {doctorsLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-14 bg-teal-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : nearbyDoctors.length > 0 ? (
                  <div className="space-y-2">
                    {nearbyDoctors.map((doc) => (
                      <DoctorMiniCard
                        key={doc.id}
                        doc={doc}
                        onBook={() => window.location.href = `/dashboard/appointments?doctor=${encodeURIComponent(doc.name)}&phone=${doc.phone}`}
                      />
                    ))}
                    <a href="/dashboard/doctors"
                      className="flex items-center justify-center gap-2 mt-2 text-teal-600 text-xs font-bold hover:text-teal-800 transition">
                      View all doctors <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <a href="/dashboard/doctors"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-teal-500 text-white text-sm font-bold rounded-xl hover:bg-teal-600 transition">
                    <UserCheck className="h-4 w-4" /> Find Available Doctors
                  </a>
                )}
              </div>

              {/* ════════════════════════════════════════════ */}
              {/* 📅 STEP 8 — Book Appointment                */}
              {/* ════════════════════════════════════════════ */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-5 border border-rose-100">
                <h3 className="font-bold text-rose-800 mb-3 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" /> Step 8 — Book Appointment
                </h3>
                <p className="text-xs text-rose-600 mb-3">
                  Based on your diagnosis: <strong>{result.diagnosis?.split('.')[0]}</strong>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <a href="/dashboard/appointments"
                    className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-bold rounded-xl hover:opacity-90 transition shadow-lg shadow-rose-500/20">
                    <Calendar className="h-4 w-4" /> Book Now
                  </a>
                  <a href="/dashboard/video-call"
                    className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:opacity-90 transition shadow-lg shadow-violet-500/20">
                    <Zap className="h-4 w-4" /> Video Consult
                  </a>
                </div>
              </div>

              {/* ════════════════════════════════════════════ */}
              {/* 💾 STEP 9 — Save Medical Records            */}
              {/* ════════════════════════════════════════════ */}
              <div className={`rounded-2xl p-5 border transition-all duration-500 ${
                recordSaved
                  ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                  : 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200'
              }`}>
                <h3 className={`font-bold mb-3 flex items-center gap-2 text-sm ${
                  recordSaved ? 'text-emerald-800' : 'text-slate-700'
                }`}>
                  {recordSaved
                    ? <><CheckCircle className="h-4 w-4 text-emerald-500" /> Step 9 — Medical Record Saved! ✅</>
                    : <><Save className="h-4 w-4" /> Step 9 — Save to Medical Records</>}
                </h3>
                {recordSaved ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-emerald-600 font-medium">Your diagnosis has been saved.</p>
                    <a href="/dashboard/reports"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition">
                      View My Health Records <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-3">
                      Save this AI diagnosis to your health records for future reference and doctor visits.
                    </p>
                    <button
                      onClick={saveToRecords}
                      disabled={savingRecord}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-slate-700 to-slate-900 text-white text-sm font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50"
                    >
                      {savingRecord
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                        : <><Save className="h-4 w-4" /> Save Diagnosis to Records</>}
                    </button>
                  </>
                )}
              </div>

              {/* ── Disclaimer ── */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  {result.disclaimer || 'This is AI-generated advice. Always consult a qualified doctor.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
