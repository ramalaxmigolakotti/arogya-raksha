'use client';

import { supabase, isSupabaseConfigured } from './supabaseClient';

export type MedicalRecordType =
  | 'symptom_check'
  | 'ai_doctor_consultation'
  | 'health_prediction'
  | 'medicine_scan'
  | 'hospital_appointment'
  | 'doctor_consultation'
  | 'medicine_order'
  | 'diagnostic_booking'
  | 'ambulance_booking'
  | 'emergency_sos'
  | 'medical_report_analysis'
  | 'health_quiz'
  | 'health_tracker';

export interface MedicalRecord {
  id: string;
  userId: string;
  userEmail?: string;
  type: MedicalRecordType;
  title: string;
  userQuery?: string;
  aiResponse?: string;
  summary?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface FeatureCategory {
  id: string;
  name: string;
  icon: string;
  types: MedicalRecordType[];
  path: string;
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  { id: 'symptom_checker', name: 'Symptom Checker', icon: '🩺', types: ['symptom_check', 'ai_doctor_consultation'], path: '/dashboard/ai' },
  { id: 'medicine_finder', name: 'Medicine Finder', icon: '💊', types: ['medicine_order'], path: '/dashboard/medicines' },
  { id: 'medicine_scanner', name: 'Medicine Scanner', icon: '🔍', types: ['medicine_scan'], path: '/dashboard/scanner' },
  { id: 'doctors', name: 'Doctors', icon: '👨‍⚕️', types: ['doctor_consultation'], path: '/dashboard/doctors' },
  { id: 'diagnostic_centre', name: 'Diagnostic Centre', icon: '🔬', types: ['diagnostic_booking'], path: '/dashboard/diagnostic-centre' },
  { id: 'hospitals', name: 'Hospitals', icon: '🏥', types: ['hospital_appointment'], path: '/dashboard/hospitals' },
  { id: 'health_predictors', name: 'Health Predictors', icon: '🧠', types: ['health_prediction', 'health_quiz'], path: '/dashboard/predictors' },
  { id: 'medical_reports', name: 'Medical Reports', icon: '📄', types: ['medical_report_analysis'], path: '/dashboard/reports' },
  { id: 'health_tracker', name: 'Health Tracker', icon: '💓', types: ['health_tracker'], path: '/dashboard/profile' },
];

const STORAGE_PREFIX = 'arogya_medical_history_';

export function getLocalHistory(userId: string, typeFilter?: MedicalRecordType): MedicalRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    let all: MedicalRecord[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      // Filter out legacy demo mock items
      all = parsed.filter(
        (r: MedicalRecord) =>
          !['rec_symp_01', 'rec_ai_02', 'rec_pred_03', 'rec_scan_04', 'rec_hosp_05'].includes(r.id)
      );
    }
    return typeFilter ? all.filter((r) => r.type === typeFilter) : all;
  } catch {
    return [];
  }
}

export function saveLocalHistory(userId: string, record: MedicalRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalHistory(userId);
    // Deduplicate if same ID
    const filtered = existing.filter((r) => r.id !== record.id);
    const updated = [record, ...filtered];
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('medical-history-updated', { detail: { userId, record } }));
  } catch (err) {
    console.warn('Failed to save local medical history:', err);
  }
}

export function deleteLocalRecord(userId: string, recordId: string): MedicalRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = getLocalHistory(userId);
    const updated = existing.filter((r) => r.id !== recordId);
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('medical-history-updated', { detail: { userId } }));
    return updated;
  } catch {
    return [];
  }
}

export function clearLocalHistory(userId: string, types?: MedicalRecordType[] | MedicalRecordType): void {
  if (typeof window === 'undefined') return;
  try {
    if (!types) {
      localStorage.removeItem(`${STORAGE_PREFIX}${userId}`);
    } else {
      const typeList = Array.isArray(types) ? types : [types];
      const existing = getLocalHistory(userId);
      const remaining = existing.filter((r) => !typeList.includes(r.type));
      localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(remaining));
    }
    window.dispatchEvent(new CustomEvent('medical-history-updated', { detail: { userId } }));
  } catch (err) {
    console.warn('Failed to clear medical history:', err);
  }
}

/**
 * Saves medical record to BOTH local storage and Supabase PostgreSQL.
 * Tied to the user's permanent authenticated credentials.
 */
export async function persistMedicalRecord(
  userId: string,
  record: Omit<MedicalRecord, 'id' | 'timestamp' | 'userId'> & { id?: string; timestamp?: string }
): Promise<MedicalRecord> {
  const finalRecord: MedicalRecord = {
    id: record.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    timestamp: record.timestamp || new Date().toISOString(),
    ...record,
  };

  // 1. Immediately save to localStorage (guarantees offline availability & instant UI reaction)
  saveLocalHistory(userId, finalRecord);

  // 2. Persist to Supabase if configured & active
  if (isSupabaseConfigured) {
    try {
      await supabase.from('patient_health_records').upsert({
        id: finalRecord.id.includes('-') && finalRecord.id.length >= 32 ? finalRecord.id : undefined,
        user_id: userId,
        type: finalRecord.type,
        record_type: finalRecord.type,
        title: finalRecord.title,
        user_query: finalRecord.userQuery || null,
        ai_response: finalRecord.aiResponse || null,
        summary: finalRecord.summary || null,
        metadata: finalRecord.metadata || {},
        created_at: finalRecord.timestamp,
      });
    } catch (supabaseErr) {
      console.warn('Supabase sync notice (local saved):', supabaseErr);
    }
  }

  return finalRecord;
}

/**
 * Deletes a record from BOTH local storage and Supabase permanently.
 */
export async function deleteMedicalRecord(userId: string, recordId: string): Promise<void> {
  deleteLocalRecord(userId, recordId);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('patient_health_records')
        .delete()
        .match({ user_id: userId, id: recordId });
    } catch (err) {
      console.warn('Supabase deletion notice:', err);
    }
  }
}

/**
 * Clears an entire category of records for this user from local storage and Supabase.
 */
export async function clearCategoryRecords(userId: string, types: MedicalRecordType[]): Promise<void> {
  clearLocalHistory(userId, types);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('patient_health_records')
        .delete()
        .eq('user_id', userId)
        .in('type', types);
    } catch (err) {
      console.warn('Supabase category clear notice:', err);
    }
  }
}

/**
 * Gets count of medical records for a user, optionally filtered by type.
 */
export function getUserMedicalHistoryCount(userId: string, typeFilter?: MedicalRecordType): number {
  return getLocalHistory(userId, typeFilter).length;
}
