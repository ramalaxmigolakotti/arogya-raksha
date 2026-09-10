'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, MapPin, Loader2, AlertCircle, UserPlus, ArrowLeft } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function BecomeVolunteerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'healthcare_professional',
    skills: '',
    availability: 'Weekdays',
    location_name: '',
    lat: 17.3850,
    lng: 78.4867,
  });

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          location_name: 'Current Location (Detected)',
        }));
      },
      () => alert('Could not detect location.')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/healthshare/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to register');
      router.push('/dashboard/healthshare/volunteers');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6 pb-24">
      <div className="max-w-2xl mx-auto">

        <Link href="/dashboard/healthshare/volunteers" className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-semibold text-sm mb-6 transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Back to Volunteers
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Become a Volunteer</h1>
            <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">HealthShare Network</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#0f2027] border border-white/5 rounded-2xl p-6 space-y-6">

          {/* Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Your Full Name</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Dr. Priya Sharma" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Phone Number</label>
              <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 98765 43210" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Your Role</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
              <option value="healthcare_professional" className="bg-[#0f2027]">Healthcare Professional (Doctor/Nurse/Pharmacist)</option>
              <option value="driver" className="bg-[#0f2027]">Driver / Transport Volunteer</option>
              <option value="ngo_worker" className="bg-[#0f2027]">NGO / Social Worker</option>
              <option value="general" className="bg-[#0f2027]">General Community Helper</option>
            </select>
          </div>

          {/* Skills */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Skills / Specialization</label>
            <textarea value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} placeholder="e.g. Emergency first aid, Blood pressure monitoring, Medicine distribution..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
          </div>

          {/* Availability */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Availability</label>
            <select value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
              <option value="Weekdays" className="bg-[#0f2027]">Weekdays</option>
              <option value="Weekends" className="bg-[#0f2027]">Weekends</option>
              <option value="Anytime" className="bg-[#0f2027]">Anytime</option>
              <option value="Emergencies Only" className="bg-[#0f2027]">Emergencies Only</option>
              <option value="On Call" className="bg-[#0f2027]">On Call</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Your Location</label>
            <div className="flex gap-2">
              <input required type="text" value={formData.location_name} onChange={e => setFormData({...formData, location_name: e.target.value})} placeholder="e.g. Kondapur, Hyderabad" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
              <button type="button" onClick={detectLocation} className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" /> Detect
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            Register as Volunteer
          </button>

        </form>
      </div>
    </div>
  );
}
