'use client';

import Link from 'next/link';
import { Building2, CreditCard, MapPin, ArrowRight, Sparkles, Banknote, BadgePercent } from 'lucide-react';

interface HealthcareCTAProps {
  /** Context from the feature result, e.g. "Your diabetes risk assessment" */
  context?: string;
  /** Condition/diagnosis from the result for hospital search */
  condition?: string;
  /** Custom styling variant */
  variant?: 'default' | 'compact' | 'wide';
}

/**
 * Universal Healthcare CTA — shown after every feature result.
 * LOAN is the PRIMARY highlighted CTA, followed by Find Nearby Hospitals.
 */
export default function HealthcareCTA({ context, condition, variant = 'default' }: HealthcareCTAProps) {
  const hospitalQuery = condition ? `?search=${encodeURIComponent(condition)}` : '';

  if (variant === 'compact') {
    return (
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        {/* LOAN — Primary, highlighted */}
        <Link
          href="/dashboard/healthcare-navigator"
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white font-black py-3.5 px-5 rounded-2xl shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5 text-sm relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Banknote className="h-5 w-5" /> Apply for Medical Loan
          <span className="bg-white/20 text-[9px] font-black px-1.5 py-0.5 rounded-md ml-1">EMI</span>
        </Link>
        {/* Hospitals — Secondary */}
        <Link
          href={`/dashboard/hospitals${hospitalQuery}`}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3.5 px-5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 text-sm"
        >
          <Building2 className="h-4 w-4" /> Find Nearby Hospitals
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-orange-50/30 to-blue-50/30 rounded-[2rem] p-6 md:p-8 border border-slate-200/60 shadow-xl shadow-slate-200/20 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg shadow-orange-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">Take the Next Step</h3>
            <p className="text-xs text-slate-500 font-medium">
              {context || 'Based on your results, explore these options'}
            </p>
          </div>
        </div>

        {/* CTA Cards — LOAN FIRST & BIGGER */}
        <div className="space-y-4">
          {/* ★ Apply for Medical Loan — PRIMARY CTA */}
          <Link
            href="/dashboard/healthcare-navigator"
            className="group relative block bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-5 md:p-6 shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl flex-shrink-0">
                <Banknote className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-black text-white text-lg">Apply for Medical Loan</h4>
                  <span className="bg-white/25 text-[10px] font-black text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                    <BadgePercent className="h-3 w-3" /> 0% EMI
                  </span>
                </div>
                <p className="text-white/80 text-sm font-medium">
                  Get instant EMI options, cost estimates & financial assistance for your treatment.
                </p>
              </div>
              <div className="flex-shrink-0 bg-white/20 p-2.5 rounded-xl group-hover:bg-white/30 transition-colors">
                <ArrowRight className="h-5 w-5 text-white" />
              </div>
            </div>
          </Link>

          {/* Find Nearby Hospitals — Secondary */}
          <Link
            href={`/dashboard/hospitals${hospitalQuery}`}
            className="group relative block bg-white rounded-2xl p-5 border-2 border-blue-100 hover:border-blue-300 shadow-lg shadow-blue-100/30 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors flex-shrink-0">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-slate-800">Find Nearby Hospitals</h4>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-0.5">
                    <MapPin className="h-2.5 w-2.5" /> GPS
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Discover 249K+ hospitals near you with real-time availability & directions.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm group-hover:gap-2.5 transition-all flex-shrink-0">
                View <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
