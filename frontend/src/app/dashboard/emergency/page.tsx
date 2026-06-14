'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PhoneCall, AlertTriangle, ShieldAlert, Navigation, Hospital,
  FileHeart, BellRing, Clock, X, User, Phone, MapPin,
  Ambulance, HeartPulse, Loader2, CheckCircle2, Truck,
  Radio, ChevronRight, Activity
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('@/components/ui/MapComponent'), { ssr: false });

// ——— Types ———
interface AmbulanceForm {
  name: string;
  phone: string;
  location: string;
  emergencyType: string;
  notes: string;
}

type TrackingStage = 'dispatched' | 'enroute' | 'arriving' | 'arrived';

const TRACKING_STAGES: { key: TrackingStage; label: string; icon: any; description: string }[] = [
  { key: 'dispatched', label: 'Dispatched', icon: Radio, description: 'Ambulance has been dispatched to your location' },
  { key: 'enroute', label: 'En Route', icon: Truck, description: 'Ambulance is on its way' },
  { key: 'arriving', label: 'Arriving', icon: Navigation, description: 'Ambulance is arriving at your location' },
  { key: 'arrived', label: 'Arrived', icon: CheckCircle2, description: 'Ambulance has arrived!' },
];

// ——— Ambulance Tracking Component ———
function AmbulanceTracker({ form, onClose }: { form: AmbulanceForm; onClose: () => void }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(8); // minutes

  useEffect(() => {
    // Advance through stages every 5 seconds
    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < TRACKING_STAGES.length - 1) return prev + 1;
        clearInterval(stageTimer);
        return prev;
      });
    }, 5000);

    // Progress bar fills smoothly
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(progressTimer); return 100; }
        return prev + 0.5;
      });
    }, 100);

    // ETA countdown
    const etaTimer = setInterval(() => {
      setEta((prev) => {
        if (prev <= 0) { clearInterval(etaTimer); return 0; }
        return prev - 1;
      });
    }, 5000);

    return () => { clearInterval(stageTimer); clearInterval(progressTimer); clearInterval(etaTimer); };
  }, []);

  const stage = TRACKING_STAGES[currentStage];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-red-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/15 rounded-xl">
              <Ambulance className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Ambulance Tracking</h3>
              <p className="text-rose-100 text-sm">Live status updates</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className={`p-4 rounded-2xl border-2 transition-all duration-500 ${
            currentStage === TRACKING_STAGES.length - 1
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                currentStage === TRACKING_STAGES.length - 1
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                <stage.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-lg">{stage.label}</p>
                <p className="text-slate-500 text-sm">{stage.description}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-emerald-500 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stage Steps */}
          <div className="space-y-1">
            {TRACKING_STAGES.map((s, i) => {
              const isCompleted = i < currentStage;
              const isCurrent = i === currentStage;
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    isCompleted ? 'bg-emerald-500 text-white' :
                    isCurrent ? 'bg-rose-500 text-white animate-pulse' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <s.icon className="h-4 w-4" />
                    )}
                  </div>
                  <p className={`text-sm font-semibold transition-colors ${
                    isCompleted ? 'text-emerald-600' :
                    isCurrent ? 'text-rose-600' : 'text-slate-400'
                  }`}>{s.label}</p>
                  {i < TRACKING_STAGES.length - 1 && (
                    <ChevronRight className={`h-3 w-3 ml-auto ${isCompleted ? 'text-emerald-400' : 'text-slate-300'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ETA + Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ETA</p>
              <p className="text-xl font-black text-blue-600">{eta > 0 ? `${eta} min` : 'Arrived!'}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Emergency</p>
              <p className="text-sm font-bold text-slate-700 truncate">{form.emergencyType}</p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">Patient Details</p>
            <p className="text-sm text-slate-700"><strong>Name:</strong> {form.name}</p>
            <p className="text-sm text-slate-700"><strong>Phone:</strong> {form.phone}</p>
            <p className="text-sm text-slate-700"><strong>Pickup:</strong> {form.location}</p>
          </div>

          <button onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-colors">
            {currentStage === TRACKING_STAGES.length - 1 ? 'Done' : 'Close Tracker'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ——— Ambulance Booking Modal ———
function AmbulanceBookingModal({ onClose, onBooked }: {
  onClose: () => void;
  onBooked: (form: AmbulanceForm) => void;
}) {
  const [form, setForm] = useState<AmbulanceForm>({
    name: '', phone: '', location: '', emergencyType: 'Cardiac Emergency', notes: ''
  });
  const [estimatedArrival] = useState(() => Math.floor(Math.random() * 8) + 5);

  // Auto-fill location from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('arogya_user_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.address) setForm(f => ({ ...f, location: parsed.address }));
      }
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBooked(form);
  };

  const emergencyTypes = [
    'Cardiac Emergency',
    'Accident / Trauma',
    'Breathing Difficulty',
    'Stroke / Paralysis',
    'Pregnancy Emergency',
    'Burn Injury',
    'Other',
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Ambulance className="h-8 w-8 text-amber-100" />
            <div>
              <h3 className="text-xl font-bold">Book Ambulance</h3>
              <p className="text-amber-100 text-sm">Estimated arrival: {estimatedArrival} minutes</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Estimated arrival banner */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-700">
              Estimated ambulance arrival: <strong className="text-amber-800">{estimatedArrival} minutes</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <User className="h-3.5 w-3.5 inline mr-1" /> Patient Name
              </label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <Phone className="h-3.5 w-3.5 inline mr-1" /> Phone
              </label>
              <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
                placeholder="+91 98765 43210" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <MapPin className="h-3.5 w-3.5 inline mr-1" /> Pickup Location
            </label>
            <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all"
              placeholder="Your current address" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <HeartPulse className="h-3.5 w-3.5 inline mr-1" /> Emergency Type
            </label>
            <select value={form.emergencyType} onChange={(e) => setForm({ ...form, emergencyType: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all bg-white">
              {emergencyTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Additional Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all resize-none"
              rows={2} placeholder="E.g., patient condition, landmarks near pickup…" />
          </div>

          <button type="submit"
            className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
            <Ambulance className="h-5 w-5" /> Dispatch Ambulance Now
          </button>
        </form>
      </div>
    </div>
  );
}

// ——— Main Page ———
export default function Emergency() {
  const { t, language } = useLanguage();
  const [showAmbulanceModal, setShowAmbulanceModal] = useState(false);
  const [trackingForm, setTrackingForm] = useState<AmbulanceForm | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <div className="bg-rose-100 p-2.5 rounded-xl border border-rose-200">
               <AlertTriangle className="h-6 w-6 text-rose-600" />
             </div>
             <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Emergency Response</h1>
           </div>
          <p className="text-slate-500 font-medium text-lg">Instant access to critical care and first-response units.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Side: SOS, Ambulance, and Contacts */}
        <div className="xl:col-span-1 space-y-6">
          {/* Primary Action */}
          <div className="bg-rose-600 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl shadow-rose-600/30 text-white flex flex-col items-center gap-6 text-center">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mx-20 -my-20"></div>
             
             <div className="relative z-10 flex h-24 w-24 rounded-full bg-white/10 border-4 border-white/20 items-center justify-center flex-shrink-0">
                 <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center animate-pulse shadow-xl shadow-rose-900/50">
                    <BellRing className="h-8 w-8 text-rose-600" />
                 </div>
             </div>

             <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2">SOS Dispatch</h2>
                <p className="text-rose-100 text-sm font-medium">This will dispatch an ambulance to your current GPS location and alert specific contacts immediately.</p>
             </div>

             <div className="relative z-10 w-full space-y-3 mt-2">
                 <button className="w-full px-6 py-4 bg-white text-rose-600 font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all outline-none focus:ring-4 focus:ring-white/50 flex items-center justify-center gap-2">
                   <PhoneCall className="h-5 w-5" /> DISPATCH SOS
                 </button>
                 <button
                   onClick={() => setShowAmbulanceModal(true)}
                   className="w-full px-6 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-base rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all outline-none focus:ring-4 focus:ring-amber-300/50 flex items-center justify-center gap-2 border border-white/20">
                   <Ambulance className="h-5 w-5" /> Book Ambulance
                 </button>
             </div>
          </div>
         
          {/* Emergency Contacts */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 mb-6">
                 <ShieldAlert className="h-5 w-5 text-indigo-600" /> Key Contacts
              </h3>
              
              <div className="space-y-4">
                 {[
                   { name: 'National Emergency', num: '112', icon: AlertTriangle, color: 'text-rose-600 bg-rose-100' },
                   { name: 'Ambulance', num: '108', icon: Hospital, color: 'text-emerald-600 bg-emerald-100' },
                   { name: 'Jane Doe (Wife)', num: '+91 98765 43210', icon: FileHeart, color: 'text-blue-600 bg-blue-100' }
                 ].map((c, i) => (
                   <div key={i} className="flex items-center justify-between border-b last:border-0 border-slate-100 pb-3 last:pb-0">
                      <div className="flex items-center gap-3">
                         <div className={`p-2.5 rounded-xl ${c.color}`}>
                            <c.icon className="h-5 w-5" />
                         </div>
                         <div>
                            <p className="font-bold text-sm text-slate-800">{c.name}</p>
                            <p className="text-sm text-slate-500 font-medium tracking-wide">{c.num}</p>
                         </div>
                      </div>
                      <button className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
                         <PhoneCall className="h-4 w-4" />
                      </button>
                   </div>
                 ))}
              </div>
          </div>
        </div>

        {/* Right Side: Map and Hospitals */}
        <div className="xl:col-span-2 space-y-6">
           {/* Live Location Map */}
           <div className="bg-white rounded-3xl p-2 border border-slate-100 shadow-xl shadow-slate-200/40 h-[400px]">
              <MapComponent />
           </div>
         
         {/* Nearest ERs */}
         <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Hospital className="h-5 w-5 text-emerald-600" /> Nearest Emergency Rooms
               </h3>
               <span className="text-sm font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">Detected via GPS</span>
            </div>

            <div className="space-y-4">
               {[
                 { name: 'City Central Hospital ER', dist: '1.2 km', time: '5 mins away', busy: 'Low Traffic' },
                 { name: 'Apollo Critical Care', dist: '3.5 km', time: '12 mins away', busy: 'High Traffic' }
               ].map((er, i) => (
                  <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-white hover:border-emerald-200 transition-colors gap-4">
                     <div>
                        <h4 className="font-bold text-slate-900 text-lg">{er.name}</h4>
                        <div className="flex items-center gap-3 text-sm font-medium text-slate-500 mt-1">
                           <span className="flex items-center gap-1"><Navigation className="h-3.5 w-3.5"/> {er.dist}</span>
                           <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5"/> {er.time}</span>
                        </div>
                     </div>
                     <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${er.busy === 'Low Traffic' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {er.busy}
                        </span>
                        <button className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors">
                           Navigate
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         </div>

      </div>
    </div>

    {/* Ambulance Booking Modal */}
    {showAmbulanceModal && (
      <AmbulanceBookingModal
        onClose={() => setShowAmbulanceModal(false)}
        onBooked={(form) => {
          setShowAmbulanceModal(false);
          setTrackingForm(form);
        }}
      />
    )}

    {/* Ambulance Tracking Overlay */}
    {trackingForm && (
      <AmbulanceTracker form={trackingForm} onClose={() => setTrackingForm(null)} />
    )}
    </div>
  );
}
