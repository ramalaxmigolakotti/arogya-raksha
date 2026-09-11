'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  User, Heart, Pill, AlertTriangle, Phone, Hospital,
  Shield, Save, CheckCircle2, Edit2, Activity, Droplets,
  Weight, Ruler, Calendar, Lock, BadgeAlert, Plus, X, Loader2,
  Clock, Trash2, Search, Zap, Bot, Stethoscope, QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';
import Link from 'next/link';
import PatientPassportQRCard from '@/components/PatientPassportQRCard';
import {
  MedicalRecord,
  MedicalRecordType,
  getLocalHistory,
  deleteMedicalRecord,
  clearLocalHistory,
  clearCategoryRecords,
  persistMedicalRecord,
  syncUserRecordsFromCloud,
} from '@/lib/medicalHistoryService';

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

type TabKey = 'passport' | 'personal' | 'medical' | 'vitals' | 'contacts' | 'hospitals' | 'history';

const TABS: { key: TabKey; label: string; icon: React.ElementType; badge?: string }[] = [
  { key: 'passport',  label: 'Health Passport QR', icon: QrCode, badge: '2FA' },
  { key: 'personal',  label: 'Personal',          icon: User },
  { key: 'medical',   label: 'Medical',            icon: Heart },
  { key: 'vitals',    label: 'Vitals',             icon: Activity },
  { key: 'contacts',  label: 'Emergency',          icon: Phone },
  { key: 'hospitals', label: 'Hospitals',          icon: Hospital },
  { key: 'history',   label: 'Lifetime Records',   icon: Clock, badge: 'ALL' },
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
  const { user: userProfile } = useUserRole();
  const [profile, setProfile] = useState<Profile>({
    conditions: [], current_medications: [], allergies: [], preferred_hospitals: [],
    has_insurance: false, organ_donor: false,
  });
  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const activeUserId = userProfile?.id || 'usr_pat_8812';
  const [historyRecords, setHistoryRecords] = useState<MedicalRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState<string>('');

  const FEATURE_TABS: { id: string; label: string; icon: string; types: MedicalRecordType[]; path: string }[] = [
    { id: 'all', label: 'All History', icon: '🌟', types: [], path: '' },
    { id: 'symptom_checker', label: 'Symptom Checker', icon: '🩺', types: ['symptom_check', 'ai_doctor_consultation'], path: '/dashboard/ai' },
    { id: 'medicine_finder', label: 'Medicine Finder', icon: '💊', types: ['medicine_order'], path: '/dashboard/medicines' },
    { id: 'medicine_scanner', label: 'Medicine Scanner', icon: '🔍', types: ['medicine_scan'], path: '/dashboard/scanner' },
    { id: 'doctors', label: 'Doctors', icon: '👨‍⚕️', types: ['doctor_consultation'], path: '/dashboard/doctors' },
    { id: 'diagnostic_centre', label: 'Diagnostic Centre', icon: '🔬', types: ['diagnostic_booking'], path: '/dashboard/diagnostic-centre' },
    { id: 'hospitals', label: 'Hospitals', icon: '🏥', types: ['hospital_appointment'], path: '/dashboard/hospitals' },
    { id: 'health_predictors', label: 'Health Predictors', icon: '🧠', types: ['health_prediction', 'health_quiz'], path: '/dashboard/predictors' },
    { id: 'medical_reports', label: 'Medical Reports', icon: '📄', types: ['medical_report_analysis'], path: '/dashboard/reports' },
    { id: 'health_tracker', label: 'Health Tracker', icon: '💓', types: ['health_tracker'], path: '/dashboard/profile' },
  ];

  const loadHistory = useCallback(() => {
    const recs = getLocalHistory(activeUserId);
    const byEmail = userProfile?.email ? getLocalHistory(userProfile.email) : [];
    const idMap = new Map<string, MedicalRecord>();
    recs.forEach(r => idMap.set(r.id, r));
    byEmail.forEach(r => { if (!idMap.has(r.id)) idMap.set(r.id, r); });

    const merged = Array.from(idMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setHistoryRecords(merged);
  }, [activeUserId, userProfile?.email]);

  useEffect(() => {
    loadHistory();
    // Sync from cloud on mount for active user and email
    syncUserRecordsFromCloud(activeUserId, userProfile?.email).then(() => {
      loadHistory();
    }).catch(() => {});

    const handleUpdate = () => loadHistory();
    window.addEventListener('medical-history-updated', handleUpdate);
    return () => window.removeEventListener('medical-history-updated', handleUpdate);
  }, [loadHistory, activeUserId, userProfile?.email]);

  const getTabCount = (tab: typeof FEATURE_TABS[0]) => {
    if (tab.id === 'all') return historyRecords.length;
    return historyRecords.filter((r) => tab.types.includes(r.type)).length;
  };

  const activeTabObj = FEATURE_TABS.find((t) => t.id === historyFilter) || FEATURE_TABS[0];

  const handleDeleteHistoryItem = async (recId: string) => {
    if (confirm('Permanently delete this medical record from your lifetime history?')) {
      await deleteMedicalRecord(activeUserId, recId);
      loadHistory();
      toast.success('Record deleted from your medical history');
    }
  };

  const handleClearHistoryCategory = async () => {
    if (activeTabObj.id === 'all') {
      if (confirm('Are you sure you want to delete ALL lifetime records across all features? This action cannot be undone.')) {
        clearLocalHistory(activeUserId);
        await supabase.from('patient_health_records').delete().eq('user_id', activeUserId);
        loadHistory();
        toast.success('All lifetime medical history cleared');
      }
    } else {
      if (confirm(`Delete all records under "${activeTabObj.label}"? This cannot be undone.`)) {
        await clearCategoryRecords(activeUserId, activeTabObj.types);
        loadHistory();
        toast.success(`Cleared all ${activeTabObj.label} records`);
      }
    }
  };

  const filteredRecords = historyRecords.filter((rec) => {
    const matchesCategory =
      activeTabObj.id === 'all' || activeTabObj.types.includes(rec.type);
    const q = historySearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      rec.title.toLowerCase().includes(q) ||
      (rec.userQuery && rec.userQuery.toLowerCase().includes(q)) ||
      (rec.aiResponse && rec.aiResponse.toLowerCase().includes(q)) ||
      (rec.summary && rec.summary.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  // Strictly scope the storage key to the active user's ID
  const userKey = activeUserId ? `arogya_medical_profile_${activeUserId}` : 'arogya_medical_profile_guest';

  // Load from local storage scoped strictly to this user
  useEffect(() => {
    // 1. Reset state to clean defaults whenever activeUserId changes
    const currentUserName = userProfile?.name || '';
    setProfile({
      full_name: currentUserName || '',
      conditions: [],
      current_medications: [],
      allergies: [],
      preferred_hospitals: [],
      has_insurance: false,
      organ_donor: false,
    });
    setHasProfile(false);

    try {
      // Clean up legacy unscoped keys that leaked across accounts
      localStorage.removeItem('arogya_medical_profile');
      localStorage.removeItem('medical_profile');

      // Check strictly this user's scoped key
      const cached = localStorage.getItem(userKey);
      if (cached) {
        const data = JSON.parse(cached);
        if (data && (data.user_id === activeUserId || !data.user_id)) {
          setProfile(prev => ({ ...prev, ...data }));
          setHasProfile(true);
        }
      }
    } catch (e) {
      console.warn('[Profile] Local cache read error:', e);
    }
  }, [activeUserId, userKey, userProfile?.name]);

  // Non-blocking background sync from Supabase for the active user
  useEffect(() => {
    if (!activeUserId) {
      setIsLoading(false);
      return;
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3000)
    );

    const fetchPromise = supabase
      .from('user_medical_profiles')
      .select('*')
      .eq('user_id', activeUserId)
      .maybeSingle();

    Promise.race([fetchPromise, timeoutPromise])
      .then((res: any) => {
        const { data, error } = res || {};
        if (error) {
          console.warn('[Profile] Supabase profile fetch notice:', error.message);
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
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeUserId, userKey]);

  const set = (key: keyof Profile, value: unknown) =>
    setProfile(p => ({ ...p, [key]: value }));

  // Instant optimistic save — persists immediately to localStorage then syncs in background
  const save = async () => {
    setIsSaving(true);
    const profileData = {
      user_id: activeUserId,
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

    // 1. Instant local save strictly scoped to this user
    try {
      localStorage.setItem(userKey, JSON.stringify(profileData));
      localStorage.removeItem('arogya_medical_profile');
      window.dispatchEvent(new CustomEvent('medicalProfileUpdated', { detail: profileData }));
    } catch {}

    // Auto-record Health Tracker checkpoint in lifetime history if vitals entered
    if (profile.bp_systolic || profile.sugar_level_fasting || profile.pulse_rate || profile.weight_kg) {
      persistMedicalRecord(activeUserId, {
        type: 'health_tracker',
        title: `Vitals Logged (${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`,
        summary: `Blood Pressure: ${profile.bp_systolic || '--'}/${profile.bp_diastolic || '--'} mmHg, Fasting Sugar: ${profile.sugar_level_fasting || '--'} mg/dL, Pulse: ${profile.pulse_rate || '--'} bpm, Weight: ${profile.weight_kg || '--'} kg`,
        userQuery: 'Recorded personal vitals checkpoint',
        aiResponse: 'Vitals validated and logged into lifetime health trajectory.',
        metadata: {
          bp: `${profile.bp_systolic || '--'}/${profile.bp_diastolic || '--'}`,
          sugar: profile.sugar_level_fasting,
          pulse: profile.pulse_rate,
          weight: profile.weight_kg,
        },
      }).catch(() => {});
    }

    setSaved(true);
    setHasProfile(true);
    setTimeout(() => setSaved(false), 3000);
    setIsSaving(false);

    // 2. Background sync to Supabase (if user logged in)
    if (activeUserId) {
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
          <button
            onClick={() => setActiveTab('passport')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-extrabold text-sm transition-all shadow-sm ${
              activeTab === 'passport'
                ? 'bg-indigo-600 text-white shadow-indigo-500/30'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
            }`}
          >
            <QrCode className="h-4 w-4" />
            <span>Health Passport QR</span>
          </button>
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

        {/* ── HEALTH PASSPORT QR ── */}
        {activeTab === 'passport' && (
          <PatientPassportQRCard
            userId={activeUserId}
            userProfile={userProfile || undefined}
            medicalProfile={profile}
          />
        )}

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

        {/* ── LIFETIME HEALTH HISTORY & AUDIT TRAIL ── */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  Lifetime Health Records & AI Consultation History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Stored forever with your authenticated account ({userProfile?.name} • {userProfile?.badgeId}). You can review or delete any record below.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleClearHistoryCategory}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear {activeTabObj.id === 'all' ? 'All Lifetime History' : `${activeTabObj.label} History`}
                </button>
              </div>
            </div>

            {/* Feature Filter Pills with Live Counts */}
            <div className="flex items-center gap-2 flex-wrap">
              {FEATURE_TABS.map((tab) => {
                const count = getTabCount(tab);
                const isSelected = historyFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHistoryFilter(tab.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeTabObj.path && (
              <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl px-4 py-2 text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Showing your lifetime history for <strong className="text-slate-900 dark:text-white">{activeTabObj.label}</strong>
                </span>
                <Link
                  href={activeTabObj.path}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Open {activeTabObj.label} Page</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            {/* Search inside history */}
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search past symptoms, diagnoses, scanned medicines, or doctor advice..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>

            {/* Records List */}
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 space-y-2">
                <Clock className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">No medical records found in this category</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Whenever you check symptoms, chat with the AI Doctor, scan medicines, or run health predictions, all queries and answers will be preserved here permanently.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center">
                          {rec.type === 'symptom_check' ? '🩺' :
                           rec.type === 'ai_doctor_consultation' ? '🤖' :
                           rec.type === 'health_prediction' || rec.type === 'health_quiz' ? '🧠' :
                           rec.type === 'medicine_scan' ? '🔍' :
                           rec.type === 'medicine_order' ? '💊' :
                           rec.type === 'doctor_consultation' ? '👨‍⚕️' :
                           rec.type === 'diagnostic_booking' ? '🔬' :
                           rec.type === 'hospital_appointment' ? '🏥' :
                           rec.type === 'medical_report_analysis' ? '📄' :
                           rec.type === 'health_tracker' ? '💓' : '📋'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{rec.title}</h4>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                              {rec.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(rec.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteHistoryItem(rec.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-transparent hover:border-rose-100 transition-colors"
                        title="Delete this record permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Summary if available */}
                    {rec.summary && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        {rec.summary}
                      </div>
                    )}

                    {/* User Input / Symptoms Query */}
                    {rec.userQuery && (
                      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          What you asked / Input provided:
                        </span>
                        <p className="text-slate-700 dark:text-slate-200 font-medium whitespace-pre-wrap leading-relaxed">{rec.userQuery}</p>
                      </div>
                    )}

                    {/* AI Response / Diagnosis / Output */}
                    {rec.aiResponse && (
                      <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/40 dark:from-indigo-950/30 dark:to-blue-950/20 rounded-xl p-3.5 border border-indigo-100/60 dark:border-indigo-900/30 text-xs">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                          AI Doctor / Diagnosis & Clinical Output:
                        </span>
                        <p className="text-slate-800 dark:text-slate-100 font-medium whitespace-pre-wrap leading-relaxed">{rec.aiResponse}</p>
                      </div>
                    )}

                    {/* Metadata Badges */}
                    {rec.metadata && Object.keys(rec.metadata).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {rec.metadata.severity && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                            Severity: {rec.metadata.severity}
                          </span>
                        )}
                        {rec.metadata.riskScore !== undefined && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300">
                            Risk Score: {rec.metadata.riskScore}%
                          </span>
                        )}
                        {rec.metadata.tokenNumber && (
                          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                            Token #{rec.metadata.tokenNumber}
                          </span>
                        )}
                        {rec.metadata.paymentAmount && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                            Paid ₹{rec.metadata.paymentAmount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
