'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { authenticateWithPasskey, registerDevicePasskey } from '@/lib/passkeyHelper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zjitgtmigelfhejzdhdy.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqaXRndG1pZ2VsZmhlanpkaGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzg1OTAsImV4cCI6MjA5MDgxNDU5MH0.8O9NKxANRarmXyVg-xEev73uXhTNmEKnIbgZm_V-72A';

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder')
);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'patient' | 'asha' | 'doctor' | 'ambulance' | 'hospital_admin' | 'pharmacy';

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  phone?: string;
  badgeId: string;
  hospitalName?: string;
  village?: string;
  vehicleNo?: string;
  department?: string;
}

export const DEFAULT_PROFILES: Record<UserRole, AuthUser> = {
  patient: {
    id: 'usr_pat_8812',
    name: 'Rahul Sharma',
    role: 'patient',
    email: 'rahul.sharma@arogya.gov.in',
    phone: '+91 98765 43210',
    badgeId: 'PAT-2026-0812',
  },
  doctor: {
    id: 'usr_doc_9941',
    name: 'Dr. Rajesh Varma',
    role: 'doctor',
    email: 'dr.rajesh@apollo.org',
    phone: '+91 98111 22334',
    badgeId: 'DOC-MCI-9941',
    hospitalName: 'Apollo Hospitals',
    department: 'General Medicine OPD Room #4',
  },
  asha: {
    id: 'usr_ash_4410',
    name: 'Lakshmi Devi',
    role: 'asha',
    email: 'asha.lakshmi@arogya.gov.in',
    phone: '+91 97222 33445',
    badgeId: 'ASH-2026-441',
    village: 'Peruru Ward 2, Kurnool',
  },
  hospital_admin: {
    id: 'usr_adm_5510',
    name: 'Suresh Reddy',
    role: 'hospital_admin',
    email: 'admin.suresh@apollo.org',
    phone: '+91 98490 55100',
    badgeId: 'ADM-HOSP-551',
    hospitalName: 'Apollo Hospitals',
    department: 'Hospital Administration & Reception',
  },
  pharmacy: {
    id: 'usr_phr_7720',
    name: 'K. Venkatesh (Chief Pharmacist)',
    role: 'pharmacy',
    email: 'pharmacy.apollo@medplus.in',
    phone: '+91 98490 77200',
    badgeId: 'PHR-APOLLO-772',
    hospitalName: 'Apollo Central Pharmacy',
    department: 'Outpatient Dispensing & Jan Aushadhi',
  },
  ambulance: {
    id: 'usr_amb_1082',
    name: 'Rajesh Kumar',
    role: 'ambulance',
    email: 'amb108.driver@arogya.gov.in',
    phone: '+91 99333 44556',
    badgeId: 'DRV-108-92',
    vehicleNo: 'AP-39-AMB-108',
    hospitalName: 'Apollo Emergency Fleet',
  },
};

interface UserRoleContextType {
  role: UserRole;
  user: AuthUser;
  setRole: (role: UserRole) => void;
  isLoggedIn: boolean;
  login: (role: UserRole, customUser?: Partial<AuthUser>) => void;
  signUpWithSupabase: (params: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: UserRole;
  }) => Promise<{ success: boolean; error?: string }>;
  signInWithSupabase: (params: {
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (preferredRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  signInWithPasskey: (fallback?: { email?: string; name?: string; role?: UserRole }) => Promise<{ success: boolean; error?: string; isNewRegistration?: boolean }>;
  registerPasskey: (params?: { email?: string; name?: string; role?: UserRole }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<AuthUser>) => void;
  resetAllTestData: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('patient');
  const [user, setUser] = useState<AuthUser>(DEFAULT_PROFILES.patient);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // 1. Initial check from Local Storage
    const savedRole = localStorage.getItem('app-user-role') as UserRole;
    const savedLogin = localStorage.getItem('app-logged-in');
    const savedProfile = localStorage.getItem('app-user-profile');

    const effectiveRole: UserRole =
      savedRole && ['patient', 'asha', 'doctor', 'ambulance', 'hospital_admin', 'pharmacy'].includes(savedRole)
        ? savedRole
        : 'patient';

    setRoleState(effectiveRole);

    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setUser(parsed);
      } catch {
        setUser(DEFAULT_PROFILES[effectiveRole]);
      }
    } else {
      setUser(DEFAULT_PROFILES[effectiveRole]);
    }

    if (savedLogin === 'true') {
      setIsLoggedIn(true);
    }

    // 2. Supabase Real-Time Session Check
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const meta = session.user.user_metadata || {};
          const detectedRole: UserRole = (meta.role || savedRole || 'patient') as UserRole;
          const detectedName = meta.full_name || meta.name || session.user.email?.split('@')[0] || 'User';
          
          const finalProfile: AuthUser = {
            ...DEFAULT_PROFILES[detectedRole],
            id: session.user.id,
            name: detectedName,
            email: session.user.email || '',
            phone: meta.phone || session.user.phone || '',
            role: detectedRole,
          };

          setUser(finalProfile);
          setRoleState(detectedRole);
          setIsLoggedIn(true);
          localStorage.setItem('app-user-role', detectedRole);
          localStorage.setItem('app-user-profile', JSON.stringify(finalProfile));
          localStorage.setItem('app-logged-in', 'true');
        }
      }).catch(err => console.warn('Supabase session load error:', err));

      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const meta = session.user.user_metadata || {};
          const savedActiveRole = localStorage.getItem('app-user-role') as UserRole;
          const uRole: UserRole = (savedActiveRole || meta.role || 'patient') as UserRole;
          const uName = meta.full_name || meta.name || session.user.email?.split('@')[0] || 'User';
          
          const profile: AuthUser = {
            ...DEFAULT_PROFILES[uRole],
            id: session.user.id,
            name: uName,
            email: session.user.email || '',
            phone: meta.phone || '',
            role: uRole,
          };

          setUser(profile);
          setRoleState(uRole);
          setIsLoggedIn(true);
          localStorage.setItem('app-user-role', uRole);
          localStorage.setItem('app-user-profile', JSON.stringify(profile));
          localStorage.setItem('app-logged-in', 'true');

          // Sync authenticated user to public.users table in Supabase
          try {
            await supabase.from('users').upsert({
              id: session.user.id,
              name: uName,
              email: session.user.email || '',
              role: uRole,
              is_active: true,
            }, { onConflict: 'id' });
          } catch (syncErr) {
            console.warn('User DB sync notice:', syncErr);
          }
        } else if (event === 'SIGNED_OUT') {
          // Keep local state in sync
          setIsLoggedIn(false);
          localStorage.removeItem('app-logged-in');
          localStorage.removeItem('app-user-profile');
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }

    setHydrated(true);
  }, []);

  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter?.() : null;
  const pathname = typeof window !== 'undefined' ? require('next/navigation').usePathname?.() : '/dashboard';

  const setRole = (newRole: UserRole, navigate: boolean = true) => {
    setRoleState(newRole);
    const existingName = user.name && !Object.values(DEFAULT_PROFILES).some(p => p.name === user.name) ? user.name : DEFAULT_PROFILES[newRole].name;
    const existingEmail = user.email && !Object.values(DEFAULT_PROFILES).some(p => p.email === user.email) ? user.email : DEFAULT_PROFILES[newRole].email;
    const existingPhone = user.phone;

    const profile: AuthUser = {
      ...DEFAULT_PROFILES[newRole],
      name: existingName,
      email: existingEmail,
      phone: existingPhone || DEFAULT_PROFILES[newRole].phone,
      role: newRole,
    };

    setUser(profile);
    localStorage.setItem('app-user-role', newRole);
    localStorage.setItem('app-user-profile', JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('user-role-changed', { detail: newRole }));

    // Immediately route to /dashboard so the present page updates to the selected role's view
    if (navigate && typeof window !== 'undefined') {
      if (window.location.pathname !== '/dashboard') {
        if (router?.push) {
          router.push('/dashboard');
        } else {
          window.location.href = '/dashboard';
        }
      } else if (router?.refresh) {
        router.refresh();
      }
    }
  };

  const login = (selectedRole: UserRole, customUser?: Partial<AuthUser>) => {
    const baseProfile = DEFAULT_PROFILES[selectedRole];
    const cleanName = customUser?.name?.trim() || baseProfile.name;
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
    const generatedId = customUser?.id || `usr_${selectedRole.slice(0, 3)}_${slug}_${Date.now().toString(36)}`;

    const finalProfile: AuthUser = {
      ...baseProfile,
      ...(customUser || {}),
      id: generatedId,
      name: cleanName,
      role: selectedRole,
    };

    setRoleState(selectedRole);
    setUser(finalProfile);
    setIsLoggedIn(true);
    localStorage.setItem('app-user-role', selectedRole);
    localStorage.setItem('app-user-profile', JSON.stringify(finalProfile));
    localStorage.setItem('app-logged-in', 'true');
    window.dispatchEvent(new CustomEvent('user-role-changed', { detail: selectedRole }));
  };

  const signUpWithSupabase = async (params: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role: UserRole;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = params.email.trim().toLowerCase();
      const cleanName = params.name.trim();
      const cleanPhone = params.phone?.trim() || '';

      if (!isSupabaseConfigured) {
        // Fallback to local session
        login(params.role, {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
        });
        return { success: true };
      }

      // 1. Attempt Supabase Auth Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: params.password,
        options: {
          data: {
            full_name: cleanName,
            name: cleanName,
            phone: cleanPhone,
            role: params.role,
          },
        },
      });

      // If user already exists in auth, or sign up completed
      const userId = data?.user?.id || `usr_${params.role.slice(0, 3)}_${Date.now().toString(36)}`;

      // 2. Always persist into public.users with password so user can sign in anytime
      try {
        await supabase.from('users').upsert({
          id: userId,
          name: cleanName,
          email: cleanEmail,
          role: params.role,
          phone: cleanPhone,
          password: params.password,
          is_active: true,
        }, { onConflict: 'email' });
      } catch (dbErr) {
        console.warn('User table sync notice:', dbErr);
      }

      // 3. Auto-confirm user email so they can immediately sign in with their password
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/confirm-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
      } catch (cErr) {
        console.warn('Auto-confirm notice:', cErr);
      }

      // 4. Initialize user_medical_profiles row
      if (params.role === 'patient') {
        try {
          await supabase.from('user_medical_profiles').upsert({
            user_id: userId,
            full_name: cleanName,
            village: 'Local Ward',
            created_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        } catch (profileErr) {
          console.warn('Medical profile init notice:', profileErr);
        }
      }

      // 5. Immediately log the user in
      const baseProfile = DEFAULT_PROFILES[params.role];
      const profile: AuthUser = {
        ...baseProfile,
        id: userId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone || baseProfile.phone,
        role: params.role,
      };

      setUser(profile);
      setRoleState(params.role);
      setIsLoggedIn(true);
      localStorage.setItem('app-user-role', params.role);
      localStorage.setItem('app-user-profile', JSON.stringify(profile));
      localStorage.setItem('app-logged-in', 'true');
      window.dispatchEvent(new CustomEvent('user-role-changed', { detail: params.role }));

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to sign up.' };
    }
  };

  const signInWithSupabase = async (params: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = params.email.trim().toLowerCase();

      if (!isSupabaseConfigured) {
        return { success: false, error: 'Supabase client is not configured.' };
      }

      // 1. Primary: Try Supabase Auth
      let authUser: any = null;
      let authErrorMessage: string = '';

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: params.password,
        });

        if (!error && data?.user) {
          authUser = data.user;
        } else if (error) {
          authErrorMessage = error.message || '';
        }
      } catch (authErr: any) {
        authErrorMessage = authErr?.message || '';
      }

      // If Supabase returned "Email not confirmed", auto-confirm via backend and retry
      if (authErrorMessage.toLowerCase().includes('email not confirmed')) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/confirm-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail }),
          });
          const retry = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: params.password,
          });
          if (!retry.error && retry.data?.user) {
            authUser = retry.data.user;
            authErrorMessage = '';
          } else if (retry.error) {
            authErrorMessage = retry.error.message || '';
          }
        } catch (confirmErr) {
          console.warn('Auto-confirm attempt notice:', confirmErr);
        }
      }

      // If Supabase Auth successfully verified credentials
      if (authUser) {
        const meta = authUser.user_metadata || {};
        const detectedRole: UserRole = (meta.role || 'patient') as UserRole;
        const detectedName = meta.full_name || meta.name || authUser.email?.split('@')[0] || 'User';

        const baseProfile = DEFAULT_PROFILES[detectedRole];
        const profile: AuthUser = {
          ...baseProfile,
          id: authUser.id,
          name: detectedName,
          email: authUser.email || cleanEmail,
          phone: meta.phone || '',
          role: detectedRole,
        };

        setUser(profile);
        setRoleState(detectedRole);
        setIsLoggedIn(true);
        localStorage.setItem('app-user-role', detectedRole);
        localStorage.setItem('app-user-profile', JSON.stringify(profile));
        localStorage.setItem('app-logged-in', 'true');
        window.dispatchEvent(new CustomEvent('user-role-changed', { detail: detectedRole }));
        return { success: true };
      }

      // 2. Fallback check: Look up user in public.users table
      const { data: dbUser, error: dbErr } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!dbUser) {
        return {
          success: false,
          error: 'No account found with this email. Please check your email or click Create Account.',
        };
      }

      // If account credentials belong to Supabase Auth, and Supabase Auth already rejected them:
      if (dbUser.password === 'auth_managed_by_supabase') {
        return {
          success: false,
          error: 'Invalid password. Please enter the correct password for your account.',
        };
      }

      // Strict password check for custom user records
      let passwordMatches = false;

      if (dbUser.password && !dbUser.password.startsWith('$2')) {
        // Plain text password match
        passwordMatches = dbUser.password === params.password;
      } else if (dbUser.password && dbUser.password.startsWith('$2')) {
        // Bcrypt hash verification via backend
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail, password: params.password }),
          });
          const json = await res.json();
          passwordMatches = !!json.success;
        } catch {
          passwordMatches = false;
        }
      }

      if (!passwordMatches) {
        return {
          success: false,
          error: 'Invalid password. Please enter the correct password for your account.',
        };
      }

      // Password is valid - proceed to set up authenticated session
      const detectedRole: UserRole = (dbUser.role || 'patient') as UserRole;
      const detectedName = dbUser.name || cleanEmail.split('@')[0];

      const baseProfile = DEFAULT_PROFILES[detectedRole];
      const profile: AuthUser = {
        ...baseProfile,
        id: dbUser.id,
        name: detectedName,
        email: dbUser.email,
        phone: dbUser.phone || '',
        role: detectedRole,
      };

      // Ensure user_medical_profiles row exists
      if (detectedRole === 'patient') {
        try {
          await supabase.from('user_medical_profiles').upsert({
            user_id: dbUser.id,
            full_name: detectedName,
            village: 'Local Ward',
          }, { onConflict: 'user_id' });
        } catch (pErr) {
          console.warn('Medical profile auto-init notice:', pErr);
        }
      }

      setUser(profile);
      setRoleState(detectedRole);
      setIsLoggedIn(true);
      localStorage.setItem('app-user-role', detectedRole);
      localStorage.setItem('app-user-profile', JSON.stringify(profile));
      localStorage.setItem('app-logged-in', 'true');
      window.dispatchEvent(new CustomEvent('user-role-changed', { detail: detectedRole }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Login failed.' };
    }
  };

  const signInWithGoogle = async (
    preferredRole: UserRole = 'patient'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!isSupabaseConfigured) {
        return { success: false, error: 'Supabase client is not configured.' };
      }

      localStorage.setItem('app-user-role', preferredRole);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const redirectTo = `${origin}/dashboard`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      return { success: false, error: err?.message || 'Failed to initialize Google Sign In.' };
    }
  };

  const signInWithPasskey = async (
    fallback?: { email?: string; name?: string; role?: UserRole }
  ): Promise<{ success: boolean; error?: string; isNewRegistration?: boolean }> => {
    try {
      const res = await authenticateWithPasskey(fallback);
      if (!res.success || !res.user) {
        return { success: false, error: res.error || 'Biometric authentication failed.' };
      }

      const verifiedRole = (res.user.role as UserRole) || fallback?.role || 'patient';
      const defaultP = DEFAULT_PROFILES[verifiedRole] || DEFAULT_PROFILES.patient;
      const profile: AuthUser = {
        id: `passkey-${Date.now()}`,
        name: res.user.name || fallback?.name || 'Verified Biometric User',
        email: res.user.email || fallback?.email || 'patient@arogyaraksha.in',
        role: verifiedRole,
        badgeId: defaultP.badgeId,
        avatar: defaultP.avatar || '🔐',
        phone: defaultP.phone || '',
        hospitalName: defaultP.hospitalName,
        village: defaultP.village,
      };

      setUser(profile);
      setRoleState(verifiedRole);
      setIsLoggedIn(true);
      localStorage.setItem('app-user-role', verifiedRole);
      localStorage.setItem('app-user-profile', JSON.stringify(profile));
      localStorage.setItem('app-logged-in', 'true');
      window.dispatchEvent(new CustomEvent('user-role-changed', { detail: verifiedRole }));
      return { success: true, isNewRegistration: res.isNewRegistration };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Passkey authentication failed.' };
    }
  };

  const registerPasskey = async (params?: {
    email?: string;
    name?: string;
    role?: UserRole;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const targetEmail = params?.email || user.email || 'patient@arogyaraksha.in';
      const targetName = params?.name || user.name || 'Arogya User';
      const targetRole = params?.role || role || 'patient';

      const res = await registerDevicePasskey({
        id: `usr-${Date.now()}`,
        email: targetEmail,
        name: targetName,
        role: targetRole,
      });

      if (res.success) {
        const defaultP = DEFAULT_PROFILES[targetRole] || DEFAULT_PROFILES.patient;
        const profile: AuthUser = {
          id: `passkey-${Date.now()}`,
          name: targetName,
          email: targetEmail,
          role: targetRole,
          badgeId: defaultP.badgeId,
          avatar: defaultP.avatar || '🔐',
          phone: defaultP.phone || '',
          hospitalName: defaultP.hospitalName,
          village: defaultP.village,
        };
        setUser(profile);
        setRoleState(targetRole);
        setIsLoggedIn(true);
        localStorage.setItem('app-user-role', targetRole);
        localStorage.setItem('app-user-profile', JSON.stringify(profile));
        localStorage.setItem('app-logged-in', 'true');
        window.dispatchEvent(new CustomEvent('user-role-changed', { detail: targetRole }));
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to register passkey.' };
    }
  };

  const updateUserProfile = (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('app-user-profile', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut().catch(() => {});
      }
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setIsLoggedIn(false);
    localStorage.removeItem('app-logged-in');
    localStorage.removeItem('app-user-role');
    localStorage.removeItem('app-user-profile');
  };

  const resetAllTestData = async () => {
    try {
      localStorage.removeItem('arogya_healthcare_journeys');
      localStorage.removeItem('arogya_my_queue_token');
      localStorage.removeItem('arogya_asha_community_patients');
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('arogya_medical_history_') || key.startsWith('app-user-'))) {
          localStorage.removeItem(key);
        }
      }
      await fetch('http://localhost:5000/api/queue/reset', { method: 'POST' }).catch(() => {});
    } catch (e) {
      console.warn('Reset error:', e);
    }
  };

  return (
    <UserRoleContext.Provider
      value={{
        role,
        user,
        setRole,
        isLoggedIn,
        login,
        signUpWithSupabase,
        signInWithSupabase,
        signInWithGoogle,
        signInWithPasskey,
        registerPasskey,
        logout,
        updateUserProfile,
        resetAllTestData,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    return {
      role: 'patient' as UserRole,
      user: DEFAULT_PROFILES.patient,
      setRole: () => {},
      isLoggedIn: false,
      login: () => {},
      signUpWithSupabase: async () => ({ success: true }),
      signInWithSupabase: async () => ({ success: true }),
      signInWithGoogle: async () => ({ success: true }),
      signInWithPasskey: async () => ({ success: true }),
      registerPasskey: async () => ({ success: true }),
      logout: async () => {},
      updateUserProfile: () => {},
      resetAllTestData: async () => {},
    };
  }
  return context;
}
