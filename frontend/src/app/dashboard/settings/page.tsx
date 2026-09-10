'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage, Language } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';
import { SupabasePasskeyItem } from '@/lib/passkeyHelper';
import {
  User, Heart, Sun, Moon, Monitor, Bell, Shield,
  Camera, CheckCircle2, ChevronRight, Save, Loader2,
  Globe, Lock, LogOut, Trash2, Edit2, Upload, Languages, Key
} from 'lucide-react';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'security';

const THEME_OPTIONS = [
  { value: 'light',  label: 'Light',  icon: Sun,     desc: 'Clean bright interface' },
  { value: 'dark',   label: 'Dark',   icon: Moon,    desc: 'Easy on the eyes at night' },
  { value: 'system', label: 'System', icon: Monitor, desc: 'Follows your device setting' },
] as const;

const LANGUAGE_OPTIONS: { value: Language; label: string; native: string; flag: string }[] = [
  { value: 'en',  label: 'English',    native: 'English',    flag: '🇬🇧' },
  { value: 'hi',  label: 'Hindi',      native: 'हिन्दी',      flag: '🇮🇳' },
  { value: 'te',  label: 'Telugu',     native: 'తెలుగు',      flag: '🇮🇳' },
  { value: 'ta',  label: 'Tamil',      native: 'தமிழ்',       flag: '🇮🇳' },
  { value: 'kn',  label: 'Kannada',    native: 'ಕನ್ನಡ',       flag: '🇮🇳' },
  { value: 'mr',  label: 'Marathi',    native: 'मराठी',       flag: '🇮🇳' },
  { value: 'bn',  label: 'Bengali',    native: 'বাংলা',       flag: '🇧🇩' },
  { value: 'bho', label: 'Bhojpuri',   native: 'भोजपुरी',     flag: '🇮🇳' },
];

export default function SettingsPage() {
  const {
    user,
    updateUserProfile,
    registerPasskey,
    listPasskeys,
    renamePasskey,
    deletePasskey,
    logout,
  } = useUserRole();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Passkey Management State
  const [passkeys, setPasskeys] = useState<SupabasePasskeyItem[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [passkeyMsg, setPasskeyMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [notifs, setNotifs] = useState({
    sos_alerts: true,
    hospital_updates: true,
    appointment_reminders: true,
    health_tips: false,
    marketing: false,
  });

  const loadPasskeys = async () => {
    setPasskeysLoading(true);
    try {
      const res = await listPasskeys();
      if (res.success && res.passkeys) {
        setPasskeys(res.passkeys);
      }
    } catch (e) {
      console.warn('Failed to load passkeys:', e);
    } finally {
      setPasskeysLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      loadPasskeys();
    }
  }, [activeTab]);

  const handleAddPasskey = async () => {
    setPasskeyRegistering(true);
    setPasskeyMsg(null);
    try {
      const res = await registerPasskey('Arogya Rakshaa Passkey');
      if (res.success) {
        setPasskeyMsg({ type: 'success', text: 'Passkey added successfully' });
        await loadPasskeys();
      } else {
        setPasskeyMsg({
          type: 'error',
          text: res.error || 'Passkey registration cancelled or failed.',
        });
      }
    } catch (err: any) {
      setPasskeyMsg({
        type: 'error',
        text: err?.message || 'Passkey registration failed.',
      });
    } finally {
      setPasskeyRegistering(false);
    }
  };

  const handleStartRename = (pk: SupabasePasskeyItem) => {
    setRenamingId(pk.id);
    setRenamingName(pk.friendly_name || 'Arogya Rakshaa Passkey');
  };

  const handleSaveRename = async (pkId: string) => {
    if (!renamingName.trim()) return;
    setActionLoadingId(pkId);
    setPasskeyMsg(null);
    try {
      const res = await renamePasskey(pkId, renamingName.trim());
      if (res.success) {
        setPasskeyMsg({ type: 'success', text: 'Passkey renamed successfully.' });
        setRenamingId(null);
        await loadPasskeys();
      } else {
        setPasskeyMsg({ type: 'error', text: res.error || 'Failed to rename passkey.' });
      }
    } catch (e: any) {
      setPasskeyMsg({ type: 'error', text: e?.message || 'Failed to rename passkey.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePasskey = async (pkId: string, friendlyName?: string) => {
    if (
      !confirm(
        `Are you sure you want to remove "${friendlyName || 'this passkey'}"? You will no longer be able to use it to sign in on this device.`
      )
    ) {
      return;
    }
    setActionLoadingId(pkId);
    setPasskeyMsg(null);
    try {
      const res = await deletePasskey(pkId);
      if (res.success) {
        setPasskeyMsg({ type: 'success', text: 'Passkey removed successfully.' });
        await loadPasskeys();
      } else {
        setPasskeyMsg({ type: 'error', text: res.error || 'Failed to remove passkey.' });
      }
    } catch (e: any) {
      setPasskeyMsg({ type: 'error', text: e?.message || 'Failed to remove passkey.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setAvatarPreview(null);
      const stored = localStorage.getItem('arogya-bio');
      if (stored) setBio(stored);
      const storedNotifs = localStorage.getItem('arogya-notifs');
      if (storedNotifs) setNotifs(JSON.parse(storedNotifs));
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      updateUserProfile({ name: displayName.trim() });
      localStorage.setItem('arogya-bio', bio);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const saveNotifs = () => {
    localStorage.setItem('arogya-notifs', JSON.stringify(notifs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const TABS: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
    { key: 'profile',       label: t('profile') || 'Profile',         icon: User },
    { key: 'appearance',    label: t('appearance') || 'Appearance',   icon: resolvedTheme === 'dark' ? Moon : Sun },
    { key: 'notifications', label: t('notifications') || 'Notifications', icon: Bell },
    { key: 'security',      label: 'Security',                        icon: Shield },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-3xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('settings')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {t('manageAccount') || 'Manage your account, appearance and preferences'}
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ─── PROFILE TAB ─── */}
      {activeTab === 'profile' && (
        <div className="space-y-4">

          {/* Avatar Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Camera className="h-4 w-4" /> {t('profilePicture')}
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0">
                <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-900 shadow-lg">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                      <span className="text-3xl font-black text-white">
                        {(user?.name || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {avatarUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-lg">{user?.name || 'Your Name'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
                    <Upload className="h-3.5 w-3.5" /> {t('uploadPhoto')}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  {avatarPreview && (
                    <button onClick={() => setAvatarPreview(null)}
                      className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-red-500 text-sm font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-600">
                      {t('cancel')}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">JPG, PNG or GIF • Max 5MB</p>
              </div>
            </div>
          </div>

          {/* Display Name + Bio */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Edit2 className="h-4 w-4" /> Account Details
            </h2>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t('displayName')}</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder={t('fullName')} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t('email')}</label>
              <input value={user?.email || ''} disabled
                className="w-full border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 rounded-xl px-3 py-2.5 text-sm cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t('bio')}</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                placeholder="A short note about yourself…" />
            </div>
            <div className="flex justify-end">
              <button onClick={saveProfile} disabled={isSaving}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                }`}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? t('profileSaved') : isSaving ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </div>

          {/* Medical Profile quick link */}
          <Link href="/dashboard/profile"
            className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-5 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900">
                <Heart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{t('medicalProfile')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('bloodGroup')}, {t('medicalConditions')}, {t('medications')}, {t('preferredHospitals')}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          </Link>
        </div>
      )}

      {/* ─── APPEARANCE TAB ─── */}
      {activeTab === 'appearance' && (
        <div className="space-y-4">

          {/* Theme selector */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5">
              Theme &amp; Display
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {THEME_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${
                    theme === opt.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 shadow-lg shadow-indigo-500/10'
                      : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}>
                  <div className={`p-3 rounded-xl ${
                    theme === opt.value ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    <opt.icon className={`h-6 w-6 ${theme === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-black text-sm ${theme === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                      {opt.value === 'light' ? t('lightMode') : opt.value === 'dark' ? t('darkMode') : t('systemMode')}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  {theme === opt.value && <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                </button>
              ))}
            </div>
            <div className={`mt-5 p-4 rounded-xl border flex items-center gap-3 ${
              resolvedTheme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              {resolvedTheme === 'dark' ? <Moon className="h-4 w-4 text-indigo-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
              <div>
                <p className="text-sm font-bold">Currently: {resolvedTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</p>
                <p className="text-xs opacity-60 mt-0.5">Changes apply instantly across the entire app</p>
              </div>
            </div>
          </div>

          {/* Language selector */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Languages className="h-4 w-4" /> Language / भाषा / భాష
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {LANGUAGE_OPTIONS.map(lang => (
                <button key={lang.value} onClick={() => setLanguage(lang.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                    language === lang.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 shadow-sm'
                      : 'border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}>
                  <span className="text-2xl">{lang.flag}</span>
                  <span className={`text-xs font-black ${language === lang.value ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'}`}>
                    {lang.label}
                  </span>
                  <span className={`text-xs ${language === lang.value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {lang.native}
                  </span>
                  {language === lang.value && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
              🌐 Selected language applies across the entire app — dashboard, SOS page, hospital portal, settings, and more.
            </p>
          </div>

          {/* Display Preferences */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Display Preferences</h2>
            <div className="space-y-3">
              {[
                { label: 'Compact mode', desc: 'Reduce spacing between elements', key: 'compact' },
                { label: 'Reduce animations', desc: 'Disable motion for accessibility', key: 'reduce_motion' },
                { label: 'High contrast', desc: 'Improve text readability', key: 'high_contrast' },
              ].map(pref => {
                const val = typeof window !== 'undefined' ? localStorage.getItem(`arogya-${pref.key}`) === 'true' : false;
                return (
                  <div key={pref.key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{pref.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{pref.desc}</p>
                    </div>
                    <button onClick={() => {
                      const cur = localStorage.getItem(`arogya-${pref.key}`) === 'true';
                      localStorage.setItem(`arogya-${pref.key}`, String(!cur));
                    }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── NOTIFICATIONS TAB ─── */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Bell className="h-4 w-4" /> {t('notifications')}
          </h2>
          <div className="space-y-3">
            {[
              { key: 'sos_alerts',           label: 'SOS & Emergency Alerts',     desc: 'Critical — cannot be turned off', critical: true },
              { key: 'hospital_updates',     label: 'Hospital Updates',           desc: 'When hospital acknowledges or bed is ready' },
              { key: 'appointment_reminders',label: 'Appointment Reminders',     desc: '24 hours before scheduled appointments' },
              { key: 'health_tips',          label: 'Daily Health Tips',          desc: 'Personalised based on your medical profile' },
              { key: 'marketing',            label: 'Promotions & Offers',        desc: 'Health packages and partner offers' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {n.label}
                    {n.critical && <span className="ml-2 text-xs text-red-500 font-black">Required</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{n.desc}</p>
                </div>
                <button disabled={n.critical}
                  onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifs[n.key as keyof typeof notifs] ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                  } ${n.critical ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    notifs[n.key as keyof typeof notifs] ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={saveNotifs}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm ${
                saved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
              }`}>
              {saved ? <><CheckCircle2 className="h-4 w-4" /> {t('profileSaved')}</> : <><Save className="h-4 w-4" /> Save Preferences</>}
            </button>
          </div>
        </div>
      )}

      {/* ─── SECURITY TAB (GitHub-Style Passkeys) ─── */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8 space-y-6">
            
            {/* Header */}
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Security</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manage your credentials, passkeys, and biometric device authentication.
              </p>
            </div>

            <hr className="border-slate-200 dark:border-slate-700" />

            {/* Passkeys Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  Passkeys
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Passkeys allow you to sign in safely using your fingerprint, Face ID, Windows Hello, or device PIN.
                </p>
              </div>

              {/* Feedback Alert */}
              {passkeyMsg && (
                <div
                  className={`text-xs p-3.5 rounded-xl font-semibold flex items-center gap-2 ${
                    passkeyMsg.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <span>{passkeyMsg.type === 'success' ? '✓' : '⚠️'}</span>
                  <span>{passkeyMsg.text}</span>
                </div>
              )}

              {/* Passkeys List */}
              <div className="space-y-3 pt-2">
                {passkeysLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
                    <span className="text-xs">Loading registered passkeys…</span>
                  </div>
                ) : passkeys.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="inline-flex p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                      <Key className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No passkeys registered yet</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Add a passkey to sign in to Arogya Rakshaa using biometric sensors (Windows Hello, Touch ID, Face ID) without typing a password.
                    </p>
                  </div>
                ) : (
                  passkeys.map((pk) => (
                    <div
                      key={pk.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>
                          {renamingId === pk.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={renamingName}
                                onChange={(e) => setRenamingName(e.target.value)}
                                className="px-2.5 py-1 text-xs rounded-lg border border-teal-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(pk.id);
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                              />
                              <button
                                onClick={() => handleSaveRename(pk.id)}
                                disabled={actionLoadingId === pk.id}
                                className="text-[11px] px-2.5 py-1 bg-teal-600 text-white rounded font-bold hover:bg-teal-700 disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setRenamingId(null)}
                                className="text-[11px] px-2.5 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {pk.friendly_name || 'Arogya Rakshaa Passkey'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 space-y-0.5">
                          <p>Added: {formatDate(pk.created_at)}</p>
                          <p>Last used: {formatDate(pk.last_used_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-5 sm:pl-0">
                        {renamingId !== pk.id && (
                          <button
                            onClick={() => handleStartRename(pk)}
                            disabled={actionLoadingId === pk.id}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            Rename
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePasskey(pk.id, pk.friendly_name)}
                          disabled={actionLoadingId === pk.id}
                          className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {actionLoadingId === pk.id ? 'Removing…' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add a passkey button */}
              <div className="pt-2">
                <button
                  onClick={handleAddPasskey}
                  disabled={passkeyRegistering}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-500/20 transition-all hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-60"
                >
                  {passkeyRegistering ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Waiting for device prompt…</span>
                    </>
                  ) : (
                    <>
                      <span>+</span>
                      <span>Add a passkey</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Data & Privacy Controls */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Lock className="h-4 w-4" /> Data & Privacy Controls
            </h2>
            {[
              { label: 'Medical Profile Visibility', desc: 'Only visible to you — never shared without consent', val: 'Private', color: 'emerald' },
              { label: 'SOS Incident Data',  desc: 'Shared with emergency services during active incidents only', val: 'Emergency Only', color: 'amber' },
              { label: 'Location Data',      desc: 'Used only for hospital and ambulance proximity calculation', val: 'App Only', color: 'blue' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                  item.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' :
                  item.color === 'amber'   ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' :
                  'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                }`}>{item.val}</span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Globe className="h-4 w-4" /> Account Actions
            </h2>
            <button
              onClick={logout}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700 group"
            >
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-bold">{t('signOut')}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
            </button>
            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors border border-red-100 dark:border-red-900/50 group">
              <div className="flex items-center gap-2 text-red-500">
                <Trash2 className="h-4 w-4" />
                <span className="text-sm font-bold">{t('deleteAccount')}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-red-300 group-hover:text-red-500" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
