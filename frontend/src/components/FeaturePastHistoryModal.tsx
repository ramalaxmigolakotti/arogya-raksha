'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Trash2, Search, X, ChevronRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import {
  MedicalRecord,
  MedicalRecordType,
  getLocalHistory,
  deleteMedicalRecord,
  clearCategoryRecords,
} from '@/lib/medicalHistoryService';
import toast from 'react-hot-toast';

interface Props {
  featureTitle: string;
  types: MedicalRecordType[];
  icon?: string;
  buttonLabel?: string;
  className?: string;
}

export default function FeaturePastHistoryModal({
  featureTitle,
  types,
  icon = '🕒',
  buttonLabel,
  className = '',
}: Props) {
  const { user } = useUserRole();
  const activeUserId = user?.id || 'usr_pat_8812';

  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  const loadRecords = useCallback(() => {
    const all = getLocalHistory(activeUserId);
    const targetTypes = types || [];
    const filtered = targetTypes.length > 0 ? all.filter((r) => targetTypes.includes(r.type)) : all;
    setRecords(filtered);
  }, [activeUserId, types]);

  useEffect(() => {
    loadRecords();
    const handleUpdate = () => loadRecords();
    window.addEventListener('medical-history-updated', handleUpdate);
    return () => window.removeEventListener('medical-history-updated', handleUpdate);
  }, [loadRecords]);

  const handleDelete = async (recId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Delete this record permanently from your medical history?')) {
      await deleteMedicalRecord(activeUserId, recId);
      loadRecords();
      if (selectedRecord?.id === recId) {
        setSelectedRecord(null);
      }
      toast.success('Record deleted from history');
    }
  };

  const handleClearAll = async () => {
    if (confirm(`Permanently delete all past ${featureTitle} records? This action cannot be undone.`)) {
      await clearCategoryRecords(activeUserId, types);
      loadRecords();
      setSelectedRecord(null);
      toast.success(`Cleared all ${featureTitle} history`);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.userQuery && r.userQuery.toLowerCase().includes(q)) ||
      (r.aiResponse && r.aiResponse.toLowerCase().includes(q)) ||
      (r.summary && r.summary.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm border ${
          records.length > 0
            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60 hover:shadow-indigo-500/10'
            : 'bg-white/80 hover:bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        } ${className}`}
        title={`View your past ${featureTitle} data`}
      >
        <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>{buttonLabel || `View Past ${featureTitle}`}</span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
            records.length > 0
              ? 'bg-indigo-600 text-white dark:bg-indigo-500'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          {records.length}
        </span>
      </button>

      {/* Slide-over Drawer / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Past {featureTitle} History
                  </h3>
                  <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                    {records.length} {records.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Bound to: <strong>{user?.name || 'Patient'}</strong> ({user?.badgeId || 'Verified'})</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {records.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                    title="Clear all records in this feature"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Clear All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search your past ${featureTitle.toLowerCase()}...`}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Records Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar">
              {filteredRecords.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-2xl">
                    {icon}
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                    No Past Records Found
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Whenever you use {featureTitle}, your queries, inputs, and medical results will be preserved here permanently under your login credentials.
                  </p>
                </div>
              ) : (
                filteredRecords.map((rec) => {
                  const isExpanded = selectedRecord?.id === rec.id;
                  return (
                    <div
                      key={rec.id}
                      onClick={() => setSelectedRecord(isExpanded ? null : rec)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isExpanded
                          ? 'border-indigo-500/60 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-indigo-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {rec.title}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                              {rec.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(rec.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleDelete(rec.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Delete this record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight
                            className={`h-4 w-4 text-slate-400 transition-transform ${
                              isExpanded ? 'rotate-90 text-indigo-600' : ''
                            }`}
                          />
                        </div>
                      </div>

                      {/* Summary preview */}
                      {rec.summary && !isExpanded && (
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {rec.summary}
                        </p>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2.5 text-xs">
                          {rec.userQuery && (
                            <div className="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Input / Query:
                              </span>
                              <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-medium">
                                {rec.userQuery}
                              </p>
                            </div>
                          )}

                          {rec.aiResponse && (
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-100/60 dark:border-indigo-900/30">
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                                Output / Diagnosis / Advice:
                              </span>
                              <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap font-medium leading-relaxed">
                                {rec.aiResponse}
                              </p>
                            </div>
                          )}

                          {/* Metadata badges */}
                          {rec.metadata && Object.keys(rec.metadata).length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {Object.entries(rec.metadata).map(([k, v]) => {
                                if (v === undefined || v === null || typeof v === 'object') return null;
                                return (
                                  <span
                                    key={k}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                  >
                                    {k}: {String(v)}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Lifelong Medical Vault</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
