'use client';

import { SignIn } from '@clerk/nextjs';
import { Activity } from 'lucide-react';

export default function SignInPage() {
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
            The future of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              smart healthcare
            </span>
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-10 max-w-md">
            Agentic health tracking, instant emergency responses, and intelligent hospital management, all in one platform.
          </p>
          <div className="flex gap-4">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-slate-900 flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: `hsl(150, 80%, ${30 + i * 10}%)` }}>
                  U{i}
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-white font-bold">10k+ users</span>
              <span className="text-slate-400 text-sm">joined this week</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Clerk Sign-In Component */}
      <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
          <div className="bg-emerald-500 p-2 rounded-lg flex items-center justify-center">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Arogya Raksha</h1>
        </div>

        <SignIn
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
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
