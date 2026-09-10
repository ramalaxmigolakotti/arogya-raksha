'use client';

import Link from 'next/link';
import {
  LayoutDashboard, Bot, Stethoscope, Pill, FileText,
  Heart, Siren, Settings, ScanLine, MapPin,
  Globe, ChevronDown, User, Brain, Microscope, BriefcaseMedical,
  Menu, X, CreditCard, Sparkles, Building2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useLanguage, Language, LANGUAGES } from '@/context/LanguageContext';
import { useState, useRef, useEffect } from 'react';

// Shared collapsed state — stored in sessionStorage so it persists across navigations
const STORAGE_KEY = 'sidebar_collapsed';

export default function Sidebar() {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // SSR-safe: always start collapsed=false on server, sync from sessionStorage after mount
  const [collapsed, setCollapsed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read saved collapsed state after mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved === 'true') setCollapsed(true);
  }, []);

  // Persist collapsed state and notify layout
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, String(collapsed));
    window.dispatchEvent(new CustomEvent('sidebarToggle', { detail: { collapsed } }));
  }, [collapsed]);

  const menuItems = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/dashboard' },
    { icon: Heart, label: t('myMedicalProfile'), href: '/dashboard/profile', profile: true },
    { icon: Bot, label: t('askAIDoctor'), href: '/dashboard/ai' },
    { icon: Stethoscope, label: t('symptomChecker'), href: '/dashboard/symptoms' },
    { icon: Pill, label: t('medicineFinder'), href: '/dashboard/medicines' },
    { icon: ScanLine, label: t('medicineScanner'), href: '/dashboard/scanner' },
    { icon: User, label: t('doctors'), href: '/dashboard/doctors' },
    { icon: BriefcaseMedical, label: t('doctorDashboard'), href: '/dashboard/doctor-dashboard' },
    { icon: Microscope, label: t('diagnosticCentre'), href: '/dashboard/diagnostic-centre' },
    { icon: Building2, label: t('hospitals'), href: '/dashboard/hospitals' },
    { icon: Brain, label: t('healthPredictors'), href: '/dashboard/predictors' },
    { icon: FileText, label: t('medicalReports'), href: '/dashboard/reports' },
    { icon: Heart, label: t('healthTracker'), href: '/dashboard/quiz' },
    { icon: Siren, label: t('emergency'), href: '/dashboard/emergency' },
    { icon: Settings, label: t('settings'), href: '/dashboard/settings' },
  ];

  const languages = LANGUAGES;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#0f2027] text-white p-2.5 rounded-xl shadow-lg shadow-black/20"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Beautiful Collapse Toggle Button ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={`
          hidden lg:flex
          fixed z-[60] top-1/2 -translate-y-1/2
          items-center justify-center
          w-7 h-14 rounded-r-2xl
          bg-gradient-to-b from-emerald-400 to-teal-500
          shadow-lg shadow-emerald-500/40
          hover:from-emerald-300 hover:to-teal-400
          hover:w-8 hover:shadow-emerald-500/60
          transition-all duration-300 ease-in-out
          group
          ${collapsed ? 'left-[72px]' : 'left-64'}
        `}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {/* Arrow icon — animated */}
        <span className="transition-transform duration-300 group-hover:scale-110">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-white drop-shadow" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-white drop-shadow" />
          )}
        </span>

        {/* Decorative dots */}
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 flex flex-col gap-0.5 opacity-50">
          <span className="w-1 h-1 rounded-full bg-white" />
          <span className="w-1 h-1 rounded-full bg-white" />
          <span className="w-1 h-1 rounded-full bg-white" />
        </span>
      </button>

      {/* ── Sidebar ── */}
      <aside className={`
        fixed left-0 top-0 h-screen bg-[#0f2027] text-white flex flex-col shadow-2xl z-50
        transition-all duration-300 ease-in-out
        ${sidebarWidth}
        ${mobileOpen ? 'translate-x-0 w-64' : collapsed ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:translate-x-0
        overflow-hidden
      `}>

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
          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto pt-2 pb-4 px-2 overflow-x-hidden">
          <ul className="space-y-0.5">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
              const isFeatured = (item as any).featured;
              const isCrisis   = (item as any).crisis;
              const isProfile  = (item as any).profile;

              const baseClass = `
                flex items-center gap-3 rounded-xl transition-all duration-200 group relative overflow-hidden
                ${collapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'}
              `;

              const tooltip = collapsed
                ? `title="${item.label}"`
                : '';

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
                        : isFeatured
                        ? isActive
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/40 font-semibold'
                          : 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-300 hover:from-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40'
                        : isActive
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 font-semibold'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {/* Icon */}
                    {isFeatured && !collapsed && (
                      <Sparkles className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                    )}
                    <item.icon className={`h-5 w-5 flex-shrink-0 ${
                      isActive ? 'text-white' :
                      isCrisis ? 'text-red-400 animate-pulse' :
                      isProfile ? 'text-indigo-400' :
                      isFeatured ? 'text-emerald-400' :
                      'text-slate-500 group-hover:text-emerald-400'
                    }`} />

                    {/* Label + badge — hidden when collapsed */}
                    {!collapsed && (
                      <>
                        <span className="text-sm font-medium whitespace-nowrap overflow-hidden">{item.label}</span>
                        {!isActive && (isCrisis || isFeatured || isProfile) && (
                          <span className={`ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                            isCrisis  ? 'bg-red-500/20 text-red-400 animate-pulse' :
                            isProfile ? 'bg-indigo-500/20 text-indigo-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {isCrisis ? 'Live' : isProfile ? 'ID' : 'New'}
                          </span>
                        )}
                      </>
                    )}

                    {/* Tooltip on collapsed hover — shown as native title */}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Language Selector */}
        {!collapsed && (
          <div className="px-3 pb-6 relative" ref={dropdownRef}>
            {isLangOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1a2d35] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="py-2 max-h-60 overflow-y-auto">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code as Language); setIsLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5 ${
                        language === lang.code ? 'text-emerald-400 font-bold bg-white/5' : 'text-slate-300'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span className="flex-1 text-left">{lang.native}</span>
                      <span className="text-xs text-slate-500">{lang.name}</span>
                      {language === lang.code && (
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className={`flex items-center gap-2 text-slate-400 hover:text-white transition-all w-full px-4 py-3 rounded-xl hover:bg-white/5 border border-transparent ${isLangOpen ? 'border-white/10 bg-white/5 text-white' : ''}`}
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm font-medium">{languages.find(l => l.code === language)?.name || 'English'}</span>
              <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}

        {/* Collapsed language icon */}
        {collapsed && (
          <div className="pb-4 flex justify-center">
            <button
              onClick={() => setCollapsed(false)}
              title="Expand to change language"
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Globe className="h-5 w-5" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
