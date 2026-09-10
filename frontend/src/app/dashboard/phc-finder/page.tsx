'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Search, Phone, Navigation2, Share2,
  Loader2, AlertCircle, Building2, Cross, RefreshCw,
  Wifi, WifiOff, Ambulance, CheckCircle2, ZapIcon,
  Info, Database, Globe, Filter, X, ActivitySquare, Pill
} from 'lucide-react';
import { telanganaFacilities, telanganaDistricts, type TelanganaFacility } from '@/data/telanganaData';
import AIFloatingPanel from '@/components/AIFloatingPanel';
import AIFeatureConnector from '@/components/AIFeatureConnector';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ──────────────── Types ────────────────
interface OSMFacility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance_km: number;
  address: string;
  phone: string;
  emergency: string;
  type: string;
}

// Unified result card type
interface UnifiedResult {
  id: string;
  name: string;
  source: 'local' | 'live';
  district?: string;
  taluka?: string;
  block?: string;
  address?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  distance_km?: number;
  emergency?: string;
  type?: string;
}

type RadiusType = 5 | 10 | 25 | 50;
const RADIUS_OPTIONS: RadiusType[] = [5, 10, 25, 50];

// ──────────────── Colour helpers ────────────────
function getFacilityColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('ayurvedic')) return 'from-amber-500/20 to-yellow-500/20 border-amber-500/30';
  if (n.includes('homoeo') || n.includes('homeo')) return 'from-purple-500/20 to-violet-500/20 border-purple-500/30';
  if (n.includes('unani')) return 'from-teal-500/20 to-cyan-500/20 border-teal-500/30';
  if (n.includes('chc') || n.includes('community health')) return 'from-orange-500/20 to-amber-500/20 border-orange-500/30';
  if (n.includes('phc') || n.includes('primary health')) return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
  if (n.includes('hospital') || n.includes('district')) return 'from-red-500/20 to-rose-500/20 border-red-500/30';
  return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30';
}

function getFacilityType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('ayurvedic')) return 'Ayurvedic';
  if (n.includes('homoeo') || n.includes('homeo')) return 'Homoeopathic';
  if (n.includes('unani')) return 'Unani';
  if (n.includes('chc') || n.includes('community health')) return 'CHC';
  if (n.includes('phc') || n.includes('primary health')) return 'PHC';
  if (n.includes('hospital')) return 'Hospital';
  return 'Health Centre';
}

// ──────────────── Convert OSM → Unified ────────────────
function osmToUnified(f: OSMFacility): UnifiedResult {
  return {
    id: `osm-${f.id}`,
    name: f.name,
    source: 'live',
    address: f.address,
    phone: f.phone,
    lat: f.lat,
    lng: f.lng,
    distance_km: f.distance_km,
    emergency: f.emergency,
    type: f.type,
  };
}

// ──────────────── Convert Telangana → Unified ────────────────
function localToUnified(f: TelanganaFacility, idx: number): UnifiedResult {
  return {
    id: `local-${f.district}-${idx}`,
    name: f.name,
    source: 'local',
    district: f.district,
    taluka: f.taluka !== '(blank)' ? f.taluka : undefined,
    block: f.block !== '(blank)' ? f.block : undefined,
  };
}

// ──────────────── Unified Result Card ────────────────
function ResultCard({ result, index }: { result: UnifiedResult; index: number }) {
  const colorClass = getFacilityColor(result.name);
  const type = getFacilityType(result.name);

  const handleDirections = () => {
    if (result.lat && result.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${result.lat},${result.lng}`, '_blank');
    } else {
      const q = encodeURIComponent(`${result.name}, ${result.district || ''}, Telangana`);
      window.open(`https://www.google.com/maps/search/${q}`, '_blank');
    }
  };

  const handleShare = () => {
    const lines = [
      `🏥 ${result.name}`,
      result.address ? `📍 ${result.address}` : result.district ? `📍 ${[result.taluka, result.district, 'Telangana'].filter(Boolean).join(', ')}` : '',
      result.phone ? `📞 ${result.phone}` : '',
      '',
      'Found via Arogya Raksha PHC Finder',
    ].filter(l => l !== undefined);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  return (
    <div
      className={`relative bg-gradient-to-br ${colorClass} border rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-black/20 animate-in fade-in slide-in-from-bottom-3`}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      {/* Source badge — top right */}
      <div className="absolute top-3 right-3">
        {result.source === 'live' ? (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
            <Globe className="h-2.5 w-2.5" /> Live
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <Database className="h-2.5 w-2.5" /> Verified
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3 pr-16">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-white/70" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-full">
              {type}
            </span>
            {result.emergency === 'yes' && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Ambulance className="h-3 w-3" /> 24/7
              </span>
            )}
            {result.distance_km !== undefined && (
              <span className={`text-xs font-bold ${result.distance_km <= 2 ? 'text-emerald-400' : result.distance_km <= 5 ? 'text-yellow-400' : 'text-slate-400'}`}>
                {result.distance_km} km
              </span>
            )}
          </div>
          <h3 className="text-white font-bold text-sm leading-snug">{result.name}</h3>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-start gap-2">
          <MapPin className="h-3.5 w-3.5 text-white/40 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-white/60 leading-relaxed">
            {result.address
              ? result.address
              : [result.taluka, result.block, result.district, 'Telangana'].filter(Boolean).join(', ')
            }
          </p>
        </div>
        {result.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-white/40 flex-shrink-0" />
            <a href={`tel:${result.phone}`} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              {result.phone}
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleDirections}
          className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-all active:scale-95"
        >
          <Navigation2 className="h-3.5 w-3.5" />
          {result.lat ? 'Directions' : 'Find on Maps'}
        </button>
        {result.phone && (
          <a
            href={`tel:${result.phone}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold py-2 px-3 rounded-xl transition-all active:scale-95"
          >
            <Phone className="h-3.5 w-3.5" /> Call
          </a>
        )}
        <button
          onClick={handleShare}
          title="Share on WhatsApp"
          className="flex items-center justify-center bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-semibold py-2 px-3 rounded-xl transition-all active:scale-95"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ──────────────── Main Page ────────────────
export default function PHCFinderPage() {
  const [searchText, setSearchText] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [radius, setRadius] = useState<RadiusType>(10);

  // GPS state
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'found' | 'denied'>('idle');
  const [locationName, setLocationName] = useState('');
  const [detectedDistrict, setDetectedDistrict] = useState('');

  // Results
  const [osmResults, setOsmResults] = useState<UnifiedResult[]>([]);
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmError, setOsmError] = useState('');

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── Fetch OSM live data ──
  const fetchOSM = useCallback(async (lat: number, lng: number, r: number) => {
    setOsmLoading(true);
    setOsmError('');
    try {
      const res = await fetch(`${API_URL}/api/phc/nearby?lat=${lat}&lng=${lng}&radius=${r}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setOsmResults((data.facilities || []).map(osmToUnified));
    } catch {
      setOsmError('Live search failed. Showing local data only.');
      setOsmResults([]);
    } finally {
      setOsmLoading(false);
    }
  }, []);

  // ── Detect GPS location ──
  const detectLocation = () => {
    if (!navigator.geolocation) { setOsmError('Geolocation not supported.'); return; }
    setLocationStatus('detecting');
    setOsmError('');
    setOsmResults([]);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat); setUserLng(lng); setLocationStatus('found');

        try {
          const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const geoData = await geo.json();
          const name = geoData.address?.suburb || geoData.address?.city_district || geoData.address?.city || 'Your Location';
          const district = geoData.address?.county || geoData.address?.state_district || '';
          setLocationName(name);

          // Try to match detected district to Telangana districts
          const matched = telanganaDistricts.find(d =>
            district.toLowerCase().includes(d.toLowerCase()) ||
            d.toLowerCase().includes(district.toLowerCase().replace(' district', '').replace(' dt', '').trim())
          );
          if (matched) {
            setDetectedDistrict(matched);
            setSelectedDistrict(matched);
          }
        } catch {
          setLocationName('Your Location');
        }

        fetchOSM(lat, lng, radius);
      },
      () => {
        setLocationStatus('denied');
        setOsmError('Location access denied. Please search by name or select a district.');
      },
      { timeout: 10000 }
    );
  };

  // ── Text search → geocode then fetch OSM + filter local ──
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    setOsmLoading(true); setOsmError(''); setOsmResults([]);
    setPage(1);

    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText + ', India')}&format=json&limit=1`
      );
      const geoData = await geo.json();
      if (geoData && geoData.length > 0) {
        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);
        setUserLat(lat); setUserLng(lng); setLocationName(searchText); setLocationStatus('found');

        // Try to match a Telangana district from the address
        const addr = (geoData[0].display_name || '').toLowerCase();
        const matched = telanganaDistricts.find(d => addr.includes(d.toLowerCase()));
        if (matched) { setDetectedDistrict(matched); setSelectedDistrict(matched); }
        else { setDetectedDistrict(''); }

        await fetchOSM(lat, lng, radius);
      } else {
        // No geocode result — just search local data
        setOsmLoading(false);
      }
    } catch {
      setOsmError('Search failed. Showing local results only.');
      setOsmLoading(false);
    }
  };

  // ── Build unified combined results ──
  const localFiltered = telanganaFacilities
    .filter(f => {
      const matchDistrict = !selectedDistrict || f.district === selectedDistrict;
      const matchSearch = !searchText ||
        f.name.toLowerCase().includes(searchText.toLowerCase()) ||
        f.taluka.toLowerCase().includes(searchText.toLowerCase()) ||
        f.district.toLowerCase().includes(searchText.toLowerCase());
      return matchDistrict && matchSearch;
    })
    .map((f, i) => localToUnified(f, i));

  // Deduplicate: skip local entries whose name already appears in OSM results
  const osmNames = new Set(osmResults.map(r => r.name.toLowerCase()));
  const deduped = localFiltered.filter(r => !osmNames.has(r.name.toLowerCase()));

  // Live results first, then local
  const combined: UnifiedResult[] = [...osmResults, ...deduped];
  const paginated = combined.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < combined.length;

  const liveCount = osmResults.length;
  const localCount = deduped.length;

  // Reset page on filter changes
  useEffect(() => { setPage(1); }, [selectedDistrict, searchText, osmResults]);

  const clearAll = () => {
    setSearchText('');
    setSelectedDistrict('');
    setDetectedDistrict('');
    setOsmResults([]);
    setOsmError('');
    setLocationStatus('idle');
    setLocationName('');
    setUserLat(null); setUserLng(null);
    setPage(1);
  };

  const hasActiveSearch = searchText || selectedDistrict || locationStatus === 'found';

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* ── Hero Header ── */}
      <div className="relative bg-gradient-to-br from-[#0f2027] via-[#0d1f2d] to-[#0a1628] border-b border-white/5 px-6 pt-8 pb-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
              <Cross className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">PHC / CHC Finder</h1>
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-widest">
                5,037 Verified + Live GPS — Combined Results
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-5 max-w-xl">
            Searches both the verified Telangana government dataset and real-time OpenStreetMap simultaneously — showing every health centre in one unified list.
          </p>

          {/* Data source legend */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Database className="h-2.5 w-2.5" /> Verified
              </span>
              Telangana official dataset
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Globe className="h-2.5 w-2.5" /> Live
              </span>
              Real-time GPS / OpenStreetMap
            </div>
          </div>

          {/* Location status bar */}
          {locationStatus !== 'idle' && (
            <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl mb-4 w-fit transition-all duration-300 ${
              locationStatus === 'found' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : locationStatus === 'detecting' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
              : 'bg-red-500/15 text-red-400 border border-red-500/20'
            }`}>
              {locationStatus === 'detecting' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Detecting location...</>
              : locationStatus === 'found' ? <><CheckCircle2 className="h-3.5 w-3.5" /> {locationName || 'Location found'}{detectedDistrict ? ` · ${detectedDistrict} district` : ''}</>
              : <><WifiOff className="h-3.5 w-3.5" /> Location denied</>}
            </div>
          )}

          {/* Controls row */}
          <div className="flex flex-col gap-3">
            {/* Row 1: GPS + text search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="detect-gps-btn"
                onClick={detectLocation}
                disabled={locationStatus === 'detecting' || osmLoading}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-sm font-bold px-5 py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/25 active:scale-95 whitespace-nowrap"
              >
                {locationStatus === 'detecting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Detect My Location
              </button>

              <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    id="phc-search-input"
                    type="text"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Search facility name, district, or area..."
                    className="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-600 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={osmLoading}
                  className="bg-white/10 hover:bg-white/15 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-2"
                >
                  {osmLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </form>
            </div>

            {/* Row 2: District + Radius + Clear */}
            <div className="flex flex-wrap items-center gap-3">
              {/* District filter */}
              <select
                id="district-select"
                value={selectedDistrict}
                onChange={e => { setSelectedDistrict(e.target.value); setPage(1); }}
                className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 transition-all"
              >
                <option value="">All Telangana Districts</option>
                {telanganaDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Radius */}
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                <span className="text-xs text-slate-500 px-2">Radius:</span>
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => { setRadius(r); if (userLat && userLng) fetchOSM(userLat, userLng, r); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 ${
                      radius === r ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r}km
                  </button>
                ))}
              </div>

              {/* Refresh live */}
              {userLat && userLng && (
                <button
                  onClick={() => fetchOSM(userLat, userLng, radius)}
                  disabled={osmLoading}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2.5 rounded-xl transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${osmLoading ? 'animate-spin' : ''}`} /> Refresh Live
                </button>
              )}

              {/* Clear all */}
              {hasActiveSearch && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-2.5 rounded-xl transition-all"
                >
                  <X className="h-3.5 w-3.5" /> Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Error */}
        {osmError && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>{osmError}</p>
          </div>
        )}

        {/* Stats bar */}
        {(combined.length > 0 || osmLoading) && (
          <div className="flex items-center flex-wrap gap-4 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg">{combined.length.toLocaleString()}</span>
              <span className="text-slate-400 text-sm">total results</span>
            </div>
            <div className="flex items-center gap-3">
              {liveCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                  <Globe className="h-3 w-3" />
                  {liveCount} Live (GPS)
                </span>
              )}
              {localCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  <Database className="h-3 w-3" />
                  {localCount} Verified
                </span>
              )}
              {osmLoading && (
                <span className="flex items-center gap-1.5 text-xs text-blue-400 animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Fetching live data...
                </span>
              )}
            </div>
            {locationName && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-auto">
                <ZapIcon className="h-3.5 w-3.5 text-emerald-500" />
                Near {locationName}
              </div>
            )}
          </div>
        )}

        {/* Loading skeletons for OSM */}
        {osmLoading && osmResults.length === 0 && localCount === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-44 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        )}

        {/* Result grid */}
        {paginated.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginated.map((result, i) => (
                <ResultCard key={result.id} result={result} index={i} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-6">
                <button
                  id="load-more-btn"
                  onClick={() => setPage(p => p + 1)}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-all active:scale-95"
                >
                  Load More ({(combined.length - paginated.length).toLocaleString()} remaining)
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!osmLoading && combined.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <Building2 className="h-10 w-10 text-emerald-400/60" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Find Nearby Government Health Centres</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              Click <strong className="text-white">Detect My Location</strong> to instantly combine live GPS results + 5,037 verified Telangana facilities, or search by district name.
            </p>
            <button
              onClick={detectLocation}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/25"
            >
              <MapPin className="h-4 w-4" /> Detect My Location
            </button>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-10 bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-semibold">Data Sources</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="text-emerald-400 font-semibold">✅ Verified:</span> Official Ayushman Arogya Mandir list for Telangana — 5,037 govt. facilities across all districts. Always available offline.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="text-blue-400 font-semibold">🌐 Live:</span> Real-time data from OpenStreetMap via GPS. Requires internet. Shows distance, phone numbers, and directions.
                </p>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                📞 <span className="text-white/50">National Health Helpline:</span> <a href="tel:104" className="text-emerald-400 font-bold">104</a> &nbsp;|&nbsp;
                🚑 <span className="text-white/50">Ambulance:</span> <a href="tel:108" className="text-red-400 font-bold">108</a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <AIFeatureConnector 
        features={[
          {
            title: "Healthcare Navigator",
            description: "If the local PHC is unequipped, use the AI navigator for higher tier hospitals.",
            icon: ActivitySquare,
            href: "/dashboard/healthcare-navigator",
            reason: "AI Insight: You might need to escalate to a district hospital or CHC.",
            color: "text-indigo-600",
            bg: "bg-indigo-100"
          },
          {
            title: "Medicine Finder",
            description: "Find local pharmacies if the PHC is out of stock.",
            icon: Pill,
            href: "/dashboard/medicines",
            reason: "AI Insight: Check alternative local pharmacies for prescribed drugs.",
            color: "text-emerald-600",
            bg: "bg-emerald-100"
          }
        ]}
      />

      <AIFloatingPanel 
        featureName="PHC Finder"
        context="You are an assistant helping users find Primary Health Centres (PHCs) and Community Health Centres (CHCs) in Telangana. You explain the difference between live OSM data and verified government data."
        quickPrompts={[
          "What is the difference between a PHC and a CHC?",
          "How accurate is the Live data?",
          "How do I call an ambulance?"
        ]}
      />
    </div>
  );
}
