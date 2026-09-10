'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart, Brain, Droplets, Activity, AlertTriangle,
  ChevronRight, Loader2, ShieldCheck, TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useUserRole } from '@/context/UserRoleContext';

interface RiskScore {
  id: string;
  label: string;
  risk: number;       // 0–100
  level: 'low' | 'moderate' | 'high';
  icon: any;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  insight: string;
}

const RISK_DISPLAY: Record<string, Omit<RiskScore, 'id' | 'risk' | 'level' | 'insight'>> = {
  'diabetes-heart': {
    label:        'Diabetes & Heart',
    icon:         Heart,
    color:        'text-rose-600',
    gradientFrom: 'from-rose-500',
    gradientTo:   'to-red-600',
  },
  kidney: {
    label:        'Kidney Health',
    icon:         Droplets,
    color:        'text-blue-600',
    gradientFrom: 'from-blue-500',
    gradientTo:   'to-indigo-600',
  },
  mental_health: {
    label:        'Mental Health',
    icon:         Brain,
    color:        'text-violet-600',
    gradientFrom: 'from-violet-500',
    gradientTo:   'to-purple-600',
  },
};

function getRiskLevel(score: number): 'low' | 'moderate' | 'high' {
  if (score < 35) return 'low';
  if (score < 65) return 'moderate';
  return 'high';
}

const LEVEL_CONFIG = {
  low:      { color: 'text-emerald-600', bg: 'bg-emerald-500', track: 'bg-emerald-100', badge: 'bg-emerald-100 text-emerald-700', label: 'Low Risk' },
  moderate: { color: 'text-amber-600',   bg: 'bg-amber-500',   track: 'bg-amber-100',   badge: 'bg-amber-100 text-amber-700',   label: 'Moderate' },
  high:     { color: 'text-rose-600',    bg: 'bg-rose-500',    track: 'bg-rose-100',     badge: 'bg-rose-100 text-rose-700',     label: 'High Risk' },
};

// Estimate risk from medical profile fields (no API call needed for quick card)
function estimateRisks(profile: any): RiskScore[] {
  const age     = parseInt(profile?.age || '35');
  const bmi     = parseFloat(profile?.bmi || profile?.weight && profile?.height
    ? ((profile.weight / ((profile.height / 100) ** 2))).toFixed(1) : '23');
  const glucose = parseFloat(profile?.glucoseLevel || profile?.bloodSugar || '95');
  const bp      = parseInt(profile?.bloodPressure?.split('/')?.[0] || profile?.systolic || '120');
  const smokes  = (profile?.smoking === 'Yes' || profile?.smoking === 'Daily');
  const diabetic= profile?.diabetes === 'Yes' || profile?.chronicConditions?.includes('Diabetes');

  // Simple heuristic risk estimates (0–100)
  const diabRisk = Math.min(100, Math.round(
    (age > 45 ? 20 : age > 35 ? 10 : 5) +
    (bmi > 30 ? 25 : bmi > 25 ? 15 : 0) +
    (glucose > 126 ? 30 : glucose > 100 ? 15 : 0) +
    (bp > 140 ? 15 : bp > 130 ? 8 : 0) +
    (smokes ? 10 : 0)
  ));

  const kidneyRisk = Math.min(100, Math.round(
    (age > 60 ? 20 : age > 45 ? 10 : 5) +
    (diabetic ? 25 : 0) +
    (bp > 140 ? 20 : bp > 130 ? 10 : 0) +
    (bmi > 30 ? 10 : 0)
  ));

  const mentalRisk = Math.min(100, Math.round(
    (profile?.stressLevel === 'High' ? 30 : profile?.stressLevel === 'Medium' ? 15 : 5) +
    (profile?.sleepHours < 6 ? 20 : profile?.sleepHours < 7 ? 10 : 0) +
    (age > 50 ? 10 : 0)
  ));

  const scores = [
    { id: 'diabetes-heart', risk: diabRisk,    insight: diabRisk > 50   ? 'Monitor glucose & BP regularly' : 'Maintain active lifestyle' },
    { id: 'kidney',         risk: kidneyRisk,  insight: kidneyRisk > 50 ? 'Stay hydrated, limit salt'      : 'Kidney function looks good' },
    { id: 'mental_health',  risk: mentalRisk,  insight: mentalRisk > 50 ? 'Consider stress management'     : 'Mental wellness is stable' },
  ];

  return scores
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 3)
    .map(s => ({
      ...s,
      level: getRiskLevel(s.risk),
      ...RISK_DISPLAY[s.id],
    }));
}

export default function PersonalRiskCard() {
  const { user } = useUserRole();
  const [risks, setRisks]   = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    // Read medical profile from user-scoped localStorage
    try {
      const userProfileKey = user?.id ? `arogya_medical_profile_${user.id}` : 'arogya_medical_profile';
      const raw = localStorage.getItem(userProfileKey);
      const profile = raw ? JSON.parse(raw) : null;
      if (profile && (profile.age || profile.weight || profile.glucoseLevel || profile.bp_systolic)) {
        setHasProfile(true);
        setRisks(estimateRisks(profile));
      } else {
        // No profile — show placeholder scores
        setHasProfile(false);
        setRisks([
          { id: 'diabetes-heart', label: 'Diabetes & Heart', risk: 0, level: 'low', icon: Heart,    color: 'text-rose-600',   gradientFrom: 'from-rose-500',   gradientTo: 'to-red-600',    insight: 'Complete your profile for personalized risk' },
          { id: 'kidney',         label: 'Kidney Health',   risk: 0, level: 'low', icon: Droplets,  color: 'text-blue-600',   gradientFrom: 'from-blue-500',   gradientTo: 'to-indigo-600', insight: 'Complete your profile for personalized risk' },
          { id: 'mental_health',  label: 'Mental Health',  risk: 0, level: 'low', icon: Brain,     color: 'text-violet-600', gradientFrom: 'from-violet-500', gradientTo: 'to-purple-600', insight: 'Complete your profile for personalized risk' },
        ]);
      }
    } catch {
      setRisks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const overallRisk = risks.length ? Math.round(risks.reduce((s, r) => s + r.risk, 0) / risks.length) : 0;
  const overallLevel = getRiskLevel(overallRisk);
  const overallCfg   = LEVEL_CONFIG[overallLevel];

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-slate-100 rounded-xl w-48 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/40 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 rounded-xl">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">Personal Health Risk</h3>
            <p className="text-xs text-slate-400 font-medium">
              {hasProfile ? 'Based on your medical profile' : 'Complete your profile for accurate scores'}
            </p>
          </div>
        </div>

        {hasProfile && (
          <div className="text-center">
            <div className={`text-2xl font-black ${overallCfg.color}`}>{overallRisk}%</div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${overallCfg.badge}`}>Overall</span>
          </div>
        )}
      </div>

      {/* Risk Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {risks.map((r, i) => {
          const cfg  = LEVEL_CONFIG[r.level];
          const Icon = r.icon;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-slate-50 rounded-2xl p-4 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${r.color}`} />
                  <span className="text-xs font-bold text-slate-700">{r.label}</span>
                </div>
                {hasProfile && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                )}
              </div>

              {/* Risk meter bar */}
              {hasProfile ? (
                <div className="mb-2">
                  <div className={`h-2 rounded-full ${cfg.track} overflow-hidden`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.risk}%` }}
                      transition={{ duration: 1, delay: i * 0.15, ease: 'easeOut' }}
                      className={`h-full rounded-full bg-gradient-to-r ${r.gradientFrom} ${r.gradientTo}`}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">0</span>
                    <span className={`text-xs font-black ${cfg.color}`}>{r.risk}%</span>
                    <span className="text-xs text-slate-400">100</span>
                  </div>
                </div>
              ) : (
                <div className="h-2 rounded-full bg-slate-200 mb-2" />
              )}

              <p className="text-xs text-slate-500 leading-snug">{r.insight}</p>
            </motion.div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        {!hasProfile && (
          <Link href="/dashboard/profile"
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold rounded-xl text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Complete Profile
          </Link>
        )}
        <Link href="/dashboard/predictors"
          className={`py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            hasProfile ? 'flex-1 bg-slate-900 hover:bg-slate-800 text-white' : 'flex-none px-4 bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}>
          <TrendingUp className="h-4 w-4" />
          {hasProfile ? 'Full Health Analysis' : 'View Predictors'}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
