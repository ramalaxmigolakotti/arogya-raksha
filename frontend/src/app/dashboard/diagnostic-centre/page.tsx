'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search, Phone, MapPin, Clock, Star, ChevronRight, ArrowRight,
  Eye, Heart, Brain, Bone, TestTube2, Microscope, Stethoscope,
  Shield, CheckCircle2, Calendar, Users, Award, Activity, 
  Droplets, Zap, X, MessageSquare, CreditCard
} from 'lucide-react';
import RazorpayCheckout from '@/components/RazorpayCheckout';
import { useLanguage } from '@/context/LanguageContext';
import HealthcareCTA from '@/components/HealthcareCTA';

/* ═══════════ DATA ═══════════ */

const diagnosticTests = [
  { id: 1, name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 350, duration: '2-4 hrs', image: '/assets/diagnostic/D1.png', description: 'Measures red/white blood cells, hemoglobin, hematocrit, and platelets.', popular: true },
  { id: 2, name: 'Thyroid Profile (T3, T4, TSH)', category: 'Endocrinology', price: 600, duration: '24 hrs', image: '/assets/diagnostic/D2.png', description: 'Tests thyroid gland function by measuring hormone levels.', popular: true },
  { id: 3, name: 'Liver Function Test (LFT)', category: 'Biochemistry', price: 500, duration: '4-6 hrs', image: '/assets/diagnostic/D3.png', description: 'Evaluates liver health by measuring enzymes, proteins, and bilirubin.' },
  { id: 4, name: 'Kidney Function Test (KFT)', category: 'Biochemistry', price: 450, duration: '4-6 hrs', image: '/assets/diagnostic/D4.png', description: 'Assesses kidney performance including creatinine and urea levels.' },
  { id: 5, name: 'Lipid Profile', category: 'Cardiology', price: 400, duration: '4-6 hrs', image: '/assets/diagnostic/D5.png', description: 'Measures cholesterol, triglycerides, HDL, and LDL for heart health.' },
  { id: 6, name: 'Blood Sugar Test (Fasting)', category: 'Diabetology', price: 100, duration: '1-2 hrs', image: '/assets/diagnostic/D6.png', description: 'Fasting glucose test for diabetes screening and monitoring.', popular: true },
  { id: 7, name: 'HbA1c (Glycated Hemoglobin)', category: 'Diabetology', price: 550, duration: '24 hrs', image: '/assets/diagnostic/D7.png', description: 'Measures average blood sugar over 2-3 months for diabetes management.' },
  { id: 8, name: 'Urine Analysis', category: 'Pathology', price: 200, duration: '2-4 hrs', image: '/assets/diagnostic/D8.png', description: 'Complete urine examination for kidney, UTI, and metabolic disorders.' },
  { id: 9, name: 'Vitamin D & B12 Panel', category: 'Nutrition', price: 900, duration: '24 hrs', image: '/assets/diagnostic/D9.png', description: 'Checks essential vitamin levels for bone health and energy.' },
  { id: 10, name: 'X-Ray (Digital)', category: 'Radiology', price: 300, duration: '30 min', image: '/assets/diagnostic/D10.png', description: 'Digital X-ray imaging for bones, chest, and joint assessment.' },
  { id: 11, name: 'ECG (Electrocardiogram)', category: 'Cardiology', price: 250, duration: '15 min', image: '/assets/diagnostic/D11.png', description: 'Records heart electrical activity to detect abnormalities.' },
  { id: 12, name: 'Ultrasound (Abdomen)', category: 'Radiology', price: 800, duration: '30 min', image: '/assets/diagnostic/D12.png', description: 'Non-invasive imaging of abdominal organs.' },
];

const eyeOpticServices = [
  { id: 1, name: 'Comprehensive Eye Exam', price: 500, duration: '45 min', image: '/assets/diagnostic/S1.png', description: 'Complete vision testing, refraction, eye pressure check, and retinal exam.' },
  { id: 2, name: 'Retina Screening', price: 1200, duration: '30 min', image: '/assets/diagnostic/S2.png', description: 'Advanced digital imaging of the retina for early disease detection.' },
  { id: 3, name: 'Glaucoma Screening', price: 800, duration: '30 min', image: '/assets/diagnostic/S3.png', description: 'Eye pressure & optic nerve examination for glaucoma prevention.' },
  { id: 4, name: 'Contact Lens Fitting', price: 600, duration: '30 min', image: '/assets/diagnostic/S4.png', description: 'Professional fitting and prescription for contact lenses.' },
  { id: 5, name: 'Pediatric Eye Check-Up', price: 400, duration: '30 min', image: '/assets/diagnostic/S5.png', description: 'Specialized eye examination for children and early vision issues.' },
  { id: 6, name: 'Cataract Assessment', price: 700, duration: '45 min', image: '/assets/diagnostic/S6.png', description: 'Comprehensive cataract evaluation with surgical consultation.' },
];

const healthPackages = [
  { id: 1, name: 'Essential Health Check', tests: 8, price: 1499, original: 2400, image: '/assets/diagnostic/C1.png', includes: ['CBC', 'Blood Sugar', 'Thyroid', 'LFT', 'KFT', 'Lipid', 'Urine', 'ECG'] },
  { id: 2, name: 'Cardiac Wellness Package', tests: 6, price: 2499, original: 3800, image: '/assets/diagnostic/C2.png', includes: ['ECG', 'Lipid Profile', 'Blood Sugar', 'CBC', 'Chest X-Ray', 'HbA1c'] },
  { id: 3, name: 'Diabetic Care Package', tests: 5, price: 1299, original: 2100, image: '/assets/diagnostic/C3.png', includes: ['Fasting Sugar', 'HbA1c', 'KFT', 'Lipid Profile', 'Urine'] },
  { id: 4, name: 'Women\'s Wellness Package', tests: 10, price: 2999, original: 4500, image: '/assets/diagnostic/C5.png', includes: ['CBC', 'Thyroid', 'Vitamin D', 'B12', 'Iron', 'LFT', 'KFT', 'Urine', 'Pap Smear', 'Mammography'] },
  { id: 5, name: 'Senior Citizen Package', tests: 12, price: 3499, original: 5200, image: '/assets/diagnostic/C6.png', includes: ['CBC', 'Thyroid', 'LFT', 'KFT', 'Lipid', 'ECG', 'Blood Sugar', 'HbA1c', 'Vitamin D', 'B12', 'X-Ray', 'Ultrasound'] },
];

const healthDepartments = [
  { name: 'Cardiology', image: '/assets/diagnostic/HD1.png', doctors: 5, icon: Heart },
  { name: 'Neurology', image: '/assets/diagnostic/HD2.png', doctors: 3, icon: Brain },
  { name: 'Orthopedics', image: '/assets/diagnostic/HD3.png', doctors: 4, icon: Bone },
  { name: 'Ophthalmology', image: '/assets/diagnostic/HD4.png', doctors: 3, icon: Eye },
  { name: 'Dermatology', image: '/assets/diagnostic/HD5.png', doctors: 2, icon: Shield },
  { name: 'Pathology', image: '/assets/diagnostic/HD6.png', doctors: 6, icon: Microscope },
  { name: 'Radiology', image: '/assets/diagnostic/HD7.png', doctors: 4, icon: Zap },
  { name: 'General Medicine', image: '/assets/diagnostic/HD8.png', doctors: 8, icon: Stethoscope },
];

/* ═══════════ BOOKING MODAL WITH RAZORPAY ═══════════ */
function BookTestModal({ test, onClose }: { test: { name: string; price: number; duration: string }; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');

  const slots = ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  });

  const handlePaymentSuccess = (paymentId: string) => {
    setStep(3);
    const msg = `🏥 Diagnostic Test Booking — PAID ✅\n\n🧪 Test: ${test.name}\n💰 Paid: ₹${test.price}\n💳 Payment ID: ${paymentId}\n📅 Date: ${date}\n⏰ Slot: ${slot}\n👤 Name: ${name}\n📱 Phone: ${phone}\n\nPayment completed. Please confirm.`;
    setTimeout(() => { window.open(`https://wa.me/917981502973?text=${encodeURIComponent(msg)}`, '_blank'); }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 z-10"><X className="h-5 w-5 text-slate-400" /></button>

        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 text-white">
          <TestTube2 className="h-8 w-8 text-violet-200 mb-2" />
          <h3 className="text-xl font-black">{test.name}</h3>
          <p className="text-violet-200 text-sm">₹{test.price} • Results in {test.duration}</p>
          <div className="flex gap-3 mt-4">
            {['Details', 'Payment', 'Done'].map((s, i) => (
              <div key={s} className={`flex items-center gap-1.5 text-xs font-bold ${step > i + 1 ? 'text-emerald-300' : step === i + 1 ? 'text-white' : 'text-violet-300'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step > i + 1 ? 'bg-emerald-500' : step === i + 1 ? 'bg-white text-violet-700' : 'bg-violet-500'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Patient Name"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-400" />
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Select Date</p>
                <div className="grid grid-cols-4 gap-2">
                  {dates.map(d => (
                    <button key={d} onClick={() => setDate(d)}
                      className={`p-2.5 rounded-xl text-xs font-bold border-2 transition-all ${date === d ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Select Time</p>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(s => (
                    <button key={s} onClick={() => setSlot(s)}
                      className={`p-2.5 rounded-xl text-xs font-bold border-2 transition-all ${slot === s ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">{test.name}</span>
                  <span className="font-black text-violet-700">₹{test.price}</span>
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!name || !phone || !date || !slot}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-2xl disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" /> Proceed to Payment — ₹{test.price}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-violet-50 rounded-xl p-4 border border-violet-100 text-sm space-y-1">
                <p className="font-black text-violet-800">{test.name}</p>
                <p className="text-violet-600">📅 {date} at {slot}</p>
                <p className="text-violet-600">👤 {name} • 📱 {phone}</p>
              </div>
              <RazorpayCheckout
                amount={test.price}
                itemName={test.name}
                itemDescription={`${test.name} - ${date} at ${slot}`}
                userName={name}
                userPhone={phone}
                onSuccess={handlePaymentSuccess}
                buttonText={`Pay ₹${test.price}`}
              />
              <button onClick={() => setStep(1)} className="w-full text-slate-500 text-sm font-bold py-2 hover:text-slate-700 transition-colors">
                ← Back to Details
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">Booked & Paid! ✅</h3>
              <p className="text-slate-500 text-sm">Confirmation sent via WhatsApp.</p>
              <div className="bg-violet-50 rounded-xl p-4 border border-violet-100 text-left text-sm space-y-1">
                <p className="font-bold text-violet-700">📅 {date} at {slot}</p>
                <p className="text-violet-600">👤 {name} • 📱 {phone}</p>
                <p className="text-violet-600">💰 ₹{test.price} — Paid ✅</p>
              </div>
              <button onClick={onClose} className="w-full bg-slate-900 text-white font-bold py-3 rounded-2xl">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ MAIN PAGE ═══════════ */
export default function DiagnosticCentrePage() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [bookingTest, setBookingTest] = useState<null | { name: string; price: number; duration: string }>(null);
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'eye'>('diagnostic');

  const categories = ['All', ...new Set(diagnosticTests.map(t => t.category))];

  const filteredTests = diagnosticTests.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-16">
      {bookingTest && <BookTestModal test={bookingTest} onClose={() => setBookingTest(null)} />}

      {/* ─── Hero Banner ─── */}
      <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl">
        <img src="/assets/diagnostic/BannerImg.png" alt="Diagnostic Centre" className="w-full h-72 lg:h-80 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/90 via-indigo-900/70 to-transparent" />
        <div className="absolute inset-0 flex items-center p-10 lg:p-14">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <img src="/assets/diagnostic/logo.png" alt="Logo" className="w-12 h-12 rounded-xl shadow-lg bg-white/20 backdrop-blur-md p-1" />
              <span className="bg-white/20 backdrop-blur-md text-white text-xs font-black px-4 py-1.5 rounded-full border border-white/30">NABL Accredited</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-3">
              Arogya <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300">Diagnostic Centre</span>
            </h1>
            <p className="text-white/70 text-sm lg:text-base font-medium mb-6 max-w-md">
              State-of-the-art diagnostic lab & eye care centre. Accurate results, affordable prices, trusted by 50,000+ patients.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a href="tel:+917981502973" className="bg-white text-violet-700 font-black px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4" /> Call Now
              </a>
              <a href="https://wa.me/917981502973" target="_blank" rel="noopener noreferrer"
                className="bg-[#25D366] text-white font-black px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tests Available', value: '50+', icon: TestTube2, color: 'text-violet-600 bg-violet-50' },
          { label: 'Expert Doctors', value: '35+', icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Reports Delivered', value: '50K+', icon: Award, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'NABL Certified', value: '100%', icon: Shield, color: 'text-amber-600 bg-amber-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.color} p-5 rounded-2xl border border-white shadow-lg hover:-translate-y-0.5 transition-transform`}>
            <s.icon className="h-6 w-6 mb-2" />
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-bold opacity-60">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ─── Tab Switch: Diagnostic / Eye Optics ─── */}
      <div className="flex justify-center">
        <div className="bg-slate-100 p-1.5 rounded-2xl inline-flex gap-1">
          <button onClick={() => setActiveTab('diagnostic')}
            className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'diagnostic' ? 'bg-white shadow-lg text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}>
            🧪 Diagnostic Tests
          </button>
          <button onClick={() => setActiveTab('eye')}
            className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${activeTab === 'eye' ? 'bg-white shadow-lg text-violet-700' : 'text-slate-500 hover:text-slate-700'}`}>
            👁️ Eye & Optics Centre
          </button>
        </div>
      </div>

      {/* ─── DIAGNOSTIC TESTS TAB ─── */}
      {activeTab === 'diagnostic' && (
        <div className="space-y-8">
          {/* Search + Category Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search tests (CBC, Thyroid, X-Ray...)"
                className="w-full bg-white border-2 border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium outline-none focus:border-violet-400 shadow-sm" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(c => (
                <button key={c} onClick={() => setSelectedCategory(c)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === c ? 'bg-violet-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Tests Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
            <h3 className="text-sm font-black text-amber-800 mb-3 flex items-center gap-2">⭐ Most Popular Tests</h3>
            <div className="flex gap-3 flex-wrap">
              {diagnosticTests.filter(t => t.popular).map(t => (
                <button key={t.id} onClick={() => setBookingTest(t)}
                  className="bg-white px-4 py-2.5 rounded-xl text-xs font-bold text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-sm">
                  {t.name} — ₹{t.price}
                </button>
              ))}
            </div>
          </div>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTests.map(test => (
              <div key={test.id} className="group bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
                <div className="relative h-40 overflow-hidden">
                  <img src={test.image} alt={test.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[10px] font-black px-2.5 py-1 rounded-lg text-violet-700">{test.category}</span>
                  <span className="absolute bottom-3 right-3 bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-lg">₹{test.price}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-800 mb-1">{test.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{test.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {test.duration}
                    </span>
                    <button onClick={() => setBookingTest(test)}
                      className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5 flex items-center gap-1">
                      Book <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── EYE & OPTICS TAB ─── */}
      {activeTab === 'eye' && (
        <div className="space-y-8">
          {/* Eye Banner */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[2rem] p-8 lg:p-10 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-3xl font-black mb-3">👁️ Eye & Optics Centre</h2>
                <p className="text-cyan-100 font-medium mb-6 max-w-lg">
                  Comprehensive eye care with advanced diagnostic equipment. From routine check-ups to specialized screenings, we protect your vision.
                </p>
                <div className="flex gap-3 flex-wrap">
                  {['Latest Equipment', 'Expert Ophthalmologists', 'Affordable Pricing'].map(tag => (
                    <span key={tag} className="bg-white/20 backdrop-blur-md text-xs font-bold px-4 py-2 rounded-xl border border-white/20">
                      ✓ {tag}
                    </span>
                  ))}
                </div>
              </div>
              <img src="/assets/diagnostic/S7.png" alt="Eye Care" className="w-40 h-40 rounded-2xl object-cover border-4 border-white/20 shadow-2xl" />
            </div>
          </div>

          {/* Eye Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {eyeOpticServices.map(service => (
              <div key={service.id} className="group bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
                <div className="relative h-44 overflow-hidden">
                  <img src={service.image} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-3 right-3 bg-cyan-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-lg">₹{service.price}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-800 mb-1">{service.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {service.duration}
                    </span>
                    <button onClick={() => setBookingTest(service)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5 flex items-center gap-1">
                      Book <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Eye glasses promo */}
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl p-6 border border-indigo-100 flex flex-col md:flex-row items-center gap-6">
            <img src="/assets/diagnostic/S8.png" alt="Optics Store" className="w-32 h-32 rounded-2xl object-cover shadow-lg" />
            <div>
              <h3 className="text-lg font-black text-indigo-800 mb-2">🏪 Optical Store</h3>
              <p className="text-sm text-indigo-600 mb-3">Wide range of prescription glasses, sunglasses, and contact lenses. Get fitted by certified optometrists.</p>
              <a href="tel:+917981502973" className="bg-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                <Phone className="h-4 w-4" /> Contact Optics Store
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── Health Packages ─── */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900">
            Health <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Packages</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1">Save up to 40% with our curated health check packages</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {healthPackages.map(pkg => (
            <div key={pkg.id} className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all group">
              <div className="relative h-44 overflow-hidden">
                <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-900/70 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-lg font-black text-white">{pkg.name}</h3>
                  <p className="text-violet-200 text-xs">{pkg.tests} tests included</p>
                </div>
                <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse">
                  Save ₹{pkg.original - pkg.price}
                </span>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {pkg.includes.map(t => (
                    <span key={t} className="text-[10px] font-bold bg-violet-50 text-violet-600 px-2 py-1 rounded">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-black text-violet-700">₹{pkg.price}</span>
                    <span className="text-sm text-slate-400 line-through ml-2">₹{pkg.original}</span>
                  </div>
                  <button onClick={() => setBookingTest({ name: pkg.name, price: pkg.price, duration: '2-3 hrs' })}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-0.5">
                    Book Package
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Health Departments ─── */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Departments</span>
          </h2>
          <p className="text-slate-500 font-medium mt-1">Specialized departments with expert consultants</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {healthDepartments.map((dept, i) => (
            <div key={i} className="group bg-white rounded-2xl border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden cursor-pointer">
              <div className="relative h-36 overflow-hidden">
                <img src={dept.image} alt={dept.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <h3 className="text-sm font-black text-white">{dept.name}</h3>
                  <dept.icon className="h-4 w-4 text-white/80" />
                </div>
              </div>
              <div className="p-3 text-center">
                <span className="text-xs font-bold text-emerald-600">{dept.doctors} Doctors</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Healthcare CTA — Loan & Hospitals ─── */}
      <HealthcareCTA
        context="Need financial assistance for your diagnostic tests?"
        condition="diagnostic tests"
        variant="wide"
      />

      {/* ─── CTA Section ─── */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-[2rem] p-8 lg:p-12 text-white text-center relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-3">Book Your Health Check-Up Today</h2>
          <p className="text-violet-200 mb-8 max-w-lg mx-auto">Early detection saves lives. Schedule your diagnostic test now and get accurate results within hours.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="tel:+917981502973" className="bg-white text-violet-700 font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2">
              <Phone className="h-5 w-5" /> Call: +91 7981502973
            </a>
            <a href="https://wa.me/917981502973" target="_blank" rel="noopener noreferrer"
              className="bg-[#25D366] text-white font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> WhatsApp Booking
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
