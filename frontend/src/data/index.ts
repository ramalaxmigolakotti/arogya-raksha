// ====================================
// 📁 Central Data Export
// ====================================
// Import all datasets from a single location:
//   import { doctors, medicines, hospitals } from '@/data';

import doctorsData from './doctors/doctors.json';
import medicinesData from './medicines/medicines.json';
import hospitalsData from './hospitals/hospitals.json';
import esiHospitalsData from './hospitals/esi-hospitals.json';
import ayurvedaHospitalsData from './hospitals/ayurveda-hospitals.json';
import hospitalStatsData from './hospitals/hospital-stats.json';
import symptomsData from './symptoms/symptoms.json';
import emergencyData from './emergency/emergency-contacts.json';
import quizData from './quiz/health-quiz.json';
import slotsData from './appointments/slots.json';

export const doctors = doctorsData;
export const medicines = medicinesData;
export const hospitals = hospitalsData;
export const esiHospitals = esiHospitalsData;
export const ayurvedaHospitals = ayurvedaHospitalsData;
export const hospitalStats = hospitalStatsData;
export const symptoms = symptomsData;
export const emergency = emergencyData;
export const quiz = quizData;
export const appointmentSlots = slotsData;
