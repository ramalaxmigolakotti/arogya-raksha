'use client';

import Link from 'next/link';
import { Eye, Bone, HeartPulse, Droplets, TestTube2, ChevronRight, Microscope } from 'lucide-react';

const services = [
  {
    name: 'Eye Check-Up',
    icon: Eye,
    description: 'Complete eye examination and vision testing',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
    emoji: '👁️',
    price: 500,
  },
  {
    name: 'X-Ray Scan',
    icon: Bone,
    description: 'Digital X-ray imaging with instant results',
    color: 'from-slate-600 to-slate-800',
    bg: 'bg-slate-50',
    emoji: '🦴',
    price: 300,
  },
  {
    name: 'Blood Pressure Check',
    icon: HeartPulse,
    description: 'Accurate BP monitoring and analysis',
    color: 'from-rose-500 to-red-600',
    bg: 'bg-rose-50',
    emoji: '💓',
    price: 150,
  },
  {
    name: 'Full Blood Count',
    icon: Droplets,
    description: 'Complete blood panel with detailed report',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
    emoji: '🩸',
    price: 350,
  },
  {
    name: 'Blood Sugar Test',
    icon: TestTube2,
    description: 'Glucose level monitoring for diabetes',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
    emoji: '🧪',
    price: 100,
  },
];

export default function DiagnosticServices() {
  return (
    <section className="py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-900 mb-2">
          Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Diagnostic Services</span>
        </h2>
        <p className="text-slate-500 font-medium">Safe, accurate & reliable testing.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {services.map((service, i) => (
          <Link key={i} href="/dashboard/diagnostic-centre"
            className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:-translate-y-1 transition-all text-center">
            <div className={`w-20 h-20 ${service.bg} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
              <span className="text-3xl">{service.emoji}</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 mb-1">{service.name}</h3>
            <p className="text-xs text-slate-500 mb-2 leading-relaxed">{service.description}</p>
            <p className="text-xs font-black text-emerald-600 mb-3">Starting ₹{service.price}</p>
            <div className={`bg-gradient-to-r ${service.color} text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1 group-hover:shadow-lg transition-shadow`}>
              <ChevronRight className="h-3 w-3" /> Book Now
            </div>
          </Link>
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center mt-8">
        <Link href="/dashboard/diagnostic-centre"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-violet-500/20 hover:-translate-y-0.5 transition-all">
          <Microscope className="h-5 w-5" /> View All Diagnostic Tests & Health Packages
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
