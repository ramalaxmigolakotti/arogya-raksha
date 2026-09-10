'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { ArrowLeft, UserPlus, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function RegisterPatient() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: 'Female',
    phone: '',
    village_name: '',
    medical_history: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/asha/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          ...formData,
          age: parseInt(formData.age)
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Patient registered successfully!');
        router.push('/dashboard/asha/patients');
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link href="/dashboard/asha" className="flex items-center gap-2 text-rose-500 hover:text-rose-600 font-semibold text-sm transition-colors w-fit">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 border border-white/30">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Register Villager</h1>
          <p className="text-rose-100 text-sm">Create a digital health profile for a rural citizen to manage their vitals and medical history.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Full Name</label>
            <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" placeholder="Enter patient name" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Age</label>
              <input required type="number" min="0" max="120" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" placeholder="e.g. 45" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Gender</label>
              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all">
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Phone (Optional)</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" placeholder="Family member's number" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Village Name</label>
              <input required type="text" value={formData.village_name} onChange={e => setFormData({...formData, village_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all" placeholder="Village / Gram Panchayat" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Pre-existing Medical History</label>
            <textarea value={formData.medical_history} onChange={e => setFormData({...formData, medical_history: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all min-h-[100px]" placeholder="e.g. Diabetes, Asthma, Previous surgeries (Leave blank if none)"></textarea>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-sm text-rose-800">
          <Shield className="h-5 w-5 flex-shrink-0 text-rose-500" />
          <p>By registering this patient, you confirm you have their consent to record their medical data for Arogya Rakshaa's digital tracking system.</p>
        </div>

        <button disabled={loading} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-[0.98] disabled:opacity-70">
          {loading ? 'Registering...' : 'Register Villager Profile'}
        </button>
      </form>
    </div>
  );
}
