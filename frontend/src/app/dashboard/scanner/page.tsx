'use client';

import { useState, useRef } from 'react';
import {
  Camera, Upload, Loader2, Pill, AlertTriangle, X, Search,
  Building2, ShieldAlert, Package, DollarSign, Thermometer,
  CheckCircle2, Info, ChevronRight, ScanLine, ImageIcon,
  RotateCcw, Stethoscope, FileWarning
} from 'lucide-react';
import HealthcareCTA from '@/components/HealthcareCTA';
import { useLanguage } from '@/context/LanguageContext';

interface ScanResult {
  identified: boolean;
  medicineName: string;
  genericName: string;
  manufacturer: string;
  composition: string;
  form: string;
  strength: string;
  packSize: string;
  mrp: string;
  uses: string[];
  sideEffects: string[];
  dosage: string;
  storage: string;
  warnings: string[];
  drugInteractions: string[];
  symptomsItTreats: string[];
  alternatives: { name: string; manufacturer: string; approxPrice: string }[];
  category: string;
  prescriptionRequired: boolean;
  description: string;
}

export default function MedicineScanner() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [datasetMatches, setDatasetMatches] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageData(dataUrl);
      setError('');
      setResult(null);
      setDatasetMatches([]);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // Dataset-first search helper
  const searchDataset = async (medicineName: string) => {
    try {
      const query = medicineName.split(' ')[0]; // Use first word for broader search
      const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}&limit=6`);
      const data = await res.json();
      setDatasetMatches(data.medicines || []);
    } catch {
      setDatasetMatches([]);
    }
  };

  const handleScan = async () => {
    if (!imageData) { setError('Please upload an image first.'); return; }

    setLoading(true);
    setError('');
    setResult(null);
    setDatasetMatches([]);

    try {
      const res = await fetch('/api/scan-medicine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, language }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan medicine');
      setResult(data);

      // Dataset-first: search our 253K dataset for this medicine
      if (data.medicineName) {
        await searchDataset(data.medicineName);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const resetScanner = () => {
    setImagePreview(null);
    setImageData(null);
    setResult(null);
    setDatasetMatches([]);
    setError('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-cyan-100 p-2.5 rounded-xl border border-cyan-200">
            <ScanLine className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('scannerTitle')}</h1>
            <p className="text-slate-500 font-medium">{t('scannerSubtitle')}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT: Image Upload */}
        <div className="space-y-5">
          {/* Upload Area */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
              <Camera className="h-5 w-5 text-cyan-600" /> Capture or Upload
            </h2>

            {!imagePreview ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center bg-slate-50 hover:bg-cyan-50 hover:border-cyan-300 transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="bg-cyan-100 p-4 rounded-full w-20 h-20 mx-auto mb-5 flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                  <ImageIcon className="h-10 w-10 text-cyan-500" />
                </div>
                <p className="text-slate-600 font-bold mb-2">Drop medicine image here</p>
                <p className="text-slate-400 text-sm mb-5">or click to browse • JPG, PNG up to 10MB</p>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
                  >
                    <Camera className="h-4 w-4" /> Take Photo
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 hover:border-cyan-300 text-slate-700 rounded-xl font-bold text-sm transition-all hover:-translate-y-0.5"
                  >
                    <Upload className="h-4 w-4" /> Upload Image
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img src={imagePreview} alt="Medicine" className="w-full h-64 object-contain rounded-2xl bg-slate-50 border border-slate-200" />
                <button onClick={resetScanner}
                  className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-xl shadow-md transition-all">
                  <RotateCcw className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            )}

            {/* Hidden inputs */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          </div>

          {/* Scan Button */}
          {imagePreview && (
            <button onClick={handleScan} disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Scanning with AI…</>
              ) : (
                <><ScanLine className="h-5 w-5" /> Scan Medicine</>
              )}
            </button>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-cyan-50 rounded-2xl p-5 border border-cyan-100">
            <h3 className="font-bold text-cyan-800 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" /> Tips for best results
            </h3>
            <ul className="space-y-2">
              {[
                'Take a clear, well-lit photo of the medicine packaging',
                'Include the front label showing the medicine name',
                'Avoid blurry or dark images',
                'Include composition details if visible on the strip',
              ].map((tip, i) => (
                <li key={i} className="text-sm text-cyan-700 flex items-start gap-2">
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* RIGHT: Scan Results */}
        <div className="space-y-5">
          {!result && !loading && (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-xl shadow-slate-200/40 text-center">
              <div className="bg-cyan-50 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <ScanLine className="h-12 w-12 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Scan Results</h3>
              <p className="text-slate-400 max-w-md mx-auto">
                Upload or capture a medicine image and click &quot;Scan Medicine&quot; to get complete AI-powered details.
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-xl shadow-slate-200/40 text-center">
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin"></div>
                <ScanLine className="h-8 w-8 text-cyan-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">Analyzing medicine…</h3>
              <p className="text-slate-400 text-sm">AI is identifying the medicine and gathering information</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              {/* Medicine Identity Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-100 rounded-xl">
                      <Pill className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-slate-900">{result.medicineName}</h3>
                      <p className="text-cyan-600 font-medium text-sm">{result.genericName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      result.prescriptionRequired
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}>
                      {result.prescriptionRequired ? '℞ Prescription' : 'OTC'}
                    </span>
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                      {result.category}
                    </span>
                  </div>
                </div>

                {result.description && (
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 mb-4">{result.description}</p>
                )}

                {/* Key Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-cyan-50 p-3 rounded-xl border border-cyan-100 text-center">
                    <p className="text-[10px] font-bold text-cyan-500 uppercase">Form</p>
                    <p className="text-sm font-bold text-cyan-700 capitalize">{result.form}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                    <p className="text-[10px] font-bold text-blue-500 uppercase">Strength</p>
                    <p className="text-sm font-bold text-blue-700">{result.strength}</p>
                  </div>
                  <div className="bg-violet-50 p-3 rounded-xl border border-violet-100 text-center">
                    <p className="text-[10px] font-bold text-violet-500 uppercase">Pack</p>
                    <p className="text-sm font-bold text-violet-700">{result.packSize}</p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase">MRP</p>
                    <p className="text-sm font-bold text-emerald-700">{result.mrp}</p>
                  </div>
                </div>
              </div>

              {/* Composition */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-cyan-600" /> Composition
                </h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{result.composition}</p>
              </div>

              {/* Manufacturer */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-cyan-600" /> Manufacturer
                </h4>
                <p className="text-sm text-slate-700 font-medium">{result.manufacturer}</p>
              </div>

              {/* Uses */}
              {result.uses?.length > 0 && (
                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                  <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Uses
                  </h4>
                  <ul className="space-y-1.5">
                    {result.uses.map((u, i) => (
                      <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /> {u}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Side Effects */}
              {result.sideEffects?.length > 0 && (
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
                  <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <FileWarning className="h-4 w-4" /> Side Effects
                  </h4>
                  <ul className="space-y-1.5">
                    {result.sideEffects.map((s, i) => (
                      <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dosage + Storage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Pill className="h-4 w-4 text-cyan-600" /> Dosage
                  </h4>
                  <p className="text-sm text-slate-600">{result.dosage}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-cyan-600" /> Storage
                  </h4>
                  <p className="text-sm text-slate-600">{result.storage}</p>
                </div>
              </div>

              {/* Warnings */}
              {result.warnings?.length > 0 && (
                <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100">
                  <h4 className="font-bold text-rose-800 mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Warnings
                  </h4>
                  <ul className="space-y-1.5">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-rose-700 flex items-start gap-2">
                        <ShieldAlert className="h-3 w-3 flex-shrink-0 mt-0.5" /> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Drug Interactions */}
              {result.drugInteractions?.length > 0 && (
                <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
                  <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Drug Interactions
                  </h4>
                  <ul className="space-y-1.5">
                    {result.drugInteractions.map((d, i) => (
                      <li key={i} className="text-sm text-purple-700 flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" /> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Symptoms It Treats */}
              {result.symptomsItTreats?.length > 0 && (
                <div className="bg-cyan-50 rounded-2xl p-5 border border-cyan-100">
                  <h4 className="font-bold text-cyan-800 mb-3 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" /> Symptoms It Treats
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.symptomsItTreats.map((s, i) => (
                      <span key={i} className="text-xs font-bold bg-cyan-100 text-cyan-700 px-3 py-1.5 rounded-full border border-cyan-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternatives */}
              {result.alternatives?.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4 text-cyan-600" /> Alternatives
                  </h4>
                  <div className="space-y-2">
                    {result.alternatives.map((alt, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{alt.name}</p>
                          <p className="text-xs text-slate-500">{alt.manufacturer}</p>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">{alt.approxPrice}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dataset Matches — Real Data */}
              {datasetMatches.length > 0 && (
                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                  <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Found in Our Database (253K+ Medicines)
                  </h4>
                  <div className="space-y-2">
                    {datasetMatches.map((m: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-100">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 line-clamp-1">{m.name}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{m.manufacturer}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          {m.price && <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded">₹{m.price}</span>}
                          <a href={`/dashboard/medicines?search=${encodeURIComponent(m.name)}`}
                            className="text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg transition-colors">
                            Order
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order CTA */}
              {result && (
                <a href={`/dashboard/medicines?search=${encodeURIComponent(result.medicineName)}`}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:-translate-y-0.5 transition-all">
                  <Pill className="h-5 w-5" /> Order This Medicine
                </a>
              )}

              {/* Disclaimer */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  AI-generated analysis. Verify with a pharmacist or doctor for accuracy.
                </p>
              </div>

              {/* Healthcare CTA — Loan & Nearby Hospitals */}
              <HealthcareCTA
                context={`For your scanned medicine: ${result.medicineName}`}
                condition={result.category}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
