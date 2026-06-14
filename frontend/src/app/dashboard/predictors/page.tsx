'use client';

import { useState, useEffect } from 'react';
import {
  Heart, Brain, Activity, Stethoscope, ShieldCheck, AlertTriangle,
  ChevronRight, Loader2, ArrowLeft, CheckCircle2, TrendingUp,
  Droplets, Wind, Bone, Pill, Target, Zap, ThermometerSun
} from 'lucide-react';
import HealthcareCTA from '@/components/HealthcareCTA';
import { useLanguage } from '@/context/LanguageContext';

const PREDICTORS = [
  { id: 'diabetes-heart', label: 'Diabetes & Heart', icon: Heart, color: 'from-rose-500 to-red-600', bg: 'bg-rose-50', text: 'text-rose-600', emoji: '🩸' },
  { id: 'dengue', label: 'Dengue Fever', icon: ThermometerSun, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600', emoji: '🦟' },
  { id: 'kidney', label: 'Kidney Disease', icon: Droplets, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600', emoji: '🫘' },
  { id: 'liver', label: 'Liver Disease', icon: Pill, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', text: 'text-emerald-600', emoji: '🔬' },
  { id: 'lung', label: 'Lung Disease', icon: Wind, color: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-50', text: 'text-cyan-600', emoji: '🫁' },
  { id: 'cancer', label: 'Cancer Risk', icon: Target, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', text: 'text-purple-600', emoji: '🧬' },
  { id: 'thyroid', label: 'Thyroid Cancer', icon: Zap, color: 'from-pink-500 to-fuchsia-600', bg: 'bg-pink-50', text: 'text-pink-600', emoji: '🦋' },
  { id: 'asthma', label: 'Asthma Risk', icon: Activity, color: 'from-sky-500 to-blue-600', bg: 'bg-sky-50', text: 'text-sky-600', emoji: '💨' },
  { id: 'mental-health', label: 'Mental Health', icon: Brain, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600', emoji: '🧠' },
];

const PREDICTOR_TESTS: Record<string, { name: string; reason: string; price: number }[]> = {
  'diabetes-heart': [
    { name: 'HbA1c (Glycated Hemoglobin)', reason: 'Measures 3-month blood sugar average', price: 550 },
    { name: 'Lipid Profile', reason: 'Check cholesterol & triglycerides', price: 400 },
    { name: 'ECG', reason: 'Detect heart rhythm abnormalities', price: 250 },
    { name: 'Blood Sugar (Fasting)', reason: 'Diabetes screening', price: 100 },
  ],
  'dengue': [
    { name: 'Complete Blood Count (CBC)', reason: 'Check platelet count', price: 350 },
    { name: 'Dengue NS1 Antigen Test', reason: 'Early dengue detection', price: 500 },
    { name: 'Liver Function Test', reason: 'Monitor liver impact', price: 500 },
  ],
  'kidney': [
    { name: 'Kidney Function Test (KFT)', reason: 'Creatinine & urea levels', price: 450 },
    { name: 'Urine Analysis', reason: 'Check protein & glucose in urine', price: 200 },
    { name: 'Complete Blood Count', reason: 'Detect anemia from kidney disease', price: 350 },
  ],
  'liver': [
    { name: 'Liver Function Test (LFT)', reason: 'Enzymes, bilirubin, proteins', price: 500 },
    { name: 'Ultrasound (Abdomen)', reason: 'Liver imaging', price: 800 },
    { name: 'Complete Blood Count', reason: 'Detect complications', price: 350 },
  ],
  'lung': [
    { name: 'X-Ray (Chest)', reason: 'Lung imaging', price: 300 },
    { name: 'Pulmonary Function Test', reason: 'Measure lung capacity', price: 600 },
    { name: 'Complete Blood Count', reason: 'Check for infection', price: 350 },
  ],
  'cancer': [
    { name: 'Complete Blood Count (CBC)', reason: 'Detect abnormal cell counts', price: 350 },
    { name: 'Tumor Marker Panel', reason: 'Screen for cancer markers', price: 1200 },
    { name: 'Ultrasound', reason: 'Imaging for masses', price: 800 },
  ],
  'thyroid': [
    { name: 'Thyroid Profile (T3, T4, TSH)', reason: 'Complete thyroid function', price: 600 },
    { name: 'Ultrasound (Neck)', reason: 'Check thyroid nodules', price: 800 },
    { name: 'Fine Needle Biopsy', reason: 'If nodules detected', price: 1500 },
  ],
  'asthma': [
    { name: 'Pulmonary Function Test', reason: 'Measure airway obstruction', price: 600 },
    { name: 'X-Ray (Chest)', reason: 'Rule out other conditions', price: 300 },
    { name: 'Allergy Panel', reason: 'Identify allergen triggers', price: 900 },
  ],
  'mental-health': [
    { name: 'Thyroid Profile', reason: 'Thyroid issues mimic depression', price: 600 },
    { name: 'Vitamin D & B12 Panel', reason: 'Deficiency causes mood issues', price: 900 },
    { name: 'Complete Blood Count', reason: 'Rule out underlying conditions', price: 350 },
  ],
  'default': [
    { name: 'Essential Health Check', reason: 'Comprehensive health screening', price: 1499 },
    { name: 'Complete Blood Count', reason: 'Basic blood analysis', price: 350 },
  ],
};

// Animated circular gauge
function RiskGauge({ score, level }: { score: number; level: string }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const gaugeColor = score < 20 ? '#10b981' : score < 40 ? '#f59e0b' : score < 60 ? '#f97316' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-52 h-52">
        <svg className="w-52 h-52 -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          <circle cx="100" cy="100" r={radius} fill="none" stroke={gaugeColor} strokeWidth="12"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-[2000ms] ease-out" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-slate-800">{animatedScore}</span>
          <span className="text-sm font-bold text-slate-400">/ 100</span>
        </div>
      </div>
      <div className={`mt-4 px-6 py-2 rounded-full font-black text-sm tracking-wider uppercase ${
        score < 20 ? 'bg-emerald-100 text-emerald-700' :
        score < 40 ? 'bg-amber-100 text-amber-700' :
        score < 60 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
      }`}>
        {level} Risk
      </div>
    </div>
  );
}

export default function PredictorsPage() {
  const { t, language } = useLanguage();
  const [selected, setSelected] = useState<string | null>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [predictorInfo, setPredictorInfo] = useState<any>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPredictors, setLoadingPredictors] = useState(true);
  const [predictorData, setPredictorData] = useState<any[]>([]);

  // Load predictor metadata
  useEffect(() => {
    fetch('/api/predict')
      .then(r => r.json())
      .then(data => { setPredictorData(data.predictors || []); setLoadingPredictors(false); })
      .catch(() => setLoadingPredictors(false));
  }, []);

  const selectPredictor = (id: string) => {
    const p = predictorData.find((p: any) => p.id === id);
    if (p) {
      setSelected(id);
      setFields(p.fields);
      setPredictorInfo(p);
      setInputs({});
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictor: selected, inputs, language })
      });
      const data = await res.json();
      setResult(data);
    } catch { setResult({ error: 'Failed to get prediction' }); }
    setLoading(false);
  };

  const currentPredictor = PREDICTORS.find(p => p.id === selected);

  // --- Results View ---
  if (result && !result.error && currentPredictor) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
        <button onClick={() => setResult(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to form
        </button>

        {/* Result Header */}
        <div className={`bg-gradient-to-r ${currentPredictor.color} p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <span className="text-5xl">{currentPredictor.emoji}</span>
            <div>
              <h2 className="text-3xl font-black">{result.predictor}</h2>
              <p className="text-white/80 text-sm font-medium mt-1">Based on {result.totalPatientsAnalyzed?.toLocaleString()} real patient records</p>
            </div>
          </div>
        </div>

        {/* Gauge + Advice */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-xl flex flex-col items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Your Risk Score</h3>
            <RiskGauge score={result.riskScore} level={result.riskLevel} />
          </div>

          <div className="space-y-6">
            {/* Contributing Factors */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Contributing Factors</h3>
              <div className="space-y-3">
                {result.factors?.map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        f.impact === 'increases' ? 'bg-red-500' : f.impact === 'decreases' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`} />
                      <div>
                        <p className="text-sm font-bold text-slate-700">{f.name}</p>
                        <p className="text-xs text-slate-400">{f.value}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${
                      f.impact === 'increases' ? 'bg-red-100 text-red-600' : f.impact === 'decreases' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {f.impact === 'increases' ? '↑ Risk' : f.impact === 'decreases' ? '↓ Risk' : '— Neutral'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Personalized Advice */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">💡 Personalized Advice</h3>
              <div className="space-y-3">
                {result.advice?.map((a: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
                    <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Diagnostic Tests */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">🧪 Recommended Diagnostic Tests</h3>
          <p className="text-sm text-slate-500 mb-5">Based on your {currentPredictor.label} risk assessment, we recommend these diagnostic tests:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(PREDICTOR_TESTS[selected || ''] || PREDICTOR_TESTS['default']).map((test, i) => (
              <a key={i} href="/dashboard/diagnostic-centre" className="group flex items-center gap-3 p-4 rounded-2xl bg-violet-50 border border-violet-100 hover:bg-violet-100 transition-all hover:-translate-y-0.5">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <Stethoscope className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800">{test.name}</p>
                  <p className="text-xs text-slate-500">{test.reason}</p>
                </div>
                <span className="text-xs font-black text-violet-600 bg-white px-3 py-1.5 rounded-lg flex-shrink-0">₹{test.price}</span>
              </a>
            ))}
          </div>
          <a href="/dashboard/diagnostic-centre"
            className="mt-5 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:-translate-y-0.5 transition-all">
            <Stethoscope className="h-5 w-5" /> Book Diagnostic Test Now
          </a>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs font-medium text-amber-700 leading-relaxed">
            <strong>Disclaimer:</strong> This prediction is based on statistical analysis of real medical datasets and is for educational purposes only.
            It is NOT a medical diagnosis. Always consult a qualified healthcare professional for medical advice.
          </p>
        </div>

        {/* Healthcare CTA — Loan & Nearby Hospitals */}
        <HealthcareCTA
          context={`Based on your ${result.riskLevel} risk ${currentPredictor.label} assessment`}
          condition={currentPredictor.label}
          variant="wide"
        />
      </div>
    );
  }

  // --- Form View ---
  if (selected && currentPredictor) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
        <button onClick={() => { setSelected(null); setFields([]); setInputs({}); }} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-semibold">
          <ArrowLeft className="h-4 w-4" /> Back to predictors
        </button>

        <div className={`bg-gradient-to-r ${currentPredictor.color} p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden`}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <span className="text-4xl mb-3 block">{currentPredictor.emoji}</span>
            <h2 className="text-3xl font-black">{predictorInfo?.name}</h2>
            <p className="text-white/80 text-sm font-medium mt-2 max-w-xl">{predictorInfo?.description}</p>
            <div className="mt-4 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl inline-block">
              <p className="text-xs font-bold">📊 Dataset: {predictorInfo?.totalPatients?.toLocaleString()} real patient records</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Enter Your Health Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((field: any) => (
              <div key={field.key}>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {field.label} {field.unit && <span className="text-slate-400 font-normal">({field.unit})</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={inputs[field.key] || ''}
                    onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all bg-white font-medium"
                  >
                    <option value="">Select...</option>
                    {field.options.map((opt: string) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={inputs[field.key] || ''}
                    onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                    placeholder={field.min !== undefined ? `${field.min} - ${field.max}` : ''}
                    min={field.min}
                    max={field.max}
                    step="any"
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || Object.values(inputs).filter(Boolean).length < 2}
            className="mt-8 w-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing...</>
            ) : (
              <><Stethoscope className="h-5 w-5" /> Predict My Risk</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- Predictor Selection Grid ---
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
      <header>
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">
          <ShieldCheck className="h-4 w-4" /> AI-Powered Health Intelligence
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          {t('predictorsTitle')}
        </h1>
        <p className="text-slate-500 mt-2 max-w-2xl font-medium">
          {t('predictorsSubtitle')}
        </p>
      </header>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Brain, label: '9 Predictors', color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: Activity, label: '1.3M+ Records', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: TrendingUp, label: 'Real Datasets', color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: ShieldCheck, label: 'Evidence Based', color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} p-4 rounded-2xl border border-white flex items-center gap-3 shadow-sm`}>
            <div className={`p-2 rounded-lg bg-white ${s.color} shadow-sm`}><s.icon className="h-5 w-5" /></div>
            <span className={`text-sm font-bold ${s.color}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Predictor Cards */}
      {loadingPredictors ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {PREDICTORS.map((p) => {
            const data = predictorData.find((d: any) => d.id === p.id);
            return (
              <button
                key={p.id}
                onClick={() => selectPredictor(p.id)}
                className="group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${p.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <span className="text-4xl block mb-4">{p.emoji}</span>
                  <h3 className="text-lg font-black text-slate-800 mb-1">{p.label}</h3>
                  <p className="text-xs text-slate-400 font-medium mb-4 line-clamp-2">{data?.description?.slice(0, 80)}...</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${p.text} ${p.bg} px-3 py-1.5 rounded-lg`}>
                      {data?.totalPatients?.toLocaleString()} patients
                    </span>
                    <ChevronRight className={`h-5 w-5 ${p.text} group-hover:translate-x-1 transition-transform`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
