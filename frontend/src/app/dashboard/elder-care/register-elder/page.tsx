'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  User, MapPin, Heart, Pill, Phone, Camera, ChevronRight,
  ChevronLeft, Check, Plus, X, Upload, Loader2, AlertCircle
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const CONDITION_OPTIONS = [
  'Diabetes', 'Hypertension', 'Heart Disease', 'Arthritis', 'Dementia',
  'Parkinson\'s', 'Asthma', 'Kidney Disease', 'Cancer', 'Stroke',
  'Osteoporosis', 'Depression', 'Cataracts', 'Post Surgery Recovery', 'Other'
];

const MOBILITY_OPTIONS = [
  { value: 'mobile', label: '🚶 Mobile', desc: 'Can walk independently' },
  { value: 'partial', label: '🦯 Partial', desc: 'Needs some assistance' },
  { value: 'bedridden', label: '🛏️ Bedridden', desc: 'Confined to bed' },
];

interface MedicineEntry { name: string; time: string; dose: string; }
interface ContactEntry { name: string; phone: string; relation: string; }

export default function RegisterElderPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [form, setForm] = useState({
    full_name: '', age: '', gender: '', address: '', city: '',
    state: 'Telangana', pincode: '', latitude: '', longitude: '',
    photo_url: '', conditions: [] as string[], mobility: 'mobile',
    special_notes: '', budget_per_month: '',
    medicine_schedule: [] as MedicineEntry[],
    emergency_contacts: [] as ContactEntry[],
  });

  const updateField = (k: string, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

  const toggleCondition = (c: string) => {
    const arr = form.conditions.includes(c)
      ? form.conditions.filter(x => x !== c)
      : [...form.conditions, c];
    updateField('conditions', arr);
  };

  const addMedicine = () =>
    setForm(f => ({ ...f, medicine_schedule: [...f.medicine_schedule, { name: '', time: '', dose: '' }] }));

  const updateMedicine = (i: number, k: string, v: string) =>
    setForm(f => ({
      ...f,
      medicine_schedule: f.medicine_schedule.map((m, idx) => idx === i ? { ...m, [k]: v } : m)
    }));

  const removeMedicine = (i: number) =>
    setForm(f => ({ ...f, medicine_schedule: f.medicine_schedule.filter((_, idx) => idx !== i) }));

  const addContact = () =>
    setForm(f => ({ ...f, emergency_contacts: [...f.emergency_contacts, { name: '', phone: '', relation: '' }] }));

  const updateContact = (i: number, k: string, v: string) =>
    setForm(f => ({
      ...f,
      emergency_contacts: f.emergency_contacts.map((c, idx) => idx === i ? { ...c, [k]: v } : c)
    }));

  const removeContact = (i: number) =>
    setForm(f => ({ ...f, emergency_contacts: f.emergency_contacts.filter((_, idx) => idx !== i) }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'elder-care');
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
      const res = await fetch(`${API}/api/elder-care/elders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          ...form,
          age: parseInt(form.age),
          budget_per_month: parseInt(form.budget_per_month) || 0,
          latitude: parseFloat(form.latitude) || null,
          longitude: parseFloat(form.longitude) || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      // Notify family member via n8n/Twilio
      try {
        const contactPhone = form.emergency_contacts.length > 0 ? form.emergency_contacts[0].phone : '+919876543210';
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'family@example.com',
            phone: contactPhone,
            channel: 'both',
            subject: 'Elder Registration Successful - Arogya Raksha',
            message: `Hi, ${form.full_name}'s profile has been successfully registered on Arogya Raksha. Caregivers can now find and apply to help them.`
          })
        });
      } catch (e) {
        console.error('Failed to send registration notification', e);
      }

      router.push('/dashboard/elder-care/directory?tab=elders&new=1');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, label: 'Basic Info', icon: User },
    { number: 2, label: 'Medical', icon: Heart },
    { number: 3, label: 'Medicines', icon: Pill },
    { number: 4, label: 'Contacts', icon: Phone },
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
          <h1 className="text-2xl font-extrabold text-slate-900">Register an Elder</h1>
          <p className="text-sm text-slate-500">Fill in details to find the best caregiver match</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => step > s.number && setStep(s.number)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all flex-1 ${
                step === s.number
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                  : step > s.number
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer'
                  : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-default'
              }`}>
              {step > s.number ? (
                <Check className="h-4 w-4 flex-shrink-0" />
              ) : (
                <s.icon className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="hidden sm:inline truncate">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-6 flex-shrink-0 rounded-full ${step > s.number ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── STEP 1: Basic Info ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-5">
          <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-orange-500" /> Basic Information
          </h2>

          {/* Photo Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {form.photo_url ? (
                <img src={form.photo_url} alt="Elder"
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-orange-200" />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-orange-200 flex items-center justify-center text-3xl">
                  👴
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold text-sm rounded-xl transition-colors">
              <Camera className="h-4 w-4" /> Upload Photo
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input value={form.full_name} onChange={e => updateField('full_name', e.target.value)}
                placeholder="e.g. Ramaiah Goud"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Age *</label>
              <input type="number" value={form.age} onChange={e => updateField('age', e.target.value)}
                placeholder="72"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Gender</label>
              <select value={form.gender} onChange={e => updateField('gender', e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Address *</label>
            <textarea value={form.address} onChange={e => updateField('address', e.target.value)}
              placeholder="House No., Street, Village/Colony..."
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">City</label>
              <input value={form.city} onChange={e => updateField('city', e.target.value)}
                placeholder="Nalgonda"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">State</label>
              <input value={form.state} onChange={e => updateField('state', e.target.value)}
                placeholder="Telangana"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pincode</label>
              <input value={form.pincode} onChange={e => updateField('pincode', e.target.value)}
                placeholder="508001"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monthly Caregiver Budget (₹)</label>
            <input type="number" value={form.budget_per_month} onChange={e => updateField('budget_per_month', e.target.value)}
              placeholder="8000"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>
      )}

      {/* ── STEP 2: Medical Info ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-5">
          <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" /> Medical Information
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Medical Conditions</label>
            <div className="flex flex-wrap gap-2">
              {CONDITION_OPTIONS.map(c => (
                <button key={c} onClick={() => toggleCondition(c)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-bold border transition-all ${
                    form.conditions.includes(c)
                      ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-500'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mobility Level</label>
            <div className="grid grid-cols-3 gap-3">
              {MOBILITY_OPTIONS.map(m => (
                <button key={m.value} onClick={() => updateField('mobility', m.value)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    form.mobility === m.value
                      ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-200'
                      : 'bg-slate-50 border-slate-200 hover:border-orange-200'
                  }`}>
                  <p className="text-lg">{m.label.split(' ')[0]}</p>
                  <p className={`text-xs font-bold mt-1 ${form.mobility === m.value ? 'text-orange-700' : 'text-slate-600'}`}>
                    {m.label.split(' ').slice(1).join(' ')}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Special Notes / Care Instructions</label>
            <textarea value={form.special_notes} onChange={e => updateField('special_notes', e.target.value)}
              placeholder="e.g. Needs help climbing stairs. Vegetarian diet only. Wakes up at 6 AM..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          </div>
        </div>
      )}

      {/* ── STEP 3: Medicine Schedule ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <Pill className="h-5 w-5 text-emerald-500" /> Medicine Schedule
            </h2>
            <button onClick={addMedicine}
              className="flex items-center gap-1.5 text-sm text-emerald-600 font-bold bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {form.medicine_schedule.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-3xl mb-2">💊</p>
              <p className="text-sm text-slate-500 font-medium">No medicines added yet</p>
              <button onClick={addMedicine}
                className="mt-3 text-sm text-emerald-600 font-bold hover:text-emerald-700">
                + Add first medicine
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {form.medicine_schedule.map((m, i) => (
                <div key={i} className="flex gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input value={m.name} onChange={e => updateMedicine(i, 'name', e.target.value)}
                      placeholder="Medicine name"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                    <input value={m.dose} onChange={e => updateMedicine(i, 'dose', e.target.value)}
                      placeholder="Dose (e.g. 500mg)"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                    <input value={m.time} onChange={e => updateMedicine(i, 'time', e.target.value)}
                      placeholder="Time (e.g. 8 AM)"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                  </div>
                  <button onClick={() => removeMedicine(i)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 4: Emergency Contacts ── */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-500" /> Emergency Contacts
            </h2>
            <button onClick={addContact}
              className="flex items-center gap-1.5 text-sm text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {form.emergency_contacts.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="text-3xl mb-2">📞</p>
              <p className="text-sm text-slate-500 font-medium">No emergency contacts added</p>
              <button onClick={addContact}
                className="mt-3 text-sm text-blue-600 font-bold hover:text-blue-700">
                + Add contact
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {form.emergency_contacts.map((c, i) => (
                <div key={i} className="flex gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input value={c.name} onChange={e => updateContact(i, 'name', e.target.value)}
                      placeholder="Full name"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                    <input value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)}
                      placeholder="Phone number"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                    <input value={c.relation} onChange={e => updateContact(i, 'relation', e.target.value)}
                      placeholder="Relation (Son/Daughter)"
                      className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                  </div>
                  <button onClick={() => removeContact(i)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Review Summary */}
          <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl p-4">
            <h3 className="text-sm font-bold text-orange-700 mb-3 flex items-center gap-2">
              <Check className="h-4 w-4" /> Registration Summary
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Name</span>
                <span className="font-bold text-slate-800">{form.full_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Age</span>
                <span className="font-bold text-slate-800">{form.age || '—'} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">City</span>
                <span className="font-bold text-slate-800">{form.city || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Conditions</span>
                <span className="font-bold text-slate-800">{form.conditions.length || 0} added</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Medicines</span>
                <span className="font-bold text-slate-800">{form.medicine_schedule.length} added</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Emergency Contacts</span>
                <span className="font-bold text-slate-800">{form.emergency_contacts.length} added</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={() => {
              if (step === 1 && (!form.full_name || !form.age || !form.address)) {
                setError('Please fill Name, Age and Address to continue.');
                return;
              }
              setError('');
              setStep(s => s + 1);
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl shadow-lg shadow-orange-200 hover:scale-[1.02] transition-transform">
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl shadow-lg shadow-orange-200 hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:scale-100">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'Registering...' : 'Register Elder'}
          </button>
        )}
      </div>
    </div>
  );
}
