'use client';

import { useState, useRef, useCallback } from 'react';
import {
  FileUp, Sparkles, Loader2, CheckCircle2, AlertTriangle,
  XCircle, ChevronDown, ChevronUp, Download, RotateCcw,
  FileText, Image as ImageIcon, Activity, Heart, TrendingUp,
  TrendingDown, Minus, ArrowRight, ShieldAlert, Info, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';
import { persistMedicalRecord } from '@/lib/medicalHistoryService';
import FeaturePastHistoryModal from '@/components/FeaturePastHistoryModal';

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Parameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  interpretation: string;
}
interface AbnormalFinding {
  parameter: string;
  value: string;
  concern: string;
  severity: 'mild' | 'moderate' | 'severe';
}
interface AnalysisResult {
  reportTitle: string;
  urgencyLevel: 'normal' | 'review' | 'urgent' | 'critical';
  overallStatus: string;
  summary: string;
  parameters: Parameter[];
  abnormalFindings: AbnormalFinding[];
  recommendations: string[];
  followUpTests: string[];
  doctorConsult: boolean;
  doctorConsultReason: string;
  disclaimer: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const URGENCY_CONFIG = {
  normal:   { color: 'emerald', label: 'All Clear',      icon: CheckCircle2,   bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  review:   { color: 'amber',   label: 'Needs Review',   icon: AlertTriangle,  bg: 'bg-amber-50 border-amber-200',   badge: 'bg-amber-100 text-amber-700' },
  urgent:   { color: 'orange',  label: 'See Doctor Soon', icon: AlertTriangle, bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  critical: { color: 'rose',    label: 'Urgent Attention', icon: ShieldAlert,  bg: 'bg-rose-50 border-rose-200',     badge: 'bg-rose-100 text-rose-700' },
};

const STATUS_CONFIG = {
  normal:   { icon: Minus,        color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', label: 'Normal' },
  high:     { icon: TrendingUp,   color: 'text-rose-600',    bg: 'bg-rose-50',     border: 'border-rose-200',    label: 'High' },
  low:      { icon: TrendingDown, color: 'text-blue-600',    bg: 'bg-blue-50',     border: 'border-blue-200',    label: 'Low' },
  critical: { icon: XCircle,      color: 'text-rose-700',    bg: 'bg-rose-100',    border: 'border-rose-300',    label: 'Critical' },
};

const SEVERITY_CONFIG = {
  mild:     { color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  moderate: { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  severe:   { color: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200' },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

async function extractPDFText(file: File): Promise<string> {
  // Client-side PDF text extraction using pdfjs via CDN
  try {
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      // @ts-ignore
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return fullText;
    }
  } catch {}
  return `[PDF: ${file.name} — ${Math.round(file.size / 1024)}KB]`;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function MedicalReports() {
  const { user } = useUserRole();
  const [dragOver, setDragOver]       = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<AnalysisResult | null>(null);
  const [error, setError]             = useState('');
  const [expandedParams, setExpanded] = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    const isImage = f.type.startsWith('image/');
    const isPDF   = f.type === 'application/pdf';
    if (!isImage && !isPDF) { setError('Please upload a JPG, PNG, or PDF file.'); return; }
    if (f.size > 15 * 1024 * 1024) { setError('File must be under 15MB.'); return; }

    setFile(f);
    setError('');
    setResult(null);

    if (isImage) {
      const b64 = await fileToBase64(f);
      setPreview(b64);
    } else {
      setPreview(null);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const { language } = useLanguage();

  const analyzeReport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let body: any = { language };
      if (file.type.startsWith('image/')) {
        body.imageData = preview;
      } else {
        body.pdfText = await extractPDFText(file);
      }

      const res = await fetch('/api/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed');
      setResult(data.result);

      if (data.result) {
        persistMedicalRecord(user?.id || 'usr_pat_8812', {
          type: 'medical_report_analysis',
          title: `Report: ${data.result.reportTitle || file.name}`,
          userQuery: `Uploaded report file: ${file.name} (${Math.round(file.size / 1024)} KB)`,
          aiResponse: data.result.summary || data.result.overallStatus,
          summary: `${data.result.overallStatus || 'Completed'} • Urgency: ${data.result.urgencyLevel?.toUpperCase()}`,
          metadata: {
            fileName: file.name,
            fileSizeKB: Math.round(file.size / 1024),
            urgencyLevel: data.result.urgencyLevel,
            overallStatus: data.result.overallStatus,
            parametersCount: data.result.parameters?.length || 0,
            abnormalFindingsCount: data.result.abnormalFindings?.length || 0,
            doctorConsult: data.result.doctorConsult,
          },
        }).catch(console.warn);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to analyze report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const urgency  = result ? URGENCY_CONFIG[result.urgencyLevel] : null;
  const UrgIcon  = urgency?.icon;
  const abnormal = result?.parameters?.filter(p => p.status !== 'normal') || [];
  const normal   = result?.parameters?.filter(p => p.status === 'normal')  || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-16 max-w-4xl mx-auto">

      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            AI Report Analyzer
          </h1>
          <p className="text-slate-500 mt-2 text-base font-medium">
            Upload any lab report — AI extracts values, flags abnormals, and explains everything in plain language.
          </p>
        </div>
        <FeaturePastHistoryModal
          featureTitle="Medical Reports"
          types={['medical_report_analysis']}
          icon="📄"
          buttonLabel="Past Reports"
        />
      </header>

      {/* Upload Zone */}
      {!result && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer
            ${dragOver ? 'border-emerald-400 bg-emerald-50 scale-[1.01]' : file ? 'border-emerald-300 bg-emerald-50/40 cursor-default' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {!file ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-5 rounded-2xl">
                  <Upload className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
              <p className="text-lg font-bold text-slate-700 mb-1">Drop your lab report here</p>
              <p className="text-sm text-slate-400 mb-4">JPG, PNG, or PDF • Max 15MB</p>
              <div className="flex justify-center gap-3 text-xs text-slate-400">
                {['CBC', 'Lipid Profile', 'LFT', 'KFT', 'Thyroid', 'X-Ray', 'Glucose'].map(t => (
                  <span key={t} className="bg-slate-100 px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-5">
              {preview ? (
                <img src={preview} alt="Report" className="w-24 h-24 object-cover rounded-xl border border-emerald-200 shadow" />
              ) : (
                <div className="w-24 h-24 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-center">
                  <FileText className="h-10 w-10 text-rose-400" />
                </div>
              )}
              <div className="text-left flex-1">
                <p className="font-bold text-slate-800 text-lg">{file.name}</p>
                <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(0)} KB • {file.type.startsWith('image/') ? 'Image' : 'PDF'}</p>
                <button onClick={e => { e.stopPropagation(); reset(); }} className="mt-2 text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Change file
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <p className="text-rose-700 font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Analyze Button */}
      {file && !result && (
        <button
          onClick={analyzeReport}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing with AI…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Analyze Report with AI
            </>
          )}
        </button>
      )}

      {/* Loading Animation */}
      {loading && (
        <div className="bg-white border border-emerald-100 rounded-3xl p-8 shadow-lg text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
              <Activity className="h-6 w-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          {['Reading report values…', 'Identifying parameters…', 'Comparing with reference ranges…', 'Generating health insights…'].map((step, i) => (
            <motion.p key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.8 }}
              className="text-sm text-slate-500 font-medium">
              {step}
            </motion.p>
          ))}
        </div>
      )}

      {/* ── RESULTS ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Urgency Banner */}
            <div className={`rounded-3xl border-2 p-6 ${urgency?.bg}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {UrgIcon && <UrgIcon className={`h-8 w-8 mt-0.5 text-${urgency?.color}-600`} />}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-black text-slate-900">{result.reportTitle}</h2>
                      <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${urgency?.badge}`}>{urgency?.label}</span>
                    </div>
                    <p className="text-slate-700 font-medium">{result.overallStatus}</p>
                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">{result.summary}</p>
                  </div>
                </div>
                <button onClick={reset} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                  <RotateCcw className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Abnormal Findings */}
            {result.abnormalFindings?.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md">
                <h3 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" /> Findings That Need Attention ({result.abnormalFindings.length})
                </h3>
                <div className="space-y-3">
                  {result.abnormalFindings.map((f, i) => {
                    const sc = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.mild;
                    return (
                      <div key={i} className={`rounded-2xl border p-4 ${sc.bg} ${sc.border}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">{f.parameter}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-700 text-sm">{f.value}</span>
                            <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-full bg-white/70 ${sc.color}`}>{f.severity}</span>
                          </div>
                        </div>
                        <p className={`text-sm font-medium ${sc.color}`}>{f.concern}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Parameters */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-500" /> All Test Values ({result.parameters?.length || 0})
                </h3>
                {normal.length > 3 && (
                  <button onClick={() => setExpanded(e => !e)} className="text-sm text-emerald-600 font-bold flex items-center gap-1">
                    {expandedParams ? <><ChevronUp className="h-4 w-4" /> Show less</> : <><ChevronDown className="h-4 w-4" /> Show all</>}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {/* Abnormal always visible */}
                {abnormal.map((p, i) => <ParameterRow key={`ab-${i}`} p={p} />)}
                {/* Normal — show 3 by default, rest on expand */}
                {(expandedParams ? normal : normal.slice(0, 3)).map((p, i) => <ParameterRow key={`n-${i}`} p={p} />)}
                {!expandedParams && normal.length > 3 && (
                  <button onClick={() => setExpanded(true)} className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm text-slate-500 font-medium transition-colors">
                    + {normal.length - 3} more normal values
                  </button>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-6">
                <h3 className="font-black text-slate-800 text-lg mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-emerald-500" /> AI Recommendations
                </h3>
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <ArrowRight className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700 font-medium text-sm">{r}</span>
                    </li>
                  ))}
                </ul>
                {result.followUpTests?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-emerald-100">
                    <p className="text-xs font-bold text-emerald-700 mb-2">SUGGESTED FOLLOW-UP TESTS</p>
                    <div className="flex flex-wrap gap-2">
                      {result.followUpTests.map((t, i) => (
                        <span key={i} className="bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Doctor Consult Alert */}
            {result.doctorConsult && (
              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-start gap-4">
                <ShieldAlert className="h-6 w-6 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-800">Doctor Consultation Recommended</p>
                  <p className="text-sm text-rose-700 mt-0.5">{result.doctorConsultReason}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2">
                <Upload className="h-4 w-4" /> Analyze Another
              </button>
            </div>

            {/* Disclaimer */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
              <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">{result.disclaimer || 'This AI analysis is for informational purposes only. Always consult a qualified doctor for medical advice.'}</p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── ParameterRow sub-component ─────────────────────────────────────────── */
function ParameterRow({ p }: { p: Parameter }) {
  const [open, setOpen] = useState(false);
  const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.normal;
  const Icon = sc.icon;
  return (
    <div className={`rounded-xl border ${sc.border} ${sc.bg} overflow-hidden`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-3 text-left">
        <Icon className={`h-4 w-4 ${sc.color} flex-shrink-0`} />
        <span className="flex-1 font-semibold text-slate-800 text-sm">{p.name}</span>
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-slate-700 text-sm">{p.value} {p.unit}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 ${sc.color}`}>{sc.label}</span>
          {p.interpretation && (open ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />)}
        </div>
      </button>
      {open && p.interpretation && (
        <div className="px-3 pb-3">
          <p className="text-xs text-slate-500 border-t border-white/60 pt-2">{p.interpretation}</p>
          {p.referenceRange && <p className="text-xs text-slate-400 mt-1">Reference: {p.referenceRange}</p>}
        </div>
      )}
    </div>
  );
}
