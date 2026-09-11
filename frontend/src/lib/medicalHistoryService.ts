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

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getStoredUserEmail(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('app-user-profile');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.email) return parsed.email;
    }
  } catch {}
  return undefined;
}

/**
 * Saves medical record to BOTH local storage and Supabase PostgreSQL.
 * Tied to the user's permanent authenticated credentials and email.
 */
export async function persistMedicalRecord(
  userId: string,
  record: Omit<MedicalRecord, 'id' | 'timestamp' | 'userId'> & { id?: string; timestamp?: string; userEmail?: string }
): Promise<MedicalRecord> {
  let effectiveUserId = userId;
  let effectiveEmail = record.userEmail || getStoredUserEmail();

  // If userId is default or falsy, try to resolve from active Supabase session
  if (isSupabaseConfigured && (effectiveUserId === 'usr_pat_8812' || !effectiveUserId || !effectiveEmail)) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (effectiveUserId === 'usr_pat_8812' || !effectiveUserId) {
          effectiveUserId = session.user.id;
        }
        if (!effectiveEmail) {
          effectiveEmail = session.user.email;
        }
      }
    } catch {}
  }

  // Ensure record has a valid RFC UUID for PostgreSQL primary key
  const finalId = (record.id && record.id.length >= 32 && record.id.includes('-'))
    ? record.id
    : generateUUID();

  const finalMetadata = {
    ...(record.metadata || {}),
    user_email: effectiveEmail || '',
    email: effectiveEmail || '',
    user_id: effectiveUserId,
  };

  const finalRecord: MedicalRecord = {
    id: finalId,
    userId: effectiveUserId,
    userEmail: effectiveEmail,
    timestamp: record.timestamp || new Date().toISOString(),
    ...record,
    metadata: finalMetadata,
  };

  // 1. Immediately save to localStorage across active keys (guarantees offline availability & instant UI reaction)
  saveLocalHistory(effectiveUserId, finalRecord);
  if (effectiveEmail && effectiveEmail !== effectiveUserId) {
    saveLocalHistory(effectiveEmail, finalRecord);
  }
  if (userId && userId !== effectiveUserId) {
    saveLocalHistory(userId, finalRecord);
  }

  // 2. Persist to Supabase if configured & active
  if (isSupabaseConfigured) {
    try {
      const row = {
        id: finalRecord.id,
        user_id: effectiveUserId,
        type: finalRecord.type,
        record_type: finalRecord.type,
        title: finalRecord.title,
        user_query: finalRecord.userQuery || null,
        ai_response: finalRecord.aiResponse || null,
        summary: finalRecord.summary || null,
        metadata: finalMetadata,
        created_at: finalRecord.timestamp,
      };

      const { error: upsertErr } = await supabase.from('patient_health_records').upsert(row, { onConflict: 'id' });
      if (upsertErr) {
        // Fallback to plain insert if upsert conflict target encountered an issue
        await supabase.from('patient_health_records').insert(row);
      }
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
  const email = getStoredUserEmail();
  if (email) deleteLocalRecord(email, recordId);

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('patient_health_records')
        .delete()
        .eq('id', recordId);
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
  const email = getStoredUserEmail();
  if (email) clearLocalHistory(email, types);

  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('patient_health_records').delete().in('type', types);
      if (email && userId) {
        query = query.or(`user_id.eq.${userId},metadata->>user_email.eq.${email}`);
      } else {
        query = query.eq('user_id', userId);
      }
      await query;
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

/**
 * Synchronizes medical records from Supabase cloud into local storage for this user.
 * Supports querying by both User ID and User Email so records are restored across devices & deployments.
 */
export async function syncUserRecordsFromCloud(userId: string, userEmail?: string): Promise<MedicalRecord[]> {
  if (typeof window === 'undefined' || !isSupabaseConfigured) return getLocalHistory(userId);

  const effectiveEmail = userEmail || getStoredUserEmail();
  const effectiveUserId = userId || 'usr_pat_8812';

  try {
    let query = supabase
      .from('patient_health_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (effectiveUserId && effectiveEmail) {
      query = query.or(`user_id.eq.${effectiveUserId},user_id.eq.${effectiveEmail},metadata->>user_email.eq.${effectiveEmail},metadata->>email.eq.${effectiveEmail}`);
    } else if (effectiveUserId) {
      query = query.or(`user_id.eq.${effectiveUserId},user_id.eq.usr_pat_8812`);
    } else if (effectiveEmail) {
      query = query.or(`metadata->>user_email.eq.${effectiveEmail},metadata->>email.eq.${effectiveEmail},user_id.eq.${effectiveEmail}`);
    }

    const { data, error } = await query;

    if (error || !data) {
      return getLocalHistory(effectiveUserId);
    }

    const cloudRecords: MedicalRecord[] = data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.metadata?.user_email || row.metadata?.email || effectiveEmail || undefined,
      type: (row.type || row.record_type || 'health_tracker') as MedicalRecordType,
      title: row.title || 'Medical Record',
      summary: row.summary || row.user_query || '',
      userQuery: row.user_query || undefined,
      aiResponse: row.ai_response || undefined,
      metadata: row.metadata || {},
      timestamp: row.created_at || new Date().toISOString(),
    }));

    const localPrimary = getLocalHistory(effectiveUserId);
    const localEmail = effectiveEmail ? getLocalHistory(effectiveEmail) : [];
    const idMap = new Map<string, MedicalRecord>();

    cloudRecords.forEach((r) => idMap.set(r.id, r));
    localPrimary.forEach((r) => { if (!idMap.has(r.id)) idMap.set(r.id, r); });
    localEmail.forEach((r) => { if (!idMap.has(r.id)) idMap.set(r.id, r); });

    const merged = Array.from(idMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    localStorage.setItem(`${STORAGE_PREFIX}${effectiveUserId}`, JSON.stringify(merged));
    if (effectiveEmail) {
      localStorage.setItem(`${STORAGE_PREFIX}${effectiveEmail}`, JSON.stringify(merged));
    }
    localStorage.setItem('arogya_medical_history', JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('medical-history-updated', { detail: { userId: effectiveUserId, count: merged.length } }));
    return merged;
  } catch (err) {
    console.warn('Failed to sync records from cloud:', err);
    return getLocalHistory(effectiveUserId);
  }
}
