'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRealtime } from './RealtimeContext';
import { useUserRole } from './UserRoleContext';
import toast from 'react-hot-toast';

export type JourneyStep =
  | 'booked'              // 1. Appointment Booked & Token Generated
  | 'transit'             // 2. Patient in Transit / Ambulance
  | 'checked_in'          // 3. Checked-in at Hospital Reception (Admin)
  | 'consulting'          // 4. Doctor Calling / In Consultation (Doctor)
  | 'prescribed'          // 5. Digital Prescription Generated (Doctor)
  | 'pharmacy_processing' // 6. Pharmacy Verifying Stock & Preparing (Pharmacy)
  | 'medicines_packed'    // 7. Medicines Packed & Labelled (Pharmacy)
  | 'out_for_delivery'    // 8. Out for Village Delivery / Ready at Counter (Pharmacy)
  | 'completed';          // 9. Treatment Completed & Follow-up Scheduled

export interface PrescribedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  price: number;
}

export interface DigitalPrescription {
  id: string;
  journeyId: string;
  doctorName: string;
  hospitalName: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  diagnosis: string;
  medicines: PrescribedMedicine[];
  instructions: string;
  followUpDate?: string;
  totalCost: number;
  status: 'pending' | 'verified' | 'packed' | 'dispensed';
  createdAt: string;
}

export interface HealthcareJourney {
  id: string; // JRN-2026-XXXX
  tokenNumber: number;
  appointmentId: string; // APT-APOLLO-2026-XXXX
  orderId: string; // ORD-HOSP-2026-XXXX
  patientId: string;
  patientName: string;
  patientPhone: string;
  age: number;
  gender: string;
  village: string;
  householdNo?: string;
  hospitalName: string;
  department: string;
  doctorName: string;
  doctorId: string;
  slotTime: string; // e.g. "Today 10:30 AM"
  bookingSource: 'patient_self' | 'asha_assisted';
  ashaWorkerName?: string;
  currentStep: JourneyStep;
  statusNotes: string;
  vitals?: string;
  symptoms?: string;
  ambulanceRequested?: boolean;
  ambulanceDispatchId?: string;
  prescription?: DigitalPrescription;
  paymentStatus: 'paid' | 'pending' | 'free_bpl_aarogyasri';
  consultationFee: number;
  paymentId?: string;
  timestamps: {
    bookedAt: string;
    checkedInAt?: string;
    consultationStartedAt?: string;
    consultationCompletedAt?: string;
    prescriptionCreatedAt?: string;
    pharmacyAcceptedAt?: string;
    medicinesPackedAt?: string;
    dispatchedAt?: string;
    completedAt?: string;
  };
}

interface HealthcareJourneyContextType {
  journeys: HealthcareJourney[];
  activeJourney: HealthcareJourney | null;
  prescriptions: DigitalPrescription[];
  setActiveJourneyId: (id: string) => void;
  
  // Journey Lifecycle Actions
  bookNewJourney: (details: Partial<HealthcareJourney>) => Promise<HealthcareJourney>;
  requestAmbulanceForJourney: (journeyId: string, pickupLocation: string) => Promise<void>;
  checkInPatient: (journeyId: string) => Promise<void>;
  startConsultation: (journeyId: string) => Promise<void>;
  completeConsultationAndPrescribe: (
    journeyId: string,
    prescriptionData: Omit<DigitalPrescription, 'id' | 'journeyId' | 'createdAt' | 'status'>
  ) => Promise<void>;
  verifyAndAcceptPrescription: (journeyId: string) => Promise<void>;
  packMedicines: (journeyId: string) => Promise<void>;
  dispatchMedicines: (journeyId: string, deliveryType: 'village_delivery' | 'counter_pickup') => Promise<void>;
  completeJourney: (journeyId: string) => Promise<void>;
  clearAllJourneys: () => void;
}

const HealthcareJourneyContext = createContext<HealthcareJourneyContextType | undefined>(undefined);

const SEED_JOURNEYS: HealthcareJourney[] = [];

export function HealthcareJourneyProvider({ children }: { children: React.ReactNode }) {
  const { socket, triggerEmergencySos } = useRealtime();
  const { role, user } = useUserRole();
  const [journeys, setJourneys] = useState<HealthcareJourney[]>([]);
  const [activeJourneyId, setActiveJourneyId] = useState<string>('');

  // Load from localStorage - filter out any legacy demo seeds
  useEffect(() => {
    try {
      const saved = localStorage.getItem('arogya_healthcare_journeys');
      if (saved) {
        const parsed: HealthcareJourney[] = JSON.parse(saved);
        const realOnes = parsed.filter(
          (j) => !['JRN-2026-8812', 'JRN-2026-4410', 'JRN-2026-1029'].includes(j.id)
        );
        setJourneys(realOnes);
        if (realOnes.length > 0) {
          setActiveJourneyId(realOnes[0].id);
        }
        localStorage.setItem('arogya_healthcare_journeys', JSON.stringify(realOnes));
      } else {
        setJourneys([]);
      }
    } catch {
      setJourneys([]);
    }
  }, []);

  const saveJourneys = useCallback((updated: HealthcareJourney[]) => {
    setJourneys(updated);
    try {
      localStorage.setItem('arogya_healthcare_journeys', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to cache journeys:', e);
    }
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleJourneyCreated = (newJourney: HealthcareJourney) => {
      setJourneys((prev) => {
        const filtered = prev.filter((j) => j.id !== newJourney.id);
        const updated = [newJourney, ...filtered];
        localStorage.setItem('arogya_healthcare_journeys', JSON.stringify(updated));
        return updated;
      });
      toast.success(`Journey Started: Token #${newJourney.tokenNumber} for ${newJourney.patientName}`);
    };

    const handleJourneyUpdated = (data: { journeyId: string; step: JourneyStep; statusNotes: string }) => {
      setJourneys((prev) => {
        const updated = prev.map((j) => {
          if (j.id === data.journeyId) {
            return {
              ...j,
              currentStep: data.step,
              statusNotes: data.statusNotes || j.statusNotes,
            };
          }
          return j;
        });
        localStorage.setItem('arogya_healthcare_journeys', JSON.stringify(updated));
        return updated;
      });
    };

    const handlePrescriptionIssued = (rx: DigitalPrescription) => {
      setJourneys((prev) => {
        const updated = prev.map((j) => {
          if (j.id === rx.journeyId) {
            return {
              ...j,
              prescription: rx,
              currentStep: 'pharmacy_processing' as JourneyStep,
              statusNotes: `Digital prescription issued by Dr. ${rx.doctorName}. Pharmacy processing.`,
              timestamps: {
                ...j.timestamps,
                prescriptionCreatedAt: rx.createdAt,
              },
            };
          }
          return j;
        });
        localStorage.setItem('arogya_healthcare_journeys', JSON.stringify(updated));
        return updated;
      });
    };

    const handlePharmacyStatusUpdated = (data: { journeyId: string; status: 'verified' | 'packed' | 'dispensed'; step: JourneyStep; notes: string }) => {
      setJourneys((prev) => {
        const updated = prev.map((j) => {
          if (j.id === data.journeyId) {
            return {
              ...j,
              currentStep: data.step,
              statusNotes: data.notes || j.statusNotes,
              prescription: j.prescription ? { ...j.prescription, status: data.status } : undefined,
            };
          }
          return j;
        });
        localStorage.setItem('arogya_healthcare_journeys', JSON.stringify(updated));
        return updated;
      });
    };

    socket.on('journey_created', handleJourneyCreated);
    socket.on('journey_updated', handleJourneyUpdated);
    socket.on('prescription_issued', handlePrescriptionIssued);
    socket.on('pharmacy_status_updated', handlePharmacyStatusUpdated);

    return () => {
      socket.off('journey_created', handleJourneyCreated);
      socket.off('journey_updated', handleJourneyUpdated);
      socket.off('prescription_issued', handlePrescriptionIssued);
      socket.off('pharmacy_status_updated', handlePharmacyStatusUpdated);
    };
  }, [socket]);

  // Active Journey
  const activeJourney = journeys.find((j) => j.id === activeJourneyId) || journeys[0] || null;

  // Extract all prescriptions
  const prescriptions: DigitalPrescription[] = journeys
    .map((j) => j.prescription)
    .filter((p): p is DigitalPrescription => Boolean(p));

  // 1. Book New Journey (Patient or ASHA)
  const bookNewJourney = async (details: Partial<HealthcareJourney>): Promise<HealthcareJourney> => {
    const nextToken = Math.max(15, ...journeys.map((j) => j.tokenNumber)) + 1;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const hospAbbr = (details.hospitalName || 'HOSP').split(' ')[0].toUpperCase().slice(0, 6);

    const newJourney: HealthcareJourney = {
      id: `JRN-2026-${randomSuffix}`,
      tokenNumber: nextToken,
      appointmentId: `APT-${hospAbbr}-2026-${randomSuffix}`,
      orderId: `ORD-HOSP-2026-${randomSuffix}`,
      patientId: details.patientId || user.id,
      patientName: details.patientName || user.name,
      patientPhone: details.patientPhone || user.phone || '+91 98480 11223',
      age: details.age || 30,
      gender: details.gender || 'Female',
      village: details.village || 'Peruru Ward 14, Kurnool',
      householdNo: details.householdNo || 'HH-14/08',
      hospitalName: details.hospitalName || 'Apollo Hospitals',
      department: details.department || 'General Medicine',
      doctorName: details.doctorName || 'Dr. Rajesh Varma',
      doctorId: details.doctorId || 'usr_doc_9941',
      slotTime: details.slotTime || 'Today 11:30 AM',
      bookingSource: role === 'asha' ? 'asha_assisted' : 'patient_self',
      ashaWorkerName: role === 'asha' ? user.name : undefined,
      currentStep: 'booked',
      statusNotes: `Appointment confirmed. Token #${nextToken} allocated. Head to ${details.hospitalName || 'hospital'}.`,
      vitals: details.vitals || 'Normal',
      symptoms: details.symptoms || 'General Checkup',
      paymentStatus: details.paymentStatus || 'paid',
      consultationFee: details.consultationFee !== undefined ? details.consultationFee : 500,
      paymentId: details.paymentId,
      timestamps: {
        bookedAt: new Date().toISOString(),
      },
    };

    const updated = [newJourney, ...journeys];
    saveJourneys(updated);
    setActiveJourneyId(newJourney.id);

    // Broadcast socket event
    if (socket) {
      socket.emit('create_healthcare_journey', newJourney);
    }

    toast.success(`Booking Confirmed! Token #${newJourney.tokenNumber} allocated.`);
    return newJourney;
  };

  // 2. Request Ambulance
  const requestAmbulanceForJourney = async (journeyId: string, pickupLocation: string) => {
    const journey = journeys.find((j) => j.id === journeyId);
    if (!journey) return;

    const dispatchId = `EMR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    triggerEmergencySos({
      dispatchId,
      patientName: journey.patientName,
      village: journey.village,
      location: pickupLocation,
      message: `Emergency patient transport requested for Token #${journey.tokenNumber} to ${journey.hospitalName}`,
      priority: 'high',
    });

    const updated = journeys.map((j) => {
      if (j.id === journeyId) {
        return {
          ...j,
          ambulanceRequested: true,
          ambulanceDispatchId: dispatchId,
          currentStep: 'transit' as JourneyStep,
          statusNotes: `108 Ambulance dispatched (${dispatchId}) to ${pickupLocation}. In transit.`,
        };
      }
      return j;
    });

    saveJourneys(updated);
    if (socket) {
      socket.emit('update_journey_step', {
        journeyId,
        step: 'transit',
        statusNotes: `108 Ambulance dispatched to ${pickupLocation}`,
        updatedBy: user.name,
      });
    }

    toast.success(`108 Ambulance Dispatched for ${journey.patientName}`);
  };

  // 3. Hospital Admin Checks In Patient
  const checkInPatient = async (journeyId: string) => {
    const updated = journeys.map((j) => {
      if (j.id === journeyId) {
        return {
          ...j,
          currentStep: 'checked_in' as JourneyStep,
          statusNotes: `Verified at Reception by ${user.name}. Token #${j.tokenNumber} in Doctor Queue.`,
          timestamps: {
            ...j.timestamps,
            checkedInAt: new Date().toISOString(),
          },
        };
      }
      return j;
    });

    saveJourneys(updated);
    if (socket) {
      socket.emit('update_journey_step', {
        journeyId,
        step: 'checked_in',
        statusNotes: `Patient checked in at hospital desk`,
        updatedBy: user.name,
      });
    }
    toast.success('Patient checked-in. Doctor queue updated!');
  };

  // 4. Doctor Calls & Starts Consultation
  const startConsultation = async (journeyId: string) => {
    const updated = journeys.map((j) => {
      if (j.id === journeyId) {
        return {
          ...j,
          currentStep: 'consulting' as JourneyStep,
          statusNotes: `Doctor called Token #${j.tokenNumber}. Consultation in progress in OPD Room #4.`,
          timestamps: {
            ...j.timestamps,
            consultationStartedAt: new Date().toISOString(),
          },
        };
      }
      return j;
    });

    saveJourneys(updated);
    if (socket) {
      socket.emit('update_journey_step', {
        journeyId,
        step: 'consulting',
        statusNotes: `Consultation started by ${user.name}`,
        updatedBy: user.name,
      });
    }
    toast.success('Consultation started. Patient journey updated to Consulting.');
  };

  // 5. Doctor Writes Digital Prescription
  const completeConsultationAndPrescribe = async (
    journeyId: string,
    prescriptionData: Omit<DigitalPrescription, 'id' | 'journeyId' | 'createdAt' | 'status'>
  ) => {
    const rxId = `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullPrescription: DigitalPrescription = {
      ...prescriptionData,
      id: rxId,
      journeyId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const updated = journeys.map((j) => {
      if (j.id === journeyId) {
        return {
          ...j,
          prescription: fullPrescription,
          currentStep: 'prescribed' as JourneyStep,
          statusNotes: `Dr. ${fullPrescription.doctorName} issued digital prescription. Sent to Pharmacy.`,
          timestamps: {
            ...j.timestamps,
            consultationCompletedAt: new Date().toISOString(),
            prescriptionCreatedAt: fullPrescription.createdAt,
          },
        };
      }
      return j;
    });

    saveJourneys(updated);
    if (socket) {
      socket.emit('create_digital_prescription', fullPrescription);
      socket.emit('update_journey_step', {
        journeyId,
        step: 'prescribed',
        statusNotes: 'Digital prescription issued',
        updatedBy: user.name,
      });
    }

    toast.success('Digital Prescription Issued! Streamed live to Hospital Pharmacy.');
  };

  // 6. Pharmacy Verifies & Accepts Prescription
  const verifyAndAcceptPrescription = async (journeyId: string) => {
    const updated = journeys.map((j) => {
      if (j.id === journeyId) {
        return {
          ...j,
          currentStep: 'pharmacy_processing' as JourneyStep,
          statusNotes: `Pharmacy verified stock for Rx #${j.prescription?.id || 'Rx'}. Preparing medication.`,
          prescription: j.prescription ? { ...j.prescription, status: 'verified' as const } : undefined,
          timestamps: {
            ...j.timestamps,
            pharmacyAcceptedAt: new Date().toISOString(),
          },
        };
      }
      return j;
    });

    saveJourneys(updated);
    if (socket) {
      socket.emit('update_pharmacy_status', {
        journeyId,
        prescriptionId: journeys.find((j) => j.id === journeyId)?.prescription?.id,
        status: 'verified',
        step: 'pharmacy_processing',
        notes: 'Prescription verified. Stock reserved and in preparation.',
      });
    }

    toast.success('Prescription verified & stock allocated.');
  };

  // 7. Pharmacy Packs Medicines
  const packMedicines = async (journeyId: string) => {
    const updated = journeys.map((j) => {
      if (j.id === journeyId) {
        return {
          ...j,
          currentStep: 'medicines_packed' as JourneyStep,
          statusNotes: `Medicines securely packed with dosage labels by ${user.name}.`,
          prescription: j.prescription ? { ...j.prescription, status: 'packed' as const } : undefined,
          timestamps: {
            ...j.timestamps,
            medicinesPackedAt: new Date().toISOString(),
          },
        };
      }
      return j;
    });

    saveJourneys(updated);
    if (socket) {
      socket.emit('update_pharmacy_status', {
        journeyId,
        prescriptionId: journeys.find((j) => j.id === journeyId)?.prescription?.id,
        status: 'packed',
        step: 'medicines_packed',
        notes: 'Medicines packed and labelled',
      });
    }

    toast.success('Medicines packed and labelled.');
  };

  // 8. Pharmacy Dispatches / Sends for Pickup
  const dispatchMedicines = async (journeyId: string, deliveryType: 'village_delivery' | 'counter_pickup') => {
    const notes =
      deliveryType === 'village_delivery'
        ? 'Dispatched with Arogya Rural Courier to village distribution desk.'
        : 'Ready for immediate pickup at Hospital Pharmacy Counter #2.';

    const updated = journeys.map((j) => {
      if (j.id === journeyId) {
        return {
          ...j,
          currentStep: 'out_for_delivery' as JourneyStep,
          statusNotes: notes,
          timestamps: {
            ...j.timestamps,
            dispatchedAt: new Date().toISOString(),
          },
        };
      }
      return j;
    });

    saveJourneys(updated);
    if (socket) {
      socket.emit('update_pharmacy_status', {
        journeyId,
        prescriptionId: journeys.find((j) => j.id === journeyId)?.prescription?.id,
        status: 'dispensed',
        step: 'out_for_delivery',
        notes,
      });
    }

    toast.success(deliveryType === 'village_delivery' ? 'Dispatched to Village!' : 'Ready at Hospital Counter!');
  };

  // 9. Complete Journey
  const completeJourney = async (journeyId: string) => {
    const updated = journeys.map((j) => {
      if (j.id === journeyId) {
        return {
          ...j,
          currentStep: 'completed' as JourneyStep,
          statusNotes: 'Treatment and medication dispensed. Follow-up reminder scheduled.',
          timestamps: {
            ...j.timestamps,
            completedAt: new Date().toISOString(),
          },
        };
      }
      return j;
    });

    saveJourneys(updated);
    if (socket) {
      socket.emit('update_journey_step', {
        journeyId,
        step: 'completed',
        statusNotes: 'Treatment and medicine handover completed',
        updatedBy: user.name,
      });
    }

    toast.success('Healthcare journey completed!');
  };

  const clearAllJourneys = () => {
    setJourneys([]);
    setActiveJourneyId('');
    try {
      localStorage.removeItem('arogya_healthcare_journeys');
    } catch {}
    toast.success('All journeys cleared');
  };

  return (
    <HealthcareJourneyContext.Provider
      value={{
        journeys,
        activeJourney,
        prescriptions,
        setActiveJourneyId,
        bookNewJourney,
        requestAmbulanceForJourney,
        checkInPatient,
        startConsultation,
        completeConsultationAndPrescribe,
        verifyAndAcceptPrescription,
        packMedicines,
        dispatchMedicines,
        completeJourney,
        clearAllJourneys,
      }}
    >
      {children}
    </HealthcareJourneyContext.Provider>
  );
}

const DEFAULT_FALLBACK_CONTEXT: HealthcareJourneyContextType = {
  journeys: [],
  activeJourney: null,
  prescriptions: [],
  setActiveJourneyId: () => {},
  bookNewJourney: async () => ({ id: 'JRN-NEW', tokenNumber: 1 } as any),
  requestAmbulanceForJourney: async () => {},
  checkInPatient: async () => {},
  startConsultation: async () => {},
  completeConsultationAndPrescribe: async () => {},
  verifyAndAcceptPrescription: async () => {},
  packMedicines: async () => {},
  dispatchMedicines: async () => {},
  completeJourney: async () => {},
  clearAllJourneys: () => {},
};

export function useHealthcareJourney() {
  const ctx = useContext(HealthcareJourneyContext);
  if (!ctx) {
    return DEFAULT_FALLBACK_CONTEXT;
  }
  return ctx;
}
