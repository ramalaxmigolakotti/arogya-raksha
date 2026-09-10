'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { LocationProvider } from '@/context/LocationContext';
import MediBotAgent from '@/components/MediBotAgent';
import ClerkApiProvider from '@/components/ClerkApiProvider';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState, useEffect } from 'react';

function DashboardInner({ children }: { children: React.ReactNode }) {
  usePushNotifications();

  // SSR-safe: start as false, sync from sessionStorage after mount
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('sidebar_collapsed') === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  // Listen for sidebar toggle events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSidebarCollapsed(detail.collapsed);
    };
    window.addEventListener('sidebarToggle', handler);
    return () => window.removeEventListener('sidebarToggle', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex transition-colors duration-300">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        }`}
      >
        <Header />
        <main className="flex-1 mt-20 p-4 md:p-8 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocationProvider>
      <ClerkApiProvider>
        <DashboardInner>{children}</DashboardInner>
        <MediBotAgent userName="Patient" />
      </ClerkApiProvider>
    </LocationProvider>
  );
}
