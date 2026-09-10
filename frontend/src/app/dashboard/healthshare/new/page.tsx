'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HandHeart, Upload, MapPin, Loader2, AlertCircle, Camera } from 'lucide-react';
import AIFloatingPanel from '@/components/AIFloatingPanel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function NewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'equipment',
    provider_name: '',
    provider_phone: '',
    description: '',
    condition: 'good',
    is_free: true,
    price: 0,
    is_emergency: false,
    location_name: '',
    lat: 17.3850, // Default to Hyderabad center
    lng: 78.4867,
    image_base64: ''
  });

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setFormData(prev => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          location_name: 'Current Location (Detected)'
        }));
      },
      () => {
        alert('Could not detect location.');
      }
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image_base64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/healthshare/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to post listing');
      
      // Notify user via n8n
      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'user@example.com', // Get from user context
            phone: formData.contact_phone || '+919876543210',
            channel: 'email',
            subject: 'Listing Posted - HealthShare Arogya Raksha',
            message: `Your listing "${formData.title}" has been successfully posted. We will notify you when a match is found.`
          })
        });
      } catch (e) {
        console.error(e);
      }

      router.push('/dashboard/healthshare');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6 pb-24">
      <div className="max-w-2xl mx-auto">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30">
            <HandHeart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Post a Resource</h1>
            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">Share equipment or medicines</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#0f2027] border border-white/5 rounded-2xl p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Item Title</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Wheelchair, Oxygen Concentrator" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                <option value="equipment" className="bg-[#0f2027]">Equipment</option>
                <option value="medicine" className="bg-[#0f2027]">Medicine</option>
                <option value="supplies" className="bg-[#0f2027]">Supplies (Bandages, etc)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Description</label>
            <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the item, condition, and any specific requirements..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Upload Photo</label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm border border-white/5">
                <Camera className="h-4 w-4" /> Choose Image
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
              {formData.image_base64 && (
                <div className="h-12 w-12 rounded-xl bg-cover bg-center border border-white/10" style={{ backgroundImage: `url(${formData.image_base64})` }} />
              )}
              {!formData.image_base64 && <span className="text-xs text-slate-500">No file chosen</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Your Name</label>
              <input required type="text" value={formData.provider_name} onChange={e => setFormData({...formData, provider_name: e.target.value})} placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Phone Number</label>
              <input required type="tel" value={formData.provider_phone} onChange={e => setFormData({...formData, provider_phone: e.target.value})} placeholder="+91 98765 43210" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-white/5 border border-white/5">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_free ? 'bg-blue-500' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_free ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Free / Donated</p>
                  <p className="text-xs text-slate-400">No rental fee charged</p>
                </div>
              </label>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={formData.is_free} 
                onChange={(e) => setFormData({...formData, is_free: e.target.checked})} 
              />
            </div>
            
            {!formData.is_free && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Daily Rental Price (₹)</label>
                <input type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-red-500/20 bg-red-500/5">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-12 h-6 rounded-full transition-colors relative ${formData.is_emergency ? 'bg-red-500' : 'bg-white/10'}`}>
                  <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_emergency ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Emergency Item</p>
                  <p className="text-xs text-slate-400">Flag for urgent disaster relief</p>
                </div>
              </label>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={formData.is_emergency} 
                onChange={(e) => setFormData({...formData, is_emergency: e.target.checked})} 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Location</label>
            <div className="flex gap-2">
              <input required type="text" value={formData.location_name} onChange={e => setFormData({...formData, location_name: e.target.value})} placeholder="e.g. Kondapur, Hyderabad" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
              <button type="button" onClick={detectLocation} className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Detect
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            Post Resource Listing
          </button>

        </form>
      </div>

      <AIFloatingPanel 
        featureName="HealthShare Listing"
        context="You are helping the user post a new HealthShare resource. Guide them on what details are important to include in the description, how to price items, or how to flag items for emergency use."
        quickPrompts={[
          "What should I include in the description?",
          "How does pricing work?",
          "What does Emergency Item mean?"
        ]}
      />
    </div>
  );
}
