'use client';

import { SignUp } from '@clerk/nextjs';
import { Activity } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side: Premium branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-slate-900 z-0"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -mx-20 -my-20"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl -mx-40 -my-40"></div>

        <div className="relative z-10 w-full max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-emerald-500 p-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Arogya Raksha</h1>
          </div>
          <h2 className="text-5xl font-bold text-white leading-tight mb-6">
            Join the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              health revolution
            </span>
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-md">
            Create your free account to access AI-powered diagnostics, telemedicine, medicine intelligence, and more.
          </p>
          <div className="space-y-4">
            {['🧪 253K+ Medicines Database', '🏥 Smart Diagnostic Centre', '📹 Video Consultations', '🤖 AI Health Predictions'].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/80 text-sm font-medium">
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Clerk Sign-Up Component */}
      <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
          <div className="bg-emerald-500 p-2 rounded-lg flex items-center justify-center">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Arogya Raksha</h1>
        </div>

        <SignUp
          appearance={{
            elements: {
              formButtonPrimary: 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20',
              card: 'shadow-none border-0',
              headerTitle: 'text-slate-900 font-extrabold',
              headerSubtitle: 'text-slate-500',
              socialButtonsBlockButton: 'border-slate-200 text-slate-700 hover:bg-slate-50',
              formFieldInput: 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10 rounded-xl',
              footerActionLink: 'text-emerald-600 hover:text-emerald-500 font-semibold',
            },
          }}
          signInUrl="/sign-in"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
