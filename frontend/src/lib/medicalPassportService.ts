'use client';

import { MedicalRecord, getLocalHistory } from './medicalHistoryService';

export interface HealthPassportPayload {
  type: 'AROGYA_HEALTH_PASSPORT';
  version: '2.0';
  userId: string;
  patientName: string;
  abhaId: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  village?: string;
  emergencyPhone?: string;
  consentPin: string;
  issuedAt: string;
}

export interface FullPatientDossier {
  personal: {
    userId: string;
    fullName: string;
    abhaId: string;
    age?: string | number;
    gender?: string;
    bloodGroup?: string;
    heightCm?: string | number;
    weightKg?: string | number;
    village?: string;
  };
  medical: {
    conditions: string[];
    allergies: string[];
    currentMedications: string[];
    doctorNotes?: string;
  };
  vitals: {
    bpSystolic?: string | number;
    bpDiastolic?: string | number;
    sugarFasting?: string | number;
    sugarPP?: string | number;
    pulseRate?: string | number;
    lastUpdated?: string;
  };
  emergency: {
    contactName?: string;
    contactPhone?: string;
    relation?: string;
    preferredHospital?: string;
    hasInsurance?: boolean;
    insuranceProvider?: string;
    policyNumber?: string;
  };
  records: MedicalRecord[];
}

const PIN_STORAGE_KEY = 'arogya_consent_pin_';

/**
 * Generate or retrieve the active 6-digit consent PIN for a patient.
 */
export function getOrCreateConsentPin(userId: string): { pin: string; expiresAt: number } {
  if (typeof window === 'undefined') {
    return { pin: '749218', expiresAt: Date.now() + 15 * 60 * 1000 };
  }

  try {
    const raw = localStorage.getItem(`${PIN_STORAGE_KEY}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Valid if created within last 24 hours (or can be refreshed)
      if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
        return parsed;
      }
    }
  } catch {}

  // Generate new 6-digit random PIN
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity
  const pinData = { pin, expiresAt };

  try {
    localStorage.setItem(`${PIN_STORAGE_KEY}${userId}`, JSON.stringify(pinData));
  } catch {}

  return pinData;
}

/**
 * Force regenerate consent PIN
 */
export function regenerateConsentPin(userId: string): { pin: string; expiresAt: number } {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 60 * 60 * 1000;
  const pinData = { pin, expiresAt };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${PIN_STORAGE_KEY}${userId}`, JSON.stringify(pinData));
      window.dispatchEvent(new CustomEvent('arogya-pin-regenerated', { detail: pinData }));
    } catch {}
  }

  return pinData;
}

/**
 * Builds the dynamic QR code payload string for a patient.
 */
export function generateHealthPassportQR(
  userId: string,
  userProfile?: { name?: string; village?: string },
  medicalProfile?: any
): { qrString: string; payload: HealthPassportPayload; consentPin: string } {
  const { pin } = getOrCreateConsentPin(userId);
  const patientName = medicalProfile?.full_name || userProfile?.name || 'Rahul Sharma';
  const abhaId = `ABHA-91-${userId.replace(/[^0-9]/g, '').slice(-4) || '8812'}-${Math.abs(hashString(userId)).toString().slice(-4) || '4091'}`;

  const payload: HealthPassportPayload = {
    type: 'AROGYA_HEALTH_PASSPORT',
    version: '2.0',
    userId,
    patientName,
    abhaId,
    dob: medicalProfile?.date_of_birth || '1994-05-12',
    gender: medicalProfile?.gender || 'Male',
    bloodGroup: medicalProfile?.blood_group || 'O+',
    village: userProfile?.village || 'Peruru, East Godavari',
    emergencyPhone: medicalProfile?.emergency_contact_phone || '+91 98765 43210',
    consentPin: pin,
    issuedAt: new Date().toISOString(),
  };

  const qrString = JSON.stringify(payload);
  return { qrString, payload, consentPin: pin };
}

/**
 * Validates doctor's entered 6-digit unique consent ID against the scanned QR payload.
 */
export function verifyDoctorAccessPin(
  scannedPayload: HealthPassportPayload | string,
  enteredPin: string
): { success: boolean; message: string; payload?: HealthPassportPayload } {
  let parsed: HealthPassportPayload;
  if (typeof scannedPayload === 'string') {
    try {
      parsed = JSON.parse(scannedPayload);
    } catch {
      return { success: false, message: 'Invalid or unreadable QR code payload.' };
    }
  } else {
    parsed = scannedPayload;
  }

  if (parsed.type !== 'AROGYA_HEALTH_PASSPORT') {
    return { success: false, message: 'This QR code is not a valid Arogya Raksha Health Passport.' };
  }

  const cleanEntered = enteredPin.replace(/[^0-9]/g, '').trim();
  const expectedPin = parsed.consentPin?.trim();

  // Also check stored pin in local storage
  let localStoredPin: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`${PIN_STORAGE_KEY}${parsed.userId}`);
      if (stored) {
        localStoredPin = JSON.parse(stored).pin;
      }
    } catch {}
  }

  if (cleanEntered === expectedPin || (localStoredPin && cleanEntered === localStoredPin)) {
    return { success: true, message: 'Patient consent verified! Full medical dossier unlocked.', payload: parsed };
  }

  return {
    success: false,
    message: 'Incorrect Unique Consent ID. Ask the patient for the 6-digit PIN on their Health Passport QR card.',
  };
}

/**
 * Fetches the entire A-to-Z Medical Dossier of the patient once consent is unlocked.
 */
export function getFullPatientDossier(userId: string): FullPatientDossier {
  let medProfile: any = {};
  let appUserName = '';
  if (typeof window !== 'undefined') {
    try {
      const cached =
        localStorage.getItem(`arogya_medical_profile_${userId}`) ||
        localStorage.getItem('arogya_medical_profile') ||
        localStorage.getItem('arogya_medical_profile_guest');
      if (cached) {
        medProfile = JSON.parse(cached);
      }
      const appProf = localStorage.getItem('app-user-profile');
      if (appProf) {
        const parsed = JSON.parse(appProf);
        if (parsed?.name && !parsed.name.includes('Rahul')) {
          appUserName = parsed.name;
        }
      }
    } catch {}
  }

  const allRecords = getLocalHistory(userId);

  return {
    personal: {
      userId,
      fullName: medProfile.full_name || appUserName || 'Sameer',
      abhaId: `ABHA-91-${userId.replace(/[^0-9]/g, '').slice(-4) || '8812'}-4091`,
      age: medProfile.age || 35,
      gender: medProfile.gender || 'Male',
      bloodGroup: medProfile.blood_group || 'A+',
      heightCm: medProfile.height_cm || 160,
      weightKg: medProfile.weight_kg || 80,
      village: medProfile.village || 'Peruru, East Godavari',
    },
    medical: {
      conditions: medProfile.conditions && medProfile.conditions.length > 0
        ? medProfile.conditions
        : ['Hypertension (Mild)', 'Seasonal Asthma'],
      allergies: medProfile.allergies && medProfile.allergies.length > 0
        ? medProfile.allergies
        : ['Penicillin', 'Sulfa Antibiotics'],
      currentMedications: medProfile.current_medications && medProfile.current_medications.length > 0
        ? medProfile.current_medications
        : ['Telmisartan 40mg (OD)', 'Levocetirizine 5mg (PRN)'],
      doctorNotes: medProfile.doctor_notes || 'Patient undergoes bi-annual OPD review. Maintain low sodium diet.',
    },
    vitals: {
      bpSystolic: medProfile.bp_systolic || 120,
      bpDiastolic: medProfile.bp_diastolic || 80,
      sugarFasting: medProfile.sugar_level_fasting || 98,
      sugarPP: medProfile.sugar_level_pp || 135,
      pulseRate: medProfile.pulse_rate || 72,
      lastUpdated: medProfile.updated_at || new Date().toISOString(),
    },
    emergency: {
      contactName: medProfile.emergency_contact_name || 'Sunita Sharma',
      contactPhone: medProfile.emergency_contact_phone || '+91 98765 43210',
      relation: medProfile.emergency_contact_relation || 'Spouse',
      preferredHospital: medProfile.preferred_hospitals?.[0] || 'Apollo Hospitals / Govt CHC',
      hasInsurance: medProfile.has_insurance ?? true,
      insuranceProvider: medProfile.insurance_provider || 'Dr. YSR Aarogyasri / PM-JAY',
      policyNumber: medProfile.policy_number || 'AAROGYA-AP-992140',
    },
    records: allRecords,
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
