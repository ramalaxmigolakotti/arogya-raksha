'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  HandHeart, Search, MapPin, Filter, PlusCircle, AlertCircle, User,
  Package, Pill, Activity, Stethoscope, ChevronRight, Loader2, Sparkles, Navigation2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Resource {
  id: string;
  title: string;
  category: string;
  provider_name: string;
  provider_phone: string;
  description: string;
  condition: string;
  is_free: boolean;
  price: number;
  is_emergency: boolean;
  location_name: string;
  lat: number;
  lng: number;
  status: string;
  image_url: string;
}

export default function HealthSharePage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterEmergency, setFilterEmergency] = useState(false);
  const [filterFree, setFilterFree] = useState(false);

  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  useEffect(() => {
    fetchResources();
  }, [filterCategory, filterEmergency, filterFree]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterCategory !== 'all') query.append('category', filterCategory);
      if (filterEmergency) query.append('is_emergency', 'true');
      if (filterFree) query.append('is_free', 'true');

      const res = await fetch(`${API_URL}/api/healthshare/resources?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
      }
    } catch (e) {
      console.error('Failed to fetch resources', e);
    } finally {
      setLoading(false);
    }
  };

  const askAiForAlternatives = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSearchQuery.trim()) return;
    setAiLoading(true);
    setAiSuggestions(null);

    try {
      const res = await fetch(`${API_URL}/api/healthshare/ai-alternatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_term: aiSearchQuery })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.data);
      }
    } catch (e) {
      console.error('AI error', e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRequest = async (resource: Resource) => {
    const name = prompt('Enter your name:');
    if (!name) return;
    const phone = prompt('Enter your phone number:');
    if (!phone) return;

    try {
      const res = await fetch(`${API_URL}/api/healthshare/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: resource.id,
          requester_name: name,
          requester_phone: phone,
          urgency: resource.is_emergency ? 'emergency' : 'normal',
          message: 'I would like to request this item.'
        })
      });
      if (res.ok) {
        alert('Request sent successfully! The provider will contact you.');
        fetchResources(); // Refresh list
      }
    } catch (e) {
      alert('Failed to send request.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30">
              <HandHeart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">HealthShare</h1>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">Community Resource Network</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 max-w-xl mt-3">
            Rent, share, or donate medical equipment and supplies. Connect with healthcare volunteers in your community. Let's build a health network where nothing goes to waste.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard/healthshare/volunteers" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 px-5 rounded-xl transition-all border border-white/10">
            <Stethoscope className="h-4 w-4" /> Volunteers
          </Link>
          <Link href="/dashboard/healthshare/new" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-5 rounded-xl transition-all shadow-lg shadow-blue-500/25">
            <PlusCircle className="h-4 w-4" /> Post Listing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Filters & AI Search */}
        <div className="space-y-6">
          {/* Smart Search */}
          <div className="bg-[#0f2027] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Can't find what you need?
            </h3>
            <form onSubmit={askAiForAlternatives} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Oxygen Cylinder"
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center justify-center disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </form>

            {/* AI Results */}
            {aiSuggestions && (
              <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-sm text-indigo-200 mb-3 font-medium leading-relaxed">{aiSuggestions.message}</p>
                <div className="space-y-2">
                  {aiSuggestions.alternatives.map((alt: any, i: number) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3">
                      <p className="text-sm font-bold text-indigo-300">{alt.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{alt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="bg-[#0f2027] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" /> Filters
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All Items' },
                    { id: 'equipment', label: 'Equipment', icon: Package },
                    { id: 'medicine', label: 'Medicines', icon: Pill },
                    { id: 'supplies', label: 'Supplies', icon: Activity },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                    >
                      {cat.icon && <cat.icon className="h-3.5 w-3.5" />} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-white/5" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Free Only</p>
                  <p className="text-xs text-slate-500">Show 100% free or donated items</p>
                </div>
                <button
                  onClick={() => setFilterFree(!filterFree)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${filterFree ? 'bg-blue-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${filterFree ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Emergencies</p>
                  <p className="text-xs text-slate-500">Urgent items for disaster/crisis</p>
                </div>
                <button
                  onClick={() => setFilterEmergency(!filterEmergency)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${filterEmergency ? 'bg-red-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${filterEmergency ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Listings */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-400 text-sm">Loading community resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="bg-[#0f2027] border border-white/5 rounded-2xl p-10 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No resources found</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
                We couldn't find any listings matching your filters. Try asking our AI for alternative solutions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map((resource) => (
                <div key={resource.id} className="bg-[#0f2027] border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                  
                  {resource.is_emergency && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-lg flex items-center gap-1 z-10">
                      <AlertCircle className="h-3 w-3" /> Urgent
                    </div>
                  )}

                  {resource.image_url && (
                    <div 
                      className="w-full h-32 bg-cover bg-center rounded-xl mb-4 border border-white/5" 
                      style={{ backgroundImage: `url(${resource.image_url})` }} 
                    />
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full mb-2 inline-block">
                        {resource.category}
                      </span>
                      <h3 className="text-base font-bold text-white leading-snug pr-10">{resource.title}</h3>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{resource.description}</p>
                  
                  <div className="space-y-2 mb-5">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" /> {resource.location_name || 'Location unknown'}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-slate-500" /> {resource.provider_name}
                      </div>
                      <span className="font-semibold text-emerald-400">
                        {resource.is_free ? 'Free / Donated' : `₹${resource.price} / day`}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => handleRequest(resource)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      Request Item
                    </button>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${resource.lat},${resource.lng}`}
                      target="_blank"
                      className="bg-white/10 hover:bg-white/15 text-white p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center"
                      title="Directions"
                    >
                      <Navigation2 className="h-4 w-4" />
                    </a>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
