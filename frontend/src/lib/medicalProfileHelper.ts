'use client';

import { getFullPatientDossier, FullPatientDossier } from './medicalPassportService';

export interface ExtractedMedicalProfile {
  fullName: string;
  age: number | string;
  gender: string;
  bloodGroup: string;
  heightCm: number | string;
  weightKg: number | string;
  bmi: number | string;
  bpSystolic: number | string;
  bpDiastolic: number | string;
  sugarFasting: number | string;
  sugarPP: number | string;
  pulseRate: number | string;
  conditions: string[];
  allergies: string[];
  medications: string[];
  isDiabetic: boolean;
  isHypertensive: boolean;
  hasAllergies: boolean;
  isOnBpMeds: boolean;
  isPregnant: boolean;
  isObese: boolean;
  village?: string;
  rawProfile: any;
}

export function getActiveMedicalProfile(userId?: string): ExtractedMedicalProfile {
  const uid = userId || 'usr_pat_8812';
  let raw: any = null;

  if (typeof window !== 'undefined') {
    try {
      // 1. Check user-specific key
      const specific = localStorage.getItem(`arogya_medical_profile_${uid}`);
      if (specific) raw = JSON.parse(specific);

      // 2. If not found, look for any arogya_medical_profile_* key in localStorage
      if (!raw) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('arogya_medical_profile_') && !key.includes('guest')) {
            const val = localStorage.getItem(key);
            if (val) {
              raw = JSON.parse(val);
              break;
            }
          }
        }
      }

      // 3. Check generic fallback keys
      if (!raw) {
        const gen = localStorage.getItem('arogya_medical_profile') || localStorage.getItem('arogya_medical_profile_guest');
        if (gen) raw = JSON.parse(gen);
      }
    } catch (e) {
      console.warn('[medicalProfileHelper] Error reading localStorage:', e);
    }
  }

  // Fall back to the patient dossier defaults
  const dossier: FullPatientDossier = getFullPatientDossier(uid);

  const fullName = raw?.full_name || dossier.personal.fullName || 'Rahul Sharma';
  const age = raw?.age || dossier.personal.age || 32;
  const rawGender = (raw?.gender || dossier.personal.gender || 'Male').toLowerCase();
  const gender = rawGender.startsWith('f') ? 'Female' : 'Male';
  const bloodGroup = raw?.blood_group || dossier.personal.bloodGroup || 'O+';
  const heightCm = Number(raw?.height_cm || dossier.personal.heightCm || 174);
  const weightKg = Number(raw?.weight_kg || dossier.personal.weightKg || 68);

  const calculatedBmi =
    heightCm > 0 && weightKg > 0
      ? Math.round((weightKg / ((heightCm / 100) * (heightCm / 100))) * 10) / 10
      : 22.5;

  const bpSystolic = raw?.bp_systolic || dossier.vitals.bpSystolic || 120;
  const bpDiastolic = raw?.bp_diastolic || dossier.vitals.bpDiastolic || 80;
  const sugarFasting = raw?.sugar_level_fasting || dossier.vitals.sugarFasting || 98;
  const sugarPP = raw?.sugar_level_pp || dossier.vitals.sugarPP || 135;
  const pulseRate = raw?.pulse_rate || dossier.vitals.pulseRate || 72;

  const conditions: string[] = raw?.conditions || dossier.medical.conditions || [];
  const allergies: string[] = raw?.allergies || dossier.medical.allergies || [];
  const medications: string[] = raw?.current_medications || dossier.medical.currentMedications || [];

  const isDiabetic =
    conditions.some((c: string) => c.toLowerCase().includes('diabet')) ||
    Number(sugarFasting) > 125 ||
    Number(sugarPP) > 180;

  const isHypertensive =
    conditions.some((c: string) => c.toLowerCase().includes('hyper') || c.toLowerCase().includes('bp') || c.toLowerCase().includes('pressure')) ||
    Number(bpSystolic) >= 130;

  const isOnBpMeds =
    medications.some((m: string) => /telmi|amlo|losar|ateno|beta|olme|enal|ramip|bp/i.test(m)) ||
    isHypertensive;

  const hasAllergies = allergies.length > 0;
  const isPregnant = conditions.some((c: string) => c.toLowerCase().includes('pregnant'));
  const isObese = calculatedBmi >= 30;

  return {
    fullName,
    age,
    gender,
    bloodGroup,
    heightCm,
    weightKg,
    bmi: calculatedBmi,
    bpSystolic,
    bpDiastolic,
    sugarFasting,
    sugarPP,
    pulseRate,
    conditions,
    allergies,
    medications,
    isDiabetic,
    isHypertensive,
    hasAllergies,
    isOnBpMeds,
    isPregnant,
    isObese,
    village: raw?.village || dossier.personal.village,
    rawProfile: raw,
  };
}

/**
 * Maps an active medical profile to the exact input keys required by a specific predictor.
 */
export function mapProfileToPredictorInputs(
  profile: ExtractedMedicalProfile,
  predictorId: string,
  fields: any[]
): Record<string, string> {
  const inputs: Record<string, string> = {};

  fields.forEach(f => {
    const key = f.id || f.key;
    if (!key) return;
    const lowerKey = key.toLowerCase();

    if (lowerKey === 'age') {
      inputs[key] = String(profile.age);
    } else if (lowerKey === 'gender' || lowerKey === 'sex') {
      if (f.options?.includes('Male')) {
        inputs[key] = profile.gender;
      } else if (f.options?.includes('1')) {
        inputs[key] = profile.gender === 'Male' ? '1' : '0';
      } else {
        inputs[key] = profile.gender;
      }
    } else if (lowerKey === 'sysbp' || lowerKey === 'systolic' || lowerKey === 'bpsystolic' || (lowerKey === 'bp' && f.max > 120)) {
      inputs[key] = String(profile.bpSystolic);
    } else if (lowerKey === 'diabp' || lowerKey === 'diastolic' || lowerKey === 'bpdiastolic') {
      inputs[key] = String(profile.bpDiastolic);
    } else if (lowerKey === 'bmi') {
      inputs[key] = String(profile.bmi);
    } else if (lowerKey === 'glucose' || lowerKey === 'bloodsugar' || lowerKey === 'sugarlevel' || (lowerKey === 'sugar' && f.max > 10)) {
      inputs[key] = String(profile.sugarFasting);
    } else if (lowerKey === 'heartrate' || lowerKey === 'pulse' || lowerKey === 'pulserate') {
      inputs[key] = String(profile.pulseRate);
    } else if (lowerKey === 'diabetes' || lowerKey === 'diabetic') {
      inputs[key] = profile.isDiabetic ? 'Yes' : 'No';
    } else if (lowerKey === 'hypertension' || lowerKey === 'highbp') {
      inputs[key] = profile.isHypertensive ? 'Yes' : 'No';
    } else if (lowerKey === 'bpmeds' || lowerKey === 'bpmedication') {
      inputs[key] = profile.isOnBpMeds ? 'Yes' : 'No';
    } else if (lowerKey === 'allergies') {
      inputs[key] = profile.hasAllergies ? 'Yes' : 'No';
    } else if (lowerKey === 'obesity' || lowerKey === 'obese') {
      inputs[key] = profile.isObese ? 'Yes' : 'No';
    } else if (lowerKey === 'smoking' || lowerKey === 'smoker') {
      inputs[key] = f.options?.includes('Never') ? 'Never' : 'No';
    } else if (lowerKey === 'alcohol') {
      inputs[key] = f.type === 'number' ? '0' : 'No';
    } else if (lowerKey === 'familyhistory' || lowerKey === 'family_history') {
      inputs[key] = 'No';
    }
  });

  return inputs;
}
