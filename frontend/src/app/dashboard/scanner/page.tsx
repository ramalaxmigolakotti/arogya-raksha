'use client';

import { useState, useRef, Suspense } from 'react';
import {
  Camera, Upload, Loader2, Pill, AlertTriangle, X, Search,
  Building2, ShieldAlert, Package, DollarSign, Thermometer,
  CheckCircle2, Info, ChevronRight, ScanLine, ImageIcon,
  RotateCcw, Stethoscope, FileWarning, QrCode, Shield
} from 'lucide-react';
import HealthcareCTA from '@/components/HealthcareCTA';
import { useLanguage } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';
import { persistMedicalRecord } from '@/lib/medicalHistoryService';
import FeaturePastHistoryModal from '@/components/FeaturePastHistoryModal';
import DoctorPatientQRScanner from '@/components/DoctorPatientQRScanner';
import { useSearchParams } from 'next/navigation';


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
  mechanismOfAction?: string;
  forensicAnalysis?: {
    isBlurry?: boolean;
    confidence?: string;
    forensicReconstructed?: boolean;
    detectedClues?: string[];
  };
}

// Client-side canvas image enhancement: unsharp masking + silver foil glare suppression
function enhanceMedicineImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(dataUrl); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }

        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;

        // Dynamic contrast expansion to pierce through shiny silver blister foil glare
        let minLum = 255;
        let maxLum = 0;
        for (let i = 0; i < d.length; i += 32) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }
        const range = Math.max(40, maxLum - minLum);

        for (let i = 0; i < d.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            let val = ((d[i + c] - minLum) / range) * 255;
            // Gamma curve: darken midtones slightly so faded stamped letters on silver foil stand out
            val = Math.pow(Math.max(0, Math.min(255, val)) / 255, 1.15) * 255;
            d[i + c] = Math.round(val);
          }
        }
        ctx.putImageData(imgData, 0, 0);

        // Sharpening layer pass (unsharp mask simulation)
        const sharpCanvas = document.createElement('canvas');
        sharpCanvas.width = width;
        sharpCanvas.height = height;
        const sctx = sharpCanvas.getContext('2d');
        if (sctx) {
          sctx.filter = 'contrast(125%) brightness(102%)';
          sctx.drawImage(canvas, 0, 0);
          resolve(sharpCanvas.toDataURL('image/jpeg', 0.90));
          return;
        }
        resolve(canvas.toDataURL('image/jpeg', 0.90));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function MedicineScanner() {
  const searchParams = useSearchParams();
  const [scannerType, setScannerType] = useState<'patient_qr' | 'medicine'>(() => {
    return searchParams?.get('mode') === 'patient_qr' ? 'patient_qr' : 'medicine';
  });
  const { user } = useUserRole();
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [showEnhanced, setShowEnhanced] = useState(true);
  const [enhancing, setEnhancing] = useState(false);
  const [manualClue, setManualClue] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [datasetMatches, setDatasetMatches] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<{medicine: string; risk: string; severity: 'mild'|'moderate'|'severe'}[]>([]);
  const [savedToProfile, setSavedToProfile] = useState(false);
  const [scanHistory, setScanHistory] = useState<{name: string; date: string}[]>(() => {
    try { return JSON.parse(localStorage.getItem('scanner_history') || '[]'); } catch { return []; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { t, language } = useLanguage();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setRawImage(dataUrl);
      setImagePreview(dataUrl);
      setImageData(dataUrl);
      setError('');
      setResult(null);
      setDatasetMatches([]);
      setEnhancing(true);

      try {
        const sharpened = await enhanceMedicineImage(dataUrl);
        setEnhancedImage(sharpened);
        if (autoEnhance) {
          setImagePreview(sharpened);
          setImageData(sharpened);
        }
      } catch {
        setEnhancedImage(dataUrl);
      } finally {
        setEnhancing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleEnhancement = () => {
    const nextState = !showEnhanced;
    setShowEnhanced(nextState);
    if (nextState && enhancedImage) {
      setImagePreview(enhancedImage);
      setImageData(enhancedImage);
    } else if (rawImage) {
      setImagePreview(rawImage);
      setImageData(rawImage);
    }
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
    const activeImage = (autoEnhance && enhancedImage) ? enhancedImage : (imageData || rawImage);
    if (!activeImage && !manualClue) {
      setError('Please upload an image or provide a clue first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setDatasetMatches([]);

    try {
      const res = await fetch('/api/scan-medicine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: activeImage,
          manualClue: manualClue.trim() || undefined,
          language
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan medicine');
      setResult(data);

      // Dataset-first: search our 253K dataset for this medicine
      if (data.medicineName) {
        await searchDataset(data.medicineName);
        checkInteractions(data.medicineName + ' ' + (data.genericName || ''));

        // Auto-persist scanned medicine to user's authenticated lifetime history
        persistMedicalRecord(user?.id || 'usr_pat_8812', {
          type: 'medicine_scan',
          title: `Medicine Scan: ${data.medicineName}`,
          userQuery: `Scanned image containing ${data.medicineName}${manualClue ? ` (Clue: ${manualClue})` : ''}`,
          aiResponse: `Composition: ${data.composition || 'Standard formulation'}. Form: ${data.form || 'Tablet'} (${data.strength || 'Standard'}). Dosage: ${data.dosage || 'As directed by physician'}.`,
          summary: `${data.medicineName} (${data.strength || data.form || 'Medicine'})`,
          metadata: {
            medicineName: data.medicineName,
            genericName: data.genericName,
            manufacturer: data.manufacturer,
            composition: data.composition,
            dosage: data.dosage,
            warnings: data.warnings || [],
            sideEffects: data.sideEffects || [],
            prescriptionRequired: data.prescriptionRequired,
            mrp: data.mrp,
          },
        }).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleTestSample = async (medName: string) => {
    setLoading(true);
    setError('');
    setResult(null);
    setDatasetMatches([]);
    setImagePreview(null);
    setImageData(null);

    try {
      const res = await fetch('/api/scan-medicine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineName: medName, language }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to scan medicine');
      setResult(data);

      if (data.medicineName) {
        await searchDataset(data.medicineName);
        checkInteractions(data.medicineName + ' ' + (data.genericName || ''));

        persistMedicalRecord(user?.id || 'usr_pat_8812', {
          type: 'medicine_scan',
          title: `Medicine Scan: ${data.medicineName}`,
          userQuery: `Sample scan containing ${data.medicineName}`,
          aiResponse: `Composition: ${data.composition || 'Standard formulation'}. Form: ${data.form || 'Tablet'} (${data.strength || 'Standard'}). Dosage: ${data.dosage || 'As directed by physician'}.`,
          summary: `${data.medicineName} (${data.strength || data.form || 'Medicine'})`,
          metadata: {
            medicineName: data.medicineName,
            genericName: data.genericName,
            manufacturer: data.manufacturer,
            composition: data.composition,
            dosage: data.dosage,
            warnings: data.warnings || [],
            sideEffects: data.sideEffects || [],
            prescriptionRequired: data.prescriptionRequired,
            mrp: data.mrp,
          },
        }).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const resetScanner = () => {
    setImagePreview(null);
    setImageData(null);
    setRawImage(null);
    setEnhancedImage(null);
    setManualClue('');
    setResult(null);
    setDatasetMatches([]);
    setInteractions([]);
    setSavedToProfile(false);
    setError('');
  };

  // Check drug interactions against user's saved medicines
  const checkInteractions = (identified: string) => {
    try {
      const userProfileKey = user?.id ? `arogya_medical_profile_${user.id}` : 'arogya_medical_profile';
      const profile = JSON.parse(localStorage.getItem(userProfileKey) || '{}');
      const currentMeds: string[] = profile?.current_medications || profile?.medications || [];
      if (!currentMeds.length) return;

      const knownInteractions: Record<string, {with: string; risk: string; severity: 'mild'|'moderate'|'severe'}[]> = {
        'paracetamol':  [{ with: 'Warfarin', risk: 'May increase bleeding risk', severity: 'moderate' }],
        'ibuprofen':    [{ with: 'Aspirin', risk: 'Increased GI bleed risk', severity: 'severe' }, { with: 'Warfarin', risk: 'Increased bleeding', severity: 'severe' }],
        'metformin':    [{ with: 'Alcohol', risk: 'Risk of lactic acidosis', severity: 'severe' }],
        'aspirin':      [{ with: 'Ibuprofen', risk: 'Reduced cardioprotective effect', severity: 'moderate' }],
        'amoxicillin':  [{ with: 'Warfarin', risk: 'May increase INR', severity: 'moderate' }],
      };

      const identifiedLower = identified.toLowerCase();
      const found: typeof interactions = [];

      for (const [drug, ixns] of Object.entries(knownInteractions)) {
        if (identifiedLower.includes(drug)) {
          for (const ixn of ixns) {
            if (currentMeds.some(m => m.toLowerCase().includes(ixn.with.toLowerCase()))) {
              found.push({ medicine: ixn.with, risk: ixn.risk, severity: ixn.severity });
            }
          }
        }
      }
      setInteractions(found);
    } catch {}
  };

  const saveToProfile = () => {
    if (!result) return;
    try {
      const userProfileKey = user?.id ? `arogya_medical_profile_${user.id}` : 'arogya_medical_profile';
      const raw = localStorage.getItem(userProfileKey) || '{}';
      const profile = JSON.parse(raw);
      const meds: string[] = profile.current_medications || [];
      if (!meds.includes(result.medicineName)) {
        meds.push(result.medicineName);
        profile.current_medications = meds;
        localStorage.setItem(userProfileKey, JSON.stringify(profile));
      }
      // Save to scan history
      const newEntry = { name: result.medicineName, date: new Date().toLocaleDateString() };
      const hist = [newEntry, ...scanHistory].slice(0, 10);
      setScanHistory(hist);
      localStorage.setItem('scanner_history', JSON.stringify(hist));
      setSavedToProfile(true);
    } catch {}
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 w-full pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-100 p-2.5 rounded-xl border border-cyan-200">
            <ScanLine className="h-6 w-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('scannerTitle')}</h1>
            <p className="text-slate-500 font-medium">{t('scannerSubtitle')}</p>
          </div>
        </div>
        <FeaturePastHistoryModal
          featureTitle="Medicine Scans"
          types={['medicine_scan']}
          icon="🔍"
          buttonLabel="Past Scans"
        />
      </header>

      {/* Scanner Domain Switcher */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl text-xs font-bold max-w-md mx-auto">
        <button
          onClick={() => setScannerType('patient_qr')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all ${
            scannerType === 'patient_qr'
              ? 'bg-white text-indigo-600 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="h-4 w-4" />
          <span>Patient Medical QR</span>
          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">2FA</span>
        </button>

        <button
          onClick={() => setScannerType('medicine')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all ${
            scannerType === 'medicine'
              ? 'bg-white text-blue-600 shadow-sm font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Pill className="h-4 w-4" />
          <span>Medicine Strip OCR</span>
        </button>
      </div>

      {scannerType === 'patient_qr' ? (
        <DoctorPatientQRScanner />
      ) : (
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

                <div className="mt-6 pt-4 border-t border-slate-200/80">
                  <p className="text-xs font-bold text-slate-500 mb-2.5">Or try an instant sample medicine:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      { name: 'Dolo 650', sub: 'Paracetamol' },
                      { name: 'Augmentin 625 Duo', sub: 'Amox + Clav' },
                      { name: 'Azithral 500', sub: 'Azithromycin' },
                      { name: 'Pantocid 40', sub: 'Pantoprazole' },
                      { name: 'Glycomet GP 1', sub: 'Metformin' },
                    ].map((s) => (
                      <button
                        key={s.name}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleTestSample(s.name); }}
                        className="px-3 py-1.5 bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-400 rounded-xl text-xs font-bold text-slate-700 hover:text-cyan-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>💊</span>
                        <span>{s.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
                  <img src={imagePreview} alt="Medicine" className="w-full h-64 object-contain bg-slate-950" />
                  
                  {/* Status overlay badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{enhancing ? 'Enhancing…' : (showEnhanced ? '⚡ Sharpened & De-Blurred' : 'Original Raw Photo')}</span>
                  </div>

                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    {enhancedImage && (
                      <button
                        type="button"
                        onClick={toggleEnhancement}
                        className="px-2.5 py-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1"
                        title="Toggle between Original photo and Sharpened de-blurred filter"
                      >
                        <span>{showEnhanced ? '👁️ View Raw' : '⚡ View Sharpened'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={resetScanner}
                      className="p-2 bg-white/90 hover:bg-white text-slate-700 rounded-xl shadow-md transition-all"
                      title="Reset and take new photo"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Optional Forensic Clue Input for difficult / reflective blister foil */}
                <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-900">
                    <span className="flex items-center gap-1.5">
                      <span>💡</span>
                      <span>Severe blur or reflective foil? (Optional)</span>
                    </span>
                    <span className="text-[10px] text-cyan-700 font-semibold bg-cyan-100 px-2 py-0.5 rounded-full">Forensic AI</span>
                  </div>
                  <p className="text-[11px] text-cyan-800">
                    If letters are faded or reflective, type 2–3 letters you can see on the strip to guide the AI:
                  </p>
                  <input
                    type="text"
                    value={manualClue}
                    onChange={(e) => setManualClue(e.target.value)}
                    placeholder="e.g. B29, Health OK, Dolo, 650, Duo, Pan-D…"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-cyan-300 rounded-xl text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-sm"
                  />
                </div>
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
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg">
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Forensic AI Analyzing & Reconstructing…</>
              ) : (
                <><ScanLine className="h-5 w-5" /> ⚡ Scan & Reconstruct Medicine</>
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

              {/* Drug Interaction Warning */}
              {interactions.length > 0 && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4">
                  <p className="font-bold text-rose-800 flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5" /> ⚠️ Drug Interaction Alert
                  </p>
                  {interactions.map((ix, i) => (
                    <div key={i} className="bg-white rounded-xl p-3 border border-rose-200 mb-2">
                      <p className="text-sm font-bold text-rose-700">With: {ix.medicine}</p>
                      <p className="text-xs text-rose-600">{ix.risk}</p>
                      <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-full mt-1 inline-block ${
                        ix.severity === 'severe' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>{ix.severity} risk</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add to Profile Button */}
              <button onClick={saveToProfile} disabled={savedToProfile}
                className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  savedToProfile
                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20'
                }`}>
                {savedToProfile
                  ? <><CheckCircle2 className="h-4 w-4" /> Added to My Medicines</>
                  : <><Package className="h-4 w-4" /> Add to My Medicines</>}
              </button>

              {/* Forensic Telemetry Card */}
              {result.forensicAnalysis && (
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 border border-indigo-500/30 shadow-md">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔬</span>
                      <div>
                        <p className="text-xs font-black tracking-wide uppercase text-indigo-300">Forensic Vision & Dataset Match</p>
                        <p className="text-[11px] text-slate-300">
                          {result.forensicAnalysis.forensicReconstructed || result.forensicAnalysis.isBlurry
                            ? 'Reconstructed through packaging blur & reflective silver blister foil'
                            : 'High-fidelity visual OCR & 253K Indian Medicines match'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      result.forensicAnalysis.confidence === 'high'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}>
                      {result.forensicAnalysis.confidence || 'Verified'}
                    </span>
                  </div>

                  {result.forensicAnalysis.detectedClues && result.forensicAnalysis.detectedClues.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-slate-400 font-bold">Detected Clues:</span>
                      {result.forensicAnalysis.detectedClues.map((clue, idx) => (
                        <span key={idx} className="text-[10px] bg-white/10 text-indigo-200 px-2 py-0.5 rounded-md font-medium">
                          ✓ {clue}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                  <Stethoscope className="h-4 w-4 text-cyan-600" /> Active Salt Composition
                </h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">{result.composition}</p>
              </div>

              {/* Mechanism of Action */}
              {result.mechanismOfAction && (
                <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-lg shadow-indigo-100/30">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-600" /> Mechanism of Action (How It Works)
                  </h4>
                  <p className="text-sm text-slate-600 bg-indigo-50/40 p-3.5 rounded-lg border border-indigo-100 leading-relaxed font-medium">
                    {result.mechanismOfAction}
                  </p>
                </div>
              )}

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
      )}
    </div>
  );
}
