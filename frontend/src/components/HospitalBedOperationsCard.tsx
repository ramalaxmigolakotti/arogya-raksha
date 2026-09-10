'use client';

import React, { useState, useEffect } from 'react';
import {
  Bed as BedIcon, AlertTriangle, CheckCircle2, Sparkles, RefreshCw,
  Clock, ShieldAlert, ArrowRight, UserPlus, LogOut, Check, Filter
} from 'lucide-react';
import { useHealthcareJourney } from '@/context/HealthcareJourneyContext';
import toast from 'react-hot-toast';

export type BedStatus = 'available' | 'occupied' | 'cleaning' | 'reserved';

export interface HospitalBed {
  id: string; // e.g. "ICU-01"
  ward: 'Emergency Trauma' | 'Intensive Care (ICU)' | 'High Dependency (HDU)' | 'General Ward' | 'Day-Care Recovery';
  status: BedStatus;
  patientName?: string;
  patientToken?: number;
  journeyId?: string;
  admittedAt?: string;
  lastCleanedAt?: string;
  notes?: string;
}

const DEFAULT_BEDS: HospitalBed[] = [
  {
    id: 'EMERG-01',
    ward: 'Emergency Trauma',
    status: 'reserved',
    patientName: 'Incoming 108 Ambulance',
    patientToken: 14,
    admittedAt: '12 mins ago',
    notes: 'Severe respiratory distress, oxygen pipeline on standby',
  },
  {
    id: 'EMERG-02',
    ward: 'Emergency Trauma',
    status: 'occupied',
    patientName: 'K. Venkatesh',
    patientToken: 8,
    admittedAt: '45 mins ago',
    notes: 'Acute trauma stabilization',
  },
  {
    id: 'EMERG-03',
    ward: 'Emergency Trauma',
    status: 'available',
    lastCleanedAt: '10 mins ago',
    notes: 'Ventilator tested & ready',
  },
  {
    id: 'EMERG-04',
    ward: 'Emergency Trauma',
    status: 'cleaning',
    lastCleanedAt: 'Cleaning in progress',
    notes: 'Deep sterilization and linen replacement underway',
  },
  {
    id: 'ICU-01',
    ward: 'Intensive Care (ICU)',
    status: 'occupied',
    patientName: 'R. Ramana Murthy',
    patientToken: 3,
    admittedAt: '2 hrs ago',
    notes: 'Post-cardiac catheterization monitoring',
  },
  {
    id: 'ICU-02',
    ward: 'Intensive Care (ICU)',
    status: 'occupied',
    patientName: 'P. Subba Rao',
    patientToken: 5,
    admittedAt: '1 hr ago',
    notes: 'Continuous arterial line BP tracking',
  },
  {
    id: 'ICU-03',
    ward: 'Intensive Care (ICU)',
    status: 'cleaning',
    notes: 'Sanitization cycle 2/3: UV-C disinfection',
  },
  {
    id: 'ICU-04',
    ward: 'Intensive Care (ICU)',
    status: 'available',
    lastCleanedAt: '25 mins ago',
    notes: 'Invasive hemodynamics monitor primed',
  },
  {
    id: 'HDU-01',
    ward: 'High Dependency (HDU)',
    status: 'available',
    lastCleanedAt: '1 hr ago',
  },
  {
    id: 'HDU-02',
    ward: 'High Dependency (HDU)',
    status: 'occupied',
    patientName: 'G. Satyavathi',
    patientToken: 11,
    admittedAt: '3 hrs ago',
    notes: 'Post-op observation',
  },
  {
    id: 'GEN-101',
    ward: 'General Ward',
    status: 'occupied',
    patientName: 'Rahul Sharma',
    patientToken: 1,
    admittedAt: 'Today 10:15 AM',
    notes: 'IV antibiotics cycle 1',
  },
  {
    id: 'GEN-102',
    ward: 'General Ward',
    status: 'cleaning',
    notes: 'Patient discharged. Bed being sanitized.',
  },
  {
    id: 'GEN-103',
    ward: 'General Ward',
    status: 'available',
    lastCleanedAt: '30 mins ago',
  },
  {
    id: 'GEN-104',
    ward: 'General Ward',
    status: 'available',
    lastCleanedAt: '15 mins ago',
  },
  {
    id: 'DAY-01',
    ward: 'Day-Care Recovery',
    status: 'available',
    lastCleanedAt: '40 mins ago',
  },
  {
    id: 'DAY-02',
    ward: 'Day-Care Recovery',
    status: 'occupied',
    patientName: 'M. Padmavati',
    patientToken: 9,
    admittedAt: '1 hr ago',
    notes: 'Chemotherapy day infusion',
  },
];

export default function HospitalBedOperationsCard() {
  const [beds, setBeds] = useState<HospitalBed[]>(DEFAULT_BEDS);
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigningBedId, setAssigningBedId] = useState<string | null>(null);
  const { journeys } = useHealthcareJourney();

  // Load from local storage if previously modified
  useEffect(() => {
    try {
      const saved = localStorage.getItem('arogya_hospital_beds_v1');
      if (saved) {
        setBeds(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveBeds = (newBeds: HospitalBed[]) => {
    setBeds(newBeds);
    try {
      localStorage.setItem('arogya_hospital_beds_v1', JSON.stringify(newBeds));
    } catch {}
  };

  // Status transitions
  const markAsAvailable = (bedId: string) => {
    const updated = beds.map((b) =>
      b.id === bedId
        ? {
            ...b,
            status: 'available' as BedStatus,
            patientName: undefined,
            patientToken: undefined,
            admittedAt: undefined,
            lastCleanedAt: 'Just now',
            notes: 'Sanitized and inspected for next patient',
          }
        : b
    );
    saveBeds(updated);
    toast.success(`${bedId} marked as SANITIZED & READY`);
  };

  const markAsCleaning = (bedId: string) => {
    const updated = beds.map((b) =>
      b.id === bedId
        ? {
            ...b,
            status: 'cleaning' as BedStatus,
            patientName: undefined,
            patientToken: undefined,
            admittedAt: undefined,
            notes: 'Patient discharged. Sanitization & linen change in progress',
          }
        : b
    );
    saveBeds(updated);
    toast.success(`${bedId} moved to SANITIZING / CLEANING queue`);
  };

  const assignBedToPatient = (bedId: string, patientName: string, token: number) => {
    const updated = beds.map((b) =>
      b.id === bedId
        ? {
            ...b,
            status: 'occupied' as BedStatus,
            patientName,
            patientToken: token,
            admittedAt: 'Just now',
            notes: `Admitted: Token #${token} (${patientName})`,
          }
        : b
    );
    saveBeds(updated);
    setAssigningBedId(null);
    toast.success(`${bedId} successfully ASSIGNED to ${patientName}`);
  };

  // Stats
  const totalBeds = beds.length;
  const availableCount = beds.filter((b) => b.status === 'available').length;
  const occupiedCount = beds.filter((b) => b.status === 'occupied').length;
  const cleaningCount = beds.filter((b) => b.status === 'cleaning').length;
  const reservedCount = beds.filter((b) => b.status === 'reserved').length;
  const occupancyRate = Math.round(((occupiedCount + reservedCount) / totalBeds) * 100);

  const filteredBeds = beds.filter((b) => {
    const matchWard = wardFilter === 'all' || b.ward === wardFilter;
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchWard && matchStatus;
  });

  const availablePatients = journeys.filter(
    (j) => j.currentStep === 'checked_in' || j.currentStep === 'consulting' || j.currentStep === 'transit'
  );

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
      {/* Header & Status Pill Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <BedIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Hospital Bed & Ward Operations Grid
                </h3>
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  CareQueue Real-Time
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Monitor available beds, occupied trauma units, and beds undergoing sanitization / preparation
              </p>
            </div>
          </div>
        </div>

        {/* Real-Time Bed Counter Metrics */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <span className="text-slate-500 font-bold block text-[10px]">READY / AVAILABLE</span>
            <span className="font-black text-emerald-700 text-sm">{availableCount} Beds</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
            <span className="text-slate-500 font-bold block text-[10px]">OCCUPIED</span>
            <span className="font-black text-rose-700 text-sm">{occupiedCount} Beds</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <span className="text-slate-500 font-bold block text-[10px]">SANITIZING / PREP</span>
            <span className="font-black text-amber-700 text-sm">{cleaningCount} Beds</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
            <span className="text-slate-500 font-bold block text-[10px]">108 RESERVED</span>
            <span className="font-black text-purple-700 text-sm">{reservedCount} Beds</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold">
            <span className="text-slate-400 block text-[10px]">OCCUPANCY</span>
            <span className="font-black text-white text-sm">{occupancyRate}%</span>
          </div>
        </div>
      </div>

      {/* Ward & Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 rounded-xl font-bold">
          {['all', 'Emergency Trauma', 'Intensive Care (ICU)', 'High Dependency (HDU)', 'General Ward', 'Day-Care Recovery'].map((w) => (
            <button
              key={w}
              onClick={() => setWardFilter(w)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                wardFilter === w ? 'bg-white text-indigo-700 shadow-sm font-extrabold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {w === 'all' ? 'All Wards' : w.replace('Intensive Care (ICU)', 'ICU').replace('High Dependency (HDU)', 'HDU')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
          <span className="text-slate-400 px-2 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Status:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'available', label: 'Available (🟢)' },
            { id: 'occupied', label: 'Occupied (🔴)' },
            { id: 'cleaning', label: 'Sanitizing (🟡)' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-2 py-1 rounded-lg transition-all ${
                statusFilter === s.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bed Grid Visual Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredBeds.map((bed) => {
          const isAvail = bed.status === 'available';
          const isOcc = bed.status === 'occupied';
          const isClean = bed.status === 'cleaning';
          const isRes = bed.status === 'reserved';

          return (
            <div
              key={bed.id}
              className={`rounded-2xl p-4 border transition-all relative flex flex-col justify-between space-y-3 ${
                isAvail
                  ? 'bg-emerald-50/40 border-emerald-200/80 hover:border-emerald-400 hover:shadow-md'
                  : isOcc
                  ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-400'
                  : isClean
                  ? 'bg-amber-50/50 border-amber-200/80 hover:border-amber-400'
                  : 'bg-purple-50/50 border-purple-200/80 hover:border-purple-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 px-2 py-0.5 bg-white border border-slate-200 rounded-md shadow-xs">
                      {bed.id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">{bed.ward}</span>
                  </div>

                  {/* Status Indicator Badge */}
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      isAvail
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isOcc
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : isClean
                        ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                        : 'bg-purple-100 text-purple-800 border-purple-300'
                    }`}
                  >
                    {isAvail ? 'Available' : isOcc ? 'Occupied' : isClean ? 'Sanitizing' : '108 Reserved'}
                  </span>
                </div>

                {/* Bed Patient / Status Details */}
                <div className="mt-3 space-y-1">
                  {isOcc && (
                    <>
                      <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                        <span className="text-xs px-1.5 py-0.2 bg-slate-900 text-white rounded font-mono">
                          #{bed.patientToken}
                        </span>
                        <span>{bed.patientName}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Admitted: <span className="font-semibold text-slate-700">{bed.admittedAt}</span>
                      </p>
                    </>
                  )}

                  {isRes && (
                    <>
                      <p className="font-extrabold text-purple-900 text-sm flex items-center gap-1">
                        <span>🚑 {bed.patientName}</span>
                      </p>
                      <p className="text-[11px] text-purple-700 font-medium">
                        Transit ETA: <span className="font-bold">Under 8 mins</span>
                      </p>
                    </>
                  )}

                  {isClean && (
                    <>
                      <p className="font-bold text-amber-900 text-xs flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        <span>Linen Change & Sterilization</span>
                      </p>
                      <p className="text-[11px] text-amber-700">Bed being prepared for next intake</p>
                    </>
                  )}

                  {isAvail && (
                    <>
                      <p className="font-bold text-emerald-800 text-xs flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Ready for Immediate Admission</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Sterilized: {bed.lastCleanedAt}</p>
                    </>
                  )}

                  {bed.notes && (
                    <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1">
                      Note: {bed.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons for Bed Staff */}
              <div className="border-t border-slate-200/60 pt-2.5 flex items-center justify-between gap-1 text-[11px]">
                {isAvail && (
                  <button
                    onClick={() => setAssigningBedId(bed.id)}
                    className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>Assign Patient</span>
                  </button>
                )}

                {isOcc && (
                  <div className="flex items-center gap-1 w-full">
                    <button
                      onClick={() => markAsCleaning(bed.id)}
                      className="flex-1 py-1 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center justify-center gap-1 text-[10px] transition-colors"
                      title="Discharge patient and send bed to sanitization"
                    >
                      <LogOut className="h-3 w-3 text-amber-400" />
                      <span>Discharge & Clean</span>
                    </button>
                  </div>
                )}

                {isClean && (
                  <button
                    onClick={() => markAsAvailable(bed.id)}
                    className="w-full py-1.5 px-2 bg-amber-600 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center justify-center gap-1 shadow-xs transition-colors text-[11px]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Mark Sanitized (Ready)</span>
                  </button>
                )}

                {isRes && (
                  <button
                    onClick={() => markAsAvailable(bed.id)}
                    className="w-full py-1 text-purple-700 hover:bg-purple-100 rounded-lg font-bold text-[10px] transition-colors"
                  >
                    Cancel 108 Hold
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient Assignment Modal */}
      {assigningBedId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-black text-slate-900 text-base">Assign Bed: {assigningBedId}</h4>
                <p className="text-xs text-slate-500">Select an active patient from today's OPD / Emergency intake</p>
              </div>
              <button
                onClick={() => setAssigningBedId(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {availablePatients.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <p className="font-bold">No active checked-in patients waiting for admission.</p>
                  <button
                    onClick={() => assignBedToPatient(assigningBedId, 'Manual Patient Intake', Math.floor(Math.random() * 80) + 20)}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                  >
                    Assign Generic Emergency Patient
                  </button>
                </div>
              ) : (
                availablePatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => assignBedToPatient(assigningBedId, p.patientName, p.tokenNumber)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="font-extrabold text-xs text-slate-900">
                        Token #{p.tokenNumber} • {p.patientName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {p.age} yrs • {p.village} • {p.department}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-lg font-bold">
                      Select
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setAssigningBedId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
