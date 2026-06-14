'use client';

import { Calendar, Clock, Video, FileText, ChevronRight, Activity, MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Appointments() {
  const { t, language } = useLanguage();
  const upcomingAppointments = [
    {
      id: 1,
      doctor: 'Dr. Sarah Smith',
      specialty: 'Cardiologist',
      hospital: 'Apollo Hospitals, City Center',
      date: 'Today, 2:30 PM',
      type: 'In-Person',
      status: 'Confirmed'
    },
    {
      id: 2,
      doctor: 'Dr. Rahul Dev',
      specialty: 'General Physician',
      hospital: 'City Clinic',
      date: 'Tomorrow, 10:00 AM',
      type: 'Video Consult',
      status: 'Pending'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Appointments</h1>
          <p className="text-slate-500 mt-1 font-medium text-lg">Manage your upcoming and past consultations.</p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5">
          <Calendar className="h-5 w-5" />
          Book New Consultation
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-800">Upcoming</h2>
            <div className="flex bg-slate-100 rounded-lg p-1">
               <button className="px-4 py-1.5 text-sm font-semibold bg-white text-slate-800 rounded shadow-sm">Upcoming</button>
               <button className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">Past</button>
            </div>
          </div>

          <div className="space-y-4">
            {upcomingAppointments.map((app) => (
              <div key={app.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-emerald-200 transition-colors flex flex-col sm:flex-row gap-6">
                 
                 <div className="flex-shrink-0 flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-xl min-w-[120px]">
                    <span className="text-sm font-bold text-emerald-600 uppercase mb-1">{app.date.split(',')[0]}</span>
                    <span className="text-xl font-black text-emerald-700">{app.date.split(',')[1].trim()}</span>
                 </div>

                 <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                          <h3 className="text-lg font-bold text-slate-900">{app.doctor}</h3>
                          <p className="text-emerald-600 text-sm font-medium">{app.specialty}</p>
                       </div>
                       <span className={`px-3 py-1 rounded-full text-xs font-bold ${app.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                         {app.status}
                       </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-slate-500">
                       <div className="flex items-center gap-1.5">
                         {app.type === 'Video Consult' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                         {app.type}
                       </div>
                       <div className="flex items-center gap-1.5">
                         <Activity className="h-4 w-4" />
                         {app.hospital}
                       </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                       <button className="px-5 py-2 bg-slate-900 hover:bg-slate-800 tracking-wide text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-slate-900/20">
                          {app.type === 'Video Consult' ? 'Join Call' : 'View Details'}
                       </button>
                       <button className="px-5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold tracking-wide text-sm rounded-xl transition-colors">
                          Reschedule
                       </button>
                    </div>
                 </div>
                 
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar Widget */}
        <div className="space-y-6">
           <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mx-10 -my-10"></div>
              <Activity className="h-8 w-8 text-emerald-100 mb-4" />
              <h3 className="text-lg font-bold mb-2">Need an urgent consult?</h3>
              <p className="text-emerald-50 text-sm leading-relaxed mb-6">Our intelligent triage system can connect you to the right specialist within 15 minutes.</p>
              <button className="w-full bg-white text-emerald-700 font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                 Find a Doctor Now
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
