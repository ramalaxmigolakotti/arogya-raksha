'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Stethoscope, User, Heart, Pill, AlertCircle, Clock,
  Phone, Calendar, ChevronDown, ChevronUp, Search,
  Activity, Droplets, ShieldAlert, Building2, Loader2,
  Edit3, Save, ImagePlus, MapPin, GraduationCap, IndianRupee,
  Globe, FileText, CheckCircle2, X
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const SPECIALIZATIONS = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics',
  'Neurology', 'Orthopedics', 'Gynecology', 'ENT', 'Ophthalmology',
  'Dentistry', 'Psychiatry', 'Oncology', 'Gastroenterology', 'Pulmonology'
];

interface PatientCard {
  id: string;
  name: string;
  age: number;
  gender: string;
  blood_group: string;
  conditions: string;
  medications: string;
  allergies: string;
  bp: string;
  sugar: string | number;
  pulse: string | number;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  organ_donor: boolean;
  has_insurance: boolean;
  insurance_provider: string;
  doctor_notes: string;
}

interface Appointment {
  appointment_id: string;
  patient_name: string;
  scheduled_time: string;
  type: string;
  status: string;
  notes: string;
  patient_id?: string;
}

// Status badge colours
const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  completed: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

function VitalChip({ label, value, unit, normal }: { label: string; value: string | number; unit?: string; normal: boolean }) {
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-xl border ${
      normal ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
             : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
    }`}>
      <span className="text-xs text-slate-400 font-semibold">{label}</span>
      <span className={`text-sm font-black ${normal ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
        {value}{unit && <span className="text-xs font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/* Doctor Profile Form Component                       */
/* ═══════════════════════════════════════════════════ */
function DoctorProfileForm({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', location: '', specialization: '',
    qualification: '', experience: 0, consultationFee: 0,
    hospitalName: '', bio: '', languages: [] as string[],
    profileImage: '', hospitalImage: '',
  });

  useEffect(() => {
    api.getMyDoctorProfile().then(res => {
      if (res.success && res.profile) {
        setProfile(res.profile);
        setForm({
          name: (res.profile.name as string) || '',
          phone: (res.profile.phone as string) || '',
          location: (res.profile.location as string) || '',
          specialization: (res.profile.specialization as string) || '',
          qualification: (res.profile.qualification as string) || '',
          experience: (res.profile.experience as number) || 0,
          consultationFee: (res.profile.consultation_fee as number) || 0,
          hospitalName: (res.profile.hospital_name as string) || '',
          bio: (res.profile.bio as string) || '',
          languages: (res.profile.languages as string[]) || [],
          profileImage: '', hospitalImage: '',
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleImageChange = (field: 'profileImage' | 'hospitalImage') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, [field]: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name || !form.phone || !form.location) return;
    setSaving(true);
    try {
      const payload = { ...form };
      let res;
      if (profile) {
        res = await api.updateDoctorProfile(payload);
      } else {
        res = await api.createDoctorProfile(payload);
      }
      if (res.success) {
        setProfile(res.profile);
        setSuccess(profile ? 'Profile updated!' : 'Profile created! Users can now see your profile.');
        setTimeout(() => setSuccess(''), 4000);
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const langOptions = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Marathi', 'Bengali', 'Urdu', 'Bhojpuri'];
  const toggleLang = (lang: string) => {
    setForm(f => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter(l => l !== lang) : [...f.languages, lang]
    }));
  };

  if (loading) return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-48 mb-3" />
      <div className="h-4 bg-slate-100 rounded w-72" />
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
        onClick={() => setShowForm(!showForm)}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${profile ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-amber-100 dark:bg-amber-900'}`}>
            {profile ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Edit3 className="h-5 w-5 text-amber-600" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              {profile ? `Dr. ${(profile.name as string)}` : 'Create Your Doctor Profile'}
            </h3>
            <p className="text-xs text-slate-500">
              {profile ? 'Your profile is visible to patients' : 'Upload your profile so patients can find and book you'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {success && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{success}</span>}
          <button className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            profile ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:scale-105'
          }`} onClick={e => { e.stopPropagation(); setShowForm(!showForm); }}>
            {profile ? 'Edit Profile' : '+ Create Profile'}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-5 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                placeholder="Dr. Your Name" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Phone *</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                placeholder="9876543210" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Location *</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                placeholder="City, State" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Specialization</label>
              <select value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30">
                <option value="">Select...</option>
                {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Qualification</label>
              <input value={form.qualification} onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                placeholder="MBBS, MD" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Hospital Name</label>
              <input value={form.hospitalName} onChange={e => setForm(f => ({ ...f, hospitalName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                placeholder="Hospital / Clinic name" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Experience (Years)</label>
              <input type="number" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Consultation Fee (₹)</label>
              <input type="number" value={form.consultationFee} onChange={e => setForm(f => ({ ...f, consultationFee: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Bio</label>
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/30 resize-none"
              placeholder="Tell patients about yourself..." />
          </div>

          {/* Languages */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Languages</label>
            <div className="flex flex-wrap gap-2">
              {langOptions.map(lang => (
                <button key={lang} onClick={() => toggleLang(lang)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    form.languages.includes(lang)
                      ? 'bg-violet-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                  }`}>{lang}</button>
              ))}
            </div>
          </div>

          {/* Image uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Profile Photo</label>
              <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-violet-400 transition-colors">
                <ImagePlus className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-500">{form.profileImage ? 'Photo selected ✓' : 'Upload your photo'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange('profileImage')} />
              </label>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Hospital Photo</label>
              <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-violet-400 transition-colors">
                <ImagePlus className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-500">{form.hospitalImage ? 'Photo selected ✓' : 'Upload hospital photo'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange('hospitalImage')} />
              </label>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !form.name || !form.phone || !form.location}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-violet-500/25 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DoctorDashboardPage() {
  const { t, language } = useLanguage();
  const { user } = useUser();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [patientCards, setPatientCards] = useState<Record<string, PatientCard | null>>({});
  const [loadingCard, setLoadingCard] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'today' | 'confirmed' | 'pending'>('today');

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/appointments/doctor/${user.id}`, {
      headers: { 'x-user-id': user.id }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setAppointments(data.appointments || []);
        else {
          setAppointments([
            { appointment_id: 'a1', patient_name: 'Ravi Kumar', scheduled_time: new Date().toISOString(), type: 'General Checkup', status: 'confirmed', notes: 'Routine follow-up' },
            { appointment_id: 'a2', patient_name: 'Priya Sharma', scheduled_time: new Date(Date.now() + 3600000).toISOString(), type: 'Cardiology', status: 'pending', notes: 'BP monitoring' },
            { appointment_id: 'a3', patient_name: 'Mohammed Ali', scheduled_time: new Date(Date.now() + 7200000).toISOString(), type: 'Diabetology', status: 'confirmed', notes: 'Sugar level review' },
          ]);
        }
      })
      .catch(() => {
        setAppointments([
          { appointment_id: 'a1', patient_name: 'Ravi Kumar', scheduled_time: new Date().toISOString(), type: 'General Checkup', status: 'confirmed', notes: 'Routine follow-up' },
          { appointment_id: 'a2', patient_name: 'Priya Sharma', scheduled_time: new Date(Date.now() + 3600000).toISOString(), type: 'Cardiology', status: 'pending', notes: 'BP monitoring' },
          { appointment_id: 'a3', patient_name: 'Mohammed Ali', scheduled_time: new Date(Date.now() + 7200000).toISOString(), type: 'Diabetology', status: 'confirmed', notes: 'Sugar level review' },
        ]);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const loadPatientCard = async (appt: Appointment) => {
    const id = appt.appointment_id;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (patientCards[id] !== undefined) return;

    setLoadingCard(id);
    try {
      // Try to get the medical profile for this patient
      const patientId = appt.patient_id || 'demo';
      const res = await fetch(`${API}/api/medical-profile/emergency-card`, {
        headers: { 'x-user-id': patientId }
      }).then(r => r.json());

      if (res.success && res.card) {
        setPatientCards(prev => ({ ...prev, [id]: res.card }));
      } else {
        // Show demo card
        setPatientCards(prev => ({
          ...prev, [id]: {
            id: patientId, name: appt.patient_name, age: 42, gender: 'Male',
            blood_group: 'B+', conditions: 'Hypertension, Type 2 Diabetes',
            medications: 'Metformin 500mg, Amlodipine 5mg',
            allergies: 'Penicillin', bp: '138/88', sugar: 142, pulse: 84,
            emergency_contact_name: 'Sunita Kumar', emergency_contact_phone: '+91 98765 43210',
            organ_donor: false, has_insurance: true, insurance_provider: 'Star Health',
            doctor_notes: 'Patient requires regular BP monitoring. Advised low-sodium diet.',
          }
        }));
      }
    } catch {
      setPatientCards(prev => ({ ...prev, [id]: null }));
    } finally {
      setLoadingCard(null);
    }
  };

  const today = new Date().toDateString();
  const filtered = appointments.filter(a => {
    const matchSearch = a.patient_name.toLowerCase().includes(search.toLowerCase()) ||
                        a.type.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'today') return new Date(a.scheduled_time).toDateString() === today;
    if (filter === 'confirmed') return a.status === 'confirmed';
    if (filter === 'pending') return a.status === 'pending';
    return true;
  });

  const todayCount = appointments.filter(a => new Date(a.scheduled_time).toDateString() === today).length;
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Stethoscope className="h-7 w-7 text-indigo-500" /> Doctor Dashboard
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          View patient medical cards before and during appointments
        </p>
      </div>

      {/* Doctor Profile Section */}
      {user && <DoctorProfileForm userId={user.id} />}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today's Patients", value: todayCount, color: 'indigo', icon: Calendar },
          { label: 'Confirmed',        value: confirmedCount, color: 'emerald', icon: Activity },
          { label: 'Pending',          value: pendingCount, color: 'amber', icon: Clock },
          { label: 'Total',            value: appointments.length, color: 'slate', icon: User },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
            <div className={`p-2 rounded-xl w-fit mb-2 ${
              s.color === 'indigo' ? 'bg-indigo-100 dark:bg-indigo-900' :
              s.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900' :
              s.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900' : 'bg-slate-100 dark:bg-slate-700'
            }`}>
              <s.icon className={`h-4 w-4 ${
                s.color === 'indigo' ? 'text-indigo-600' :
                s.color === 'emerald' ? 'text-emerald-600' :
                s.color === 'amber' ? 'text-amber-600' : 'text-slate-500'
              }`} />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-slate-500 font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient or appointment type…"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>
        <div className="flex gap-2">
          {(['all', 'today', 'confirmed', 'pending'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === f ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
              }`}>{f}</button>
          ))}
        </div>
      </div>

      {/* Appointment list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-10 text-center">
          <Calendar className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-400">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(appt => {
            const isExpanded = expandedId === appt.appointment_id;
            const card = patientCards[appt.appointment_id];
            const time = new Date(appt.scheduled_time);
            const isToday = time.toDateString() === today;

            return (
              <div key={appt.appointment_id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">

                {/* Appointment row */}
                <button onClick={() => loadPatientCard(appt)}
                  className="w-full flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                  <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <span className="text-white font-black text-sm">{appt.patient_name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-slate-900 dark:text-white">{appt.patient_name}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[appt.status] || STATUS_COLORS.pending}`}>
                        {appt.status}
                      </span>
                      {isToday && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">Today</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />{time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs text-slate-500">{appt.type}</span>
                      {appt.notes && <span className="text-xs text-slate-400 truncate max-w-[200px]">{appt.notes}</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hidden sm:block">
                      {isExpanded ? 'Hide' : 'View'} Medical Card
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Medical Profile Card */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                    {loadingCard === appt.appointment_id ? (
                      <div className="flex items-center gap-2 py-4 justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                        <span className="text-sm text-slate-500">Loading medical profile…</span>
                      </div>
                    ) : card ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Medical Profile</span>
                          <span className="text-xs text-slate-400">— pre-loaded for consultation</span>
                        </div>

                        {/* Demographics row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: 'Age', value: `${card.age} yrs` },
                            { label: 'Gender', value: card.gender },
                            { label: 'Blood Group', value: card.blood_group },
                            { label: 'Organ Donor', value: card.organ_donor ? '✅ Yes' : '❌ No' },
                          ].map(f => (
                            <div key={f.label} className="bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700">
                              <p className="text-xs text-slate-400 font-semibold">{f.label}</p>
                              <p className="text-sm font-black text-slate-900 dark:text-white">{f.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Vitals */}
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vitals</p>
                          <div className="flex gap-2 flex-wrap">
                            <VitalChip label="BP" value={card.bp || '—'} unit="mmHg"
                              normal={parseInt(card.bp?.split('/')?.[0] || '120') <= 130} />
                            <VitalChip label="Sugar" value={card.sugar || '—'} unit="mg/dL"
                              normal={Number(card.sugar) >= 70 && Number(card.sugar) <= 130} />
                            <VitalChip label="Pulse" value={card.pulse || '—'} unit="bpm"
                              normal={Number(card.pulse) >= 60 && Number(card.pulse) <= 100} />
                          </div>
                        </div>

                        {/* Clinical info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { icon: ShieldAlert, label: 'Known Conditions', value: card.conditions, color: 'rose' },
                            { icon: Pill, label: 'Current Medications', value: card.medications, color: 'indigo' },
                            { icon: AlertCircle, label: 'Allergies', value: card.allergies, color: 'amber' },
                            { icon: Building2, label: 'Insurance', value: card.has_insurance ? card.insurance_provider : 'No insurance', color: 'blue' },
                          ].map(field => (
                            <div key={field.label} className={`bg-white dark:bg-slate-800 rounded-xl p-3 border ${
                              field.color === 'rose' ? 'border-rose-200 dark:border-rose-800' :
                              field.color === 'indigo' ? 'border-indigo-200 dark:border-indigo-800' :
                              field.color === 'amber' ? 'border-amber-200 dark:border-amber-800' : 'border-blue-200 dark:border-blue-800'
                            }`}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <field.icon className={`h-3.5 w-3.5 ${
                                  field.color === 'rose' ? 'text-rose-500' :
                                  field.color === 'indigo' ? 'text-indigo-500' :
                                  field.color === 'amber' ? 'text-amber-500' : 'text-blue-500'
                                }`} />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{field.label}</span>
                              </div>
                              <p className="text-sm text-slate-800 dark:text-slate-200 font-semibold">{field.value || '—'}</p>
                            </div>
                          ))}
                        </div>

                        {/* Doctor notes */}
                        {card.doctor_notes && (
                          <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3 border border-indigo-200 dark:border-indigo-800">
                            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Previous Doctor Notes</p>
                            <p className="text-sm text-indigo-900 dark:text-indigo-200">{card.doctor_notes}</p>
                          </div>
                        )}

                        {/* Emergency contact */}
                        {card.emergency_contact_name && (
                          <div className="flex items-center gap-3 text-sm bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{card.emergency_contact_name}</span>
                              <span className="text-slate-400 ml-2">{card.emergency_contact_phone}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-400">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-semibold">No medical profile found for this patient</p>
                        <p className="text-xs mt-1">Patient can set one up at <span className="font-mono">/dashboard/profile</span></p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
