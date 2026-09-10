'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import {
  User, Heart, Pill, AlertTriangle, Phone, Hospital,
  Shield, Save, CheckCircle2, Edit2, Activity, Droplets,
  Weight, Ruler, Calendar, Lock, BadgeAlert, Plus, X, Loader2
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

// Direct Supabase client (bypasses backend — works even when backend is offline)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const CONDITION_OPTIONS = [
  'Diabetes (Type 1)', 'Diabetes (Type 2)', 'Hypertension', 'Heart Disease',
  'Asthma', 'COPD', 'Kidney Disease', 'Liver Disease', 'Thyroid Disorder',
  'Epilepsy / Seizures', 'Cancer', 'Arthritis', 'Osteoporosis',
  'Anxiety / Depression', 'Stroke (History)', 'HIV / AIDS', 'Sickle Cell',
];

const HOSPITAL_OPTIONS = [
  'Apollo Hospitals', 'AIIMS', 'Fortis Healthcare', 'Max Healthcare',
  'Manipal Hospitals', 'Narayana Health', 'Medanta', 'Aster CMI',
  'Christian Medical College (CMC)', 'NIMHANS', 'Govt District Hospital',
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface Profile {
  full_name?: string; age?: string; date_of_birth?: string; gender?: string;
  blood_group?: string; height_cm?: string; weight_kg?: string;
  conditions?: string[]; bp_systolic?: string; bp_diastolic?: string;
  sugar_level_fasting?: string; sugar_level_pp?: string; pulse_rate?: string;
  current_medications?: string[]; allergies?: string[];
  preferred_hospitals?: string[];
  emergency_contact_name?: string; emergency_contact_phone?: string; emergency_contact_relation?: string;
  has_insurance?: boolean; insurance_provider?: string; policy_number?: string;
  organ_donor?: boolean; doctor_notes?: string;
}

type TabKey = 'personal' | 'medical' | 'vitals' | 'contacts' | 'hospitals';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'personal',  label: 'Personal',       icon: User },
  { key: 'medical',   label: 'Medical',         icon: Heart },
  { key: 'vitals',    label: 'Vitals',          icon: Activity },
  { key: 'contacts',  label: 'Emergency',       icon: Phone },
  { key: 'hospitals', label: 'Hospitals',       icon: Hospital },
];

function TagInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder?: string
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-full">
            {v}
            <button onClick={() => onChange(values.filter(x => x !== v))} className="hover:text-red-600 ml-0.5">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); }}}
          className="flex-1 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
          placeholder={placeholder} />
        <button onClick={add} type="button"
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function MedicalProfilePage() {
  const { t, language } = useLanguage();
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<Profile>({
    conditions: [], current_medications: [], allergies: [], preferred_hospitals: [],
    has_insurance: false, organ_donor: false,
  });
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const STORAGE_KEY = 'arogya_medical_profile';
  const userKey = user?.id ? `arogya_medical_profile_${user.id}` : STORAGE_KEY;

  // Immediate load from localStorage on mount (0ms delay!)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        setProfile(prev => ({ ...prev, ...data }));
        setHasProfile(true);
      }
    } catch (e) {
      console.warn('[Profile] Local cache read error:', e);
    }
    setIsLoading(false);
  }, [userKey]);

  // Non-blocking background sync from Supabase when user is ready
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Auto-prefill full name from Clerk if missing
    if (user.fullName || user.firstName) {
      setProfile(p => ({
        ...p,
        full_name: p.full_name || user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim()
      }));
    }

    // Non-blocking fetch with strict 2.5s timeout so it never hangs
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 2500)
    );

    const fetchPromise = supabase
      .from('user_medical_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    Promise.race([fetchPromise, timeoutPromise])
      .then((res: any) => {
        const { data, error } = res || {};
        if (error && error.code !== 'PGRST116') {
          return;
        }
        if (data) {
          const formatted = {
            ...data,
            age: data.age?.toString() || '',
            height_cm: data.height_cm?.toString() || '',
            weight_kg: data.weight_kg?.toString() || '',
            bp_systolic: data.bp_systolic?.toString() || '',
            bp_diastolic: data.bp_diastolic?.toString() || '',
            sugar_level_fasting: data.sugar_level_fasting?.toString() || '',
            sugar_level_pp: data.sugar_level_pp?.toString() || '',
            pulse_rate: data.pulse_rate?.toString() || '',
            conditions: data.conditions || [],
            current_medications: data.current_medications || [],
            allergies: data.allergies || [],
            preferred_hospitals: data.preferred_hospitals || [],
          };
          setProfile(formatted);
          setHasProfile(true);
          try {
            localStorage.setItem(userKey, JSON.stringify(formatted));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
          } catch {}
        }
      })
      .catch(() => {
        // Fallback silently to localStorage — zero freeze!
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isLoaded, user, userKey]);

  const set = (key: keyof Profile, value: unknown) =>
    setProfile(p => ({ ...p, [key]: value }));

  // Instant optimistic save — persists immediately to localStorage then syncs in background
  const save = async () => {
    setIsSaving(true);
    const profileData = {
      user_id: user?.id || 'guest',
      ...profile,
      age: profile.age ? Number(profile.age) : null,
      height_cm: profile.height_cm ? Number(profile.height_cm) : null,
      weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
      bp_systolic: profile.bp_systolic ? Number(profile.bp_systolic) : null,
      bp_diastolic: profile.bp_diastolic ? Number(profile.bp_diastolic) : null,
      sugar_level_fasting: profile.sugar_level_fasting ? Number(profile.sugar_level_fasting) : null,
      sugar_level_pp: profile.sugar_level_pp ? Number(profile.sugar_level_pp) : null,
      pulse_rate: profile.pulse_rate ? Number(profile.pulse_rate) : null,
      updated_at: new Date().toISOString(),
    };

    // 1. Instant local save (0ms)
    try {
      localStorage.setItem(userKey, JSON.stringify(profileData));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
      window.dispatchEvent(new CustomEvent('medicalProfileUpdated', { detail: profileData }));
    } catch {}

    setSaved(true);
    setHasProfile(true);
    setTimeout(() => setSaved(false), 3000);
    setIsSaving(false);

    // 2. Background sync to Supabase (if user logged in)
    if (user?.id) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000)
        );
        const syncPromise = supabase
          .from('user_medical_profiles')
          .upsert(profileData, { onConflict: 'user_id' });

        await Promise.race([syncPromise, timeoutPromise]);
      } catch (e: any) {
        console.warn('[Profile] Supabase background sync notice:', e.message);
      }
    }
  };

  const inp = (key: keyof Profile, placeholder: string, type = 'text') => (
    <input
      type={type}
      value={(profile[key] as string) || ''}
      onChange={e => set(key, e.target.value)}
      placeholder={placeholder}
      className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all"
    />
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Medical Profile</h1>
            <p className="text-sm text-slate-500">
              {hasProfile ? (
                <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Profile saved — auto-fills your SOS alerts
                </span>
              ) : 'Complete your profile to enable instant emergency identification'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            <Lock className="h-3.5 w-3.5" /> Private — only visible to you
          </div>
          <button onClick={save} disabled={isSaving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
              saved ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
              'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30 hover:scale-105'
            }`}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> :
             saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? 'Saved!' : isSaving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Privacy Banner */}
      {!hasProfile && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3">
          <BadgeAlert className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-indigo-800">Complete your Medical Profile</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              When you press 🚨 Emergency at any hotel, mall, or restaurant — your full medical data
              (blood group, conditions, medications, preferred hospitals) is automatically attached to the
              incident, so staff and hospitals receive complete patient information instantly.
            </p>
          </div>
        </div>
      )}

      {/* Emergency Preview Card */}
      {hasProfile && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Your Emergency ID Card
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Name',        value: profile.full_name || '—' },
              { label: 'Blood Group', value: profile.blood_group || '—' },
              { label: 'BP',   value: profile.bp_systolic ? `${profile.bp_systolic}/${profile.bp_diastolic}` : '—' },
              { label: 'Conditions',  value: (profile.conditions || []).slice(0,2).join(', ') || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/80 rounded-xl p-2.5 border border-red-100">
                <p className="text-xs text-slate-500 font-bold">{label}</p>
                <p className="text-sm font-black text-slate-900 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === t.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">

        {/* ── PERSONAL ── */}
        {activeTab === 'personal' && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-500" /> Personal Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Full Name *</label>
                {inp('full_name', 'e.g. Raj Kumar')}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Age</label>
                {inp('age', 'e.g. 34', 'number')}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Date of Birth</label>
                {inp('date_of_birth', '', 'date')}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Gender</label>
                <select value={profile.gender || ''} onChange={e => set('gender', e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                  <option value="">Select gender</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Droplets className="h-3 w-3 text-red-500" /> Blood Group *
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {BLOOD_GROUPS.map(bg => (
                    <button key={bg} type="button" onClick={() => set('blood_group', bg)}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        profile.blood_group === bg
                          ? 'bg-red-500 text-white border-red-600 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-red-300'
                      }`}>{bg}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                    <Ruler className="h-3 w-3" /> Height (cm)
                  </label>
                  {inp('height_cm', '170', 'number')}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                    <Weight className="h-3 w-3" /> Weight (kg)
                  </label>
                  {inp('weight_kg', '70', 'number')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!profile.organ_donor}
                  onChange={e => set('organ_donor', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded" />
                <span className="text-sm text-slate-700 font-semibold">I am an Organ Donor</span>
              </label>
            </div>
          </div>
        )}

        {/* ── MEDICAL ── */}
        {activeTab === 'medical' && (
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" /> Medical Conditions & History
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Select Conditions</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONDITION_OPTIONS.map(c => (
                  <button key={c} type="button"
                    onClick={() => set('conditions', (profile.conditions || []).includes(c)
                      ? (profile.conditions || []).filter(x => x !== c)
                      : [...(profile.conditions || []), c])}
                    className={`text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      (profile.conditions || []).includes(c)
                        ? 'bg-red-500 text-white border-red-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-red-200'
                    }`}>{c}</button>
                ))}
              </div>
              <div className="mt-3">
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Other Conditions (type & press Enter)</label>
                <TagInput
                  values={(profile.conditions || []).filter(c => !CONDITION_OPTIONS.includes(c))}
                  onChange={custom => set('conditions', [...CONDITION_OPTIONS.filter(c => (profile.conditions || []).includes(c)), ...custom])}
                  placeholder="e.g. Thalassemia, PCOD…" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-violet-500" /> Current Medications
              </label>
              <TagInput values={profile.current_medications || []} onChange={v => set('current_medications', v)}
                placeholder="e.g. Metformin 500mg, Amlodipine 5mg…" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Allergies (drug / food / other)
              </label>
              <TagInput values={profile.allergies || []} onChange={v => set('allergies', v)}
                placeholder="e.g. Penicillin, Shellfish, Latex…" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Special Notes for Doctors</label>
              <textarea value={profile.doctor_notes || ''} onChange={e => set('doctor_notes', e.target.value)}
                rows={3} placeholder="e.g. Previous surgery: appendectomy 2018. Pacemaker fitted. Do not give NSAIDs."
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white resize-none" />
            </div>
          </div>
        )}

        {/* ── VITALS ── */}
        {activeTab === 'vitals' && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" /> Vitals & Readings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-red-50 rounded-2xl p-4 border border-red-100 space-y-3">
                <p className="text-xs font-black text-red-700 uppercase tracking-wider">Blood Pressure</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Systolic (mmHg)</label>
                    {inp('bp_systolic', '120', 'number')}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Diastolic (mmHg)</label>
                    {inp('bp_diastolic', '80', 'number')}
                  </div>
                </div>
                {profile.bp_systolic && profile.bp_diastolic && (
                  <div className={`text-center py-2 rounded-xl text-sm font-black ${
                    parseInt(profile.bp_systolic) > 140 ? 'bg-red-200 text-red-800' :
                    parseInt(profile.bp_systolic) > 120 ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {profile.bp_systolic}/{profile.bp_diastolic} mmHg —{' '}
                    {parseInt(profile.bp_systolic) > 140 ? 'High' :
                     parseInt(profile.bp_systolic) > 120 ? 'Elevated' : 'Normal'}
                  </div>
                )}
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 space-y-3">
                <p className="text-xs font-black text-amber-700 uppercase tracking-wider">Blood Sugar</p>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fasting (mg/dL)</label>
                  {inp('sugar_level_fasting', '90', 'number')}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Post-Prandial (mg/dL)</label>
                  {inp('sugar_level_pp', '140', 'number')}
                </div>
                {profile.sugar_level_fasting && (
                  <div className={`text-center py-2 rounded-xl text-sm font-black ${
                    parseFloat(profile.sugar_level_fasting) > 126 ? 'bg-red-200 text-red-800' :
                    parseFloat(profile.sugar_level_fasting) > 100 ? 'bg-amber-200 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    Fasting: {profile.sugar_level_fasting} mg/dL —{' '}
                    {parseFloat(profile.sugar_level_fasting) > 126 ? 'Diabetic Range' :
                     parseFloat(profile.sugar_level_fasting) > 100 ? 'Pre-Diabetic' : 'Normal'}
                  </div>
                )}
              </div>

              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <p className="text-xs font-black text-indigo-700 uppercase tracking-wider mb-3">Pulse Rate</p>
                <label className="block text-xs font-bold text-slate-500 mb-1">Resting Pulse (bpm)</label>
                {inp('pulse_rate', '72', 'number')}
              </div>
            </div>
          </div>
        )}

        {/* ── EMERGENCY CONTACTS ── */}
        {activeTab === 'contacts' && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Phone className="h-4 w-4 text-orange-500" /> Emergency Contact
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Contact Name *</label>
                {inp('emergency_contact_name', 'e.g. Priya Kumar (Wife)')}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Contact Phone *</label>
                {inp('emergency_contact_phone', '+91 98765 43210', 'tel')}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Relationship</label>
                <select value={profile.emergency_contact_relation || ''}
                  onChange={e => set('emergency_contact_relation', e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                  <option value="">Select relation</option>
                  <option>Spouse</option><option>Parent</option><option>Child</option>
                  <option>Sibling</option><option>Friend</option><option>Other</option>
                </select>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" /> Insurance
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!profile.has_insurance}
                  onChange={e => set('has_insurance', e.target.checked)}
                  className="w-4 h-4 accent-indigo-600" />
                <span className="text-sm font-semibold text-slate-700">I have health insurance</span>
              </label>
              {profile.has_insurance && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Insurance Provider</label>
                    {inp('insurance_provider', 'e.g. Star Health, HDFC ERGO')}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Policy Number</label>
                    {inp('policy_number', 'e.g. POL-12345678')}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HOSPITALS ── */}
        {activeTab === 'hospitals' && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Hospital className="h-4 w-4 text-emerald-500" /> Preferred Hospitals
            </h2>
            <p className="text-sm text-slate-500">
              Select hospitals you prefer or are registered with. During an emergency, the system
              will prioritize routing you to these hospitals.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {HOSPITAL_OPTIONS.map(h => (
                <button key={h} type="button"
                  onClick={() => set('preferred_hospitals', (profile.preferred_hospitals || []).includes(h)
                    ? (profile.preferred_hospitals || []).filter(x => x !== h)
                    : [...(profile.preferred_hospitals || []), h])}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-all text-left ${
                    (profile.preferred_hospitals || []).includes(h)
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                  }`}>
                  <Hospital className="h-4 w-4 flex-shrink-0" />
                  {h}
                  {(profile.preferred_hospitals || [])[0] === h && (
                    <span className="ml-auto text-xs bg-white/30 px-1.5 py-0.5 rounded-full">Primary</span>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Other Hospital (type & press Enter)</label>
              <TagInput
                values={(profile.preferred_hospitals || []).filter(h => !HOSPITAL_OPTIONS.includes(h))}
                onChange={custom => set('preferred_hospitals', [
                  ...HOSPITAL_OPTIONS.filter(h => (profile.preferred_hospitals || []).includes(h)),
                  ...custom
                ])}
                placeholder="e.g. Regional Cancer Centre, Sankara Nethralaya…" />
            </div>
          </div>
        )}
      </div>

      {/* Save Button (bottom) */}
      <div className="flex justify-end">
        <button onClick={save} disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-xl transition-all hover:scale-105 ${
            saved ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
            'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
          }`}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> :
           saved ? <><CheckCircle2 className="h-4 w-4" /> Profile Saved!</> :
           <><Save className="h-4 w-4" /> Save My Medical Profile</>}
        </button>
      </div>
    </div>
  );
}
