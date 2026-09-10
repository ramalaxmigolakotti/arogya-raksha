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

  return (
    <div key={role} className="w-full animate-in fade-in duration-200">
      {role === 'asha' && <AshaDashboardView />}
      {role === 'doctor' && <DoctorDashboardView />}
      {role === 'ambulance' && <AmbulanceDashboardView />}
      {role === 'hospital_admin' && <HospitalAdminDashboardView />}
      {role === 'pharmacy' && <PharmacyDashboardView />}
      {role === 'patient' && <PatientDashboardView />}
    </div>
  );
}
