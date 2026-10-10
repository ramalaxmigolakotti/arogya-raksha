import Link from 'next/link';
import { Activity, ArrowRight, Github, Mail, ShieldCheck } from 'lucide-react';

export default function Register() {
  return (
    <div className="flex min-h-screen bg-[#FAF7F2] justify-center items-center p-4">
      <div className="bg-white rounded-3xl shadow-xl flex overflow-hidden max-w-6xl w-full border border-[#EFE8DE]">
        
        {/* Left Side Form */}
        <div className="flex-1 py-12 px-8 sm:px-12 lg:px-16 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-amber-500 p-2 rounded-lg flex items-center justify-center">
              <Activity className="h-6 w-6 text-stone-950" />
            </div>
            <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">Arogya Raksha</h1>
          </div>

          <h2 className="text-3xl font-black text-stone-900 tracking-tight mb-2">Create an account</h2>
          <p className="text-stone-500 mb-8 font-medium">Join the intelligent healthcare ecosystem.</p>

          <form action="/dashboard" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1" htmlFor="firstName">First Name</label>
                  <input id="firstName" required className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#EFE8DE] rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm" placeholder="John" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1" htmlFor="lastName">Last Name</label>
                  <input id="lastName" required className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#EFE8DE] rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm" placeholder="Doe" />
               </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1" htmlFor="email">Email Address</label>
              <input type="email" id="email" required className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#EFE8DE] rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm" placeholder="john@example.com" />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1" htmlFor="role">I am a...</label>
              <select id="role" className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#EFE8DE] rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm appearance-none">
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Hospital Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1" htmlFor="password">Password</label>
              <input type="password" id="password" required className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#EFE8DE] rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm" placeholder="••••••••" />
            </div>

            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-stone-950 font-black rounded-xl flex justify-center items-center gap-2 transition-all mt-6 shadow-lg shadow-amber-500/20 hover:-translate-y-0.5">
              Create Account
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-bold border-b-2 border-transparent hover:border-emerald-600 transition-colors pb-0.5">
              Log in instead
            </Link>
          </p>
        </div>

        {/* Right Side Info */}
        <div className="hidden lg:flex flex-1 bg-gradient-to-br from-emerald-500 to-emerald-700 p-12 text-white flex-col justify-between relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mx-10 -my-10"></div>
           <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl -mx-20 -my-20"></div>
           
           <div className="relative z-10 w-full max-w-md mx-auto mt-10">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 mb-8">
                 <ShieldCheck className="h-10 w-10 text-emerald-100 mb-4" />
                 <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                 <p className="text-emerald-100/80 text-sm leading-relaxed">Your medical data is encrypted and securely stored. We comply with major health data privacy regulations to ensure your peace of mind.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 translate-x-12">
                 <Activity className="h-10 w-10 text-emerald-100 mb-4" />
                 <h3 className="text-xl font-bold mb-2">AI-Powered Insights</h3>
                 <p className="text-emerald-100/80 text-sm leading-relaxed">Get instant preliminary diagnosis and report analysis using our cutting-edge LLM integration.</p>
              </div>
           </div>

           <div className="relative z-10 mt-auto">
              <p className="text-emerald-100 font-medium italic">"Arogya Raksha transformed how we manage patient care across our network."</p>
              <p className="font-bold mt-2">— Dr. Arvind Kumar, Chief Medical Officer</p>
           </div>
        </div>

      </div>
    </div>
  );
}
