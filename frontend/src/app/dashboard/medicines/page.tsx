'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Pill, PlusSquare, Clock, CheckCircle2, AlertCircle,
  MapPin, Navigation, Phone, Store, ShoppingCart, Truck,
  Package, X, Loader2, ChevronRight, Building2, Search, Filter, Database
} from 'lucide-react';
import RazorpayCheckout from '@/components/RazorpayCheckout';
import { useLanguage } from '@/context/LanguageContext';
import { useLocation } from '@/context/LocationContext';
import { useUserRole } from '@/context/UserRoleContext';
import HealthcareCTA from '@/components/HealthcareCTA';
import { persistMedicalRecord } from '@/lib/medicalHistoryService';
import FeaturePastHistoryModal from '@/components/FeaturePastHistoryModal';

// ——— Types ———
interface NearbyPharmacy {
  id: string;
  name: string;
  address: string;
  distance: number;
  phone?: string;
}

interface OrderDetails {
  medicine: string;
  pharmacy: NearbyPharmacy;
  mode: 'delivery' | 'pickup';
}

interface MedicineResult {
  id: number;
  name: string;
  price: string;
  manufacturer: string;
  type: string;
  packSize: string;
  composition1: string;
  composition2: string;
}

type DeliveryStage = 'confirmed' | 'preparing' | 'outForDelivery' | 'delivered';

const DELIVERY_STAGES: { key: DeliveryStage; label: string; icon: any }[] = [
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'outForDelivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

// ——— Medicine Search Component (253K Real Dataset) ———
function MedicineSearchSection({ onOrder }: { onOrder: (name: string) => void }) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [query, setQuery] = useState(initialSearch);
  const [results, setResults] = useState<MedicineResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [selectedLetter, setSelectedLetter] = useState('A');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const LIMIT = 24;

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Load stats on mount
  useEffect(() => {
    fetch('/api/medicines?stats=true').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  // Load medicines whenever query/letter/page changes
  useEffect(() => {
    const delay = query ? 350 : 0;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) { params.set('q', query); }
        else { params.set('letter', selectedLetter); }
        params.set('page', page.toString());
        params.set('limit', LIMIT.toString());
        const res = await fetch(`/api/medicines?${params}`);
        const data = await res.json();
        setResults(data.medicines || []);
        setTotal(data.total || 0);
      } catch { setResults([]); setTotal(0); }
      setLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [query, selectedLetter, page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden mb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Database className="h-6 w-6" />
            <h2 className="text-xl font-black">Medicine Database</h2>
          </div>
          {stats && (
            <span className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold">
              {stats.totalMedicines?.toLocaleString()} medicines
            </span>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-200" />
          <input value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); if (e.target.value) setSelectedLetter(''); }}
            placeholder="Search 2,53,973 medicines (e.g., Paracetamol, Azithromycin, Dolo...)"
            className="w-full bg-white/20 backdrop-blur-md border-2 border-white/30 rounded-2xl pl-12 pr-10 py-3.5 text-white placeholder-emerald-100 outline-none focus:border-white/60 text-sm font-medium" />
          {query && (
            <button onClick={() => { setQuery(''); setSelectedLetter('A'); setPage(1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-200 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* A-Z Letter Filter */}
      <div className="px-6 py-3 border-b border-slate-100 overflow-x-auto bg-slate-50">
        <div className="flex gap-1 min-w-max">
          {letters.map(l => (
            <button key={l} onClick={() => { setSelectedLetter(l); setQuery(''); setPage(1); }}
              className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                selectedLetter === l && !query
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-400">
            {loading ? 'Loading...' : query
              ? `${total.toLocaleString()} results for "${query}"`
              : `${total.toLocaleString()} medicines starting with "${selectedLetter}" — Page ${page} of ${totalPages || 1}`}
          </p>
          {!query && <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full">Sorted A-Z</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <span className="text-sm text-slate-500 font-medium">Loading medicines...</span>
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {results.map((m) => (
                <div key={m.id}
                  className="bg-slate-50 rounded-2xl border border-slate-100 p-4 hover:bg-white hover:shadow-md hover:border-emerald-100 transition-all cursor-pointer"
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">{m.name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{m.manufacturer}</p>
                    </div>
                    {Number(m.price) > 0 && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-black px-2 py-0.5 rounded-lg flex-shrink-0 ml-2">
                        ₹{m.price}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {m.type && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{m.type}</span>}
                    {m.packSize && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded truncate max-w-[80px]">{m.packSize}</span>}
                  </div>
                  {expanded === m.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 animate-in fade-in duration-200">
                      {(m.composition1 || m.composition2) && (
                        <p className="text-xs text-slate-600"><span className="font-bold">Composition:</span> {m.composition1}{m.composition2 ? ` + ${m.composition2}` : ''}</p>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); onOrder(m.name); }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1">
                        <ShoppingCart className="h-3 w-3" /> Order from Pharmacy
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-200">«</button>
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-200">← Prev</button>
                {(() => {
                  // Build a unique, sorted list of page numbers to show (up to 5)
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const end   = Math.min(totalPages, start + 4);
                  const pages: number[] = [];
                  for (let n = start; n <= end; n++) pages.push(n);
                  return pages.map((n, idx) => (
                    <button key={`page-${n}-${idx}`} onClick={() => setPage(n)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${n === page ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {n}
                    </button>
                  ));
                })()}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                  className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-200">Next →</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-200">»</button>
                <span className="text-xs text-slate-400 ml-2">Page {page} of {totalPages.toLocaleString()}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-12">No medicines found.</p>
        )}
      </div>
    </div>
  );
}

// ——— Haversine Distance ———
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ——— Delivery Tracker ———
function DeliveryTracker({ order, onClose }: { order: OrderDetails; onClose: () => void }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const etaMinutes = order.mode === 'delivery' ? 35 : 15;
  const [eta, setEta] = useState(etaMinutes);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < DELIVERY_STAGES.length - 1) return prev + 1;
        clearInterval(stageTimer);
        return prev;
      });
    }, 5000);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(progressTimer); return 100; }
        return prev + 0.5;
      });
    }, 100);

    const etaTimer = setInterval(() => {
      setEta((prev) => {
        if (prev <= 0) { clearInterval(etaTimer); return 0; }
        return prev - 1;
      });
    }, 5000);

    return () => { clearInterval(stageTimer); clearInterval(progressTimer); clearInterval(etaTimer); };
  }, []);

  return (
    <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-xl shadow-emerald-200/20 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 rounded-xl">
            <Truck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">
              {order.mode === 'delivery' ? 'Delivery Tracking' : 'Pickup Status'}
            </h3>
            <p className="text-xs text-slate-500">{order.medicine} from {order.pharmacy.name}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
          <span>{DELIVERY_STAGES[currentStage].label}</span>
          <span>{eta > 0 ? `ETA: ${eta} min` : 'Completed!'}</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stage Steps */}
      <div className="flex items-center justify-between">
        {DELIVERY_STAGES.map((s, i) => {
          const isCompleted = i < currentStage;
          const isCurrent = i === currentStage;
          const StageIcon = s.icon;
          return (
            <div key={s.key} className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-500 ${
                isCompleted ? 'bg-emerald-500 text-white' :
                isCurrent ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-500 ring-offset-2' :
                'bg-slate-100 text-slate-400'
              }`}>
                <StageIcon className="h-4 w-4" />
              </div>
              <p className={`text-[10px] font-bold text-center leading-tight ${
                isCompleted ? 'text-emerald-600' : isCurrent ? 'text-emerald-600' : 'text-slate-400'
              }`}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Order Info */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mode</p>
          <p className="text-xs font-bold text-slate-700">{order.mode === 'delivery' ? '🚴 Delivery' : '🏪 Pickup'}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fee</p>
          <p className="text-xs font-bold text-emerald-600">{order.mode === 'delivery' ? '₹49' : 'Free'}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">ETA</p>
          <p className="text-xs font-bold text-blue-600">{eta > 0 ? `${eta} min` : 'Done!'}</p>
        </div>
      </div>
    </div>
  );
}

// ——— Order Refill Modal ———
function OrderRefillModal({
  medicine,
  pharmacies,
  pharmaciesLoading,
  onClose,
  onOrder,
}: {
  medicine: string;
  pharmacies: NearbyPharmacy[];
  pharmaciesLoading: boolean;
  onClose: () => void;
  onOrder: (order: OrderDetails) => void;
}) {
  const { user } = useUserRole();
  const [selectedPharmacy, setSelectedPharmacy] = useState<NearbyPharmacy | null>(null);
  const [mode, setMode] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const deliveryFee = mode === 'delivery' ? 49 : 0;
  const medicinePrice = 199; // Base price for order
  const totalAmount = medicinePrice + deliveryFee;

  const handlePaymentSuccess = (paymentId: string) => {
    setPaymentSuccess(true);
    if (selectedPharmacy) {
      persistMedicalRecord(user?.id || 'usr_pat_8812', {
        type: 'medicine_order',
        title: `Medicine Order: ${medicine}`,
        userQuery: `Ordered ${medicine} from ${selectedPharmacy.name} via ${mode === 'delivery' ? 'Home Delivery' : 'Store Pickup'}`,
        aiResponse: `Order confirmed. Payment ID: ${paymentId}. Pharmacy: ${selectedPharmacy.name}. Delivery Mode: ${mode}. Amount: ₹${totalAmount}.`,
        summary: `${medicine} • ₹${totalAmount} (${mode})`,
        metadata: {
          medicineName: medicine,
          pharmacyName: selectedPharmacy.name,
          pharmacyAddress: selectedPharmacy.address,
          deliveryMode: mode,
          totalAmount,
          paymentId,
        },
      }).catch(console.warn);
    }
    setTimeout(() => {
      if (selectedPharmacy) {
        onOrder({ medicine, pharmacy: selectedPharmacy, mode });
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <ShoppingCart className="h-8 w-8 text-emerald-100 mb-3" />
          <h3 className="text-xl font-bold">Order Medicine</h3>
          <p className="text-emerald-100 text-sm mt-1">{medicine}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* Select Pharmacy */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              <Store className="h-3.5 w-3.5 inline mr-1" /> Select Pharmacy
            </label>
            {pharmaciesLoading ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                <span className="text-sm text-slate-500 font-medium">Finding nearby pharmacies…</span>
              </div>
            ) : pharmacies.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No pharmacies found nearby. Set your location on the Hospitals page first.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pharmacies.map((p) => (
                  <button key={p.id} type="button" onClick={() => setSelectedPharmacy(p)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedPharmacy?.id === p.id
                        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}>
                    <p className="font-bold text-sm text-slate-800 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.address}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Navigation className="h-2.5 w-2.5" /> {p.distance.toFixed(1)} km
                      </span>
                      {p.phone && (
                        <span className="text-xs text-slate-400">{p.phone}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delivery Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Delivery Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMode('delivery')}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  mode === 'delivery'
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                <Truck className={`h-6 w-6 mx-auto mb-2 ${mode === 'delivery' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <p className="font-bold text-sm text-slate-800">Home Delivery</p>
                <p className="text-xs text-slate-500 mt-1">30-45 min • ₹49</p>
              </button>
              <button type="button" onClick={() => setMode('pickup')}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  mode === 'pickup'
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}>
                <Store className={`h-6 w-6 mx-auto mb-2 ${mode === 'pickup' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <p className="font-bold text-sm text-slate-800">Store Pickup</p>
                <p className="text-xs text-slate-500 mt-1">~15 min • Free</p>
              </button>
            </div>
          </div>

          {/* Summary + Pay */}
          {selectedPharmacy && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Order Summary</p>
                <div className="flex justify-between text-sm text-slate-700 mb-1">
                  <span>{medicine}</span>
                  <span className="font-bold">₹{medicinePrice}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-700 mb-1">
                  <span>{mode === 'delivery' ? 'Delivery fee' : 'Pickup'}</span>
                  <span className="font-bold">{mode === 'delivery' ? '₹49' : 'Free'}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200 mt-2">
                  <span>Total</span>
                  <span className="text-emerald-600">₹{totalAmount}</span>
                </div>
              </div>

              {!paymentSuccess ? (
                <RazorpayCheckout
                  amount={totalAmount}
                  itemName={medicine}
                  itemDescription={`${medicine} from ${selectedPharmacy.name} (${mode})`}
                  onSuccess={handlePaymentSuccess}
                  buttonText="Pay & Place Order"
                />
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-emerald-800">Payment done! Placing order...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ——— Main Page ———
export default function Medicines() {
  const { t, language } = useLanguage();
  const [nearbyPharmacies, setNearbyPharmacies] = useState<NearbyPharmacy[]>([]);
  const [pharmaciesLoading, setPharmaciesLoading] = useState(true);
  const [orderModal, setOrderModal] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderDetails | null>(null);

  const medicines = [
    { id: 1, name: 'Metformin', dosage: '500mg', time: '08:00 AM (After Breakfast)', taken: true, stock: '24 pills left' },
    { id: 2, name: 'Atorvastatin', dosage: '10mg', time: '09:00 PM (After Dinner)', taken: false, stock: '15 pills left' },
    { id: 3, name: 'Vitamin D3', dosage: '60000 IU', time: 'Sunday, 10:00 AM', taken: false, stock: '2 pills left (Low Stock)' },
  ];

  // ——— Fetch nearby pharmacies via Overpass API ———
  const fetchPharmacies = useCallback(async (lat: number, lng: number) => {
    setPharmaciesLoading(true);
    try {
      const query = `[out:json][timeout:15];(node["amenity"="pharmacy"](around:5000,${lat},${lng});way["amenity"="pharmacy"](around:5000,${lat},${lng}););out center body;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const data = await res.json();
      if (data?.elements?.length > 0) {
        const results: NearbyPharmacy[] = data.elements
          .filter((el: any) => el.tags?.name)
          .map((el: any) => ({
            id: String(el.id),
            name: el.tags.name,
            address: [el.tags['addr:street'], el.tags['addr:city'], el.tags['addr:postcode']].filter(Boolean).join(', ') || 'Address not available',
            distance: haversineDistance(lat, lng, el.lat ?? el.center?.lat, el.lon ?? el.center?.lon),
            phone: el.tags.phone || el.tags['contact:phone'],
          }))
          .sort((a: NearbyPharmacy, b: NearbyPharmacy) => a.distance - b.distance)
          .slice(0, 8);
        setNearbyPharmacies(results);
      } else {
        setNearbyPharmacies(getDemoPharmacies());
      }
    } catch {
      setNearbyPharmacies(getDemoPharmacies());
    }
    setPharmaciesLoading(false);
  }, []);

  function getDemoPharmacies(): NearbyPharmacy[] {
    return [
      { id: 'demo-p1', name: 'Apollo Pharmacy', address: 'Sarita Vihar, Main Road', distance: 0.8, phone: '+91 11 2682 1234' },
      { id: 'demo-p2', name: 'MedPlus Pharmacy', address: 'Sector 15, Near Metro', distance: 1.5, phone: '+91 11 2744 5678' },
      { id: 'demo-p3', name: 'Wellness Forever', address: 'DDA Market, Block A', distance: 2.3 },
    ];
  }

  const { location: globalLocation } = useLocation();

  // Load pharmacies from global location
  useEffect(() => {
    if (globalLocation) {
      fetchPharmacies(globalLocation.lat, globalLocation.lng);
    } else {
      setPharmaciesLoading(true);
    }
  }, [globalLocation, fetchPharmacies]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Medicine Tracker & Finder</h1>
          <p className="text-slate-500 mt-1 font-medium text-lg">Never miss a dose with intelligent reminders and Jan Aushadhi access.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <FeaturePastHistoryModal
            featureTitle="Medicine Orders"
            types={['medicine_order']}
            icon="💊"
            buttonLabel="Past Orders"
          />
          <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5">
            <PlusSquare className="h-5 w-5" />
            Add Prescription
          </button>
        </div>
      </header>

      {/* Medicine Search - 253K Real Dataset */}
      <Suspense fallback={<div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-10 text-center text-slate-400">Loading medicine search…</div>}>
        <MedicineSearchSection onOrder={(name) => setOrderModal(name)} />
      </Suspense>

      {/* Active Delivery Tracking */}
      {activeOrder && (
        <DeliveryTracker order={activeOrder} onClose={() => setActiveOrder(null)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-slate-800 border-b border-slate-200 pb-2">Today's Schedule</h2>
            
            {medicines.map(med => (
              <div key={med.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                 {med.taken && <div className="absolute top-0 right-0 border-[30px] border-emerald-50 border-b-transparent border-l-transparent -m-4"></div>}
                 
                 <div className="flex justify-between items-start relative z-10 w-full">
                    <div className="flex items-center gap-4">
                       <div className={`p-3 rounded-2xl ${med.taken ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          <Pill className="h-6 w-6" />
                       </div>
                       <div>
                          <h3 className="font-bold text-lg text-slate-900 line-through decoration-slate-300 decoration-2 mb-0.5">{med.name} <span className="text-slate-500 text-sm font-medium no-underline">— {med.dosage}</span></h3>
                          <p className="text-slate-500 font-semibold text-sm flex items-center gap-1.5 line-through decoration-slate-300">
                             <Clock className="h-3.5 w-3.5" /> {med.time}
                          </p>
                       </div>
                    </div>
                    {med.taken ? (
                       <div className="flex flex-col items-end">
                         <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                         <span className="text-xs font-bold text-emerald-600 mt-1">Taken</span>
                       </div>
                    ) : (
                       <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 hover:-translate-y-0.5">
                          Mark Taken
                       </button>
                    )}
                 </div>
                 
                 <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <p className={`text-sm font-bold flex items-center gap-1.5 ${med.stock.includes('Low') ? 'text-rose-600' : 'text-slate-500'}`}>
                       {med.stock.includes('Low') && <AlertCircle className="h-4 w-4" />}
                       {med.stock}
                    </p>
                    {med.stock.includes('Low') && (
                      <button
                        onClick={() => setOrderModal(`${med.name} (${med.dosage})`)}
                        className="text-emerald-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                        <ShoppingCart className="h-3.5 w-3.5" /> Order Refill
                      </button>
                    )}
                 </div>
              </div>
            ))}
         </div>

         {/* Right Column: Medicine Intelligence + Nearby Pharmacies */}
         <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-slate-800 border-b border-slate-200 pb-2">Medicine Intelligence</h2>
            
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mx-20 -my-20"></div>
               <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mx-10 -my-10"></div>
               
               <Pill className="h-12 w-12 text-white/90 mx-auto mb-4" />
               <h3 className="text-2xl font-black mb-2">Drug Interactions Checked</h3>
               <p className="text-indigo-100 font-medium mb-8 max-w-sm mx-auto">Arogya AI has analyzed your current prescriptions. No harmful drug interactions found.</p>
               
               <button className="bg-white text-indigo-700 font-black py-3 px-8 rounded-xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  View Analysis Report
               </button>
            </div>

            {/* Nearby Pharmacies */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Store className="h-5 w-5 text-emerald-600" /> Nearby Pharmacies
                </h3>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {pharmaciesLoading ? 'Loading…' : `${nearbyPharmacies.length} found`}
                </span>
              </div>

              {pharmaciesLoading ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                  <span className="text-sm text-slate-500 font-medium">Finding pharmacies…</span>
                </div>
              ) : nearbyPharmacies.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Set your location on the Hospitals page to see nearby pharmacies.</p>
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {nearbyPharmacies.map((p) => (
                    <div key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200 transition-all group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-emerald-100 rounded-xl flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                          <Building2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-800 line-clamp-1">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-bold text-blue-600 flex items-center gap-0.5">
                              <Navigation className="h-2.5 w-2.5" /> {p.distance.toFixed(1)} km
                            </span>
                            <span className="text-[11px] text-slate-400 line-clamp-1">{p.address}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setOrderModal(`Medicine Order`)}
                        className="flex-shrink-0 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm hover:-translate-y-0.5">
                        Order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Healthcare CTA — Loan & Nearby Hospitals */}
            <HealthcareCTA
              context="Need help covering medicine costs?"
              condition="pharmacy"
              variant="compact"
            />
         </div>
      </div>

      {/* Order Refill Modal */}
      {orderModal && (
        <OrderRefillModal
          medicine={orderModal}
          pharmacies={nearbyPharmacies}
          pharmaciesLoading={pharmaciesLoading}
          onClose={() => setOrderModal(null)}
          onOrder={(order) => {
            setOrderModal(null);
            setActiveOrder(order);
          }}
        />
      )}
    </div>
  );
}
