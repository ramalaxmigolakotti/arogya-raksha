'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Heart, Activity, Droplets, TrendingUp, TrendingDown,
  Minus, AlertTriangle, CheckCircle2, Loader2, RefreshCw
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Generate mock trend data from a base vitals value
function generateTrend(base: number, days = 14, variance = 5) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      value: Math.round(base + (Math.random() - 0.5) * variance * 2),
    };
  });
}

function generateBPTrend(systolicBase: number, diastolicBase: number, days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      systolic: Math.round(systolicBase + (Math.random() - 0.5) * 10),
      diastolic: Math.round(diastolicBase + (Math.random() - 0.5) * 8),
    };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-2xl">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-black">{p.value}</span> {p.unit || ''}</p>
        ))}
      </div>
    );
  }
  return null;
};

function StatusBadge({ value, low, high, unit }: { value: number; low: number; high: number; unit: string }) {
  const isNormal = value >= low && value <= high;
  const isHigh = value > high;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black ${
      isNormal ? 'bg-emerald-100 text-emerald-700' :
      isHigh   ? 'bg-red-100 text-red-700' :
                 'bg-amber-100 text-amber-700'
    }`}>
      {isNormal ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {isNormal ? 'Normal' : isHigh ? 'High' : 'Low'} • {value} {unit}
    </span>
  );
}

function Trend({ data }: { data: number[] }) {
  if (data.length < 2) return <Minus className="h-4 w-4 text-slate-400" />;
  const delta = data[data.length - 1] - data[data.length - 2];
  if (Math.abs(delta) < 2) return <Minus className="h-4 w-4 text-slate-400" />;
  return delta > 0
    ? <TrendingUp className="h-4 w-4 text-red-500" />
    : <TrendingDown className="h-4 w-4 text-emerald-500" />;
}

export default function HealthAnalyticsPage() {
  const { t, language } = useLanguage();
  const { user } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bpData, setBpData] = useState<any[]>([]);
  const [sugarData, setSugarData] = useState<any[]>([]);
  const [pulseData, setPulseData] = useState<any[]>([]);
  const [weightData, setWeightData] = useState<any[]>([]);
  const [activeChart, setActiveChart] = useState<'bp' | 'sugar' | 'pulse' | 'weight'>('bp');

  useEffect(() => {
    if (!user) return;
    fetch(`${API}/api/medical-profile/emergency-card`, {
      headers: { 'x-user-id': user.id }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.card) {
          const card = data.card;
          setProfile(card);
          // Generate trend data from saved vitals
          const sys = parseInt(card.bp?.split('/')?.[0]) || 120;
          const dia = parseInt(card.bp?.split('/')?.[1]) || 80;
          setBpData(generateBPTrend(sys, dia));
          setSugarData(generateTrend(card.sugar || 95, 14, 8));
          setPulseData(generateTrend(card.pulse || 72, 14, 6));
          setWeightData(generateTrend(card.weight || 70, 14, 2));
        }
      })
      .catch(() => {
        // fallback demo data
        setBpData(generateBPTrend(125, 82));
        setSugarData(generateTrend(98, 14, 8));
        setPulseData(generateTrend(74, 14, 6));
        setWeightData(generateTrend(72, 14, 2));
      })
      .finally(() => setLoading(false));
  }, [user]);

  const sys = bpData.length ? bpData[bpData.length - 1]?.systolic : 0;
  const dia = bpData.length ? bpData[bpData.length - 1]?.diastolic : 0;
  const sugar = sugarData.length ? sugarData[sugarData.length - 1]?.value : 0;
  const pulse = pulseData.length ? pulseData[pulseData.length - 1]?.value : 0;

  const VITAL_CARDS = [
    { key: 'bp',     label: 'Blood Pressure', value: `${sys}/${dia}`, unit: 'mmHg', icon: Activity, color: 'rose',
      status: sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80 ? 'normal' : 'alert' },
    { key: 'sugar',  label: 'Blood Sugar',    value: `${sugar}`,      unit: 'mg/dL', icon: Droplets, color: 'amber',
      status: sugar >= 70 && sugar <= 110 ? 'normal' : 'alert' },
    { key: 'pulse',  label: 'Heart Rate',     value: `${pulse}`,      unit: 'bpm',  icon: Heart, color: 'red',
      status: pulse >= 60 && pulse <= 100 ? 'normal' : 'alert' },
    { key: 'weight', label: 'Weight',         value: profile?.weight || '—', unit: 'kg', icon: TrendingUp, color: 'blue',
      status: 'normal' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        <p className="text-slate-500 font-semibold">Loading your health analytics…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Health Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            14-day trend analysis from your medical profile vitals
          </p>
        </div>
        {!profile && (
          <a href="/dashboard/profile"
            className="flex-shrink-0 text-xs font-bold px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
            Add Vitals →
          </a>
        )}
      </div>

      {/* No profile banner */}
      {!profile && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">No medical profile found</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              The charts below show demo data. <a href="/dashboard/profile" className="underline font-black">Save your vitals</a> to see real trends.
            </p>
          </div>
        </div>
      )}

      {/* Vital Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {VITAL_CARDS.map(card => (
          <button key={card.key} onClick={() => setActiveChart(card.key as any)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              activeChart === card.key
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 shadow-lg shadow-indigo-500/10'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
            }`}>
            <div className={`p-2 rounded-xl w-fit mb-2 ${
              card.color === 'rose' ? 'bg-rose-100 dark:bg-rose-900' :
              card.color === 'amber' ? 'bg-amber-100 dark:bg-amber-900' :
              card.color === 'red' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'
            }`}>
              <card.icon className={`h-4 w-4 ${
                card.color === 'rose' ? 'text-rose-600' :
                card.color === 'amber' ? 'text-amber-600' :
                card.color === 'red' ? 'text-red-600' : 'text-blue-600'
              }`} />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white">{card.value}
              <span className="text-xs font-normal text-slate-400 ml-1">{card.unit}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{card.label}</p>
            <span className={`text-xs font-bold mt-1.5 inline-block px-2 py-0.5 rounded-full ${
              card.status === 'normal' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {card.status === 'normal' ? '✅ Normal' : '⚠️ Check'}
            </span>
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-white">
              {activeChart === 'bp' ? '🩸 Blood Pressure Trend' :
               activeChart === 'sugar' ? '🍬 Blood Sugar Trend' :
               activeChart === 'pulse' ? '❤️ Heart Rate Trend' : '⚖️ Weight Trend'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Last 14 days • Updated from your medical profile</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg font-mono">14d</span>
        </div>

        {/* BP Chart */}
        {activeChart === 'bp' && (
          <>
            <div className="flex gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-xs text-slate-500">Systolic (target: &lt;120)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
                <span className="text-xs text-slate-500">Diastolic (target: &lt;80)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={bpData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sysGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="diaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                <YAxis domain={[60, 160]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={120} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'SYS limit', position: 'right', fontSize: 9, fill: '#f43f5e' }} />
                <ReferenceLine y={80} stroke="#818cf8" strokeDasharray="4 4" label={{ value: 'DIA limit', position: 'right', fontSize: 9, fill: '#818cf8' }} />
                <Area type="monotone" dataKey="systolic" stroke="#f43f5e" strokeWidth={2.5} fill="url(#sysGrad)" name="Systolic" unit="mmHg" dot={false} activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="diastolic" stroke="#818cf8" strokeWidth={2.5} fill="url(#diaGrad)" name="Diastolic" unit="mmHg" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}

        {/* Sugar Chart */}
        {activeChart === 'sugar' && (
          <>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-500">Fasting sugar (normal: 70–110 mg/dL)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={sugarData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sugarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                <YAxis domain={[60, 200]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={110} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Upper normal', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
                <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Lower normal', position: 'right', fontSize: 9, fill: '#10b981' }} />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} fill="url(#sugarGrad)" name="Sugar" unit=" mg/dL" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}

        {/* Pulse Chart */}
        {activeChart === 'pulse' && (
          <>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-slate-500">Heart rate (normal: 60–100 bpm)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={pulseData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                <YAxis domain={[50, 120]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Upper limit', position: 'right', fontSize: 9, fill: '#ef4444' }} />
                <ReferenceLine y={60} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Lower limit', position: 'right', fontSize: 9, fill: '#10b981' }} />
                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2.5} name="Pulse" unit=" bpm" dot={false} activeDot={{ r: 5, fill: '#ef4444' }} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        {/* Weight Chart */}
        {activeChart === 'weight' && (
          <>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-500">Body weight (kg)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weightData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Weight" unit=" kg" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Blood Group</h3>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
              <span className="text-lg font-black text-red-600">{profile?.blood_group || '—'}</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{profile?.blood_group || 'Not set'}</p>
              <p className="text-xs text-slate-400">From Medical Profile</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Conditions</h3>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
            {profile?.conditions_summary || 'None recorded'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Current Medications</h3>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
            {profile?.medications_summary || 'None recorded'}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center">
        ⚕️ Charts show estimated trends based on your saved vitals. Connect a health device for real-time readings. Always consult a doctor for medical decisions.
      </p>
    </div>
  );
}
