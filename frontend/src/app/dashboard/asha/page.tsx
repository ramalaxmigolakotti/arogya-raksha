'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { cachedFetch } from '@/lib/apiCache';
import {
  Users, Activity, PlusCircle, AlertTriangle, ChevronRight, Stethoscope, HeartPulse, Pill, Heart
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import AIFloatingPanel from '@/components/AIFloatingPanel';
import AIFeatureConnector from '@/components/AIFeatureConnector';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }),
};

interface Stats {
  total_patients: number;
  high_risk_patients: number;
}

export default function AshaDashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState<Stats>({ total_patients: 0, high_risk_patients: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const headers = { 'x-user-id': user.id };
      const statsData = await cachedFetch<any>(`${API}/api/asha/stats`, { headers }, 30_000);
      if (statsData.success) setStats(statsData.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">
      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 p-7 shadow-2xl shadow-rose-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mb-16" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 border border-white/30 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-lg">
              <HeartPulse className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-rose-200 uppercase tracking-widest mb-1">Arogya Raksha Module</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">ASHA Worker Portal</h1>
              <p className="text-rose-100 text-sm mt-1">Manage village health records, track vitals, and get AI-powered risk alerts.</p>
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/dashboard/asha/register"
              className="flex items-center gap-2 px-5 py-3 bg-white text-rose-600 font-black text-sm rounded-2xl shadow-lg hover:scale-105 transition-transform">
              <PlusCircle className="h-4 w-4" /> Register Patient
            </Link>
            <Link href="/dashboard/asha/patients"
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-sm rounded-2xl transition-all">
              <Users className="h-4 w-4" /> View Directory
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
        {[
          { label: 'Registered Villagers', value: stats.total_patients, icon: Users, color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'High Risk Patients', value: stats.high_risk_patients, icon: AlertTriangle, color: 'from-red-400 to-rose-500', bg: 'bg-red-50', text: 'text-red-600' },
        ].map((s, i) => (
          <motion.div key={s.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-100/50 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 bg-gradient-to-br ${s.color} -mr-6 -mt-6`} />
            <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`h-5 w-5 ${s.text}`} />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">{loading ? '—' : s.value}</p>
            <p className="text-sm font-semibold text-slate-500 mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/asha/register"
          className="group bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-rose-100 transition-all hover:-translate-y-1">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-rose-400 to-pink-500 p-3 rounded-2xl shadow-lg shadow-rose-200">
              <PlusCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-slate-800 text-lg mb-1">Add New Villager</h3>
              <p className="text-sm text-slate-500">Create a digital health profile for a rural citizen who doesn't use the app.</p>
              <div className="flex items-center gap-1 mt-3 text-rose-600 font-bold text-sm group-hover:gap-2 transition-all">
                Register <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/asha/patients"
          className="group bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-indigo-100 transition-all hover:-translate-y-1">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-indigo-400 to-blue-500 p-3 rounded-2xl shadow-lg shadow-indigo-200">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-slate-800 text-lg mb-1">Log Patient Vitals</h3>
              <p className="text-sm text-slate-500">Record BP, Sugar, Weight, and get instant AI risk assessments and suggestions.</p>
              <div className="flex items-center gap-1 mt-3 text-indigo-600 font-bold text-sm group-hover:gap-2 transition-all">
                Select Patient <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Directory Quick Access ── */}
      <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}
        className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">📋 Quick Directories</h2>
            <p className="text-xs text-slate-500 mt-0.5">Access patient records and vitals instantly</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/dashboard/asha/patients"
            className="group flex items-center gap-3 p-4 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-2xl hover:shadow-md hover:border-rose-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">Patient Directory</p>
              <p className="text-xs text-slate-500">All registered villagers</p>
            </div>
            <ChevronRight className="h-4 w-4 text-rose-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/dashboard/asha/register"
            className="group flex items-center gap-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl hover:shadow-md hover:border-indigo-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">Register New Patient</p>
              <p className="text-xs text-slate-500">Add villager health profile</p>
            </div>
            <ChevronRight className="h-4 w-4 text-indigo-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.div>

      <AIFeatureConnector 
        features={[
          {
            title: "Symptom Checker",
            description: "Check patient symptoms on the spot for preliminary AI guidance.",
            icon: Stethoscope,
            href: "/dashboard/symptoms",
            reason: "AI Insight: Quickly check reported symptoms for villagers before recommending a doctor visit.",
            color: "text-violet-600",
            bg: "bg-violet-100"
          },
          {
            title: "Medicine Finder",
            description: "Check availability of prescribed medicines at local pharmacies.",
            icon: Pill,
            href: "/dashboard/medicines",
            reason: "AI Insight: Ensure the villager's required medication is in stock nearby.",
            color: "text-emerald-600",
            bg: "bg-emerald-100"
          },
          {
            title: "Hospitals",
            description: "Find the nearest hospital for high-risk patients.",
            icon: Heart,
            href: "/dashboard/hospitals",
            reason: "AI Insight: Important for immediate escalation of critical patients.",
            color: "text-rose-600",
            bg: "bg-rose-100"
          }
        ]}
      />

      <AIFloatingPanel 
        featureName="ASHA Worker Portal"
        context="You are an AI assistant for ASHA (Accredited Social Health Activist) workers. You help them log patient vitals, explain AI risk alerts, and suggest next steps for patient care."
        quickPrompts={[
          "What should I do for high BP?",
          "How do I log new patient vitals?",
          "Explain the high risk alert"
        ]}
      />
    </div>
  );
}
