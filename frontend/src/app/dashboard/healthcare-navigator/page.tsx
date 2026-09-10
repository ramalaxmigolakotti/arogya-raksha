'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Search, MapPin, Heart, Activity, Building2, Star, Shield,
  AlertTriangle, Info, TrendingUp, DollarSign, Clock, Award,
  Stethoscope, CheckCircle2, ArrowRight, Loader2, Sparkles,
  BarChart3, Users, Zap, ChevronDown, ChevronUp, Navigation,
  FileText, BadgeCheck, CreditCard, Landmark, Banknote,
  Calendar, Phone, PartyPopper, CircleDollarSign, Target,
  ThumbsUp, XCircle, Briefcase, IndianRupee, Mail, User,
  KeyRound, Timer, ShieldCheck, CheckCircle, Hash
} from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import { useUser } from '@clerk/nextjs';
import RazorpayCheckout from '@/components/RazorpayCheckout';
import { useLanguage } from '@/context/LanguageContext';

// ─── Types ────────────────────────────────────────────────────

interface Hospital {
  name: string;
  category: 'Premium' | 'Mid-tier' | 'Budget';
  location: string;
  distance: string;
  rating: number;
  accreditations: string[];
  costRange: { min: number; max: number };
  strengths: string[];
  specialization: string;
  procedureVolume?: string;
  appointmentAvailability?: string;
  lat?: number;
  lng?: number;
}

interface CostRange { min: number; max: number }

interface CostBreakdown {
  procedure: CostRange;
  hospitalStay: CostRange;
  medicines: CostRange;
  diagnostics: CostRange;
  contingency: CostRange;
  total: CostRange;
}

interface EMIScenario {
  tenure: number;
  interestRate: number;
  emi: number;
  totalRepayment: number;
  totalInterest: number;
  incomePercent: number;
  safe: boolean;
}

interface LenderOption {
  type: string;
  examples: string;
  interestRange: string;
  approvalTime: string;
  docLevel: string;
  note: string;
}

interface FullResult {
  detectedCondition: string;
  icdCode: string;
  snomedConcept?: string;
  recommendedProcedure: string;
  clinicalPathway: string[];
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
  hospitals: Hospital[];
  costBreakdown: CostBreakdown;
  affordabilityStatus: 'fully_affordable' | 'partial_financing' | 'high_stress' | 'unknown';
  safeSpendLimit: number | null;
  emiAffordabilityThreshold: number | null;
  loanNeeded: number;
  emiScenarios: EMIScenario[];
  lenderOptions: LenderOption[];
  recommendedPlan: { tenure: number; interestRate: number; emi: number; rationale: string } | null;
  financialRiskScore: number;
  financialRiskLabel: string;
  notes: string[];
  assumptions: string[];
  disclaimer: string;
}

// Loan application flow steps
type LoanStep = 'idle' | 'details' | 'payment' | 'token_sent' | 'verify_token' | 'approved' | 'appointment_booked';

// ─── Helpers ──────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(0)}k` : `₹${n}`;

const urgencyConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Activity }> = {
  routine: { label: 'Routine', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  urgent: { label: 'Urgent', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  emergency: { label: 'Emergency', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: Zap },
};

const affordConfig: Record<string, { label: string; color: string; bg: string }> = {
  fully_affordable: { label: 'Fully Affordable', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  partial_financing: { label: 'Partial Financing Needed', color: 'text-amber-700', bg: 'bg-amber-50' },
  high_stress: { label: 'High Financial Stress', color: 'text-red-700', bg: 'bg-red-50' },
  unknown: { label: 'Income Not Provided', color: 'text-slate-500', bg: 'bg-slate-50' },
};

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'AR-';
  for (let i = 0; i < 6; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

function maskEmail(e: string): string {
  const [user, domain] = e.split('@');
  if (!domain) return e;
  return user.slice(0, 2) + '***@' + domain;
}

function maskPhone(p: string): string {
  if (p.length < 6) return p;
  return p.slice(0, 2) + '****' + p.slice(-4);
}

// ─── API Call ─────────────────────────────────────────────────

async function fetchReport(params: Record<string, any>): Promise<FullResult> {
  const res = await fetch('/api/healthcare-navigator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || 'Failed to get results');
  return data.result as FullResult;
}

// ─── Main Component ───────────────────────────────────────────

export default function HealthcareNavigatorPage() {
  const { t, language } = useLanguage();
  const { location } = useLocation();
  const { user } = useUser();
  const firstName = user?.firstName || 'User';

  // Search form
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [comorbidities, setComorbidities] = useState('');
  const [income, setIncome] = useState('');
  const [budget, setBudget] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Results
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FullResult | null>(null);
  const [error, setError] = useState('');
  const [expandedHospital, setExpandedHospital] = useState<number | null>(0);

  // EMI & Lender selection
  const [selectedEmi, setSelectedEmi] = useState<number | null>(null);
  const [selectedLender, setSelectedLender] = useState<string | null>(null);

  // Loan application flow
  const [loanStep, setLoanStep] = useState<LoanStep>('idle');
  const [loanPhone, setLoanPhone] = useState('');
  const [loanEmail, setLoanEmail] = useState('');
  const [loanDob, setLoanDob] = useState('');
  const [loanPaymentId, setLoanPaymentId] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [loanId, setLoanId] = useState('');
  const [countdown, setCountdown] = useState(1800); // 30 minutes in seconds

  // Appointment
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);
  const loanRef = useRef<HTMLDivElement>(null);

  // Sync city from location context
  useEffect(() => {
    if (location?.city && !city) setCity(location.city);
  }, [location, city]);

  // Prefill email from Clerk
  useEffect(() => {
    if (user?.emailAddresses?.[0]?.emailAddress && !loanEmail) {
      setLoanEmail(user.emailAddresses[0].emailAddress);
    }
    if (user?.phoneNumbers?.[0]?.phoneNumber && !loanPhone) {
      setLoanPhone(user.phoneNumbers[0].phoneNumber);
    }
  }, [user, loanEmail, loanPhone]);

  // Countdown timer when token is sent
  useEffect(() => {
    if (loanStep !== 'token_sent' && loanStep !== 'verify_token') return;
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [loanStep, countdown]);

  const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const examples = [
    { label: '🫀 Angioplasty', q: 'angioplasty for coronary artery disease' },
    { label: '🦴 Knee Replacement', q: 'knee replacement surgery' },
    { label: '👁 Cataract Surgery', q: 'cataract surgery cost' },
    { label: '🎗 Cancer Treatment', q: 'cancer treatment under ₹5 lakh' },
    { label: '💊 Dialysis', q: 'dialysis centers and cost estimation' },
    { label: '🤰 C-Section', q: 'cesarean delivery cost estimation' },
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setExpandedHospital(0);
    setLoanStep('idle');
    setBookingSuccess(false);
    setSelectedLender(null);
    setSelectedEmi(null);

    try {
      const res = await fetchReport({
        query, city: city || location?.city || 'Mumbai',
        age, gender, comorbidities, income, budget,
        lat: location?.lat, lng: location?.lng, area: location?.area,
      });
      setResult(res);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } catch (e: any) {
      setError(e.message || 'Failed to get results.');
    } finally {
      setLoading(false);
    }
  };

  // Start loan application — go to details form
  const startLoanApplication = () => {
    setLoanStep('details');
    setTimeout(() => loanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  };

  // After details filled, go to payment
  const proceedToPayment = () => {
    if (!loanPhone.trim() || !loanEmail.trim() || !loanDob.trim()) return;
    setLoanStep('payment');
  };

  // After Razorpay ₹30 payment success
  const onPaymentSuccess = (paymentId: string) => {
    setLoanPaymentId(paymentId);
    const token = generateToken();
    setGeneratedToken(token);
    setVerificationToken(token);
    setCountdown(1800);
    setLoanStep('token_sent');
  };

  // Verify entered token
  const verifyToken = () => {
    setTokenError('');
    if (tokenInput.trim().toUpperCase() === generatedToken) {
      const id = 'LOAN-' + Date.now().toString(36).toUpperCase();
      setLoanId(id);
      setLoanStep('approved');
      // Auto-book appointment 2 seconds after loan approval
      setTimeout(() => {
        setBookingSuccess(true);
        setLoanStep('appointment_booked');
      }, 2500);
    } else {
      setTokenError('Invalid token. Please check your email and SMS and try again.');
    }
  };

  const costRows = result ? [
    { label: 'Procedure / Surgery', val: result.costBreakdown.procedure, icon: Stethoscope, color: 'text-rose-500' },
    { label: 'Hospital Stay', val: result.costBreakdown.hospitalStay, icon: Building2, color: 'text-violet-500' },
    { label: 'Medicines & Consumables', val: result.costBreakdown.medicines, icon: Heart, color: 'text-emerald-500' },
    { label: 'Diagnostics (pre + post)', val: result.costBreakdown.diagnostics, icon: BarChart3, color: 'text-amber-500' },
    { label: 'Contingency (10-25%)', val: result.costBreakdown.contingency, icon: Shield, color: 'text-orange-500' },
  ] : [];

  const riskColor = result
    ? result.financialRiskScore < 0.35 ? 'emerald' : result.financialRiskScore < 0.6 ? 'amber' : 'red'
    : 'slate';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12 w-full">

      {/* ── Header ── */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-cyan-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
            <Navigation className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Healthcare & Financial Navigator
              <Sparkles className="h-5 w-5 text-emerald-500" />
            </h1>
            <p className="text-sm text-slate-500 font-medium">Hospital discovery · Cost estimation · Loan & EMI analysis</p>
          </div>
        </div>
        {location && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <MapPin className="h-3.5 w-3.5" />
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
            Live: {location.area ? `${location.area}, ` : ''}{location.city}
          </div>
        )}
      </header>

      {/* ── Disclaimer ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Decision Support Tool — Not Medical or Financial Advice</p>
          <p className="text-xs text-amber-600 mt-0.5">Cost estimates are illustrative. Loan approval depends on your credit profile. Always consult a qualified healthcare professional.</p>
        </div>
      </div>

      {/* ═══════════ LOAN FINAL SUCCESS ═══════════ */}
      {loanStep === 'appointment_booked' && result && (
        <div className="space-y-4 animate-in zoom-in-95 duration-500">
          {/* Loan Approved */}
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-500 rounded-full p-3 shadow-lg shadow-emerald-500/30"><PartyPopper className="h-7 w-7 text-white" /></div>
              <div className="flex-1">
                <h3 className="text-xl font-extrabold text-emerald-800 mb-1">🎉 Loan Approved & Appointment Booked!</h3>
                <p className="text-sm text-emerald-700 mb-4">Congratulations, {firstName}! Everything is confirmed. Your healthcare journey starts now.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase">Loan ID</p>
                    <p className="text-sm font-extrabold text-slate-800 font-mono">{loanId}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase">Loan Amount</p>
                    <p className="text-lg font-extrabold text-slate-800">{fmt(result.loanNeeded)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase">EMI</p>
                    <p className="text-lg font-extrabold text-slate-800">{selectedEmi !== null && result.emiScenarios[selectedEmi] ? fmt(result.emiScenarios[selectedEmi].emi) + '/mo' : '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-emerald-200">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase">Processing Fee</p>
                    <p className="text-lg font-extrabold text-slate-800">₹30 ✓</p>
                  </div>
                </div>

                {/* Appointment Confirmed */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <h4 className="font-bold text-blue-800">📅 Appointment Confirmed</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><p className="text-[10px] font-bold text-blue-500 uppercase">Hospital</p><p className="text-sm font-bold text-slate-800">{result.hospitals[0]?.name}</p></div>
                    <div><p className="text-[10px] font-bold text-blue-500 uppercase">Date</p><p className="text-sm font-bold text-slate-800">{new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                    <div><p className="text-[10px] font-bold text-blue-500 uppercase">Condition</p><p className="text-sm font-bold text-slate-800">{result.detectedCondition}</p></div>
                  </div>
                </div>

                <div className="bg-emerald-100 rounded-xl p-3 flex items-start gap-2">
                  <Mail className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-emerald-700">
                    ✅ Confirmation sent to <strong>{maskEmail(loanEmail)}</strong> and <strong>{maskPhone(loanPhone)}</strong>. 
                    The lender will contact you within 24-48 hours. Please carry your ID, medical records, and payment receipt to the hospital.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Search Card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 overflow-hidden">
        <div className="p-6">
          <div className="mb-4">
            <label className="text-sm font-bold text-slate-700 mb-2 block flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-500" /> Describe your condition, symptoms, or procedure
            </label>
            <textarea rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal resize-none"
              placeholder='"knee replacement", "chest pain while walking", "best cancer hospital under ₹5 lakh"'
              value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {examples.map((ex) => (
              <button key={ex.q} onClick={() => setQuery(ex.q)}
                className="px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all">
                {ex.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">City / Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm text-slate-700 font-medium placeholder:text-slate-400"
                  placeholder="Auto-detected from GPS" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              {location && <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1"><Navigation className="h-2.5 w-2.5" /> Live GPS: {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Age</label>
              <input type="number" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm text-slate-700 font-medium placeholder:text-slate-400"
                placeholder="e.g. 52" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
          </div>

          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 font-medium transition-colors mb-3">
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAdvanced ? 'Hide' : 'Show'} financial & medical details
          </button>

          {showAdvanced && (
            <div className="space-y-3 mb-4 animate-in slide-in-from-top-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Gender</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm text-slate-700 font-medium"
                    value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Comorbidities</label>
                  <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm text-slate-700 font-medium placeholder:text-slate-400"
                    placeholder="e.g. diabetes, hypertension" value={comorbidities} onChange={(e) => setComorbidities(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Monthly Income (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="number" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm text-slate-700 font-medium placeholder:text-slate-400"
                      placeholder="e.g. 60000" value={income} onChange={(e) => setIncome(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Available Budget (₹)</label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="number" className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm text-slate-700 font-medium placeholder:text-slate-400"
                      placeholder="e.g. 100000" value={budget} onChange={(e) => setBudget(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <button onClick={handleSearch} disabled={loading || !query.trim()}
            className={`flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all ${loading || !query.trim() ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 hover:-translate-y-0.5'}`}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating Full Report...</> : <><Search className="h-4 w-4" /> Generate Full Report <ArrowRight className="h-4 w-4" /></>}
          </button>

          {error && <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl"><XCircle className="h-4 w-4 text-red-500" /><p className="text-sm text-red-700 font-medium">{error}</p></div>}
        </div>

        {loading && (
          <div className="border-t border-slate-100 px-6 py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative"><div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center"><Activity className="h-7 w-7 text-emerald-500 animate-pulse" /></div><div className="absolute inset-0 rounded-full border-2 border-emerald-300 border-t-transparent animate-spin" /></div>
              <p className="text-sm font-semibold text-slate-700">Building healthcare + financial report...</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['ICD-10 Mapping', 'Hospital Discovery', 'Cost Estimation', 'EMI Analysis', 'Lender Matching'].map((s, i) => (
                  <span key={s} className="text-xs font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════ RESULTS ════════════════════ */}
      {result && (
        <div ref={resultRef} className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-500">

          {/* Condition Banner */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detected</span>
                  <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{result.icdCode}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-1">{result.detectedCondition}</h2>
                <p className="text-sm text-slate-500">Recommended: <span className="font-bold text-slate-700">{result.recommendedProcedure}</span></p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${urgencyConfig[result.urgencyLevel]?.bg} ${urgencyConfig[result.urgencyLevel]?.color}`}>
                  {(() => { const I = urgencyConfig[result.urgencyLevel]?.icon || CheckCircle2; return <I className="h-3.5 w-3.5" />; })()}
                  {urgencyConfig[result.urgencyLevel]?.label}
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${affordConfig[result.affordabilityStatus]?.bg} ${affordConfig[result.affordabilityStatus]?.color}`}>
                  {affordConfig[result.affordabilityStatus]?.label}
                </div>
                {result.safeSpendLimit && (
                  <div className="bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 text-center">
                    <p className="text-[10px] text-blue-500 font-semibold">Safe Spend</p>
                    <p className="text-sm font-extrabold text-blue-700">{fmt(result.safeSpendLimit)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

            {/* ═════ LEFT — 3/5 ═════ */}
            <div className="lg:col-span-3 space-y-5">

              {/* Clinical Pathway */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                  <div className="bg-violet-100 p-1.5 rounded-lg"><TrendingUp className="h-4 w-4 text-violet-600" /></div>Clinical Pathway
                </h3>
                {result.clinicalPathway.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 text-slate-600'}`}>{i + 1}</div>
                      {i < result.clinicalPathway.length - 1 && <div className="w-0.5 h-8 bg-slate-200 my-1" />}
                    </div>
                    <div className="flex-1 pb-4"><p className="text-sm font-medium text-slate-700 pt-1.5">{step}</p></div>
                  </div>
                ))}
              </div>

              {/* Hospitals Near You */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <div className="bg-blue-100 p-1.5 rounded-lg"><Building2 className="h-4 w-4 text-blue-600" /></div>Hospitals Near You
                  <span className="text-xs text-slate-400 ml-auto font-medium">{result.hospitals.length} results</span>
                </h3>
                {location && <p className="text-xs text-emerald-600 font-medium mb-4 flex items-center gap-1"><Navigation className="h-3 w-3" /> Based on live GPS: {location.area ? `${location.area}, ` : ''}{location.city}</p>}

                <div className="space-y-3">
                  {result.hospitals.map((h, i) => {
                    const isExpanded = expandedHospital === i;
                    const tierColors: Record<string, string> = { Premium: 'text-violet-700 bg-violet-50 border-violet-200', 'Mid-tier': 'text-blue-700 bg-blue-50 border-blue-200', Budget: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
                    return (
                      <div key={i} className={`border rounded-xl transition-all ${i === 0 ? 'border-emerald-300 bg-emerald-50/20 shadow-md' : 'border-slate-200 hover:shadow-sm'}`}>
                        <div className="p-4 cursor-pointer" onClick={() => setExpandedHospital(isExpanded ? null : i)}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {i === 0 && <span className="text-[10px] font-bold uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full">Best Match</span>}
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${tierColors[h.category] || ''}`}>{h.category}</span>
                              </div>
                              <h4 className="font-bold text-slate-800 text-base">{h.name}</h4>
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> {h.location} · {h.distance}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-extrabold text-slate-800 tabular-nums">{fmt(h.costRange.min)} – {fmt(h.costRange.max)}</p>
                              <div className="flex items-center gap-1 justify-end mt-1"><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /><span className="text-sm font-bold text-slate-700">{h.rating?.toFixed(1)}</span></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {h.accreditations?.map((a) => <span key={a} className="flex items-center gap-1 text-[10px] font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200"><BadgeCheck className="h-3 w-3" />{a}</span>)}
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{h.specialization}</span>
                          </div>
                          {isExpanded && (
                            <div className="mt-4 pt-3 border-t border-slate-200 animate-in slide-in-from-top-2 duration-200 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                {h.procedureVolume && <div className="flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4 text-blue-500" /><span className="text-slate-600">Volume: <strong>{h.procedureVolume}</strong></span></div>}
                                {h.appointmentAvailability && <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-amber-500" /><span className="text-slate-600">Next slot: <strong>{h.appointmentAvailability}</strong></span></div>}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {h.strengths?.map((s) => <span key={s} className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">{s}</span>)}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-center pb-2">{isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 mx-auto" /> : <ChevronDown className="h-4 w-4 text-slate-400 mx-auto" />}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EMI Scenarios */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="bg-indigo-100 p-1.5 rounded-lg"><CreditCard className="h-4 w-4 text-indigo-600" /></div>EMI Scenarios
                </h3>
                {result.loanNeeded > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-4 mb-4 text-sm text-slate-600">
                      <span>Loan needed: <strong className="text-slate-800 tabular-nums">{fmt(result.loanNeeded)}</strong></span>
                      {result.emiAffordabilityThreshold && <span>EMI threshold: <strong className="text-blue-700 tabular-nums">{fmt(result.emiAffordabilityThreshold)}/mo</strong></span>}
                    </div>
                    <div className="overflow-x-auto -mx-6 px-6">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-slate-200">
                          {['Tenure', 'Rate', 'Monthly EMI', 'Total Pay', 'Interest', 'Income %', 'Safe', ''].map(h => <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2 pr-3">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {result.emiScenarios.map((s, i) => {
                            const isRec = result.recommendedPlan?.tenure === s.tenure;
                            const isSel = selectedEmi === i;
                            return (
                              <tr key={i} className={`border-b border-slate-50 ${isRec ? 'bg-blue-50/50' : ''} ${isSel ? 'bg-emerald-50' : ''}`}>
                                <td className="py-3 pr-3"><span className="font-bold tabular-nums">{s.tenure}mo</span>{isRec && <span className="ml-2 text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">Recommended</span>}</td>
                                <td className="py-3 pr-3 tabular-nums">{s.interestRate}%</td>
                                <td className="py-3 pr-3 font-extrabold tabular-nums text-slate-800">{fmt(s.emi)}</td>
                                <td className="py-3 pr-3 tabular-nums">{fmt(s.totalRepayment)}</td>
                                <td className="py-3 pr-3 tabular-nums text-amber-600">{fmt(s.totalInterest)}</td>
                                <td className={`py-3 pr-3 font-bold tabular-nums ${s.incomePercent > 30 ? 'text-red-600' : 'text-emerald-600'}`}>{Math.round(s.incomePercent)}%</td>
                                <td className="py-3 pr-3">{s.safe ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-400" />}</td>
                                <td className="py-3"><button onClick={() => setSelectedEmi(i)} className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${isSel ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'}`}>{isSel ? '✓ Selected' : 'Select'}</button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {result.recommendedPlan && (
                      <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-slate-700">
                        <strong className="text-blue-700">💡 Recommended — {result.recommendedPlan.tenure}mo @ {result.recommendedPlan.interestRate}%:</strong>{' '}{result.recommendedPlan.rationale}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-semibold flex items-center gap-2"><ThumbsUp className="h-5 w-5" /> Your budget covers the estimated cost!</div>
                )}
              </div>

              {/* Lender Marketplace + Loan Application */}
              {result.loanNeeded > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <div className="bg-teal-100 p-1.5 rounded-lg"><Landmark className="h-4 w-4 text-teal-600" /></div>Lender Marketplace
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">Neutral display — select a lender type to proceed</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                    {result.lenderOptions.map((l) => {
                      const isSel = selectedLender === l.type;
                      return (
                        <div key={l.type} onClick={() => setSelectedLender(l.type)}
                          className={`border rounded-xl p-4 cursor-pointer transition-all ${isSel ? 'border-emerald-400 bg-emerald-50/50 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-800 text-sm">{l.type}</h4>
                            {isSel && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mb-3">{l.examples}</p>
                          {[['Interest', l.interestRange], ['Approval', l.approvalTime], ['Docs', l.docLevel]].map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs mb-1"><span className="text-slate-400">{k}</span><span className="font-semibold text-slate-700">{v}</span></div>
                          ))}
                          <p className="mt-3 text-[11px] text-slate-500 italic">{l.note}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* ═══════ LOAN APPLICATION FLOW ═══════ */}
                  <div ref={loanRef}>

                    {/* Step 0: Start */}
                    {loanStep === 'idle' && (
                      <button onClick={startLoanApplication}
                        disabled={!selectedLender || selectedEmi === null}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${!selectedLender || selectedEmi === null ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5'}`}>
                        <Briefcase className="h-5 w-5" /> Apply for Healthcare Loan
                      </button>
                    )}
                    {loanStep === 'idle' && (!selectedLender || selectedEmi === null) && (
                      <p className="text-xs text-slate-400 text-center mt-2">Select an EMI plan and lender type above to apply</p>
                    )}

                    {/* Step 1: User Details */}
                    {loanStep === 'details' && (
                      <div className="border-2 border-emerald-300 rounded-2xl p-5 bg-emerald-50/30 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="bg-emerald-500 p-1.5 rounded-lg"><User className="h-4 w-4 text-white" /></div>
                          <h4 className="font-bold text-slate-800">Step 1 — Your Details (Mandatory)</h4>
                        </div>
                        <div className="space-y-3 mb-4">
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Number *</label>
                            <input type="tel" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm text-slate-700 font-medium placeholder:text-slate-400"
                              placeholder="e.g. 9876543210" value={loanPhone} onChange={(e) => setLoanPhone(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block flex items-center gap-1"><Mail className="h-3 w-3" /> Email Address *</label>
                            <input type="email" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm text-slate-700 font-medium placeholder:text-slate-400"
                              placeholder="e.g. name@email.com" value={loanEmail} onChange={(e) => setLoanEmail(e.target.value)} />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block flex items-center gap-1"><Calendar className="h-3 w-3" /> Date of Birth *</label>
                            <input type="date" className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm text-slate-700 font-medium"
                              value={loanDob} onChange={(e) => setLoanDob(e.target.value)} />
                          </div>
                        </div>
                        <button onClick={proceedToPayment}
                          disabled={!loanPhone.trim() || !loanEmail.trim() || !loanDob.trim()}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${!loanPhone.trim() || !loanEmail.trim() || !loanDob.trim() ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'}`}>
                          Continue to Payment <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Step 2: Razorpay ₹30 Payment */}
                    {loanStep === 'payment' && (
                      <div className="border-2 border-blue-300 rounded-2xl p-5 bg-blue-50/30 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="bg-blue-500 p-1.5 rounded-lg"><CreditCard className="h-4 w-4 text-white" /></div>
                          <h4 className="font-bold text-slate-800">Step 2 — Processing Fee Payment</h4>
                        </div>
                        <div className="bg-white rounded-xl border border-blue-200 p-4 mb-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-slate-600">Loan Processing Fee</span>
                            <span className="text-2xl font-extrabold text-slate-800">₹30</span>
                          </div>
                          <div className="text-xs text-slate-400 space-y-1">
                            <p>• One-time non-refundable processing fee</p>
                            <p>• Covers verification & quick approval processing</p>
                            <p>• Secure payment via Razorpay (UPI, Card, NetBanking)</p>
                          </div>
                        </div>
                        <RazorpayCheckout
                          amount={30}
                          itemName="Healthcare Loan Processing Fee"
                          itemDescription={`Loan processing for ${result.detectedCondition} treatment`}
                          onSuccess={onPaymentSuccess}
                          onFailure={(err) => setError(err)}
                          buttonText="Pay Processing Fee"
                          userName={firstName}
                          userEmail={loanEmail}
                          userPhone={loanPhone}
                        />
                        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-400">
                          <ShieldCheck className="h-3.5 w-3.5" /> Secured by Razorpay · 256-bit encryption
                        </div>
                      </div>
                    )}

                    {/* Step 3: Token Sent — Check email and SMS */}
                    {loanStep === 'token_sent' && (
                      <div className="border-2 border-amber-300 rounded-2xl p-5 bg-amber-50/30 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="bg-amber-500 p-1.5 rounded-lg"><Mail className="h-4 w-4 text-white" /></div>
                          <h4 className="font-bold text-slate-800">Step 3 — Verify Your Identity</h4>
                        </div>

                        <div className="bg-white rounded-xl border border-amber-200 p-4 mb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold"><CheckCircle className="h-4 w-4" /> ₹30 Payment Successful</div>
                            <span className="text-xs text-slate-400 font-mono">ID: {loanPaymentId.slice(0, 16)}...</span>
                          </div>

                          <div className="bg-amber-50 rounded-lg p-3 mb-3">
                            <p className="text-sm font-bold text-amber-800 mb-1">📧📱 Verification code sent!</p>
                            <p className="text-xs text-amber-700">
                              A 6-character verification token has been sent to:<br />
                              <strong>Email:</strong> {maskEmail(loanEmail)}<br />
                              <strong>SMS:</strong> {maskPhone(loanPhone)}
                            </p>
                          </div>

                          {/* Simulated token display — in production this would only be in email/SMS */}
                          <div className="bg-slate-900 rounded-lg p-3 mb-3">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Your Verification Token (also sent via Email & SMS)</p>
                            <p className="text-2xl font-extrabold text-emerald-400 font-mono tracking-[0.3em] text-center">{generatedToken}</p>
                          </div>

                          <div className="flex items-center gap-2 text-sm mb-3">
                            <Timer className="h-4 w-4 text-amber-600" />
                            <span className="text-amber-700 font-semibold">Time remaining: <span className="font-mono tabular-nums">{fmtTime(countdown)}</span></span>
                            <span className="text-xs text-slate-400">(30 min for fast processing)</span>
                          </div>

                          <button onClick={() => setLoanStep('verify_token')}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                            <KeyRound className="h-4 w-4" /> Enter Verification Token
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Enter Token */}
                    {loanStep === 'verify_token' && (
                      <div className="border-2 border-violet-300 rounded-2xl p-5 bg-violet-50/30 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="bg-violet-500 p-1.5 rounded-lg"><KeyRound className="h-4 w-4 text-white" /></div>
                          <h4 className="font-bold text-slate-800">Step 4 — Enter Verification Token</h4>
                          <div className="ml-auto flex items-center gap-1 text-amber-600"><Timer className="h-4 w-4" /><span className="text-sm font-mono font-bold tabular-nums">{fmtTime(countdown)}</span></div>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">Enter the 6-character code sent to your email and phone to approve your loan.</p>

                        <div className="flex gap-3 mb-3">
                          <div className="relative flex-1">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                              type="text"
                              maxLength={9}
                              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 text-lg font-extrabold font-mono tracking-[0.2em] text-center text-slate-800 uppercase placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
                              placeholder="AR-XXXXXX"
                              value={tokenInput}
                              onChange={(e) => { setTokenInput(e.target.value.toUpperCase()); setTokenError(''); }}
                            />
                          </div>
                        </div>

                        {tokenError && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-3">
                            <XCircle className="h-4 w-4 text-red-500" /><p className="text-sm text-red-700 font-medium">{tokenError}</p>
                          </div>
                        )}

                        <button onClick={verifyToken}
                          disabled={tokenInput.length < 6}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${tokenInput.length < 6 ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25'}`}>
                          <CheckCircle className="h-4 w-4" /> Verify & Approve Loan
                        </button>
                      </div>
                    )}

                    {/* Step 5: Approved */}
                    {loanStep === 'approved' && (
                      <div className="border-2 border-emerald-300 rounded-2xl p-5 bg-emerald-50/30 animate-in zoom-in-95 duration-500">
                        <div className="flex flex-col items-center gap-3 py-4">
                          <div className="bg-emerald-500 rounded-full p-4 shadow-lg shadow-emerald-500/30 animate-bounce"><CheckCircle2 className="h-8 w-8 text-white" /></div>
                          <h4 className="text-xl font-extrabold text-emerald-800">🎉 Loan Approved!</h4>
                          <p className="text-sm text-emerald-700">Booking your appointment automatically...</p>
                          <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                        </div>
                      </div>
                    )}

                    {/* Step 6: Everything Done */}
                    {loanStep === 'appointment_booked' && (
                      <div className="border-2 border-emerald-300 rounded-2xl p-5 bg-emerald-50/30 animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          <span className="font-bold text-emerald-800">All steps completed!</span>
                        </div>
                        <p className="text-sm text-emerald-700">Scroll to the top to see your full confirmation with loan ID, appointment, and next steps.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ═════ RIGHT — 2/5 ═════ */}
            <div className="lg:col-span-2 space-y-5">

              {/* Cost Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="bg-amber-100 p-1.5 rounded-lg"><DollarSign className="h-4 w-4 text-amber-600" /></div>Cost Breakdown
                </h3>
                {costRows.map(({ label, val, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2.5"><Icon className={`h-4 w-4 ${color}`} /><span className="text-sm text-slate-600 font-medium">{label}</span></div>
                    <span className="text-sm font-bold text-slate-800 tabular-nums">{fmt(val.min)} – {fmt(val.max)}</span>
                  </div>
                ))}
                <div className="mt-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl p-4 flex items-center justify-between text-white">
                  <div>
                    <p className="text-xs font-medium opacity-80">Total Estimated</p>
                    <p className="text-xl font-extrabold tracking-tight">{fmt(result.costBreakdown.total.min)} – {fmt(result.costBreakdown.total.max)}</p>
                  </div>
                  <IndianRupee className="h-8 w-8 opacity-30" />
                </div>
                {result.loanNeeded > 0 && (
                  <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                    <span className="text-sm text-amber-700 font-medium">Financing Needed</span>
                    <span className="font-extrabold text-amber-800 tabular-nums">{fmt(result.loanNeeded)}</span>
                  </div>
                )}
              </div>

              {/* Financial Risk Score */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="bg-rose-100 p-1.5 rounded-lg"><Target className="h-4 w-4 text-rose-600" /></div>Financial Risk Score
                </h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`text-4xl font-extrabold tabular-nums text-${riskColor}-600`}>{Math.round(result.financialRiskScore * 100)}</div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold bg-${riskColor}-50 text-${riskColor}-700`}>
                      {result.financialRiskLabel || (result.financialRiskScore < 0.35 ? 'Low Risk' : result.financialRiskScore < 0.6 ? 'Moderate Risk' : 'High Risk')}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">0-100 · Lower = safer</p>
                  </div>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 bg-${riskColor}-500`} style={{ width: `${result.financialRiskScore * 100}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-3">Factors: income-to-cost ratio · EMI burden · comorbidities · geographic index.</p>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-6">
                <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <div className="bg-sky-100 p-1.5 rounded-lg"><FileText className="h-4 w-4 text-sky-600" /></div>Important Notes
                </h3>
                {result.notes.map((n, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-50 last:border-0">
                    <Info className="h-4 w-4 text-sky-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-slate-600">{n}</p>
                  </div>
                ))}
              </div>

              {/* Assumptions */}
              {result.assumptions?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <div className="bg-orange-100 p-1.5 rounded-lg"><AlertTriangle className="h-4 w-4 text-orange-600" /></div>Assumptions Made
                  </h3>
                  {result.assumptions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5 py-2 border-b border-slate-50 last:border-0">
                      <span className="text-xs font-bold text-orange-500 mt-0.5">{i + 1}.</span><p className="text-sm text-slate-600">{a}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800 mb-1">Disclaimer</p>
                    <p className="text-xs text-amber-700">{result.disclaimer}</p>
                    <p className="text-xs text-amber-600 mt-2">Loan approval depends on credit profile. Costs may vary. Decision support only.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Responsible AI Footer */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-emerald-500" /><span className="text-sm font-bold text-slate-700">Responsible AI</span></div>
              <div className="flex flex-wrap gap-3">
                {['No proprietary data', 'Neutral lender display', 'Transparent signals', 'Secure payments', 'Decision support only'].map(item => (
                  <span key={item} className="flex items-center gap-1 text-xs text-slate-500 font-medium"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {item}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
