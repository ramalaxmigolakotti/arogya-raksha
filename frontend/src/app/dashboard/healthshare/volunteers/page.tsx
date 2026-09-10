'use client';

import { useState, useEffect } from 'react';
import { Users, Phone, MapPin, Loader2, HeartPulse, UserPlus } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Volunteer {
  id: string;
  name: string;
  role: string;
  skills: string;
  phone: string;
  location_name: string;
  availability: string;
  verified: boolean;
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/healthshare/volunteers`);
        if (res.ok) {
          const data = await res.json();
          setVolunteers(data.volunteers || []);
        }
      } catch (e) {
        console.error('Failed to fetch volunteers', e);
      } finally {
        setLoading(false);
      }
    };
    fetchVolunteers();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6 pb-24">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Volunteer Network</h1>
                <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">HealthShare</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 max-w-xl mt-3">
              Connect with healthcare professionals, drivers, and NGO workers willing to help in times of need.
            </p>
          </div>

          <Link href="/dashboard/healthshare/volunteers/register" className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-5 rounded-xl transition-all shadow-lg shadow-indigo-500/25">
            <UserPlus className="h-4 w-4" /> Become a Volunteer
          </Link>
        </div>

        {/* Directory */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Loading volunteer network...</p>
          </div>
        ) : volunteers.length === 0 ? (
          <div className="bg-[#0f2027] border border-white/5 rounded-2xl p-10 text-center">
            <HeartPulse className="h-10 w-10 text-indigo-500/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No volunteers yet</h3>
            <p className="text-slate-400 text-sm">Be the first to step up and help your community.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {volunteers.map(vol => (
              <div key={vol.id} className="bg-[#0f2027] border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition-all group relative">
                
                {vol.verified && (
                  <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                    Verified
                  </div>
                )}

                <h3 className="text-lg font-bold text-white">{vol.name}</h3>
                <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-3">{vol.role.replace('_', ' ')}</p>
                
                <p className="text-sm text-slate-300 mb-4 h-10 line-clamp-2">{vol.skills || 'General support'}</p>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" /> {vol.location_name || 'Location unknown'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <HeartPulse className="h-3.5 w-3.5 text-slate-500" /> Availability: {vol.availability}
                  </div>
                </div>

                <a href={`tel:${vol.phone}`} className="w-full bg-white/5 hover:bg-white/10 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/5 group-hover:border-indigo-500/20">
                  <Phone className="h-4 w-4" /> Contact
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
