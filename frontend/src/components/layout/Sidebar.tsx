'use client';

import Link from 'next/link';
import {
  LayoutDashboard, Bot, Stethoscope, Pill, FileText,
  Heart, Siren, Settings, ScanLine,
  Globe, ChevronDown, User, Brain, Microscope, BriefcaseMedical,
  Menu, X, Sparkles, Building2,
  ChevronLeft, ChevronRight,
  Users, Syringe, Mic, ClipboardList, Activity,
  Ambulance, MapPin, Radio, Phone, Navigation,
  LogOut, Shield, Calendar, Ticket, Package, Truck, UserCheck
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLanguage, Language, LANGUAGES } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';
import { useState, useRef, useEffect } from 'react';

const STORAGE_KEY = 'sidebar_collapsed';

export default function Sidebar() {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const { role, user, logout } = useUserRole();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, String(collapsed));
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed } }));
  }, [collapsed]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  interface NavItem {
    icon: any;
    label: string;
    href: string;
    badge?: string;
    crisis?: boolean;
    profile?: boolean;
  }

  // ─── ROLE-SPECIFIC NAV ITEMS ───────────────────────────────────────────────

  const patientNav: NavItem[] = [
    { icon: LayoutDashboard, label: t('dashboard'),        href: '/dashboard' },
    { icon: Navigation,      label: 'Live Tracking',       href: '/dashboard/tracking', badge: 'LIVE' },
    { icon: Calendar,        label: 'Appointments & Flow', href: '/dashboard/appointments', badge: 'SYNC' },
    { icon: Heart,           label: t('myMedicalProfile'), href: '/dashboard/profile', profile: true },
    { icon: Bot,             label: t('askAIDoctor'),       href: '/dashboard/ai' },
    { icon: Stethoscope,     label: t('symptomChecker'),    href: '/dashboard/symptoms' },
    { icon: Pill,            label: t('medicineFinder'),    href: '/dashboard/medicines' },
    { icon: ScanLine,        label: t('medicineScanner'),   href: '/dashboard/scanner' },
    { icon: User,            label: t('doctors'),           href: '/dashboard/doctors' },
    { icon: Microscope,      label: t('diagnosticCentre'),  href: '/dashboard/diagnostic-centre' },
    { icon: Building2,       label: t('hospitals'),         href: '/dashboard/hospitals' },
    { icon: Brain,           label: t('healthPredictors'),  href: '/dashboard/predictors' },
    { icon: FileText,        label: t('medicalReports'),    href: '/dashboard/reports' },
    { icon: Heart,           label: t('healthTracker'),     href: '/dashboard/quiz' },
    { icon: Siren,           label: t('emergency'),         href: '/dashboard/emergency', crisis: true },
    { icon: Settings,        label: t('settings'),          href: '/dashboard/settings' },
  ];

  const ashaNav: NavItem[] = [
    { icon: LayoutDashboard, label: 'ASHA Dashboard',     href: '/dashboard' },
    { icon: Navigation,      label: 'Journey Radar',      href: '/dashboard/tracking', badge: 'Live' },
    { icon: Users,           label: 'Community Roster',   href: '/dashboard', badge: 'Field' },
    { icon: Ticket,          label: 'Village OPD Queue',  href: '/dashboard', badge: 'Live' },
    { icon: ClipboardList,   label: 'Field Visits',       href: '/dashboard' },
    { icon: Syringe,         label: 'Immunization',       href: '/dashboard' },
    { icon: Activity,        label: 'Vital Records',      href: '/dashboard' },
    { icon: Siren,           label: 'Emergency Referral', href: '/dashboard/emergency', crisis: true },
    { icon: MapPin,          label: 'Nearby PHC / CHC',   href: '/dashboard/hospitals' },
    { icon: Settings,        label: 'Settings',           href: '/dashboard/settings' },
  ];

  const doctorNav: NavItem[] = [
    { icon: LayoutDashboard,    label: 'Doctor Dashboard',    href: '/dashboard' },
    { icon: Navigation,         label: 'Live Queue Radar',    href: '/dashboard/tracking', badge: 'Live' },
    { icon: ClipboardList,      label: 'Patient Queue',       href: '/dashboard', badge: 'Live' },
    { icon: BriefcaseMedical,   label: 'EHR / Records',       href: '/dashboard/doctor-dashboard' },
    { icon: Calendar,           label: 'Appointments',        href: '/dashboard' },
    { icon: FileText,           label: 'Prescriptions',       href: '/dashboard/reports' },
    { icon: Microscope,         label: 'Lab / Diagnostics',   href: '/dashboard/diagnostic-centre' },
    { icon: Brain,              label: 'AI Diagnostics',      href: '/dashboard/predictors' },
    { icon: Shield,             label: 'High Risk Alerts',    href: '/dashboard', crisis: true },
    { icon: Bot,                label: 'AI Assistant',        href: '/dashboard/ai' },
    { icon: Building2,          label: 'Hospital Directory',  href: '/dashboard/hospitals' },
    { icon: Settings,           label: 'Settings',            href: '/dashboard/settings' },
  ];

  const hospitalAdminNav: NavItem[] = [
    { icon: LayoutDashboard, label: 'Hospital Operations', href: '/dashboard' },
    { icon: Navigation,      label: 'Live Journey Radar',  href: '/dashboard/tracking', badge: 'Live' },
    { icon: UserCheck,       label: 'OPD Check-In Desk',   href: '/dashboard' },
    { icon: Stethoscope,     label: 'Doctor Availability', href: '/dashboard' },
    { icon: Building2,       label: 'Hospital Directory',  href: '/dashboard/hospitals' },
    { icon: Pill,            label: 'Pharmacy Stock',      href: '/dashboard/medicines' },
    { icon: Settings,        label: 'Admin Settings',      href: '/dashboard/settings' },
  ];

  const pharmacyNav: NavItem[] = [
    { icon: LayoutDashboard, label: 'Pharmacy Console',    href: '/dashboard' },
    { icon: FileText,        label: 'Digital Rx Queue',    href: '/dashboard', badge: 'Live' },
    { icon: Navigation,      label: 'Live Delivery Radar', href: '/dashboard/tracking', badge: 'Radar' },
    { icon: Package,         label: 'Dispensing Counter',  href: '/dashboard' },
    { icon: Pill,            label: 'Drug Inventory',      href: '/dashboard/medicines' },
    { icon: Truck,           label: 'Village Deliveries',  href: '/dashboard' },
    { icon: Settings,        label: 'Settings',            href: '/dashboard/settings' },
  ];

  const ambulanceNav: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dispatch Console',   href: '/dashboard' },
    { icon: Radio,           label: 'Active Calls',       href: '/dashboard', badge: 'Live', crisis: true },
    { icon: Navigation,      label: 'Navigate GPS',       href: '/dashboard/tracking' },
    { icon: Building2,       label: 'Hospital Routing',   href: '/dashboard/hospitals' },
    { icon: Phone,           label: 'Emergency Contacts', href: '/dashboard/emergency' },
    { icon: MapPin,          label: 'My Location',        href: '/dashboard' },
    { icon: ClipboardList,   label: 'Trip Log',           href: '/dashboard' },
    { icon: Settings,        label: 'Settings',           href: '/dashboard/settings' },
  ];

  const navConfig: Record<string, { items: NavItem[]; accentColor: string; roleLabel: string; roleIcon: string }> = {
    patient:        { items: patientNav,        accentColor: 'emerald', roleLabel: 'Patient Panel',         roleIcon: '🧑‍⚕️' },
    asha:           { items: ashaNav,           accentColor: 'teal',    roleLabel: 'ASHA Field Desk',        roleIcon: '👩‍🌾' },
    doctor:         { items: doctorNav,         accentColor: 'violet',  roleLabel: 'Doctor EHR',             roleIcon: '👨‍⚕️' },
    hospital_admin: { items: hospitalAdminNav,  accentColor: 'indigo',  roleLabel: 'Hospital Admin',         roleIcon: '🏥' },
    pharmacy:       { items: pharmacyNav,       accentColor: 'emerald', roleLabel: 'Hospital Pharmacy',      roleIcon: '💊' },
    ambulance:      { items: ambulanceNav,      accentColor: 'rose',    roleLabel: 'Ambulance Dispatch',     roleIcon: '🚑' },
  };

  const { items: menuItems, accentColor, roleLabel, roleIcon } = navConfig[role] ?? navConfig.patient;

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';
  const languages = LANGUAGES;

  // accent helpers — warm amber gold palette matching reference image
  const accentActive = 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-white font-bold shadow-lg shadow-amber-500/35 rounded-2xl';

  const accentHover = 'text-stone-700 hover:bg-[#F5EFE6] hover:text-stone-900 rounded-2xl transition-all duration-200';

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#FFFDF9] text-stone-800 p-2.5 rounded-2xl shadow-lg shadow-stone-300/40 border border-[#EFE8DE]"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-amber-600" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`hidden lg:flex fixed z-[60] top-1/2 -translate-y-1/2 items-center justify-center w-7 h-14 rounded-r-2xl bg-gradient-to-b from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30 hover:from-amber-300 hover:to-yellow-400 hover:w-8 transition-all duration-300 group ${collapsed ? 'left-[72px]' : 'left-64'}`}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="transition-transform duration-300 group-hover:scale-110">
          {collapsed ? <ChevronRight className="h-4 w-4 text-white" /> : <ChevronLeft className="h-4 w-4 text-white" />}
        </span>
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 flex flex-col gap-0.5 opacity-60">
          <span className="w-1 h-1 rounded-full bg-white" />
          <span className="w-1 h-1 rounded-full bg-white" />
          <span className="w-1 h-1 rounded-full bg-white" />
        </span>
      </button>

      {/* ── Sidebar (Warm Ivory Cream & Golden Amber matching reference) ── */}
      <aside className={`fixed left-0 top-0 h-screen bg-[#FFFDF9] border-r border-[#EFE8DE] text-stone-800 flex flex-col shadow-xl shadow-stone-200/50 z-50 transition-all duration-300 ease-in-out ${sidebarWidth} ${mobileOpen ? 'translate-x-0 w-64' : collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:translate-x-0 overflow-hidden`}>

        {/* Brand */}
        <div className={`px-4 py-5 flex items-center gap-3 relative z-10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="bg-gradient-to-br from-amber-400 to-yellow-500 p-2.5 rounded-2xl flex items-center justify-center shadow-md shadow-amber-500/25 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.8">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <h1 className="text-lg font-black tracking-tight text-stone-900 whitespace-nowrap">
                Arogya Raksha
              </h1>
              <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-[0.2em]">आरोग्य रक्षा</p>
            </div>
          )}
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-stone-400 hover:text-stone-800 transition p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Profile Card (Marcus Lee style from reference) */}
        {!collapsed && (
          <div className="px-3 mb-3 relative z-10">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF6F0] border border-[#EBE4D8] shadow-sm">
              <div className="w-10 h-10 rounded-full bg-amber-100 ring-2 ring-amber-300/80 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
                {roleIcon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-stone-900 truncate tracking-tight">{user?.name || 'Marcus Lee'}</p>
                <div className="mt-0.5">
                  <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-200/80 px-2 py-0.5 rounded-full capitalize">
                    {roleLabel || 'User Profile'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto pt-1 pb-4 px-3 overflow-x-hidden relative z-10">
          <ul className="space-y-1">
            {(() => {
              // Find the single best matching active index (never multiple)
              const activeIndex = menuItems.findIndex((item) => {
                if (item.href === '/dashboard') {
                  return pathname === '/dashboard';
                }
                return pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
              });

              return menuItems.map((item, index) => {
                const isActive = index === activeIndex;
                const isCrisis  = (item as any).crisis;
                const badge     = (item as any).badge as string | undefined;

                const baseClass = `flex items-center gap-3.5 transition-all duration-200 group relative overflow-hidden ${collapsed ? 'justify-center px-2 py-3 rounded-2xl' : 'px-3.5 py-3 rounded-2xl'}`;

                return (
                <li key={index}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`${baseClass} ${
                      isCrisis
                        ? isActive
                          ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 font-bold'
                          : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                        : isActive
                        ? accentActive
                        : accentHover
                    }`}
                  >
                    <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? 'text-white' :
                      isCrisis ? 'text-rose-500 animate-pulse' :
                      'text-amber-600 group-hover:text-amber-700'
                    }`} />

                    {!collapsed && (
                      <>
                        <span className={`text-sm font-medium whitespace-nowrap overflow-hidden flex-1 ${isActive ? 'text-white font-bold' : 'text-stone-800 group-hover:text-stone-900'}`}>{item.label}</span>
                        {badge && !isActive && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isCrisis ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800 border border-amber-200/80'
                          }`}>{badge}</span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            });
          })()}
          </ul>
        </div>

        {/* Footer: Help Center & Sign Out matching reference */}
        {!collapsed ? (
          <div className="px-4 pt-3 pb-5 border-t border-[#EFE8DE] bg-[#FAF6F0]/80 space-y-2 relative" ref={dropdownRef}>
            {/* Language picker */}
            {isLangOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#FFFDF9] border border-[#EBE4D8] rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
                <div className="py-2 max-h-60 overflow-y-auto">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code as Language); setIsLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-amber-50 ${language === lang.code ? 'text-amber-700 font-bold bg-amber-50' : 'text-stone-700'}`}
                    >
                      <span>{lang.flag}</span>
                      <span className="flex-1 text-left">{lang.native}</span>
                      <span className="text-xs text-stone-500">{lang.name}</span>
                      {language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-semibold text-amber-800/80 pt-1">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 hover:text-amber-900 transition-colors py-1"
              >
                <Globe className="h-3.5 w-3.5 text-amber-600" />
                <span>{languages.find(l => l.code === language)?.name || 'English'}</span>
              </button>

              <button
                onClick={logout}
                className="hover:text-red-600 transition-colors py-1 font-bold"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="pb-4 flex flex-col items-center gap-2 border-t border-[#EFE8DE] pt-3">
            <button onClick={() => setCollapsed(false)} title="Language" className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-all">
              <Globe className="h-5 w-5" />
            </button>
            <button onClick={logout} title="Sign Out" className="p-2 rounded-xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-all">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
