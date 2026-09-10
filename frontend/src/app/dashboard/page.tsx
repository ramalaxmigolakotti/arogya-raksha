'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ScanLine, Upload, Stethoscope, Heart, Activity, Droplets,
  ChevronRight, Pill, MapPin, Star, Building2, ArrowUpRight,
  FileUp, Thermometer, CheckCircle2, AlertCircle, Navigation,
  User, Lock, BadgeAlert, Siren
} from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@clerk/nextjs';
import DiagnosticServices from '@/components/DiagnosticServices';
import Testimonials from '@/components/Testimonials';
import HealthcareCTA from '@/components/HealthcareCTA';
import GeminiBadge from '@/components/GeminiBadge';
import PersonalRiskCard from '@/components/PersonalRiskCard';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }),
};

export default function Dashboard() {
  const { location, loading: locLoading } = useLocation();
  const { t } = useLanguage();
  const { user } = useUser();
  const firstName = user?.firstName || 'User';
  const cityName = location?.city || t('selectLocation');
  const areaName = location?.area || '';

  // Medical profile quick-load for dashboard card
  const [medProfile, setMedProfile] = useState<Record<string, string | boolean | string[]> | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    // 1. Instant load from localStorage
    try {
      const userKey = user?.id ? `arogya_medical_profile_${user.id}` : 'arogya_medical_profile';
      const cached = localStorage.getItem(userKey) || localStorage.getItem('arogya_medical_profile');
      if (cached) {
        setMedProfile(JSON.parse(cached));
        setProfileLoaded(true);
      }
    } catch {}

    const handleUpdate = (e: any) => {
      if (e?.detail) {
        setMedProfile(e.detail);
        setProfileLoaded(true);
      }
    };
    window.addEventListener('medicalProfileUpdated', handleUpdate);

    // 2. Background fetch from API
    if (user?.id) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/medical-profile`, {
        headers: { 'x-user-id': user.id },
      }).then(r => r.json()).then(res => {
        if (res.success && res.profile) setMedProfile(res.profile);
      }).catch(() => {}).finally(() => setProfileLoaded(true));
    } else {
      setProfileLoaded(true);
    }

    return () => window.removeEventListener('medicalProfileUpdated', handleUpdate);
  }, [user?.id]);

  const [symptoms] = useState([
    { name: 'Fever', severity: '', icon: '🤒' },
    { name: 'Headache', severity: 'mild', icon: '🤕' },
    { name: 'Cold', severity: '', icon: '🤧' },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12 w-full">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl">
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Welcome, {firstName} 👋</h1>
            <p className="text-sm text-slate-500 font-medium">Here&apos;s your health dashboard</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <GeminiBadge variant="flash" size="sm" />
          <GeminiBadge variant="vision" size="sm" />
          <GeminiBadge variant="vertex" size="sm" />
        </div>
      </header>



      {/* ── PERSONAL RISK CARD ── */}
      <PersonalRiskCard />

      {/* ── MEDICAL PROFILE CARD ── */}
      {profileLoaded && (
        medProfile ? (
          <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700 rounded-2xl p-5 border border-indigo-500/30 shadow-xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent)]" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-indigo-200 uppercase tracking-wider mb-0.5">
                    <Lock className="h-3 w-3 inline mr-1" /> Your Medical ID — Private
                  </p>
                  <h2 className="text-lg font-extrabold text-white">{(medProfile.full_name as string) || firstName}</h2>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(medProfile.blood_group as string) && (
                      <span className="text-xs font-bold bg-red-500/30 text-red-200 px-2 py-0.5 rounded-full">🩸 {medProfile.blood_group as string}</span>
                    )}
                    {medProfile.bp_systolic && (
                      <span className="text-xs font-bold bg-white/15 text-white px-2 py-0.5 rounded-full">BP: {medProfile.bp_systolic}/{medProfile.bp_diastolic}</span>
                    )}
                    {((medProfile.conditions as string[]) || []).slice(0,2).map((c: string) => (
                      <span key={c} className="text-xs font-bold bg-white/15 text-white px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href="/dashboard/profile"
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-700 font-black text-sm rounded-xl shadow-lg hover:scale-105 transition-transform">
                  <User className="h-4 w-4" /> Edit Profile
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <BadgeAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">⚕️ Complete your Medical Profile</p>
              <p className="text-xs text-amber-700 mt-0.5">Your blood group, conditions and emergency contact will be auto-sent to hospitals during any SOS.</p>
            </div>
            <Link href="/dashboard/profile"
              className="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors">
              Set Up →
            </Link>
          </div>
        )
      )}

      {/* 3-Column Grid */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full">

        {/* ==================== LEFT COLUMN ==================== */}
        <div className="space-y-5">

          {/* Medicine Scanner Card */}
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 mb-1">{t('medicineScanner')}</h3>
                <p className="text-sm text-slate-500 mb-4">{t('scanDescription')}</p>
                <Link href="/dashboard/scanner"
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 w-fit">
                  <Upload className="h-4 w-4" /> {t('scanMedicine')}
                </Link>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                <ScanLine className="h-10 w-10 text-emerald-500" />
              </div>
            </div>
          </motion.div>

          {/* Health Stats */}
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{t('healthStats')}</h3>
            <div className="space-y-3">
              <HealthStat icon={Heart} label={t('heartRate')} value="72" unit="BPM" color="rose" />
              <HealthStat icon={Activity} label={t('bloodPressure')} value="120/80" unit="mmHg" color="blue" />
              <HealthStat icon={Droplets} label={t('sugarLevel')} value="95" unit="mg/dL" color="amber" />
            </div>
          </motion.div>

          {/* Prescription Reader */}
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30 relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl opacity-60"></div>
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Prescription Reader</h3>
                <p className="text-sm text-slate-500 mb-4">Upload & analyze<br/>doctor prescription.</p>
                <Link href="/dashboard/scanner"
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 w-fit">
                  <FileUp className="h-4 w-4" /> Upload Prescription
                </Link>
              </div>
              <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                <FileUp className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ==================== MIDDLE COLUMN ==================== */}
        <div className="space-y-5">

          {/* Symptom Checker Card */}
          <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 rounded-full blur-2xl -mr-6 -mt-6 opacity-60"></div>
            <div className="flex items-start justify-between relative z-10 mb-4">
              <h3 className="text-lg font-bold text-slate-800">{t('symptomChecker')}</h3>
              <div className="bg-violet-50 p-2 rounded-xl border border-violet-100">
                <Stethoscope className="h-6 w-6 text-violet-400" />
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-3">Enter your symptoms below</p>

            {/* Symptom chips */}
            <div className="space-y-2 mb-4">
              {symptoms.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <span className="text-sm font-semibold text-slate-700">{s.name}</span>
                    {s.severity && (
                      <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold">{s.severity}</span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
                </div>
              ))}
            </div>

            {/* AI Suggestion */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">AI Suggestion</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">Possible Viral Infection</span>
                <ChevronRight className="h-4 w-4 text-emerald-400" />
              </div>
            </div>

            <Link href="/dashboard/symptoms"
              className="mt-4 block text-center text-sm text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
              Open Full Checker →
            </Link>
          </motion.div>

          {/* AI Diagnosis Suggestion */}
          <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-50 rounded-full blur-2xl opacity-50"></div>
            <div className="flex items-start justify-between mb-4 relative z-10">
              <h3 className="text-lg font-bold text-slate-800">{t('aiDiagnosis')}</h3>
              <div className="bg-sky-50 p-2 rounded-xl border border-sky-100">
                <Thermometer className="h-6 w-6 text-sky-400" />
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-sm text-slate-500 mb-2">Based on symptoms:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="flex items-center gap-1 text-xs font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Mild Fever
                </span>
                <span className="flex items-center gap-1 text-xs font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span> Body Pain
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Possible Condition</p>
                  <p className="text-lg font-extrabold text-slate-900">Viral Fever</p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-slate-600 font-medium">Rest + Paracetamol</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-600 font-medium">Consult doctor if &gt; 3 days</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ==================== RIGHT COLUMN ==================== */}
        <div className="space-y-5">

          {/* Medicine Information */}
          <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{t('medicineInfo')}</h3>
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1">
                <h4 className="text-xl font-extrabold text-slate-900">Paracetamol</h4>
                <div className="space-y-1.5 mt-3">
                  <p className="text-sm text-slate-500">Used for: <span className="font-bold text-slate-700">Fever, Pain</span></p>
                  <p className="text-sm text-slate-500">Dosage: <span className="font-bold text-slate-700">500mg</span></p>
                  <p className="text-sm text-slate-500">Availability: <span className="font-bold text-emerald-600">Pharmacy</span></p>
                </div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                <Pill className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <Link href="/dashboard/symptoms"
              className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 text-sm">
              {t('symptomChecker')}
            </Link>
          </motion.div>

          {/* Nearby Hospitals */}
          <motion.div custom={6} initial="hidden" animate="visible" variants={fadeUp} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-slate-800">{t('nearbyHospitals')}</h3>
            </div>
            {location && (
              <p className="text-xs text-emerald-600 font-medium mb-3 flex items-center gap-1">
                <Navigation className="h-3 w-3" /> Live: {areaName ? `${areaName}, ` : ''}{cityName}
              </p>
            )}

            {/* Hospital Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-3">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2.5 rounded-xl flex-shrink-0">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800">Apollo Hospital</h4>
                  <p className="text-xs text-slate-500 mt-0.5">2.3 km away</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="flex">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`h-3 w-3 ${i <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400 font-medium ml-1">4,587 reviews</span>
                  </div>
                </div>
                <Link href="/dashboard/hospitals"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 whitespace-nowrap flex items-center gap-1">
                  {t('viewAll')} <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Quick Hospital List */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-emerald-500" /> Hospitals
                </h4>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
              {[
                { name: 'Apollo Hospital', dist: '2.3 km away', area: 'Delhi' },
                { name: 'Max Super Specialty', dist: '3.1 km away', area: 'Saket' },
                { name: 'AIIMS Delhi', dist: '5.0 km away', area: 'Ansari Nagar' },
              ].map((h, i) => (
                <Link key={i} href="/dashboard/hospitals"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                  <div className="bg-emerald-100 p-1.5 rounded-lg flex-shrink-0">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{h.name}</p>
                    <p className="text-xs text-slate-400">{h.dist}, ({h.area})</p>
                  </div>
                  <span className="text-xs text-emerald-600 font-bold flex-shrink-0">Invite</span>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg shadow-slate-200/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-100 p-2.5 rounded-xl">
            <Siren className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Quick Access</h3>
            <p className="text-sm text-slate-500">Essential healthcare features</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/dashboard/emergency" className="group bg-gradient-to-br from-rose-50 to-pink-50 p-5 rounded-2xl border border-rose-100 hover:shadow-md transition-all hover:-translate-y-1">
            <div className="bg-rose-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Building2 className="h-6 w-6 text-rose-600" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">Emergency Support</h4>
            <p className="text-xs text-slate-500">Emergency contacts and blood donor networks.</p>
          </Link>
          <Link href="/dashboard/doctors" className="group bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100 hover:shadow-md transition-all hover:-translate-y-1">
            <div className="bg-indigo-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <User className="h-6 w-6 text-indigo-600" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">Find Doctors</h4>
            <p className="text-xs text-slate-500">Browse and connect with certified doctors.</p>
          </Link>
        </div>
      </div>

      {/* Diagnostic Services */}
      <DiagnosticServices />

      {/* Healthcare CTA — Loan & Nearby Hospitals */}
      <HealthcareCTA
        context="Explore financial options or find hospitals for your healthcare needs"
        variant="wide"
      />

      {/* Testimonials */}
      <Testimonials />
    </div>
  );
}

/* ======================== SUBCOMPONENTS ======================== */

function HealthStat({ icon: Icon, label, value, unit, color }: any) {
  const colors: Record<string, string> = {
    rose: 'bg-rose-100 text-rose-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-slate-600">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-extrabold text-slate-800">{value}</span>
        <span className="text-xs text-slate-400 font-medium">{unit}</span>
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
      </div>
    </div>
  );
}
