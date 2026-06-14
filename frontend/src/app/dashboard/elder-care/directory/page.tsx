'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import {
  Search, MapPin, Star, Clock, Users, HeartHandshake, Filter,
  ChevronRight, Phone, Globe, Briefcase, IndianRupee, X,
  UserPlus, Plus, CheckCircle2, ArrowLeft, Sparkles, Shield,
  Activity, Heart, Baby
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }),
};

interface Caregiver {
  id: string;
  full_name: string;
  age?: number;
  gender?: string;
  photo_url?: string;
  village: string;
  city?: string;
  state?: string;
  skills: string[];
  languages: string[];
  experience_years: number;
  salary_expectation: number;
  rating?: number;
  bio?: string;
  availability?: { days?: string[]; timing?: string };
  status: string;
}

interface Elder {
  id: string;
  full_name: string;
  age: number;
  address: string;
  city?: string;
  state?: string;
  photo_url?: string;
  conditions: string[];
  mobility?: string;
  budget_per_month?: number;
  special_notes?: string;
  status: string;
}

type Tab = 'caregivers' | 'elders';

const SKILL_FILTERS = [
  'All', 'Medicine Management', 'Hospital Accompany', 'Diabetic Care',
  'Blood Pressure Monitoring', 'Alzheimer/Dementia Care', 'Mobility Assistance',
  'Post-Surgery Care', 'Companionship',
];

export default function ElderCareDirectoryPage() {
  const searchParams = useSearchParams();
  const newProfile = searchParams.get('new') === '1';
  const tabParam = searchParams.get('tab') as Tab | null;

  const [tab, setTab] = useState<Tab>(tabParam === 'elders' ? 'elders' : 'caregivers');
  const [showBanner, setShowBanner] = useState(newProfile);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [elders, setElders] = useState<Elder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Caregiver | Elder | null>(null);
  const [selectedType, setSelectedType] = useState<Tab>('caregivers');

  // Auto-dismiss the banner after 6 seconds
  useEffect(() => {
    if (!showBanner) return;
    const t = setTimeout(() => setShowBanner(false), 6000);
    return () => clearTimeout(t);
  }, [showBanner]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cgRes, elRes] = await Promise.all([
        fetch(`${API}/api/elder-care/caregivers?limit=100`),
        fetch(`${API}/api/elder-care/elders/public`),
      ]);
      const cgData = await cgRes.json();
      if (cgData.success) setCaregivers(cgData.caregivers || []);

      // Elders public endpoint — fallback gracefully if not found
      if (elRes.ok) {
        const elData = await elRes.json();
        if (elData.success) setElders(elData.elders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh every 30 seconds so new profiles appear instantly
  useEffect(() => {
    const interval = setInterval(() => { loadAll(); }, 30_000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const filteredCaregivers = caregivers.filter(c => {
    const matchSearch = search === '' ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.village.toLowerCase().includes(search.toLowerCase()) ||
      (c.city || '').toLowerCase().includes(search.toLowerCase());
    const matchSkill = skillFilter === 'All' || c.skills.includes(skillFilter);
    return matchSearch && matchSkill;
  });

  const filteredElders = elders.filter(e => {
    return search === '' ||
      e.full_name.toLowerCase().includes(search.toLowerCase()) ||
      e.address.toLowerCase().includes(search.toLowerCase()) ||
      (e.city || '').toLowerCase().includes(search.toLowerCase());
  });

  const openModal = (item: Caregiver | Elder, type: Tab) => {
    setSelected(item);
    setSelectedType(type);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-500">

      {/* ── Success Banner ── */}
      {showBanner && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-4 rounded-2xl shadow-xl shadow-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-sm">🎉 Your profile is now live!</p>
              <p className="text-emerald-100 text-xs mt-0.5">All customers can now see your profile in this directory.</p>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)} className="text-white/70 hover:text-white transition p-1 flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </motion.div>
      )}

      {/* ── Hero Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 p-7 shadow-2xl shadow-emerald-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-16 -mb-16" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/elder-care"
              className="h-10 w-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <div className="h-14 w-14 rounded-2xl bg-white/20 border border-white/30 backdrop-blur flex items-center justify-center flex-shrink-0 shadow-lg">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-200 uppercase tracking-widest mb-1">Public Directory</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                Elders & Caregivers Directory
              </h1>
              <p className="text-emerald-100 text-sm mt-1">
                Browse all registered profiles — updated in real-time
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/dashboard/elder-care/register-elder"
              className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-700 font-black text-sm rounded-2xl shadow-lg hover:scale-105 transition-transform">
              <Plus className="h-4 w-4" /> Register Elder
            </Link>
            <Link href="/dashboard/elder-care/register-caregiver"
              className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-sm rounded-2xl transition-all">
              <UserPlus className="h-4 w-4" /> Be a Caregiver
            </Link>
          </div>
        </div>
      </div>

      {/* ── Live Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp}
          className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 bg-gradient-to-br from-emerald-400 to-teal-500 -mr-6 -mt-6" />
          <div className="text-3xl font-extrabold text-slate-900">{loading ? '—' : caregivers.length}</div>
          <p className="text-xs font-bold text-slate-500 mt-1">Available Caregivers</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-600 font-bold">Live</span>
          </div>
        </motion.div>
        <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}
          className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 bg-gradient-to-br from-amber-400 to-orange-500 -mr-6 -mt-6" />
          <div className="text-3xl font-extrabold text-slate-900">{loading ? '—' : elders.length}</div>
          <p className="text-xs font-bold text-slate-500 mt-1">Registered Elders</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] text-amber-600 font-bold">Live</span>
          </div>
        </motion.div>
        <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp}
          className="bg-white rounded-2xl border border-slate-100 shadow-lg p-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 bg-gradient-to-br from-violet-400 to-purple-500 -mr-6 -mt-6" />
          <div className="text-3xl font-extrabold text-slate-900">{loading ? '—' : caregivers.length + elders.length}</div>
          <p className="text-xs font-bold text-slate-500 mt-1">Total Profiles</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <Sparkles className="h-3 w-3 text-violet-400" />
            <span className="text-[10px] text-violet-600 font-bold">All Verified</span>
          </div>
        </motion.div>
      </div>

      {/* ── Tab Switcher ── */}
      <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}
        className="bg-white rounded-2xl border border-slate-100 shadow-lg p-1.5 flex gap-1.5">
        <button
          onClick={() => setTab('caregivers')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-bold transition-all ${
            tab === 'caregivers'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}>
          <HeartHandshake className="h-4 w-4" />
          Available Caregivers
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${tab === 'caregivers' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {caregivers.length}
          </span>
        </button>
        <button
          onClick={() => setTab('elders')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl text-sm font-bold transition-all ${
            tab === 'elders'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}>
          <Users className="h-4 w-4" />
          Registered Elders
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${tab === 'elders' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {elders.length}
          </span>
        </button>
      </motion.div>

      {/* ── Search & Filters ── */}
      <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'caregivers' ? 'Search by name, village, city...' : 'Search elders by name or location...'}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 outline-none transition-all text-sm shadow-sm"
            />
          </div>
          {tab === 'caregivers' && (
            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold border transition-all shadow-sm ${
                showFilters
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}>
              <Filter className="h-4 w-4" />
              Filter
            </button>
          )}
        </div>

        {showFilters && tab === 'caregivers' && (
          <div className="flex flex-wrap gap-2 bg-white rounded-xl border border-slate-100 p-4 shadow-sm animate-in slide-in-from-top-4 duration-300">
            {SKILL_FILTERS.map(s => (
              <button key={s} onClick={() => setSkillFilter(s)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  skillFilter === s
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'
                }`}>
                {s}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Caregivers Grid ── */}
      {tab === 'caregivers' && (
        <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse overflow-hidden">
                  <div className="h-44 bg-slate-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCaregivers.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <HeartHandshake className="h-16 w-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-600 mb-2">No caregivers found</h3>
              <p className="text-sm text-slate-400 mb-6">
                {search || skillFilter !== 'All' ? 'Try different search or filters' : 'Be the first to create a caregiver profile!'}
              </p>
              <Link href="/dashboard/elder-care/register-caregiver"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-200 hover:scale-105 transition-transform">
                <UserPlus className="h-4 w-4" /> Become a Caregiver
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredCaregivers.map((cg, i) => (
                <motion.div key={cg.id} custom={i % 6} initial="hidden" animate="visible" variants={fadeUp}
                  onClick={() => openModal(cg, 'caregivers')}
                  className="group bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100/50 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-200 transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden">

                  {/* Card Top */}
                  <div className="relative h-44 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center overflow-hidden">
                    {cg.photo_url ? (
                      <img src={cg.photo_url} alt={cg.full_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl">
                        <span className="text-4xl">👩‍⚕️</span>
                      </div>
                    )}
                    {/* Available badge */}
                    <span className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Available
                    </span>
                    {/* Rating */}
                    {cg.rating && cg.rating > 0 && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full">
                        <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-white text-xs font-bold">{cg.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-emerald-700 transition-colors">
                        {cg.full_name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{cg.village}{cg.city ? `, ${cg.city}` : ''}</span>
                      </div>
                    </div>

                    {/* Skills */}
                    {cg.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {cg.skills.slice(0, 3).map((s, idx) => (
                          <span key={idx} className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                            {s}
                          </span>
                        ))}
                        {cg.skills.length > 3 && (
                          <span className="text-[10px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                            +{cg.skills.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                      <div className="text-center">
                        <p className="text-xs font-extrabold text-slate-800">{cg.experience_years}y</p>
                        <p className="text-[9px] text-slate-400 font-semibold">Experience</p>
                      </div>
                      <div className="text-center border-x border-slate-100">
                        <p className="text-xs font-extrabold text-slate-800">₹{cg.salary_expectation > 0 ? (cg.salary_expectation >= 1000 ? `${(cg.salary_expectation / 1000).toFixed(0)}k` : cg.salary_expectation) : 'Negotiable'}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">Per Month</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-extrabold text-slate-800">{cg.languages?.length || 0}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">Languages</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {cg.languages?.slice(0, 2).map((l, idx) => (
                          <span key={idx} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                            {l}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-emerald-600 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        View Profile <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Elders Grid ── */}
      {tab === 'elders' && (
        <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse h-48" />
              ))}
            </div>
          ) : filteredElders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <Users className="h-16 w-16 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-600 mb-2">No elders found</h3>
              <p className="text-sm text-slate-400 mb-6">
                {search ? 'Try a different search term' : 'Register your elderly family member to get started!'}
              </p>
              <Link href="/dashboard/elder-care/register-elder"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-200 hover:scale-105 transition-transform">
                <Plus className="h-4 w-4" /> Register Elder
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredElders.map((elder, i) => (
                <motion.div key={elder.id} custom={i % 6} initial="hidden" animate="visible" variants={fadeUp}
                  onClick={() => openModal(elder, 'elders')}
                  className="group bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100/50 hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-200 transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden">

                  <div className="relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-6 flex items-center gap-4">
                    {elder.photo_url ? (
                      <img src={elder.photo_url} alt={elder.full_name}
                        className="h-16 w-16 rounded-2xl object-cover border-2 border-amber-200 flex-shrink-0" />
                    ) : (
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-200 to-orange-200 border-2 border-amber-300 flex items-center justify-center flex-shrink-0 text-3xl">
                        👴
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-slate-800 text-base truncate group-hover:text-amber-700 transition-colors">
                        {elder.full_name}
                      </h3>
                      <p className="text-sm text-slate-500">{elder.age} years old</p>
                      <div className="flex items-center gap-1 mt-1 text-slate-400 text-xs">
                        <MapPin className="h-3 w-3 text-amber-400" />
                        <span className="truncate">{elder.address}</span>
                      </div>
                    </div>
                    {/* Needs caregiver badge */}
                    <span className="absolute top-3 right-3 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200">
                      Needs Care
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    {/* Conditions */}
                    {elder.conditions?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Health Conditions</p>
                        <div className="flex flex-wrap gap-1.5">
                          {elder.conditions.slice(0, 4).map((c, idx) => (
                            <span key={idx} className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      {elder.budget_per_month && elder.budget_per_month > 0 ? (
                        <span className="flex items-center gap-1 text-sm font-bold text-emerald-600">
                          <IndianRupee className="h-3.5 w-3.5" /> {elder.budget_per_month}/mo budget
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Budget negotiable</span>
                      )}
                      <span className="text-xs text-amber-600 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                        View Details <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <Link href={`/dashboard/elder-care/matches?elder=${elder.id}`}
                      onClick={e => e.stopPropagation()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-xl hover:scale-[1.02] transition-transform shadow-md shadow-orange-200">
                      <HeartHandshake className="h-4 w-4" /> Match Caregiver
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── CTA Banner ── */}
      <motion.div custom={8} initial="hidden" animate="visible" variants={fadeUp}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(52,211,153,0.1),transparent)]" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-xl font-extrabold mb-1">Don't see who you need?</h3>
            <p className="text-slate-400 text-sm">Register a profile and it appears instantly in this directory for everyone to see.</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/dashboard/elder-care/register-elder"
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-500/30 hover:scale-105 transition-transform">
              <Plus className="h-4 w-4" /> Add Elder
            </Link>
            <Link href="/dashboard/elder-care/register-caregiver"
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform">
              <UserPlus className="h-4 w-4" /> Join as Caregiver
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Caregiver Detail Modal ── */}
      {selected && selectedType === 'caregivers' && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative h-52 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center overflow-hidden">
              {(selected as Caregiver).photo_url ? (
                <img src={(selected as Caregiver).photo_url} alt={(selected as Caregiver).full_name}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl text-5xl">
                  👩‍⚕️
                </div>
              )}
              <button onClick={() => setSelected(null)}
                className="absolute top-4 right-4 bg-white/90 backdrop-blur-md hover:bg-white rounded-full p-2 shadow-lg transition">
                <X className="h-5 w-5 text-slate-700" />
              </button>
              <span className="absolute top-4 left-4 bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Available
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{(selected as Caregiver).full_name}</h2>
                <div className="flex items-center gap-2 mt-1 text-slate-500 text-sm">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <span>{(selected as Caregiver).village}{(selected as Caregiver).city ? `, ${(selected as Caregiver).city}` : ''}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-emerald-700">{(selected as Caregiver).experience_years}y</div>
                  <p className="text-xs text-emerald-500 mt-0.5">Experience</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-blue-700">₹{(selected as Caregiver).salary_expectation > 0 ? `${(selected as Caregiver).salary_expectation.toLocaleString()}` : 'Neg.'}</div>
                  <p className="text-xs text-blue-500 mt-0.5">Per Month</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-amber-700">{(selected as Caregiver).rating?.toFixed(1) || '—'}</div>
                  <p className="text-xs text-amber-500 mt-0.5">Rating</p>
                </div>
              </div>

              {/* Skills */}
              {(selected as Caregiver).skills?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-500" /> Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(selected as Caregiver).skills.map((s, idx) => (
                      <span key={idx} className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {(selected as Caregiver).languages?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-500" /> Languages
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(selected as Caregiver).languages.map((l, idx) => (
                      <span key={idx} className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-100">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability */}
              {(selected as Caregiver).availability && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-violet-500" /> Availability
                  </h4>
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-sm">
                    {(selected as Caregiver).availability?.days && (
                      <p className="text-slate-600"><span className="font-bold">Days:</span> {((selected as Caregiver).availability?.days || []).join(', ')}</p>
                    )}
                    {(selected as Caregiver).availability?.timing && (
                      <p className="text-slate-600 mt-1"><span className="font-bold">Timing:</span> {(selected as Caregiver).availability?.timing}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Bio */}
              {(selected as Caregiver).bio && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-1">About</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{(selected as Caregiver).bio}</p>
                </div>
              )}

              <button
                onClick={() => {
                  setSelected(null);
                  // Show success notification via react-hot-toast
                  import('react-hot-toast').then(({ default: toast }) => {
                    toast.success(
                      '✅ Hire request sent! Please check your email & phone messages for confirmation and next steps.',
                      { duration: 6000, style: { maxWidth: '380px' } }
                    );
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black rounded-xl shadow-lg shadow-emerald-200 hover:scale-[1.02] transition-transform">
                <HeartHandshake className="h-4 w-4" /> Hire This Caregiver
              </button>
              <button onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Elder Detail Modal ── */}
      {selected && selectedType === 'elders' && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 p-8 flex items-center gap-5">
              {(selected as Elder).photo_url ? (
                <img src={(selected as Elder).photo_url} alt={(selected as Elder).full_name}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-amber-200 flex-shrink-0" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-200 to-orange-200 border-2 border-amber-300 flex items-center justify-center flex-shrink-0 text-4xl">
                  👴
                </div>
              )}
              <div>
                <h2 className="text-2xl font-black text-slate-900">{(selected as Elder).full_name}</h2>
                <p className="text-slate-500">{(selected as Elder).age} years old</p>
                <div className="flex items-center gap-1.5 mt-1 text-slate-400 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" />
                  <span>{(selected as Elder).address}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="absolute top-4 right-4 bg-white/90 backdrop-blur-md hover:bg-white rounded-full p-2 shadow-lg transition">
                <X className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Conditions */}
              {(selected as Elder).conditions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-rose-500" /> Health Conditions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(selected as Elder).conditions.map((c, idx) => (
                      <span key={idx} className="text-xs font-bold bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full border border-rose-100">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget */}
              {(selected as Elder).budget_per_month && (selected as Elder).budget_per_month! > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-emerald-600" />
                    <span className="text-lg font-bold text-emerald-700">
                      ₹{(selected as Elder).budget_per_month!.toLocaleString()}/month budget
                    </span>
                  </div>
                  <p className="text-xs text-emerald-500 mt-0.5">Family's caregiver budget</p>
                </div>
              )}

              {/* Special Notes */}
              {(selected as Elder).special_notes && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-1">Special Notes</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{(selected as Elder).special_notes}</p>
                </div>
              )}

              <Link href={`/dashboard/elder-care/matches?elder=${(selected as Elder).id}`}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl shadow-lg shadow-orange-200 hover:scale-[1.02] transition-transform">
                <HeartHandshake className="h-4 w-4" /> Find a Caregiver
              </Link>
              <button onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
