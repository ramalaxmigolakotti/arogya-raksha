'use client';

import { useUserRole } from '@/context/UserRoleContext';
import PatientDashboardView from '@/components/dashboards/PatientDashboardView';
import AshaDashboardView from '@/components/dashboards/AshaDashboardView';
import DoctorDashboardView from '@/components/dashboards/DoctorDashboardView';
import AmbulanceDashboardView from '@/components/dashboards/AmbulanceDashboardView';
import HospitalAdminDashboardView from '@/components/dashboards/HospitalAdminDashboardView';
import PharmacyDashboardView from '@/components/dashboards/PharmacyDashboardView';

export default function DashboardPage() {
  const { role } = useUserRole();

  if (role === 'asha') return <AshaDashboardView />;
  if (role === 'doctor') return <DoctorDashboardView />;
  if (role === 'ambulance') return <AmbulanceDashboardView />;
  if (role === 'hospital_admin') return <HospitalAdminDashboardView />;
  if (role === 'pharmacy') return <PharmacyDashboardView />;
  return <PatientDashboardView />;
}
