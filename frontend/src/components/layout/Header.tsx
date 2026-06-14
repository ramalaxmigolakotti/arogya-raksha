'use client';

import { Search, Bell, User, MapPin, Video, Loader2, RefreshCw } from 'lucide-react';
import { useLocation } from '@/context/LocationContext';
import { useLanguage } from '@/context/LanguageContext';
import { UserButton } from '@clerk/nextjs';

export default function Header() {
  const { location, loading, error, refreshLocation } = useLocation();
  const { t } = useLanguage();

  const cityDisplay = loading
    ? 'Detecting...'
    : location?.city || (error ? t('selectLocation') : 'Unknown');

  return (
    <header className="h-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/60 fixed top-0 right-0 left-0 lg:left-64 z-30 flex items-center justify-between px-4 md:px-8 shadow-sm transition-colors duration-300">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-xl group ml-12 lg:ml-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          className="w-full pl-12 pr-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 transition-all outline-none font-medium"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 md:gap-3 ml-3 md:ml-6">
        {/* Live City Selector */}
        <button
          onClick={refreshLocation}
          className="flex items-center gap-1.5 px-2 md:px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 group"
          title={location?.fullAddress || 'Click to refresh location'}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 text-emerald-500" />
          )}
          <span className="font-semibold max-w-[80px] md:max-w-[120px] truncate hidden sm:inline">{cityDisplay}</span>
          {!loading && (
            <RefreshCw className="h-3 w-3 text-slate-300 group-hover:text-emerald-500 transition-colors hidden md:block" />
          )}
        </button>

        {/* Online Doctor Button */}
        <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 md:px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/40">
          <Video className="h-4 w-4" />
          <span className="hidden sm:inline">{t('onlineDoctor')}</span>
        </button>

        {/* Notification Bell */}
        <button className="relative p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600 transition-all">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
        </button>

        {/* Clerk User Button */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-10 w-10 ring-2 ring-emerald-100 hover:ring-emerald-300 transition-all shadow-md',
            },
          }}
        />
      </div>
    </header>
  );
}
