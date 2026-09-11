'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Users, Clock, CheckCircle,
  UserCheck, Stethoscope, ArrowRight, Search,
  ToggleLeft, ToggleRight, Navigation,
  Activity, AlertTriangle, Zap, Flame,
  LayoutDashboard, BedDouble, Plus, X, ClipboardCheck,
  LogOut, CircleAlert
} from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import { useHealthcareJourney } from '@/context/HealthcareJourneyContext';
import HospitalBedOperationsCard from '@/components/HospitalBedOperationsCard';
import Link from 'next/link';
import toast from 'react-hot-toast';

// ─── CareQueue design tokens ──────────────────────────────────────────────────
const CQ = {
  paper: '#FFFFFF',
  panel: '#FFFFFF',
  ink: '#16324A',
  inkSoft: '#6C8598',
  line: '#D8E6EF',
  urgent: '#B8433A',
  accent: '#1E76C4',
};

const VIEW_THEMES = {
  overview: { accent: '#1E76C4', tint: '#EAF4FC', label: 'Command overview' },
  flow:     { accent: '#1F8A6F', tint: '#EAF7F1', label: 'Live journey board' },
  beds:     { accent: '#B8703A', tint: '#FBF1E6', label: 'Ward capacity' },
  depts:    { accent: '#7A5C9E', tint: '#F3EEFA', label: 'Department load' },
} as const;

type ViewKey = keyof typeof VIEW_THEMES;

const STAGES = [
  { key: 'registration',  label: 'Registration',    color: '#7A5C9E' },
  { key: 'waiting',       label: 'Waiting Area',     color: '#C98A2E' },
  { key: 'consultation',  label: 'Consultation',     color: '#1F8A6F' },
  { key: 'diagnostics',   label: 'Diagnostics',      color: '#3E7A9E' },
  { key: 'procedure',     label: 'Procedure',        color: '#B8433A' },
  { key: 'bed',           label: 'Bed / Admission',  color: '#3D7A4A' },
  { key: 'discharge',     label: 'Discharge Ready',  color: '#8C8272' },
];
const stageIndex = (k: string) => STAGES.findIndex((s) => s.key === k);

const CQ_DEPARTMENTS = ['Emergency', 'General Medicine', 'Orthopedics', 'Cardiology', 'Pediatrics'];
const WARDS = ['A', 'B', 'C'];

interface CQBed {
  id: string; ward: string;
  status: 'available' | 'occupied' | 'cleaning';
  patientId: string | null;
}
interface CQPatient {
  id: string; name: string; age: number; dept: string;
  stage: string; priority: 'urgent' | 'normal';
  enteredAt: number; bedId?: string;
}

const initialBeds: CQBed[] = WARDS.flatMap((w) =>
  Array.from({ length: 4 }, (_, i) => ({
    id: `${w}${i + 1}`, ward: w,
    status: (i === 3 && w !== 'C' ? 'cleaning' : 'available') as CQBed['status'],
    patientId: null,
  }))
);

const seedPatients: CQPatient[] = [
  { id: 'P-104', name: 'R. Venkatesh', age: 58, dept: 'Cardiology',       stage: 'bed',          priority: 'urgent', enteredAt: -22, bedId: 'A2' },
  { id: 'P-118', name: 'S. Lakshmi',   age: 34, dept: 'General Medicine',  stage: 'waiting',      priority: 'normal', enteredAt: -9 },
  { id: 'P-121', name: 'K. Naidu',     age: 71, dept: 'Emergency',         stage: 'diagnostics',  priority: 'urgent', enteredAt: -19 },
  { id: 'P-125', name: 'A. Priya',     age: 6,  dept: 'Pediatrics',        stage: 'consultation', priority: 'normal', enteredAt: -4 },
  { id: 'P-129', name: 'M. Rao',       age: 45, dept: 'Orthopedics',       stage: 'procedure',    priority: 'normal', enteredAt: -12 },
  { id: 'P-131', name: 'T. Devi',      age: 62, dept: 'General Medicine',  stage: 'discharge',    priority: 'normal', enteredAt: -3, bedId: 'B1' },
  { id: 'P-133', name: 'V. Krishna',   age: 29, dept: 'Emergency',         stage: 'registration', priority: 'urgent', enteredAt: -1 },
  { id: 'P-136', name: 'N. Sarita',    age: 40, dept: 'Cardiology',        stage: 'waiting',      priority: 'normal', enteredAt: -16 },
];

const seededBeds: CQBed[] = initialBeds.map((b) => {
  const occ = seedPatients.find((p) => p.bedId === b.id);
  return occ ? { ...b, status: 'occupied', patientId: occ.id } : b;
});

let cqIdCounter = 200;

// ─── Sub-components ───────────────────────────────────────────────────────────

function CQNavItem({ icon: Icon, label, active, theme, onClick }: {
  icon: React.ElementType; label: string; active: boolean;
  theme: { accent: string }; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-left w-full"
      style={{ background: active ? `${theme.accent}1A` : 'transparent', color: active ? theme.accent : CQ.inkSoft, fontWeight: active ? 700 : 400 }}>
      <Icon size={16} />{label}
    </button>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const s = STAGES.find((x) => x.key === stage)!;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
      style={{ background: `${s.color}1A`, color: s.color, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: s.color, display: 'inline-block' }} />
      {s.label}
    </span>
  );
}

function PatientCard({ p, elapsed, delayed, onSelect }: {
  p: CQPatient; elapsed: number; delayed: boolean; onSelect: (id: string) => void;
}) {
  const stageColor = STAGES.find((s) => s.key === p.stage)?.color ?? CQ.accent;
  const borderColor = delayed ? CQ.urgent : CQ.line;
  return (
    <button onClick={() => onSelect(p.id)} className="w-full text-left rounded-lg p-3 mb-2 transition-colors"
      style={{
        background: CQ.panel,
        borderTop: `1px solid ${borderColor}`,
        borderRight: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${p.priority === 'urgent' ? CQ.urgent : stageColor}`,
      }}>
      <div className="flex items-center justify-between">
        <span style={{ fontWeight: 600, fontSize: 14, color: CQ.ink }}>{p.name}</span>
        <span style={{ fontSize: 11, color: CQ.inkSoft }}>{p.id}</span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span style={{ fontSize: 12, color: CQ.inkSoft }}>{p.dept} · {p.age}y</span>
        <span className="flex items-center gap-1"
          style={{ fontSize: 12, color: delayed ? CQ.urgent : CQ.inkSoft, fontWeight: delayed ? 600 : 400 }}>
          <Clock size={11} /> {elapsed}m
        </span>
      </div>
      {p.priority === 'urgent' && (
        <div className="mt-1.5 flex items-center gap-1" style={{ fontSize: 11, color: CQ.urgent, fontWeight: 600 }}>
          <CircleAlert size={12} /> Priority attention
        </div>
      )}
    </button>
  );
}

function FlowBoard({ patients, elapsed, isDelayed, onSelect }: {
  patients: CQPatient[]; elapsed: (p: CQPatient) => number;
  isDelayed: (p: CQPatient) => boolean; onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2" style={{ minHeight: 500 }}>
      {STAGES.map((s) => {
        const inStage = patients.filter((p) => p.stage === s.key);
        return (
          <div key={s.key} className="shrink-0" style={{ width: 230 }}>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span style={{ width: 8, height: 8, borderRadius: 99, background: s.color }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: CQ.ink }}>{s.label}</span>
              <span style={{ fontSize: 12, color: CQ.inkSoft, marginLeft: 'auto' }}>{inStage.length}</span>
            </div>
            <div style={{ minHeight: 60 }}>
              {inStage.length === 0 && <div style={{ fontSize: 12, color: CQ.inkSoft, padding: '8px 4px' }}>No patients</div>}
              {inStage.map((p) => (
                <PatientCard key={p.id} p={p} elapsed={elapsed(p)} delayed={isDelayed(p)} onSelect={onSelect} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CQOverview({ patients, beds, bedsAvail, delayedCount, avgWaitByStage, elapsed, theme }: {
  patients: CQPatient[]; beds: CQBed[]; bedsAvail: number; delayedCount: number;
  avgWaitByStage: { key: string; label: string; color: string; avg: number; count: number }[];
  elapsed: (p: CQPatient) => number; theme: { accent: string };
}) {
  const urgent = patients.filter((p) => p.priority === 'urgent').length;
  const cards = [
    { label: 'Active patients',   value: patients.length,
      sub: `${urgent} flagged urgent` },
    { label: 'Beds available',    value: `${bedsAvail} / ${beds.length}`,
      sub: `${beds.filter((b) => b.status === 'cleaning').length} being prepared` },
    { label: 'Delayed in queue',  value: delayedCount,
      sub: 'over 15 min at stage' },
    { label: 'Discharge ready',   value: patients.filter((p) => p.stage === 'discharge').length,
      sub: 'awaiting bed turnover' },
  ];
  const maxAvg = Math.max(1, ...avgWaitByStage.map((s) => s.avg));
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg p-4"
            style={{
              background: CQ.panel,
              borderTop: `3px solid ${theme.accent}`,
              borderRight: `1px solid ${CQ.line}`,
              borderBottom: `1px solid ${CQ.line}`,
              borderLeft: `1px solid ${CQ.line}`,
            }}>
            <div style={{ fontSize: 12, color: CQ.inkSoft }}>{c.label}</div>
            <div style={{ fontSize: 28, fontFamily: 'Georgia, serif', color: theme.accent }}>{c.value}</div>
            <div style={{ fontSize: 11.5, color: CQ.inkSoft }}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg p-5" style={{ background: CQ.panel, border: `1px solid ${CQ.line}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: theme.accent }}>Average time at each stage</div>
        <div className="flex flex-col gap-3">
          {avgWaitByStage.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <div style={{ width: 120, fontSize: 12.5, color: CQ.inkSoft }}>{s.label}</div>
              <div className="flex-1 rounded-full overflow-hidden" style={{ background: '#EFEDE6', height: 10 }}>
                <div style={{ width: `${(s.avg / maxAvg) * 100}%`, background: s.color, height: '100%' }} />
              </div>
              <div style={{ width: 70, fontSize: 12, color: CQ.inkSoft, textAlign: 'right' }}>{s.avg}m · {s.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BedsView({ beds, patients, onAssign, onStatus, theme }: {
  beds: CQBed[]; patients: CQPatient[];
  onAssign: (patientId: string, bedId: string) => void;
  onStatus: (bedId: string, status: CQBed['status']) => void;
  theme: { accent: string };
}) {
  const waitingForBed = patients.filter((p) => p.stage === 'bed' && !p.bedId);
  const statusColor: Record<string, string> = { available: '#2F7A4F', occupied: CQ.ink, cleaning: '#D9942B' };
  return (
    <div>
      {waitingForBed.length > 0 && (
        <div className="mb-5 rounded-lg p-3 flex items-center gap-2"
          style={{ background: '#FBF3E7', border: '1px solid #E9D3AA', fontSize: 13, color: CQ.ink }}>
          <AlertTriangle size={15} color="#B9791F" />
          {waitingForBed.length} patient{waitingForBed.length > 1 ? 's' : ''} awaiting a bed:{' '}
          {waitingForBed.map((p) => p.name).join(', ')}
        </div>
      )}
      {WARDS.map((w) => (
        <div key={w} className="mb-6">
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: theme.accent }}>Ward {w}</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {beds.filter((b) => b.ward === w).map((b) => {
              const occ = patients.find((p) => p.id === b.patientId);
              return (
                <div key={b.id} className="rounded-lg p-3"
                  style={{
                    background: CQ.panel,
                    borderTop: `3px solid ${statusColor[b.status]}`,
                    borderRight: `1px solid ${CQ.line}`,
                    borderBottom: `1px solid ${CQ.line}`,
                    borderLeft: `1px solid ${CQ.line}`,
                  }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontWeight: 700, fontSize: 14, color: CQ.ink }}>Bed {b.id}</span>
                    <span style={{ fontSize: 11, color: statusColor[b.status], fontWeight: 600, textTransform: 'capitalize' }}>{b.status}</span>
                  </div>
                  {occ && <div style={{ fontSize: 12, color: CQ.inkSoft, marginTop: 4 }}>{occ.name} · {occ.dept}</div>}
                  {b.status === 'cleaning' && (
                    <button onClick={() => onStatus(b.id, 'available')} className="mt-2 text-xs px-2 py-1 rounded"
                      style={{ background: '#EFEDE6', color: CQ.ink }}>Mark ready</button>
                  )}
                  {b.status === 'available' && waitingForBed.length > 0 && (
                    <button onClick={() => onAssign(waitingForBed[0].id, b.id)} className="mt-2 text-xs px-2 py-1 rounded"
                      style={{ background: theme.accent, color: '#fff' }}>
                      Assign {waitingForBed[0].name.split(' ')[0]}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeptsView({ patients, elapsed, onSelect, theme }: {
  patients: CQPatient[]; elapsed: (p: CQPatient) => number;
  onSelect: (id: string) => void; theme: { accent: string };
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {CQ_DEPARTMENTS.map((d) => {
        const group = patients.filter((p) => p.dept === d);
        return (
          <div key={d} className="rounded-lg p-4"
            style={{
              background: CQ.panel,
              borderTop: `1px solid ${CQ.line}`,
              borderRight: `1px solid ${CQ.line}`,
              borderBottom: `1px solid ${CQ.line}`,
              borderLeft: `3px solid ${theme.accent}`,
            }}>
            <div className="flex items-center justify-between mb-2">
              <div style={{ fontWeight: 700, fontSize: 14, color: theme.accent }}>{d}</div>
              <div style={{ fontSize: 12, color: CQ.inkSoft }}>{group.length} patients</div>
            </div>
            {group.length === 0 && <div style={{ fontSize: 12, color: CQ.inkSoft }}>No patients currently</div>}
            {group.map((p) => (
              <button key={p.id} onClick={() => onSelect(p.id)} className="w-full flex items-center justify-between py-1.5"
                style={{ borderTop: `1px solid ${CQ.line}` }}>
                <span style={{ fontSize: 13, color: CQ.ink }}>{p.name}</span>
                <StageBadge stage={p.stage} />
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PatientPanel({ patient, elapsed, delayed, beds, onClose, onAdvance, onDischarge, onTogglePriority, onAssignBed }: {
  patient: CQPatient; elapsed: number; delayed: boolean; beds: CQBed[];
  onClose: () => void; onAdvance: () => void; onDischarge: () => void;
  onTogglePriority: () => void; onAssignBed: (bedId: string) => void;
}) {
  const idx = stageIndex(patient.stage);
  const nextStage = STAGES[idx + 1];
  const availableBeds = beds.filter((b) => b.status === 'available');
  return (
    <div className="fixed inset-0 flex justify-end z-50" style={{ background: 'rgba(27,36,48,0.35)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="h-full w-96 p-5 overflow-auto" style={{ background: CQ.panel }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div style={{ fontSize: 19, fontFamily: 'Georgia, serif', color: CQ.ink }}>{patient.name}</div>
            <div style={{ fontSize: 12.5, color: CQ.inkSoft }}>{patient.id} · {patient.age}y · {patient.dept}</div>
          </div>
          <button onClick={onClose} style={{ color: CQ.inkSoft }}><X size={18} /></button>
        </div>
        <StageBadge stage={patient.stage} />
        {delayed && (
          <div className="mt-2 flex items-center gap-1.5" style={{ color: CQ.urgent, fontSize: 12.5, fontWeight: 600 }}>
            <AlertTriangle size={13} /> Waiting longer than expected
          </div>
        )}
        <div className="mt-4 flex items-center gap-2" style={{ fontSize: 13, color: CQ.inkSoft }}>
          <Clock size={14} /> {elapsed} minutes at current stage
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {nextStage && (
            <button onClick={onAdvance} className="flex items-center justify-center gap-2 py-2 rounded-md text-sm"
              style={{ background: CQ.ink, color: '#fff' }}>
              Move to {nextStage.label} <ArrowRight size={14} />
            </button>
          )}
          {patient.stage === 'discharge' && (
            <button onClick={onDischarge} className="flex items-center justify-center gap-2 py-2 rounded-md text-sm"
              style={{ background: '#3D7A4A', color: '#fff' }}>
              <LogOut size={14} /> Complete discharge
            </button>
          )}
          <button onClick={onTogglePriority} className="flex items-center justify-center gap-2 py-2 rounded-md text-sm"
            style={{ border: `1px solid ${CQ.line}`, color: CQ.ink, background: 'transparent' }}>
            {patient.priority === 'urgent' ? 'Remove priority flag' : 'Flag for priority attention'}
          </button>
        </div>
        {patient.stage === 'bed' && !patient.bedId && (
          <div className="mt-5">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: CQ.ink }}>Assign a bed</div>
            {availableBeds.length === 0 && <div style={{ fontSize: 12.5, color: CQ.inkSoft }}>No beds available</div>}
            <div className="flex flex-wrap gap-2">
              {availableBeds.map((b) => (
                <button key={b.id} onClick={() => onAssignBed(b.id)} className="px-2.5 py-1 rounded-md text-xs"
                  style={{ border: `1px solid ${CQ.line}`, color: CQ.ink, background: 'transparent' }}>Bed {b.id}</button>
              ))}
            </div>
          </div>
        )}
        {patient.bedId && (
          <div className="mt-5 flex items-center gap-2" style={{ fontSize: 13, color: CQ.ink }}>
            <BedDouble size={15} /> Assigned to bed {patient.bedId}
          </div>
        )}
        <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${CQ.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: CQ.ink }}>Journey so far</div>
          <div className="flex flex-col gap-2">
            {STAGES.slice(0, idx + 1).map((s, i) => (
              <div key={s.key} className="flex items-center gap-2"
                style={{ fontSize: 12.5, color: i === idx ? CQ.ink : CQ.inkSoft }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: s.color }} />
                {s.label}
                {i === idx && <ClipboardCheck size={13} style={{ marginLeft: 'auto' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (form: { name: string; age: string; dept: string; priority: 'urgent' | 'normal' }) => void;
}) {
  const [form, setForm] = useState({ name: '', age: '', dept: CQ_DEPARTMENTS[0], priority: 'normal' as 'urgent' | 'normal' });
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(27,36,48,0.35)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-96 rounded-lg p-5" style={{ background: CQ.panel }}>
        <div className="flex items-center justify-between mb-4">
          <div style={{ fontSize: 17, fontFamily: 'Georgia, serif', color: CQ.ink }}>Register new patient</div>
          <button onClick={onClose} style={{ color: CQ.inkSoft }}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 12, color: CQ.inkSoft }}>Full name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-md text-sm"
              style={{ border: `1px solid ${CQ.line}`, color: CQ.ink, background: CQ.panel }}
              placeholder="e.g. B. Anand" />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 12, color: CQ.inkSoft }}>Age</span>
            <input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} type="number"
              className="w-full px-2.5 py-1.5 rounded-md text-sm"
              style={{ border: `1px solid ${CQ.line}`, color: CQ.ink, background: CQ.panel }}
              placeholder="e.g. 47" />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 12, color: CQ.inkSoft }}>Department</span>
            <select value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-md text-sm"
              style={{ border: `1px solid ${CQ.line}`, color: CQ.ink, background: CQ.panel }}>
              {CQ_DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 12, color: CQ.inkSoft }}>Priority</span>
            <div className="flex gap-2">
              {(['normal', 'urgent'] as const).map((p) => (
                <button key={p} onClick={() => setForm({ ...form, priority: p })} className="flex-1 py-1.5 rounded-md text-sm capitalize"
                  style={{ background: form.priority === p ? CQ.ink : '#F6F5F1', color: form.priority === p ? '#fff' : CQ.ink }}>
                  {p}
                </button>
              ))}
            </div>
          </label>
        </div>
        <button disabled={!form.name} onClick={() => onSubmit(form)} className="w-full mt-5 py-2 rounded-md text-sm"
          style={{ background: form.name ? CQ.ink : CQ.line, color: '#fff' }}>
          Register at Registration
        </button>
      </div>
    </div>
  );
}

// ─── CareQueue embedded section ───────────────────────────────────────────────
function CareQueueSection() {
  const [tick, setTick] = useState(30);
  const [patients, setPatients] = useState<CQPatient[]>(
    seedPatients.map((p) => ({ ...p, enteredAt: 30 + p.enteredAt }))
  );
  const [beds, setBeds] = useState<CQBed[]>(seededBeds);
  const [view, setView] = useState<ViewKey>('flow');
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => setTick((t) => t + 1), 4000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const elapsed = (p: CQPatient) => Math.max(0, tick - p.enteredAt);
  const isDelayed = (p: CQPatient) =>
    ['waiting', 'diagnostics', 'procedure'].includes(p.stage) && elapsed(p) >= 15;

  function advanceStage(id: string) {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const idx = stageIndex(p.stage);
        if (idx >= STAGES.length - 1) return p;
        return { ...p, stage: STAGES[idx + 1].key, enteredAt: tick };
      })
    );
  }

  function completeDischarge(id: string) {
    const p = patients.find((x) => x.id === id);
    if (p?.bedId) {
      setBeds((prev) =>
        prev.map((b) => (b.id === p.bedId ? { ...b, status: 'cleaning', patientId: null } : b))
      );
    }
    setPatients((prev) => prev.filter((x) => x.id !== id));
    setSelected(null);
  }

  function togglePriority(id: string) {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, priority: p.priority === 'urgent' ? 'normal' : 'urgent' } : p))
    );
  }

  function assignBed(patientId: string, bedId: string) {
    setBeds((prev) => prev.map((b) => (b.id === bedId ? { ...b, status: 'occupied', patientId } : b)));
    setPatients((prev) => prev.map((p) => (p.id === patientId ? { ...p, bedId } : p)));
  }

  function setBedStatus(bedId: string, status: CQBed['status']) {
    setBeds((prev) =>
      prev.map((b) =>
        b.id === bedId ? { ...b, status, patientId: status === 'available' ? null : b.patientId } : b
      )
    );
  }

  function addPatient(form: { name: string; age: string; dept: string; priority: 'urgent' | 'normal' }) {
    const id = `P-${cqIdCounter++}`;
    setPatients((prev) => [
      ...prev,
      { id, name: form.name, age: Number(form.age) || 0, dept: form.dept,
        stage: 'registration', priority: form.priority, enteredAt: tick },
    ]);
    setShowAdd(false);
  }

  const visible = patients.filter(
    (p) => p.name.toLowerCase().includes(query.toLowerCase()) ||
           p.id.toLowerCase().includes(query.toLowerCase())
  );
  const bedsAvail = beds.filter((b) => b.status === 'available').length;
  const delayedCount = patients.filter(isDelayed).length;
  const avgWaitByStage = STAGES.map((s) => {
    const inStage = patients.filter((p) => p.stage === s.key);
    const avg = inStage.length
      ? Math.round(inStage.reduce((a, p) => a + elapsed(p), 0) / inStage.length)
      : 0;
    return { ...s, avg, count: inStage.length };
  });

  const selectedPatient = patients.find((p) => p.id === selected);
  const theme = VIEW_THEMES[view];

  return (
    <div className="rounded-3xl overflow-hidden border border-slate-200/80 shadow-sm"
      style={{ background: CQ.paper, color: CQ.ink }}>

      {/* Header bar */}
      <div className="px-6 py-4 bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl"><Activity className="h-5 w-5 text-white" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">CareQueue</h2>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                LIVE · Swarnandhra General
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {patients.length} active patients ·{' '}
              {String(8 + Math.floor(tick / 60)).padStart(2, '0')}:{String(tick % 60).padStart(2, '0')} hospital time
              {delayedCount > 0 && (
                <span className="ml-2 text-red-400 font-bold">· ⚠ {delayedCount} delayed</span>
              )}
            </p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: theme.accent, color: '#fff' }}>
          <Plus size={15} /> Register Patient
        </button>
      </div>

      <div className="flex min-h-[600px]" style={{ background: CQ.paper }}>
        {/* Sidebar */}
        <aside className="w-48 shrink-0 flex flex-col py-4 px-3 gap-1"
          style={{ borderRight: `1px solid ${CQ.line}`, background: CQ.panel }}>
          <CQNavItem icon={LayoutDashboard} label="Overview"    active={view === 'overview'} theme={VIEW_THEMES.overview} onClick={() => setView('overview')} />
          <CQNavItem icon={Users}          label="Patient Flow" active={view === 'flow'}     theme={VIEW_THEMES.flow}     onClick={() => setView('flow')} />
          <CQNavItem icon={BedDouble}      label="Beds"         active={view === 'beds'}     theme={VIEW_THEMES.beds}     onClick={() => setView('beds')} />
          <CQNavItem icon={Building2}      label="Departments"  active={view === 'depts'}    theme={VIEW_THEMES.depts}    onClick={() => setView('depts')} />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: `2px solid ${theme.accent}`, background: CQ.panel }}>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span style={{ width: 7, height: 7, borderRadius: 99, background: theme.accent, display: 'inline-block' }} />
                <span style={{ fontSize: 11, color: theme.accent, fontWeight: 700 }}>{theme.label}</span>
              </div>
              <h3 style={{ fontFamily: 'Georgia, ui-serif, serif', fontSize: 18, color: CQ.ink }}>
                {view === 'overview' && 'Operations Overview'}
                {view === 'flow'     && 'Patient Flow Board'}
                {view === 'beds'     && 'Bed Status'}
                {view === 'depts'    && 'Department Queues'}
              </h3>
            </div>
            {view === 'flow' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                style={{ border: `1px solid ${CQ.line}`, background: CQ.panel }}>
                <Search size={14} color={CQ.inkSoft} />
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search patient or ID"
                  style={{ outline: 'none', fontSize: 13, width: 140, color: CQ.ink, background: 'transparent' }} />
              </div>
            )}
          </header>

          <div className="flex-1 overflow-auto p-5" style={{ background: theme.tint }}>
            {view === 'overview' && (
              <CQOverview patients={patients} beds={beds} bedsAvail={bedsAvail}
                delayedCount={delayedCount} avgWaitByStage={avgWaitByStage}
                elapsed={elapsed} theme={theme} />
            )}
            {view === 'flow' && (
              <FlowBoard patients={visible} elapsed={elapsed} isDelayed={isDelayed} onSelect={setSelected} />
            )}
            {view === 'beds' && (
              <BedsView beds={beds} patients={patients} onAssign={assignBed} onStatus={setBedStatus} theme={theme} />
            )}
            {view === 'depts' && (
              <DeptsView patients={patients} elapsed={elapsed} onSelect={setSelected} theme={theme} />
            )}
          </div>
        </div>
      </div>

      {selectedPatient && (
        <PatientPanel
          patient={selectedPatient} elapsed={elapsed(selectedPatient)} delayed={isDelayed(selectedPatient)}
          beds={beds} onClose={() => setSelected(null)} onAdvance={() => advanceStage(selectedPatient.id)}
          onDischarge={() => completeDischarge(selectedPatient.id)}
          onTogglePriority={() => togglePriority(selectedPatient.id)}
          onAssignBed={(bedId) => assignBed(selectedPatient.id, bedId)} />
      )}
      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSubmit={addPatient} />}
    </div>
  );
}

// ─── Doctor schedule type ─────────────────────────────────────────────────────
interface DoctorSchedule {
  id: string; name: string; specialty: string; room: string;
  fee: number; isAvailable: boolean; slotsToday: number; bookedSlots: number;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function HospitalAdminDashboardView() {
  const { setRole } = useUserRole();
  const { journeys, checkInPatient, completeJourney } = useHealthcareJourney();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [doctors, setDoctors] = useState<DoctorSchedule[]>([
    { id: 'usr_doc_9941',   name: 'Dr. Rajesh Varma',  specialty: 'Cardiology & Internal Medicine', room: 'OPD Room #4', fee: 500, isAvailable: true,  slotsToday: 30, bookedSlots: 22 },
    { id: 'usr_doc_anita',  name: 'Dr. Anita Sharma',  specialty: 'Obstetrics & Gynecology',        room: 'OPD Room #2', fee: 500, isAvailable: true,  slotsToday: 25, bookedSlots: 19 },
    { id: 'usr_doc_suresh', name: 'Dr. Suresh Kumar',  specialty: 'Orthopedics & Trauma',           room: 'OPD Room #7', fee: 450, isAvailable: false, slotsToday: 20, bookedSlots: 0  },
    { id: 'usr_doc_priya',  name: 'Dr. Priya Nair',    specialty: 'Pediatrics & Neonatology',       room: 'OPD Room #1', fee: 400, isAvailable: true,  slotsToday: 25, bookedSlots: 16 },
  ]);

  const toggleDoctorAvailability = (docId: string) => {
    setDoctors((prev) => prev.map((d) => (d.id === docId ? { ...d, isAvailable: !d.isAvailable } : d)));
  };

  const filteredJourneys = journeys.filter((j) => {
    const matchesSearch =
      j.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.village.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'all'             ? true
      : filterStatus === 'pending_checkin' ? j.currentStep === 'booked' || j.currentStep === 'transit'
      : filterStatus === 'checked_in'      ? j.currentStep === 'checked_in'
      : filterStatus === 'consulting'      ? j.currentStep === 'consulting'
      : j.currentStep === 'completed';
    return matchesSearch && matchesStatus;
  });

  const getPatientTAT = (j: any) => {
    const diffMins = Math.max(2, Math.round((Date.now() - new Date(j.timestamps?.bookedAt || Date.now()).getTime()) / 60000));
    if (j.currentStep === 'completed')                                     return { text: '34m total TAT',            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (['out_for_delivery','medicines_packed'].includes(j.currentStep))   return { text: `${diffMins + 12}m in flow`, badge: 'bg-indigo-50 text-indigo-700 border-indigo-200'   };
    if (['prescribed','consulting'].includes(j.currentStep))               return { text: `${diffMins + 6}m in flow`,  badge: 'bg-blue-50 text-blue-700 border-blue-200'         };
    return { text: `${diffMins}m in flow`, badge: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const totalPatientsToday = journeys.length;
  const checkedInCount = journeys.filter((j) => j.currentStep !== 'booked' && j.currentStep !== 'transit').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-16">

      {/* ── TOP BANNER ── */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest font-bold text-indigo-400">Hospital Administration & Operations</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full font-bold">Apollo Hospitals Network</span>
            </div>
            <p className="text-sm text-slate-300 font-medium mt-0.5">
              CareQueue Live Board • Doctor Schedules • OPD Check-In • Revenue Analytics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <Link href="/dashboard/hospital-management"
            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" /> Inpatient Management
          </Link>
          <button onClick={() => setRole('doctor')}   className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md">Doctor EHR View</button>
          <button onClick={() => setRole('pharmacy')} className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md">Pharmacy View</button>
          <button onClick={() => setRole('asha')}     className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700">ASHA View</button>
        </div>
      </div>

      {/* ── METRICS GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">OPD Registered</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Users className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalPatientsToday + 45}</p>
          <p className="text-xs text-slate-500 mt-1"><span className="text-emerald-600 font-bold">↑ 14%</span> vs yesterday</p>
        </div>
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checked-In Patients</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><UserCheck className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-black text-indigo-600 mt-2">{checkedInCount + 38}</p>
          <p className="text-xs text-slate-500 mt-1">In Waiting Lounges</p>
        </div>
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doctors On Duty</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Stethoscope className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-black text-emerald-600 mt-2">{doctors.filter((d) => d.isAvailable).length} / {doctors.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active Consultation Rooms</p>
        </div>
        <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg OPD Wait Time</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Clock className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2">16 mins</p>
          <p className="text-xs text-emerald-600 font-bold mt-1">Fast Queue Flow Active</p>
        </div>
      </div>

      {/* ── CAREQUEUE INTERACTIVE BOARD ── */}
      <CareQueueSection />

      {/* ── BED OPERATIONS ── */}
      <HospitalBedOperationsCard />

      {/* ── OPD CHECK-IN DESK ── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">OPD Reception & Arrival Check-In Desk</h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Live Reception Stream</span>
            </div>
            <p className="text-sm text-slate-500 font-medium mt-1">Verify incoming rural & urban patients, check them into doctor waiting queue with 1 click</p>
          </div>
          <Link href="/dashboard/tracking" className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5 text-indigo-400" /><span>Full Realtime Radar</span>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient name, Journey ID, or village..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all" />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto overflow-x-auto">
            {[
              { key: 'all', label: 'All Patients' }, { key: 'pending_checkin', label: 'Pending Arrival' },
              { key: 'checked_in', label: 'Checked-In' }, { key: 'consulting', label: 'In Consultation' },
              { key: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${filterStatus === tab.key ? 'bg-white text-indigo-600 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 rounded-l-xl">Token & ID</th>
                <th className="py-3 px-4">Patient & Village</th>
                <th className="py-3 px-4">Doctor & Department</th>
                <th className="py-3 px-4">Slot Time</th>
                <th className="py-3 px-4">Journey Stage</th>
                <th className="py-3 px-4">Stage TAT</th>
                <th className="py-3 px-4">Billing</th>
                <th className="py-3 px-4 text-right rounded-r-xl">Action & Discharge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredJourneys.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600"><Users className="h-6 w-6" /></div>
                      <p className="font-extrabold text-slate-800 text-sm">No Patients in Reception Queue</p>
                      <p className="text-xs text-slate-400">When patients book an OPD token or an ASHA worker assists a rural booking, their arrival entry will appear here for reception check-in.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJourneys.map((j) => {
                  const isPendingCheckin = j.currentStep === 'booked' || j.currentStep === 'transit';
                  const tat = getPatientTAT(j);
                  return (
                    <tr key={j.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm px-2.5 py-1 bg-slate-900 text-white rounded-lg">#{j.tokenNumber}</span>
                          <div><p className="font-bold text-slate-900">{j.id}</p><p className="text-[10px] text-slate-400">{j.appointmentId}</p></div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-extrabold text-slate-900 text-sm">{j.patientName}</p>
                        <p className="text-slate-500 text-[11px]">{j.age} yrs • {j.gender} • <span className="font-semibold text-indigo-600">{j.village}</span></p>
                        {j.ashaWorkerName && <span className="inline-block mt-0.5 text-[10px] bg-blue-50 text-blue-700 px-1.5 rounded font-bold">Via ASHA: {j.ashaWorkerName}</span>}
                      </td>
                      <td className="py-3.5 px-4"><p className="font-bold text-slate-900">{j.doctorName}</p><p className="text-slate-500 text-[11px]">{j.department}</p></td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">{j.slotTime}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
                          j.currentStep === 'booked'       ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : j.currentStep === 'transit'    ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                          : j.currentStep === 'checked_in' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : j.currentStep === 'consulting' ? 'bg-blue-600 text-white border-blue-600'
                          : j.currentStep === 'completed'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {j.currentStep === 'transit' && '🚑 '}{j.currentStep.replace('_',' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${tat.badge}`}>
                          <Clock className="h-3 w-3" />{tat.text}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {j.paymentStatus === 'free_bpl_aarogyasri'
                          ? <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">AAROGYASRI FREE</span>
                          : <span className="text-[11px] font-extrabold text-slate-900">₹{j.consultationFee} (PAID)</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isPendingCheckin ? (
                          <button onClick={() => checkInPatient(j.id)} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all">Check In Patient</button>
                        ) : j.currentStep === 'completed' ? (
                          <span className="text-[11px] text-emerald-600 font-extrabold flex items-center justify-end gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /><span>Discharge Cleared</span>
                          </span>
                        ) : (
                          <button onClick={() => { completeJourney(j.id); toast.success(`Discharge clearance approved for #${j.tokenNumber} ${j.patientName}!`); }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1">
                            <span>Clear Discharge</span><ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DOCTOR SCHEDULE ── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">Doctor Availability & Slot Lock Management</h3>
            <p className="text-xs text-slate-500 font-medium">Synchronize doctor schedules with the online patient app and ASHA booking desk</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{doctors.length} Doctors Configured</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {doctors.map((doc) => (
            <div key={doc.id} className={`p-5 rounded-3xl border transition-all space-y-3 ${doc.isAvailable ? 'bg-slate-50/60 border-slate-200/80 hover:border-indigo-300' : 'bg-slate-100/60 border-slate-200 opacity-60'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">{doc.room}</span>
                <button onClick={() => toggleDoctorAvailability(doc.id)} className="flex items-center gap-1 text-xs font-bold">
                  {doc.isAvailable
                    ? <span className="text-emerald-600 flex items-center gap-1"><ToggleRight className="h-5 w-5" /> Available</span>
                    : <span className="text-slate-400 flex items-center gap-1"><ToggleLeft className="h-5 w-5" /> Off-Duty</span>}
                </button>
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-base">{doc.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{doc.specialty}</p>
              </div>
              <div className="border-t border-slate-200/70 pt-3 flex items-center justify-between text-xs">
                <div><span className="text-slate-400 text-[10px] uppercase font-bold">Fee</span><p className="font-black text-slate-900">₹{doc.fee}</p></div>
                <div><span className="text-slate-400 text-[10px] uppercase font-bold">Booked</span><p className="font-black text-indigo-600">{doc.bookedSlots} / {doc.slotsToday}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
