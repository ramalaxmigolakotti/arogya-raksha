'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  User, MapPin, Briefcase, Clock, ChevronRight, ChevronLeft,
  Check, Camera, Loader2, AlertCircle, Plus, X, Phone, Globe
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const SKILL_OPTIONS = [
  'Medicine Management', 'Hospital Accompany', 'Diabetic Care',
  'Blood Pressure Monitoring', 'Physiotherapy Assistance', 'Wound Care',
  'Alzheimer/Dementia Care', 'Mobility Assistance', 'Cooking & Nutrition',
  'Personal Hygiene', 'Companionship', 'Doctor Appointment Booking',
  'Wheelchair Handling', 'Emergency Response', 'Post-Surgery Care',
];

const LANGUAGE_OPTIONS = [
  'Telugu', 'Hindi', 'English', 'Tamil', 'Kannada',
  'Marathi', 'Bengali', 'Bhojpuri', 'Urdu', 'Odia',
];

const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIMING_OPTIONS = [
  { value: 'Morning', label: '🌅 Morning', desc: '6 AM – 12 PM' },
  { value: 'Afternoon', label: '🌤️ Afternoon', desc: '12 PM – 6 PM' },
  { value: 'Evening', label: '🌆 Evening', desc: '6 PM – 10 PM' },
  { value: 'Full Day', label: '☀️ Full Day', desc: '8 AM – 8 PM' },
  { value: 'Night', label: '🌙 Night', desc: '10 PM – 6 AM' },
  { value: 'Live-in', label: '🏠 Live-in', desc: '24/7 Available' },
];

export default function RegisterCaregiverPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [form, setForm] = useState({
    full_name: '', age: '', gender: '', phone: '', email: '',
    photo_url: '', village: '', city: '', state: 'Telangana',
    pincode: '', bio: '',
    skills: [] as string[],
    languages: [] as string[],
    experience_years: '',
    salary_expectation: '',
    availability: { days: [] as string[], timing: '' },
  });

  const updateField = (k: string, v: string | object) => setForm(f => ({ ...f, [k]: v }));

  const toggleSkill = (s: string) => {
    const arr = form.skills.includes(s) ? form.skills.filter(x => x !== s) : [...form.skills, s];
    updateField('skills', arr);
  };

  const toggleLanguage = (l: string) => {
    const arr = form.languages.includes(l) ? form.languages.filter(x => x !== l) : [...form.languages, l];
    updateField('languages', arr);
  };

  const toggleDay = (d: string) => {
    const days = form.availability.days.includes(d)
      ? form.availability.days.filter(x => x !== d)
      : [...form.availability.days, d];
    updateField('availability', { ...form.availability, days });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'elder-care-caregivers');
      const res = await fetch(`${API}/api/media/upload`, {
        method: 'POST',
        headers: { 'x-user-id': user?.id || '' },
        body: fd,
      });
      const data = await res.json();
      if (data.url || data.secure_url) updateField('photo_url', data.url || data.secure_url);
    } catch {
      setError('Photo upload failed. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/elder-care/caregivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          ...form,
          age: parseInt(form.age) || null,
          experience_years: parseInt(form.experience_years) || 0,
          salary_expectation: parseInt(form.salary_expectation) || 0,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      // Notify caregiver via n8n/Twilio
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email || 'user@example.com',
            phone: form.phone,
            channel: 'both',
            subject: 'Registration Successful - Arogya Raksha',
            message: `Hi ${form.full_name}, welcome to Arogya Raksha! Your caregiver profile is now live. We will notify you when families want to hire you.`
          })
        });
      } catch (e) {
        console.error('Failed to send registration notification', e);
      }

      router.push('/dashboard/elder-care/directory?tab=caregivers&new=1');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, label: 'Personal', icon: User },
    { number: 2, label: 'Skills', icon: Briefcase },
    { number: 3, label: 'Availability', icon: Clock },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Caregiver Profile</h1>
          <p className="text-sm text-slate-500">Create your profile to get matched with nearby elders</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => step > s.number && setStep(s.number)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 ${
                step === s.number
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                  : step > s.number
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer'
                  : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-default'
              }`}>
              {step > s.number ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-6 flex-shrink-0 rounded-full ${step > s.number ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── STEP 1: Personal Info ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-5">
          <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-500" /> Personal Information
          </h2>

          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {form.photo_url ? (
                <img src={form.photo_url} alt="Caregiver"
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-emerald-200" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-emerald-200 flex items-center justify-center text-3xl">
                  👩‍⚕️
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-xl transition-colors">
              <Camera className="h-4 w-4" /> Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input value={form.full_name} onChange={e => updateField('full_name', e.target.value)}
                placeholder="e.g. Sunitha Reddy"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Age</label>
              <input type="number" value={form.age} onChange={e => updateField('age', e.target.value)}
                placeholder="30"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
              <select value={form.gender} onChange={e => updateField('gender', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Select</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone *</label>
              <input value={form.phone} onChange={e => updateField('phone', e.target.value)}
                placeholder="9876543210"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input value={form.email} onChange={e => updateField('email', e.target.value)}
                placeholder="sunitha@gmail.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Village / Area *</label>
              <input value={form.village} onChange={e => updateField('village', e.target.value)}
                placeholder="e.g. Miryalaguda"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">City</label>
              <input value={form.city} onChange={e => updateField('city', e.target.value)}
                placeholder="Nalgonda"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Short Bio</label>
            <textarea value={form.bio} onChange={e => updateField('bio', e.target.value)}
              placeholder="Briefly describe your caregiving experience and why you want to help..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>
        </div>
      )}

      {/* ── STEP 2: Skills & Languages ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-5">
          <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-500" /> Skills &amp; Languages
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Caregiving Skills <span className="text-slate-400 normal-case font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map(s => (
                <button key={s} onClick={() => toggleSkill(s)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition-all ${
                    form.skills.includes(s)
                      ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-500'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Languages Spoken</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map(l => (
                <button key={l} onClick={() => toggleLanguage(l)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition-all flex items-center gap-1.5 ${
                    form.languages.includes(l)
                      ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-500'
                  }`}>
                  <Globe className="h-3.5 w-3.5" /> {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Experience (Years)</label>
              <input type="number" value={form.experience_years} onChange={e => updateField('experience_years', e.target.value)}
                placeholder="2"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expected Salary (₹/month)</label>
              <input type="number" value={form.salary_expectation} onChange={e => updateField('salary_expectation', e.target.value)}
                placeholder="8000"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Availability ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-5">
          <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" /> Availability
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Available Days</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_OPTIONS.map(d => (
                <button key={d} onClick={() => toggleDay(d)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    form.availability.days.includes(d)
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-300'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preferred Timing</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TIMING_OPTIONS.map(t => (
                <button key={t.value}
                  onClick={() => updateField('availability', { ...form.availability, timing: t.value })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.availability.timing === t.value
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-200'
                      : 'bg-slate-50 border-slate-200 hover:border-amber-200'
                  }`}>
                  <p className="text-sm font-bold text-slate-800">{t.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <h3 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
              <Check className="h-4 w-4" /> Profile Summary
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Name</span>
                <span className="font-bold text-slate-800">{form.full_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Location</span>
                <span className="font-bold text-slate-800">{form.village || '—'}, {form.city || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Skills</span>
                <span className="font-bold text-slate-800">{form.skills.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Languages</span>
                <span className="font-bold text-slate-800">{form.languages.join(', ') || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Salary</span>
                <span className="font-bold text-slate-800">₹{form.salary_expectation || '—'}/month</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1 && (!form.full_name || !form.phone || !form.village)) {
                setError('Please fill Name, Phone and Village to continue.');
                return;
              }
              setError('');
              setStep(s => s + 1);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black rounded-xl shadow-lg shadow-emerald-200 hover:scale-[1.02] transition-transform">
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black rounded-xl shadow-lg shadow-emerald-200 hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:scale-100">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Create Caregiver Profile'}
          </button>
        )}
      </div>
    </div>
  );
}
