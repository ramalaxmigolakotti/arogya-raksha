import React from 'react';

type GeminiVariant =
  | 'gemini'          // General Gemini AI
  | 'flash'           // Gemini 2.0 Flash
  | 'vision'          // Gemini Vision (image analysis)
  | 'vertex'          // Vertex AI
  | 'pro'             // Gemini Pro
  | 'nano';           // Gemini Nano

interface GeminiBadgeProps {
  variant?: GeminiVariant;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const VARIANTS: Record<GeminiVariant, { label: string; gradient: string; icon: string }> = {
  gemini:  { label: 'Powered by Sarvam AI',         gradient: 'from-blue-500 via-violet-500 to-pink-500',    icon: '✦' },
  flash:   { label: 'Powered by Sarvam Models',    gradient: 'from-amber-400 via-orange-500 to-rose-500',   icon: '⚡' },
  vision:  { label: 'Powered by Sarvam NLP',   gradient: 'from-cyan-400 via-blue-500 to-indigo-600',    icon: '👁' },
  vertex:  { label: 'Powered by Sarvam Base',       gradient: 'from-blue-600 via-blue-500 to-cyan-400',      icon: '▲' },
  pro:     { label: 'Powered by Sarvam Pro',      gradient: 'from-violet-500 via-purple-600 to-indigo-600',icon: '◆' },
  nano:    { label: 'Powered by Sarvam Nano',     gradient: 'from-emerald-400 via-teal-500 to-cyan-500',   icon: '⬡' },
};

const SIZES = {
  xs: 'text-[9px] px-1.5 py-0.5 gap-1',
  sm: 'text-[10px] px-2 py-1 gap-1',
  md: 'text-xs px-2.5 py-1.5 gap-1.5',
};

export default function GeminiBadge({ variant = 'gemini', size = 'sm', className = '' }: GeminiBadgeProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <span className={`inline-flex items-center font-bold rounded-full bg-gradient-to-r ${v.gradient} text-white ${s} shadow-sm select-none ${className}`}>
      <span className="opacity-90">{v.icon}</span>
      <span>{v.label}</span>
    </span>
  );
}

// Pill version with white background for use on colored cards
export function GeminiBadgeOutline({ variant = 'gemini', size = 'sm', className = '' }: GeminiBadgeProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <span className={`inline-flex items-center font-bold rounded-full border bg-white/90 backdrop-blur-sm ${s} ${className}`}
      style={{ borderImage: 'linear-gradient(to right, #6366f1, #ec4899) 1' }}>
      <span className={`bg-gradient-to-r ${v.gradient} bg-clip-text text-transparent`}>
        {v.icon} {v.label}
      </span>
    </span>
  );
}
