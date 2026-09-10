'use client';

import React, { useState } from 'react';
import { useUserRole, UserRole, DEFAULT_PROFILES } from '@/context/UserRoleContext';

const roles = [
  {
    id: 'patient' as UserRole,
    label: 'Patient Portal',
    sublabel: 'Appointments, medicine orders, OPD queue & SOS',
    icon: '🧑‍⚕️',
    color: 'from-blue-500 to-blue-700',
    border: 'border-blue-300/40 hover:border-blue-400',
    bg: 'hover:bg-blue-950/30',
    glow: 'shadow-blue-500/20',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    badgeText: 'Citizen Self-Service',
    demoUser: DEFAULT_PROFILES.patient,
  },
  {
    id: 'doctor' as UserRole,
    label: 'Doctor EHR Portal',
    sublabel: 'Clinical OPD queue, prescriptions, patient history',
    icon: '👨‍⚕️',
    color: 'from-violet-500 to-purple-700',
    border: 'border-violet-300/40 hover:border-violet-400',
    bg: 'hover:bg-violet-950/30',
    glow: 'shadow-violet-500/20',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
    badgeText: 'Clinical Staff (MCI)',
    demoUser: DEFAULT_PROFILES.doctor,
  },
  {
    id: 'asha' as UserRole,
    label: 'ASHA Worker Portal',
    sublabel: 'Village health surveys, assisted booking & tracking',
    icon: '👩‍🌾',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-300/40 hover:border-emerald-400',
    bg: 'hover:bg-emerald-950/30',
    glow: 'shadow-emerald-500/20',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    badgeText: 'Rural Digital Bridge',
    demoUser: DEFAULT_PROFILES.asha,
  },
  {
    id: 'hospital_admin' as UserRole,
    label: 'Hospital Admin Portal',
    sublabel: 'OPD arrival check-in, doctor availability & revenue',
    icon: '🏥',
    color: 'from-indigo-500 to-indigo-700',
    border: 'border-indigo-300/40 hover:border-indigo-400',
    bg: 'hover:bg-indigo-950/30',
    glow: 'shadow-indigo-500/20',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    badgeText: 'Operations Desk',
    demoUser: DEFAULT_PROFILES.hospital_admin,
  },
  {
    id: 'pharmacy' as UserRole,
    label: 'Hospital Pharmacy Portal',
    sublabel: 'Digital Rx queue, stock verification & village courier',
    icon: '💊',
    color: 'from-teal-500 to-emerald-700',
    border: 'border-teal-300/40 hover:border-teal-400',
    bg: 'hover:bg-teal-950/30',
    glow: 'shadow-teal-500/20',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
    badgeText: 'Jan Aushadhi Hub',
    demoUser: DEFAULT_PROFILES.pharmacy,
  },
  {
    id: 'ambulance' as UserRole,
    label: 'Ambulance Driver Portal',
    sublabel: 'Emergency GPS dispatch, live telemetry & route nav',
    icon: '🚑',
    color: 'from-rose-500 to-red-700',
    border: 'border-rose-300/40 hover:border-rose-400',
    bg: 'hover:bg-rose-950/30',
    glow: 'shadow-rose-500/20',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    badgeText: 'Emergency Dispatch 108',
    demoUser: DEFAULT_PROFILES.ambulance,
  },
];

export default function LoginScreen() {
  const { login, signUpWithSupabase, signInWithSupabase, resetAllTestData } = useUserRole();

  // Mode: 'signin' | 'signup' | 'quick_pass'
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'quick_pass'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  // Feedback
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const activeRoleObj = roles.find((r) => r.id === selectedRole) || roles[0];

  // 1. Handle Sign In with Supabase
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    const res = await signInWithSupabase({
      email: email.trim(),
      password,
    });

    if (!res.success) {
      setError((res as { success: boolean; error?: string }).error || 'Invalid credentials or user does not exist.');
    } else {
      setSuccessMsg('Signed in successfully! Loading your dashboard...');
    }
    setLoading(false);
  };

  // 2. Handle Sign Up with Supabase
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError('');
    setSuccessMsg('');
    setLoading(true);

    const res = await signUpWithSupabase({
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim(),
      role: selectedRole,
    });

    if (!res.success) {
      setError((res as { success: boolean; error?: string }).error || 'Failed to create account.');
    } else {
      setSuccessMsg('Account created successfully! Connecting your workspace...');
    }
    setLoading(false);
  };

  // 3. Quick 1-Click Login (Evaluator/Demo Bypass)
  const handleQuickLogin = (rId: UserRole) => {
    const demo = DEFAULT_PROFILES[rId];
    login(rId, {
      name: demo.name,
      email: demo.email,
      phone: demo.phone,
    });
  };

  const handleResetData = async () => {
    if (confirm('This will wipe all test journeys, test medical history, and reset the OPD queue to zero. Proceed?')) {
      setResetting(true);
      await resetAllTestData();
      setResetting(false);
      alert('All test data cleared! You can now start testing from clean zero.');
    }
  };

  return (
    <div className="min-h-screen bg-[#060d18] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-600/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">

        {/* Logo & Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 text-3xl mb-1">
            🏥
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Arogya Raksha
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-md mx-auto leading-relaxed">
            AI-Powered Smart Healthcare Platform · Direct Supabase Realtime Authentication
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 mb-6 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => { setAuthMode('signin'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signin'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🔐</span>
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('signup'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'signup'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>✨</span>
            <span>Create Account</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('quick_pass'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'quick_pass'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⚡</span>
            <span>1-Click Demo</span>
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mb-5 flex items-center gap-2 text-rose-400 text-xs font-bold bg-rose-500/10 border border-rose-500/25 rounded-xl p-3.5 animate-in fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-5 flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3.5 animate-in fade-in">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN */}
        {authMode === 'signin' && (
          <form onSubmit={handleSignIn} className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl font-black text-sm text-white shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span>Authenticating with Supabase...</span>
                </>
              ) : (
                <span>Sign In to Your Portal →</span>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-slate-400">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className="text-blue-400 hover:underline font-bold"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CREATE ACCOUNT (SIGN UP) */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-4">
            
            {/* Role Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Select Your Role / Portal
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs flex items-center gap-2 ${
                      selectedRole === r.id
                        ? 'border-emerald-500 bg-emerald-500/20 text-white font-bold ring-1 ring-emerald-500/50'
                        : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{r.icon}</span>
                    <span className="truncate">{r.label.replace(' Portal', '')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Full Name (మీ పేరు) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98480 12345"
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password (min 6 chars) *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full bg-black/40 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl font-black text-sm text-white shadow-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span>Registering Member in Supabase...</span>
                </>
              ) : (
                <span>Register & Open {activeRoleObj.label} →</span>
              )}
            </button>

            <div className="pt-2 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="text-emerald-400 hover:underline font-bold"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: 1-CLICK DEMO ACCESS (Fast testing across all 6 roles) */}
        {authMode === 'quick_pass' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-4">
            <p className="text-slate-300 text-xs font-medium">
              Click any panel below for instant 1-click evaluator access without entering credentials:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleQuickLogin(r.id)}
                  className={`p-4 rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 transition-all cursor-pointer flex items-center gap-3.5 group hover:border-violet-500/50`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center text-xl shadow-md flex-shrink-0`}>
                    {r.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-extrabold group-hover:text-violet-300 transition-colors">
                      {r.label}
                    </p>
                    <p className="text-slate-400 text-[11px] truncate">
                      {r.demoUser.name} · {r.demoUser.badgeId}
                    </p>
                  </div>
                  <span className="text-slate-500 group-hover:text-white transition-colors text-xs">→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Reset Utility */}
        <div className="mt-8 pt-5 border-t border-white/10 flex flex-col items-center justify-center gap-2 text-center">
          <button
            onClick={handleResetData}
            disabled={resetting}
            className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 border border-rose-800/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <span>🧹</span>
            <span>{resetting ? 'Wiping Cache...' : 'Wipe All Test Data & Reset to Zero'}</span>
          </button>
          <p className="text-slate-500 text-[10px]">
            Clears local storage journeys, resets the backend OPD queue to Token #1, and empties medical histories.
          </p>
        </div>

        <p className="text-center text-slate-600 text-[10px] font-medium mt-6">
          Arogya Raksha · Powered by Supabase Realtime & PostgreSQL RLS · Google Gemini Hackathon 2026
        </p>

      </div>
    </div>
  );
}
