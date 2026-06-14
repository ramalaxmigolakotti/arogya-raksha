'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { motion, type Variants } from 'framer-motion';
import {
  HeartHandshake, MapPin, Star, Loader2, ChevronLeft,
  Check, X, Clock, Globe, Banknote, Briefcase, RefreshCw,
  Users, AlertCircle, Zap
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Caregiver {
  id: string;
  full_name: string;
  photo_url?: string;
  village: string;
  city: string;
  skills: string[];
  languages: string[];
  experience_years: number;
  salary_expectation: number;
  rating: number;
  bio?: string;
  match_score?: number;
  distance_km?: number;
  availability?: { days?: string[]; timing?: string };
}

interface Match {
  id: string;
  match_score: number;
  distance_km: number;
  status: string;
  caregiver: Caregiver;
}

interface Elder {
  id: string;
  full_name: string;
  age: number;
  conditions: string[];
  city: string;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
  }),
};

export default function MatchesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const elderId = searchParams.get('elder');

  const [elder, setElder] = useState<Elder | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [hiring, setHiring] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [hired, setHired] = useState<string | null>(null);

  const loadElder = useCallback(async () => {
    if (!elderId) return;
    const res = await fetch(`${API}/api/elder-care/elders/${elderId}`, {
      headers: { 'x-user-id': user?.id || '' },
    });
    const data = await res.json();
    if (data.success) setElder(data.elder);
  }, [elderId, user?.id]);

  const loadMatches = useCallback(async () => {
    if (!elderId) return;
    const res = await fetch(`${API}/api/elder-care/matches/${elderId}`, {
      headers: { 'x-user-id': user?.id || '' },
    });
    const data = await res.json();
    if (data.success) {
      setMatches(data.matches || []);
      const h = data.matches?.find((m: Match) => m.status === 'hired');
      if (h) setHired(h.id);
    }
  }, [elderId, user?.id]);

  const runMatch = async () => {
    if (!elderId) return;
    setRunning(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/elder-care/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ elder_id: elderId, radius_km: 20 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      await loadMatches();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const hireCaregiver = async (matchId: string) => {
    setHiring(matchId);
    try {
      const res = await fetch(`${API}/api/elder-care/matches/${matchId}/hire`, {
        method: 'PUT',
        headers: { 'x-user-id': user?.id || '' },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setHired(matchId);

      // --- Notify Caregiver ---
      const match = matches.find(m => m.id === matchId);
      if (match && match.caregiver) {
        try {
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'caregiver@example.com', // In a real app, this would be match.caregiver.email
              phone: '+919876543210', // match.caregiver.phone
              channel: 'both',
              subject: 'Congratulations! You have been hired - Arogya Raksha',
              message: `Hi ${match.caregiver.full_name}, congratulations! You have been selected and hired to provide elder care for ${elder?.full_name || 'a client'}. Please check your dashboard for next steps.`
            })
          });
        } catch (e) {
          console.error('Failed to notify caregiver', e);
        }
      }
      
      await loadMatches();
      setTimeout(() => router.push(`/dashboard/elder-care/${elderId}`), 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setHiring(null);
    }
  };

  const updateStatus = async (matchId: string, status: string) => {
    await fetch(`${API}/api/elder-care/matches/${matchId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
      body: JSON.stringify({ status }),
    });
    await loadMatches();
  };

  useEffect(() => {
    Promise.all([loadElder(), loadMatches()]).finally(() => setLoading(false));
  }, [loadElder, loadMatches]);

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const scoreLabel = (score: number) => {
    if (score >= 80) return '🔥 Excellent';
    if (score >= 60) return '✅ Good';
    return '⚪ Fair';
  };

  if (!elderId) {
    return (
      <div className="max-w-2xl mx-auto pt-16 text-center">
        <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <p className="text-slate-600 font-bold">No elder selected. Go back and try again.</p>
        <button onClick={() => router.back()} className="mt-4 text-orange-600 font-bold hover:underline">← Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-slate-900">Smart Caregiver Matches</h1>
          {elder && (
            <p className="text-sm text-slate-500 mt-0.5">
              Finding the best caregivers for <span className="font-bold text-orange-600">{elder.full_name}</span>,
              {elder.age} yrs • {elder.city}
            </p>
          )}
        </div>
        <button onClick={runMatch} disabled={running}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-200 hover:scale-105 transition-transform disabled:opacity-60 disabled:scale-100">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {running ? 'Matching...' : 'Run Match'}
        </button>
      </div>

      {/* Elder conditions */}
      {(elder?.conditions?.length ?? 0) > 0 && elder && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 my-auto">Needs:</span>
          {elder.conditions.map((c, i) => (
            <span key={i} className="text-xs font-bold bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-100">
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Hired Success Banner */}
      {hired && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Check className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-emerald-800">Caregiver Hired Successfully!</p>
            <p className="text-sm text-emerald-600">Redirecting to elder profile...</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse h-36" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <HeartHandshake className="h-12 w-12 text-orange-200 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 mb-1">No matches yet</h3>
          <p className="text-sm text-slate-400 mb-6">Click "Run Match" to find the best caregivers based on distance, skills and budget.</p>
          <button onClick={runMatch} disabled={running}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl shadow-lg hover:scale-105 transition-transform disabled:opacity-60">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {running ? 'Running AI Match...' : 'Find Caregivers'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {matches
            .filter(m => m.status !== 'rejected')
            .map((match, i) => {
              const cg = match.caregiver;
              const isHired = match.status === 'hired';
              const isThisHired = hired === match.id;
              return (
                <motion.div key={match.id} custom={i} initial="hidden" animate="visible" variants={fadeUp}
                  className={`bg-white rounded-2xl border shadow-lg transition-all ${
                    isHired ? 'border-emerald-300 shadow-emerald-100' : 'border-slate-100 hover:shadow-xl'
                  }`}>
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Photo */}
                      {cg?.photo_url ? (
                        <img src={cg.photo_url} alt={cg.full_name}
                          className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-100 flex-shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-2xl flex-shrink-0">
                          👩‍⚕️
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-extrabold text-slate-800 text-base">{cg?.full_name}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {cg?.village}, {cg?.city} •
                              <span className="font-bold text-slate-600">
                                {match.distance_km?.toFixed(1)} km away
                              </span>
                            </p>
                          </div>

                          {/* Match Score */}
                          <div className={`flex-shrink-0 px-3 py-1.5 rounded-xl border text-sm font-black ${scoreColor(match.match_score)}`}>
                            {match.match_score}% {scoreLabel(match.match_score)}
                          </div>
                        </div>

                        {/* Bio */}
                        {cg?.bio && (
                          <p className="text-sm text-slate-500 mt-2 line-clamp-2">{cg.bio}</p>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {cg?.skills?.slice(0, 3).map((s, idx) => (
                            <span key={idx} className="text-[11px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                              {s}
                            </span>
                          ))}
                          {cg?.skills?.length > 3 && (
                            <span className="text-[11px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                              +{cg.skills.length - 3} more
                            </span>
                          )}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 mt-3">
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Briefcase className="h-3.5 w-3.5" />
                            {cg?.experience_years || 0} yrs exp
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Globe className="h-3.5 w-3.5" />
                            {cg?.languages?.join(', ')}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <Banknote className="h-3.5 w-3.5" />
                            ₹{cg?.salary_expectation?.toLocaleString()}/mo
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                      {isHired ? (
                        <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 font-black text-sm rounded-xl border border-emerald-200">
                          <Check className="h-4 w-4" /> Hired — Active Caregiver
                        </div>
                      ) : hired ? (
                        <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-400 font-bold text-sm rounded-xl border border-slate-100">
                          Another caregiver hired
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => hireCaregiver(match.id)}
                            disabled={hiring === match.id}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm rounded-xl shadow-md shadow-orange-100 hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:scale-100">
                            {hiring === match.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartHandshake className="h-4 w-4" />}
                            {hiring === match.id ? 'Hiring...' : 'Hire Caregiver'}
                          </button>
                          {match.status !== 'shortlisted' && (
                            <button
                              onClick={() => updateStatus(match.id, 'shortlisted')}
                              className="px-4 py-2.5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-100 transition-colors">
                              Shortlist
                            </button>
                          )}
                          <button
                            onClick={() => updateStatus(match.id, 'rejected')}
                            className="px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-xl border border-slate-100 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}
    </div>
  );
}
