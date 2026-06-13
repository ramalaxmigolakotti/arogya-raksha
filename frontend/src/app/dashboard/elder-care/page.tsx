'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { cachedFetch } from '@/lib/apiCache';
import {
  Users, UserPlus, Heart, Bell, ChevronRight, Shield,
  MapPin, Star, Clock, AlertTriangle, CheckCircle2,
  Activity, Pill, Calendar, Phone, ArrowUpRight,
  HeartHandshake, Stethoscope, Baby, Plus
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

interface Elder {
  id: string;
  full_name: string;
  age: number;
  address: string;
  conditions: string[];
  photo_url?: string;
  unread_alerts?: number;
  active_match?: { caregiver: { full_name: string; photo_url?: string } } | null;
}

interface Stats {
  my_elders: number;
  available_caregivers: number;
  unread_alerts: number;
}

export default function ElderCarePage() {
  const { user } = useUser();
  const [elders, setElders] = useState<Elder[]>([]);
  const [stats, setStats] = useState<Stats>({ my_elders: 0, available_caregivers: 0, unread_alerts: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const headers = { 'x-user-id': user.id };
      const [eldersData, statsData] = await Promise.allSettled([
        cachedFetch<any>(`${API}/api/elder-care/elders`, { headers }, 30_000),
        cachedFetch<any>(`${API}/api/elder-care/stats`,  { headers }, 30_000),
      ]);
      if (eldersData.status === 'fulfilled' && eldersData.value?.success)
        setElders(eldersData.value.elders || []);
      if (statsData.status === 'fulfilled' && statsData.value?.success)
        setStats(statsData.value.stats);
    } catch {
      // Backend offline — show empty state gracefully
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">
      {/* ── Hero Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-7 shadow-2xl shadow-orange-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mb-16" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 border border-white/30 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-lg">
              <HeartHandshake className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-orange-200 uppercase tracking-widest mb-1">Arogya Raksha Module</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">Elder Care &amp; Caregiver Connect</h1>
              <p className="text-orange-100 text-sm mt-1">Match elders with verified local caregivers — medicines, hospital visits &amp; more</p>
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/dashboard/elder-care/register-elder"
              className="flex items-center gap-2 px-5 py-3 bg-white text-orange-600 font-black text-sm rounded-2xl shadow-lg hover:scale-105 transition-transform">
              <Plus className="h-4 w-4" /> Register Elder
            </Link>
            <Link href="/dashboard/elder-care/register-caregiver"
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-sm rounded-2xl transition-all">
              <UserPlus className="h-4 w-4" /> Be a Caregiver
            </Link>
            <Link href="/dashboard/elder-care/directory"
              className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-2xl transition-all">
              <Users className="h-4 w-4" /> View Directory
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'My Elders', value: stats.my_elders, icon: Users, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600' },
          { label: 'Available Caregivers', value: stats.available_caregivers, icon: HeartHandshake, color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'Active Matches', value: elders.filter(e => e.active_match).length, icon: Heart, color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-600' },
          { label: 'Unread Alerts', value: stats.unread_alerts, icon: Bell, color: 'from-violet-400 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-600' },
        ].map((s, i) => (
          <motion.div key={s.label} custom={i} initial="hidden" animate="visible" variants={fadeUp}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-100/50 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 bg-gradient-to-br ${s.color} -mr-6 -mt-6`} />
            <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`h-5 w-5 ${s.text}`} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{loading ? '—' : s.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}
        className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Register an Elder */}
        <Link href="/dashboard/elder-care/register-elder"
          className="group bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-orange-100 transition-all hover:-translate-y-1">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-200">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-slate-800 text-lg mb-1">Register an Elder</h3>
              <p className="text-sm text-slate-500">Add your elderly family member — name, age, medical conditions, medicine schedule and emergency contacts.</p>
              <div className="flex items-center gap-1 mt-3 text-orange-600 font-bold text-sm group-hover:gap-2 transition-all">
                Get Started <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>

        {/* Become a Caregiver */}
        <Link href="/dashboard/elder-care/register-caregiver"
          className="group bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-emerald-100 transition-all hover:-translate-y-1">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-3 rounded-2xl shadow-lg shadow-emerald-200">
              <HeartHandshake className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-slate-800 text-lg mb-1">Become a Caregiver</h3>
              <p className="text-sm text-slate-500">Create your caregiver profile — skills, availability, languages and expected salary. Get matched with elders near you.</p>
              <div className="flex items-center gap-1 mt-3 text-emerald-600 font-bold text-sm group-hover:gap-2 transition-all">
                Create Profile <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Browse Directory Banner ── */}
      <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp}>
        <Link href="/dashboard/elder-care/directory"
          className="group flex items-center justify-between bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 rounded-2xl p-5 shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-100 uppercase tracking-wider mb-0.5">Public Directory · Live</p>
              <h3 className="font-extrabold text-white text-lg leading-tight">Browse All Caregivers & Elders</h3>
              <p className="text-emerald-100 text-sm">
                {loading ? '...' : `${stats.available_caregivers} caregivers available right now`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all group-hover:gap-3 flex-shrink-0">
            View All <ChevronRight className="h-4 w-4" />
          </div>
        </Link>
      </motion.div>

      {/* ── My Registered Elders ── */}
      <motion.div custom={6} initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Heart className="h-5 w-5 text-orange-500" /> My Registered Elders
          </h2>
          <Link href="/dashboard/elder-care/register-elder"
            className="flex items-center gap-1.5 text-sm text-orange-600 font-bold hover:text-orange-700 transition-colors">
            <Plus className="h-4 w-4" /> Add Elder
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse h-28" />
            ))}
          </div>
        ) : elders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-orange-300" />
            </div>
            <h3 className="font-bold text-slate-600 mb-1">No elders registered yet</h3>
            <p className="text-sm text-slate-400 mb-4">Register your elderly family member to find the best caregiver match.</p>
            <Link href="/dashboard/elder-care/register-elder"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-200 hover:scale-105 transition-transform">
              <Plus className="h-4 w-4" /> Register First Elder
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {elders.map((elder, i) => (
              <motion.div key={elder.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}
                className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100/50 p-5 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Photo */}
                  <div className="relative flex-shrink-0">
                    {elder.photo_url ? (
                      <img src={elder.photo_url} alt={elder.full_name}
                        className="h-14 w-14 rounded-2xl object-cover border-2 border-orange-100" />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-orange-200 flex items-center justify-center">
                        <span className="text-2xl">👴</span>
                      </div>
                    )}
                    {(elder.unread_alerts || 0) > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                        {elder.unread_alerts}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base">{elder.full_name}</h3>
                        <p className="text-sm text-slate-500">{elder.age} years • <span className="text-slate-400">{elder.address}</span></p>
                      </div>
                      <Link href={`/dashboard/elder-care/${elder.id}`}
                        className="flex items-center gap-1 text-xs text-orange-600 font-bold bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0">
                        View <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {/* Conditions */}
                    {elder.conditions?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {elder.conditions.map((c, idx) => (
                          <span key={idx} className="text-[11px] font-bold bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full border border-rose-100">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Caregiver status */}
                    <div className="mt-3 flex items-center gap-3">
                      {elder.active_match ? (
                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-xs font-bold text-emerald-700">
                            Caregiver: {elder.active_match.caregiver?.full_name}
                          </span>
                        </div>
                      ) : (
                        <Link href={`/dashboard/elder-care/matches?elder=${elder.id}`}
                          className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors">
                          <HeartHandshake className="h-3.5 w-3.5 text-amber-600" />
                          <span className="text-xs font-bold text-amber-700">Find Caregiver</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Integration Features ── */}
      <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp}>
        <h2 className="text-xl font-extrabold text-slate-800 mb-4">Connected Features</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Stethoscope, label: 'AI Symptom\nChecker', desc: 'Auto-alerts caregiver', href: '/dashboard/symptoms', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
            { icon: Calendar, label: 'Doctor\nBooking', desc: 'Caregiver can book', href: '/dashboard/appointments', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { icon: Pill, label: 'Medicine\nFinder', desc: 'Track deliveries', href: '/dashboard/medicines', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { icon: Activity, label: 'Health\nPredictor', desc: 'Risk alert to family', href: '/dashboard/predictors', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
          ].map((f, i) => (
            <Link key={i} href={f.href}
              className={`group bg-white border ${f.border} rounded-2xl p-4 hover:shadow-lg transition-all hover:-translate-y-1`}>
              <div className={`${f.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <p className="text-sm font-extrabold text-slate-800 leading-tight whitespace-pre-line">{f.label}</p>
              <p className="text-[11px] text-slate-400 mt-1">{f.desc}</p>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── How it works ── */}
      <motion.div custom={8} initial="hidden" animate="visible" variants={fadeUp}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(251,146,60,0.15),transparent)]" />
        <div className="relative z-10">
          <h2 className="text-xl font-extrabold mb-6">How Elder Care Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '01', icon: Users, title: 'Register Elder', desc: 'Add elderly family member with medical details' },
              { step: '02', icon: HeartHandshake, title: 'Smart Match', desc: 'AI matches the best caregivers by distance & skills' },
              { step: '03', icon: Shield, title: 'Hire Caregiver', desc: 'Review profiles, hire the best match' },
              { step: '04', icon: Heart, title: 'Care Begins', desc: 'Caregiver manages medicines, visits & tasks' },
            ].map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-[11px] font-black text-orange-400">
                    {s.step}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{s.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Directory Quick Access ── */}
      <motion.div custom={9} initial="hidden" animate="visible" variants={fadeUp}
        className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">📋 Quick Directories</h2>
            <p className="text-xs text-slate-500 mt-0.5">Browse, hire caregivers or register elders directly</p>
          </div>
          <Link href="/dashboard/elder-care/directory"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/dashboard/elder-care/directory?tab=caregivers"
            className="group flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl hover:shadow-md hover:border-emerald-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md flex-shrink-0">
              <HeartHandshake className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">Caregiver Directory</p>
              <p className="text-xs text-slate-500">Browse & hire caregivers</p>
            </div>
            <ChevronRight className="h-4 w-4 text-emerald-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/dashboard/elder-care/directory?tab=elders"
            className="group flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl hover:shadow-md hover:border-amber-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">Elders Directory</p>
              <p className="text-xs text-slate-500">All registered elders</p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/dashboard/elder-care/matches"
            className="group flex items-center gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl hover:shadow-md hover:border-violet-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Star className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">AI Matches</p>
              <p className="text-xs text-slate-500">Smart caregiver matching</p>
            </div>
            <ChevronRight className="h-4 w-4 text-violet-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.div>

      <AIFeatureConnector 
        features={[
          {
            title: "Symptom Checker",
            description: "Check your elder's symptoms to get immediate AI guidance.",
            icon: Stethoscope,
            href: "/dashboard/symptoms",
            reason: "AI Insight: Quickly check symptoms before booking a doctor.",
            color: "text-violet-600",
            bg: "bg-violet-100"
          },
          {
            title: "Medicine Finder",
            description: "Find prescribed medicines and set up delivery for your elders.",
            icon: Pill,
            href: "/dashboard/medicines",
            reason: "AI Insight: Keep track of medication availability easily.",
            color: "text-emerald-600",
            bg: "bg-emerald-100"
          },
          {
            title: "Hospitals",
            description: "Find the nearest hospitals for emergency or routine visits.",
            icon: Heart,
            href: "/dashboard/hospitals",
            reason: "AI Insight: Important to know the nearest care facilities.",
            color: "text-rose-600",
            bg: "bg-rose-100"
          }
        ]}
      />

      <AIFloatingPanel 
        featureName="Elder Care"
        context="You are acting as an Elder Care coordinator. Help the user manage elderly family members, find caregivers, and manage medical needs. Advise them on using the Elder Care module."
        quickPrompts={[
          "How do I find a caregiver?",
          "How can I set medicine reminders?",
          "What should I include in the elder profile?"
        ]}
      />
    </div>
  );
}
