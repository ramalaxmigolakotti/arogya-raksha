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

  // accent helpers
  const accentActive = {
    emerald: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
    teal:    'bg-teal-500 text-white shadow-lg shadow-teal-500/30',
    violet:  'bg-violet-600 text-white shadow-lg shadow-violet-500/30',
    rose:    'bg-rose-600 text-white shadow-lg shadow-rose-500/30',
  }[accentColor] ?? 'bg-emerald-500 text-white';

  const accentHover = 'text-slate-400 hover:bg-white/5 hover:text-white';

  return (
    <>
      {/* Mobile Hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#0f2027] text-white p-2.5 rounded-xl shadow-lg shadow-black/20"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`hidden lg:flex fixed z-[60] top-1/2 -translate-y-1/2 items-center justify-center w-7 h-14 rounded-r-2xl bg-gradient-to-b from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/40 hover:from-emerald-300 hover:to-teal-400 hover:w-8 transition-all duration-300 group ${collapsed ? 'left-[72px]' : 'left-64'}`}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="transition-transform duration-300 group-hover:scale-110">
          {collapsed ? <ChevronRight className="h-4 w-4 text-white" /> : <ChevronLeft className="h-4 w-4 text-white" />}
        </span>
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 flex flex-col gap-0.5 opacity-50">
          <span className="w-1 h-1 rounded-full bg-white" />
          <span className="w-1 h-1 rounded-full bg-white" />
          <span className="w-1 h-1 rounded-full bg-white" />
        </span>
      </button>

      {/* ── Sidebar ── */}
      <aside className={`fixed left-0 top-0 h-screen bg-[#0f2027] text-white flex flex-col shadow-2xl z-50 transition-all duration-300 ease-in-out ${sidebarWidth} ${mobileOpen ? 'translate-x-0 w-64' : collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} lg:translate-x-0 overflow-hidden`}>

        {/* Brand */}
        <div className={`px-4 py-5 flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-cyan-300 whitespace-nowrap">
                Arogya Raksha
              </h1>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em]">आरोग्य रक्षा</p>
            </div>
          )}
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Active Authenticated Role Badge */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/8">
              <span className="text-base">{roleIcon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-white truncate">{user?.name || roleLabel}</p>
                {user?.email && (
                  <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5" title={user.email}>{user.email}</p>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] text-emerald-400 font-mono font-black truncate">{user?.badgeId || role}</span>
                  <span className="text-[9px] text-slate-500 font-medium">({role})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto pt-1 pb-4 px-2 overflow-x-hidden">
          <ul className="space-y-0.5">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
              const isCrisis  = (item as any).crisis;
              const isProfile = (item as any).profile;
              const badge     = (item as any).badge as string | undefined;

              const baseClass = `flex items-center gap-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'}`;

              return (
                <li key={index}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`${baseClass} ${
                      isCrisis
                        ? isActive
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/40 font-semibold'
                          : 'bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-300 hover:from-red-500/20 border border-red-500/20 hover:border-red-500/40'
                        : isProfile
                        ? isActive
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 font-semibold'
                          : 'bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-300 hover:from-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40'
                        : isActive
                        ? accentActive
                        : accentHover
                    }`}
                  >
                    <item.icon className={`h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-white' :
                      isCrisis ? 'text-red-400 animate-pulse' :
                      isProfile ? 'text-indigo-400' :
                      'text-slate-500 group-hover:text-emerald-400'
                    }`} />

                    {!collapsed && (
                      <>
                        <span className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1">{item.label}</span>
                        {badge && !isActive && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            isCrisis ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>{badge}</span>
                        )}
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Language Selector + Logout */}
        {!collapsed ? (
          <div className="px-3 pb-4 space-y-2 relative" ref={dropdownRef}>
            {/* Language picker */}
            {isLangOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1a2d35] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="py-2 max-h-60 overflow-y-auto">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code as Language); setIsLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${language === lang.code ? 'text-emerald-400 font-bold bg-white/5' : 'text-slate-300'}`}
                    >
                      <span>{lang.flag}</span>
                      <span className="flex-1 text-left">{lang.native}</span>
                      <span className="text-xs text-slate-500">{lang.name}</span>
                      {language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`flex items-center gap-2 text-slate-400 hover:text-white transition-all w-full px-4 py-2.5 rounded-xl hover:bg-white/5 border border-transparent ${isLangOpen ? 'border-white/10 bg-white/5 text-white' : ''}`}
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium">{languages.find(l => l.code === language)?.name || 'English'}</span>
              <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all w-full px-4 py-2.5 rounded-xl border border-transparent hover:border-rose-500/20"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout / Switch Role</span>
            </button>
          </div>
        ) : (
          <div className="pb-4 flex flex-col items-center gap-2">
            <button onClick={() => setCollapsed(false)} title="Expand to change language" className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all">
              <Globe className="h-5 w-5" />
            </button>
            <button onClick={logout} title="Logout" className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
