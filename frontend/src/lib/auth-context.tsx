'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface HealthProfile {
  age?: number;
  weight?: number;
  height?: number;
  bloodGroup?: string;
  allergies?: string[];
  existingDiseases?: string[];
  prescriptions?: string[];
  emergencyContacts?: { name: string; phone: string; relation: string }[];
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  phone?: string;
  avatar?: string;
  healthProfile?: HealthProfile;
  preferredLanguage?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: Record<string, string>) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    checkAuth();
    const savedLang = localStorage.getItem('language');
    if (savedLang) setLanguage(savedLang);
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      api.setToken(token);
      const result = await api.verifyToken();
      if (result.success) {
        setUser(result.user);
      } else {
        api.clearToken();
      }
    } catch {
      api.clearToken();
    }
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const result = await api.login({ email, password });
    if (result.success) {
      api.setToken(result.token);
      setUser(result.user);
    }
    return result;
  };

  const register = async (data: Record<string, string>) => {
    const result = await api.register(data as never);
    if (result.success) {
      api.setToken(result.token);
      setUser(result.user);
    }
    return result;
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    if (user) setUser({ ...user, ...data });
  };

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, language, setLanguage: handleSetLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
