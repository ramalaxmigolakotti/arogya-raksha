'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { cachedFetch } from '@/lib/apiCache';
import { useUser } from '@clerk/nextjs';
import { Users, Search, ChevronRight, Activity, Plus } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.3 }
  }),
};

interface Patient {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  village_name: string;
  created_at: string;
}

export default function AshaPatientsDirectory() {
  const { user } = useUser();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await cachedFetch<any>(`${API}/api/asha/patients`, {
        headers: { 'x-user-id': user.id }
      }, 0); // No cache to ensure immediate updates
      if (res.success) setPatients(res.patients);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = patients.filter(p => 
    p.full_name.toLowerCase().includes(search.toLowerCase()) || 
    p.village_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-rose-500" /> Patient Directory
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage health records for your registered villagers.</p>
        </div>
        <Link href="/dashboard/asha/register" className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-rose-500/30 transition-all active:scale-95 text-sm w-fit">
          <Plus className="h-4 w-4" /> New Villager
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or village..." 
          className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all shadow-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 h-24 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-rose-300" />
          </div>
          <h3 className="font-bold text-slate-700 text-lg mb-1">No patients found</h3>
          <p className="text-slate-500 text-sm mb-6">Register a rural citizen to start tracking their vitals.</p>
          <Link href="/dashboard/asha/register" className="inline-flex items-center gap-2 bg-rose-100 text-rose-700 hover:bg-rose-200 px-5 py-2.5 rounded-xl font-bold transition-colors text-sm">
            <Plus className="h-4 w-4" /> Register Patient
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((patient, i) => (
            <motion.div key={patient.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}>
              <Link href={`/dashboard/asha/patients/${patient.id}`} className="block bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-rose-200 transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-50 to-pink-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg mb-0.5 group-hover:text-rose-600 transition-colors">{patient.full_name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{patient.age} yrs • {patient.gender}</p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600">
                      <Activity className="h-3.5 w-3.5 text-rose-400" /> Log Vitals
                    </div>
                  </div>
                  <div className="bg-slate-50 text-slate-500 group-hover:bg-rose-50 group-hover:text-rose-600 p-2 rounded-xl transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400 relative z-10">
                  <span className="truncate max-w-[150px]">📍 {patient.village_name}</span>
                  <span>Registered: {new Date(patient.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
