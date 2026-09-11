'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BedDouble, UserPlus, Stethoscope, FlaskConical, Pill,
  LogOut, Clock, CheckCircle2, AlertTriangle, Loader2,
  Building2, User, Phone, Activity, Search, RefreshCw,
  ChevronDown, ChevronUp, X, Plus, Save, Siren
} from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://arogya-raksha-n89v.onrender.com';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Admission {
  id: string;
  patient_name: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  hospital_name: string;
  assigned_doctor_name?: string;
  bed_number?: string;
  ward?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  chief_complaint?: string;
  status: string;
  timestamps: Record<string, string>;
  created_at: string;
}

interface Bed {
  id: string;
  bed_number: string;
  ward: string;
  bed_type: string;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  patient_name?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  mild:     'bg-emerald-100 text-emerald-700 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-700 border-amber-200',
  severe:   'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_STEPS = [
  { key: 'registered',         label: 'Registered',         icon: User },
  { key: 'doctor_assigned',    label: 'Doctor Assigned',    icon: Stethoscope },
  { key: 'under_examination',  label: 'Examining',          icon: Activity },
  { key: 'diagnostics_ordered',label: 'Diagnostics Ordered',icon: FlaskConical },
  { key: 'diagnostics_done',   label: 'Results Ready',      icon: CheckCircle2 },
  { key: 'treatment_ongoing',  label: 'Treatment',          icon: Pill },
  { key: 'ready_for_discharge',label: 'Ready to Discharge', icon: LogOut },
  { key: 'discharged',         label: 'Discharged',         icon: CheckCircle2 },
];

const WARDS = ['General', 'ICU', 'Emergency', 'Paediatric', 'Maternity'];

const BED_COLORS: Record<string, string> = {
  available:   'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  occupied:    'bg-red-50 border-red-200',
  reserved:    'bg-amber-50 border-amber-200',
  maintenance: 'bg-slate-100 border-slate-200',
};

// ─── Register Patient Modal ───────────────────────────────────────────────────
function RegisterPatientModal({
  hospitalName, onClose, onSuccess,
}: { hospitalName: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    patient_name: '', patient_phone: '', patient_age: '',
    patient_gender: 'Male', severity: 'mild', chief_complaint: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.patient_name.trim()) { setError('Patient name is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/admissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, hospital_name: hospitalName }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Registration failed');
      onSuccess();
      onClose();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <UserPlus className="h-6 w-6" />
            <h2 className="text-xl font-black">Register New Inpatient</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 mb-1 block">Patient Full Name *</label>
              <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Phone</label>
              <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.patient_phone} onChange={e => setForm(f => ({ ...f, patient_phone: e.target.value }))}
                placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Age</label>
              <input type="number" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.patient_age} onChange={e => setForm(f => ({ ...f, patient_age: e.target.value }))}
                placeholder="35" min={1} max={120} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Gender</label>
              <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.patient_gender} onChange={e => setForm(f => ({ ...f, patient_gender: e.target.value }))}>
                {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Severity</label>
              <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {['mild','moderate','severe','critical'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 mb-1 block">Chief Complaint</label>
              <textarea className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2} value={form.chief_complaint}
                onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))}
                placeholder="e.g. Chest pain and shortness of breath for 2 days" />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {loading ? 'Registering...' : 'Register Inpatient'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Doctor+Bed Modal ──────────────────────────────────────────────────
function AssignModal({
  admission, beds, onClose, onSuccess,
}: { admission: Admission; beds: Bed[]; onClose: () => void; onSuccess: () => void }) {
  const [doctorName, setDoctorName] = useState('');
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableBeds = beds.filter(b => b.status === 'available');

  const handleAssign = async () => {
    if (!doctorName.trim()) { setError('Doctor name is required'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/admissions/${admission.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assigned_doctor_name: doctorName,
          bed_id: selectedBed?.id,
          bed_number: selectedBed?.bed_number,
          ward: selectedBed?.ward,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Assignment failed');
      onSuccess(); onClose();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Stethoscope className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-black">Assign Doctor + Bed</h2>
              <p className="text-indigo-200 text-xs">{admission.patient_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Assign Doctor *</label>
            <input className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={doctorName} onChange={e => setDoctorName(e.target.value)}
              placeholder="Dr. Rajesh Varma" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block">Select Bed (optional)</label>
            {availableBeds.length === 0
              ? <p className="text-sm text-slate-400 text-center py-4">No beds available</p>
              : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availableBeds.map(bed => (
                    <button key={bed.id} onClick={() => setSelectedBed(selectedBed?.id === bed.id ? null : bed)}
                      className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${
                        selectedBed?.id === bed.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
                      }`}>
                      <p className="font-black">{bed.bed_number}</p>
                      <p className="text-[10px] text-slate-500">{bed.ward}</p>
                    </button>
                  ))}
                </div>
              )
            }
          </div>

          <button onClick={handleAssign} disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {loading ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admission Card ───────────────────────────────────────────────────────────
function AdmissionCard({ admission, beds, onRefresh }: { admission: Admission; beds: Bed[]; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const stepIdx = STATUS_STEPS.findIndex(s => s.key === admission.status);

  return (
    <>
      {showAssign && (
        <AssignModal admission={admission} beds={beds}
          onClose={() => setShowAssign(false)} onSuccess={onRefresh} />
      )}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
        <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-black text-slate-800">{admission.patient_name}</h3>
              <p className="text-xs text-slate-500">
                {admission.patient_age && `${admission.patient_age}y`}
                {admission.patient_gender && ` · ${admission.patient_gender}`}
                {admission.patient_phone && ` · ${admission.patient_phone}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black px-2 py-1 rounded-full border capitalize ${SEVERITY_COLORS[admission.severity]}`}>
                {admission.severity}
              </span>
              {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="flex gap-1 mb-2">
            {STATUS_STEPS.map((s, i) => (
              <div key={s.key}
                className={`h-1 flex-1 rounded-full ${i <= stepIdx ? 'bg-blue-500' : 'bg-slate-100'}`} />
            ))}
          </div>
          <p className="text-xs font-bold text-blue-600">{STATUS_STEPS[stepIdx]?.label || admission.status}</p>
        </div>

        {expanded && (
          <div className="px-4 pb-4 border-t border-slate-50 pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 rounded-xl p-2.5">
                <p className="text-slate-400 font-bold mb-0.5">Doctor</p>
                <p className="font-black text-slate-700">{admission.assigned_doctor_name || '— Not assigned'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5">
                <p className="text-slate-400 font-bold mb-0.5">Bed</p>
                <p className="font-black text-slate-700">
                  {admission.bed_number ? `${admission.bed_number} · ${admission.ward}` : '— No bed assigned'}
                </p>
              </div>
            </div>
            {admission.chief_complaint && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                <span className="font-bold">Complaint:</span> {admission.chief_complaint}
              </p>
            )}
            {admission.status === 'registered' && (
              <button onClick={() => setShowAssign(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" /> Assign Doctor + Bed
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HospitalManagementPage() {
  const { user } = useUserRole();
  const hospitalName = user.hospitalName || 'Apollo Hospitals';

  const [tab, setTab] = useState<'beds' | 'admissions' | 'discharge'>('beds');
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [bedsByWard, setBedsByWard] = useState<Record<string, Bed[]>>({});
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [selectedWard, setSelectedWard] = useState('All');
  const [stats, setStats] = useState({ total: 0, available: 0, occupied: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bedsRes, admRes] = await Promise.all([
        fetch(`${API}/api/beds?hospital_name=${encodeURIComponent(hospitalName)}&limit=200`),
        fetch(`${API}/api/admissions?hospital_name=${encodeURIComponent(hospitalName)}&limit=100`),
      ]);
      const bedsData = await bedsRes.json();
      const admData  = await admRes.json();

      if (bedsData.success) {
        setBeds(bedsData.beds || []);
        setBedsByWard(bedsData.byWard || {});
        setStats({ total: bedsData.total, available: bedsData.available, occupied: bedsData.occupied });
      }
      if (admData.success) setAdmissions(admData.admissions || []);
    } catch { /* non-blocking */ }
    setLoading(false);
  }, [hospitalName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeAdmissions  = admissions.filter(a => a.status !== 'discharged');
  const dischargeReady    = admissions.filter(a => a.status === 'ready_for_discharge');
  const filteredAdmissions = activeAdmissions.filter(a =>
    a.patient_name.toLowerCase().includes(searchQ.toLowerCase()) ||
    (a.chief_complaint || '').toLowerCase().includes(searchQ.toLowerCase())
  );

  const displayBeds = selectedWard === 'All'
    ? beds
    : (bedsByWard[selectedWard] || []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 lg:p-8">
      {showRegister && (
        <RegisterPatientModal
          hospitalName={hospitalName}
          onClose={() => setShowRegister(false)}
          onSuccess={fetchData}
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-3xl p-6 mb-6 text-white shadow-xl">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black">{hospitalName}</h1>
              <p className="text-blue-200 text-sm">Hospital Management — Inpatient Control</p>
            </div>
          </div>
          <button onClick={() => setShowRegister(true)}
            className="flex items-center gap-2 bg-white text-blue-700 font-black px-5 py-2.5 rounded-2xl hover:bg-blue-50 transition-colors text-sm shadow-lg">
            <UserPlus className="h-4 w-4" /> Register Inpatient
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Beds', value: stats.total, color: 'bg-white/10' },
            { label: 'Available', value: stats.available, color: 'bg-emerald-500/30' },
            { label: 'Occupied', value: stats.occupied, color: 'bg-red-500/30' },
            { label: 'Active Patients', value: activeAdmissions.length, color: 'bg-amber-500/30' },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-2xl p-3 text-center backdrop-blur-sm`}>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs text-blue-100 font-bold">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'beds',       label: 'Bed Dashboard', icon: BedDouble },
          { key: 'admissions', label: `Active Admissions (${activeAdmissions.length})`, icon: User },
          { key: 'discharge',  label: `Discharge Queue (${dischargeReady.length})`, icon: LogOut },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
              tab === key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}>
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
        <button onClick={fetchData}
          className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold bg-white text-slate-500 border border-slate-200 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-blue-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="font-bold">Loading hospital data...</span>
        </div>
      ) : (
        <>
          {/* ── Bed Dashboard ── */}
          {tab === 'beds' && (
            <div className="space-y-6">
              {/* Ward filter */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {['All', ...WARDS].map(w => (
                  <button key={w} onClick={() => setSelectedWard(w)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                      selectedWard === w ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}>
                    {w}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { color: 'bg-emerald-100 border-emerald-300', label: 'Available' },
                  { color: 'bg-red-100 border-red-300',         label: 'Occupied' },
                  { color: 'bg-amber-100 border-amber-300',     label: 'Reserved' },
                  { color: 'bg-slate-100 border-slate-300',     label: 'Maintenance' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded border ${l.color}`} />
                    <span className="text-xs text-slate-500 font-bold">{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Bed grid */}
              {Object.entries(bedsByWard).filter(([ward]) => selectedWard === 'All' || ward === selectedWard).map(([ward, wardBeds]) => (
                <div key={ward} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h3 className="font-black text-slate-700 mb-3 flex items-center gap-2">
                    <BedDouble className="h-5 w-5 text-blue-500" />
                    {ward} Ward
                    <span className="text-xs font-bold text-slate-400 ml-auto">
                      {wardBeds.filter(b => b.status === 'available').length}/{wardBeds.length} free
                    </span>
                  </h3>
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {wardBeds.map(bed => (
                      <div key={bed.id}
                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-[10px] font-black transition-all ${BED_COLORS[bed.status]}`}
                        title={bed.status === 'occupied' ? `${bed.patient_name || 'Patient'}` : bed.status}>
                        <BedDouble className={`h-3.5 w-3.5 mb-0.5 ${
                          bed.status === 'available' ? 'text-emerald-500' :
                          bed.status === 'occupied'  ? 'text-red-500' : 'text-slate-400'
                        }`} />
                        <span className="text-[9px]">{bed.bed_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {Object.keys(bedsByWard).length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No beds found for {hospitalName}</p>
                  <p className="text-sm mt-1">Run the Supabase migration to auto-seed beds</p>
                </div>
              )}
            </div>
          )}

          {/* ── Active Admissions ── */}
          {tab === 'admissions' && (
            <div>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search by patient name or complaint..."
                  className="w-full border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>

              {filteredAdmissions.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No active admissions</p>
                  <p className="text-sm mt-1">Click "Register Inpatient" to admit a new patient</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAdmissions.map(a => (
                    <AdmissionCard key={a.id} admission={a} beds={beds} onRefresh={fetchData} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Discharge Queue ── */}
          {tab === 'discharge' && (
            <div>
              {dischargeReady.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <LogOut className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-bold">No patients pending discharge</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dischargeReady.map(a => (
                    <div key={a.id} className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-black text-slate-800">{a.patient_name}</h3>
                          <p className="text-xs text-slate-500">{a.bed_number} · {a.ward}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                          Ready to Discharge
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        <span className="font-bold">Doctor:</span> {a.assigned_doctor_name || '—'}
                      </p>
                      <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl">
                        ✅ Awaiting doctor to finalize discharge from Doctor Dashboard
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
