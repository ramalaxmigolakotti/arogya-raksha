'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { cachedFetch } from '@/lib/apiCache';
import {
  Users, HandHeart, PlusCircle, Search, ChevronRight, MapPin, 
  Package, Pill, Activity, Stethoscope, AlertTriangle, UserPlus, HeartHandshake, Shield
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
  my_shared: number;
  available_resources: number;
  volunteers: number;
  active_requests: number;
}

export default function HealthShareDashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState<Stats>({ my_shared: 0, available_resources: 0, volunteers: 0, active_requests: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const headers = { 'x-user-id': user.id };
      const statsData = await cachedFetch<any>(`${API}/api/healthshare/stats`, { headers }, 30_000);
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
      {/* ── Hero Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 p-7 shadow-2xl shadow-blue-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mb-16" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 border border-white/30 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-lg">
              <HandHeart className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-1">Arogya Raksha Module</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">HealthShare Network</h1>
              <p className="text-blue-100 text-sm mt-1">Rent, share, or donate medical equipment and connect with community volunteers.</p>
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/dashboard/healthshare/new"
              className="flex items-center gap-2 px-5 py-3 bg-white text-blue-600 font-black text-sm rounded-2xl shadow-lg hover:scale-105 transition-transform">
              <PlusCircle className="h-4 w-4" /> Post Resource
            </Link>
            <Link href="/dashboard/healthshare/volunteers"
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-sm rounded-2xl transition-all">
              <Stethoscope className="h-4 w-4" /> Volunteers
            </Link>
            <Link href="/dashboard/healthshare/directory"
              className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-2xl transition-all">
              <Search className="h-4 w-4" /> Directory
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'My Shared Items', value: stats.my_shared, icon: Package, color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Community Resources', value: stats.available_resources, icon: Activity, color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'Local Volunteers', value: stats.volunteers, icon: Users, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-600' },
          { label: 'Active Requests', value: stats.active_requests, icon: AlertTriangle, color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-600' },
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

        {/* Post a Resource */}
        <Link href="/dashboard/healthshare/new"
          className="group bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-100 transition-all hover:-translate-y-1">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-slate-800 text-lg mb-1">Share a Resource</h3>
              <p className="text-sm text-slate-500">Post medical equipment, medicines, or supplies you no longer need. Rent them out or donate for free.</p>
              <div className="flex items-center gap-1 mt-3 text-blue-600 font-bold text-sm group-hover:gap-2 transition-all">
                Post Listing <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>

        {/* Become a Volunteer */}
        <Link href="/dashboard/healthshare/volunteers/register"
          className="group bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-emerald-100 transition-all hover:-translate-y-1">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-3 rounded-2xl shadow-lg shadow-emerald-200">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-extrabold text-slate-800 text-lg mb-1">Become a Volunteer</h3>
              <p className="text-sm text-slate-500">Register as a healthcare professional, driver, or NGO worker to help those in need during emergencies.</p>
              <div className="flex items-center gap-1 mt-3 text-emerald-600 font-bold text-sm group-hover:gap-2 transition-all">
                Join Network <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* ── Browse Directory Banner ── */}
      <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp}>
        <Link href="/dashboard/healthshare/directory"
          className="group flex items-center justify-between bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 rounded-2xl p-5 shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30">
              <Search className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-blue-100 uppercase tracking-wider mb-0.5">Public Marketplace · Live</p>
              <h3 className="font-extrabold text-white text-lg leading-tight">Browse All Shared Resources</h3>
              <p className="text-blue-100 text-sm">
                {loading ? '...' : `${stats.available_resources} items available right now`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all group-hover:gap-3 flex-shrink-0">
            View All <ChevronRight className="h-4 w-4" />
          </div>
        </Link>
      </motion.div>

      {/* ── How it works ── */}
      <motion.div custom={6} initial="hidden" animate="visible" variants={fadeUp}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-7 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.15),transparent)]" />
        <div className="relative z-10">
          <h2 className="text-xl font-extrabold mb-6">How HealthShare Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '01', icon: Package, title: 'List an Item', desc: 'Post medical equipment or supplies you no longer need' },
              { step: '02', icon: Search, title: 'Search & Match', desc: 'Others search the directory or use AI to find alternatives' },
              { step: '03', icon: HeartHandshake, title: 'Request & Connect', desc: 'Users request the item and arrange pickup' },
              { step: '04', icon: Shield, title: 'Safe Return', desc: 'Return rented items and help the community thrive' },
            ].map((s, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-black text-blue-400">
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
      <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp}
        className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">📋 Quick Directories</h2>
            <p className="text-xs text-slate-500 mt-0.5">Browse resources, volunteers and manage listings</p>
          </div>
          <Link href="/dashboard/healthshare/directory"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/dashboard/healthshare/directory"
            className="group flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl hover:shadow-md hover:border-blue-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">Resource Directory</p>
              <p className="text-xs text-slate-500">Browse shared items</p>
            </div>
            <ChevronRight className="h-4 w-4 text-blue-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/dashboard/healthshare/volunteers"
            className="group flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl hover:shadow-md hover:border-emerald-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md flex-shrink-0">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">Volunteer Directory</p>
              <p className="text-xs text-slate-500">Find local helpers</p>
            </div>
            <ChevronRight className="h-4 w-4 text-emerald-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link href="/dashboard/healthshare/new"
            className="group flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl hover:shadow-md hover:border-amber-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md flex-shrink-0">
              <PlusCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">Post a Resource</p>
              <p className="text-xs text-slate-500">Share or donate item</p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </motion.div>

      <AIFeatureConnector 
        features={[
          {
            title: "PHC / CHC Finder",
            description: "Find your local Primary Health Centre.",
            icon: MapPin,
            href: "/dashboard/phc-finder",
            reason: "AI Insight: Need equipment immediately? Local PHCs might have it.",
            color: "text-emerald-600",
            bg: "bg-emerald-100"
          },
          {
            title: "Medicine Finder",
            description: "Check pharmacy stocks if you can't find donated medicines here.",
            icon: Pill,
            href: "/dashboard/medicines",
            reason: "AI Insight: Quickly check pharmacy availability as a backup.",
            color: "text-blue-600",
            bg: "bg-blue-100"
          },
          {
            title: "Crisis Command",
            description: "Request emergency supplies directly to crisis centers.",
            icon: AlertTriangle,
            href: "/dashboard/crisis",
            reason: "AI Insight: Is this an emergency? Use the Crisis module instead.",
            color: "text-red-600",
            bg: "bg-red-100"
          }
        ]}
      />

      <AIFloatingPanel 
        featureName="HealthShare"
        context="You are assisting users with HealthShare, a platform for sharing, renting, or donating medical equipment and medicines. You can help them search for items, understand the process, or find volunteers."
        quickPrompts={[
          "How do I request an item?",
          "Can I rent equipment here?",
          "How do I become a volunteer?"
        ]}
      />
    </div>
  );
}
