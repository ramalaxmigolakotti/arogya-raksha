'use client';

import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import {
  Camera, Upload, KeyRound, ShieldCheck, Lock, AlertTriangle,
  User, Heart, Activity, FileText, Pill, Stethoscope, Phone,
  CheckCircle2, X, RefreshCw, Sparkles, ExternalLink, Printer,
  Eye, Search, Building2, Download
} from 'lucide-react';
import {
  HealthPassportPayload,
  FullPatientDossier,
  verifyDoctorAccessPin,
  getFullPatientDossier,
  generateHealthPassportQR,
} from '@/lib/medicalPassportService';
import toast from 'react-hot-toast';

interface Props {
  onPatientUnlocked?: (dossier: FullPatientDossier) => void;
  className?: string;
}

export default function DoctorPatientQRScanner({ onPatientUnlocked, className = '' }: Props) {
  const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'demo'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scanned QR state
  const [scannedPayload, setScannedPayload] = useState<HealthPassportPayload | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // 6-Digit PIN input state
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Unlocked Dossier state
  const [unlockedDossier, setUnlockedDossier] = useState<FullPatientDossier | null>(null);

  // Video & Canvas refs for camera scanning
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Camera start / stop
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setCameraActive(true);
        scanFrame();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. You can upload a QR image or use Quick Demo Scan.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Continuous frame scanning with jsQR
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          handleDetectedQR(code.data);
          stopCamera();
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDetectedQR(code.data);
          } else {
            toast.error('No valid QR code found in this image. Please try another image.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Process detected QR code payload
  const handleDetectedQR = (rawData: string) => {
    try {
      const parsed: HealthPassportPayload = JSON.parse(rawData);
      if (parsed.type === 'AROGYA_HEALTH_PASSPORT') {
        setScannedPayload(parsed);
        setPinDigits(['', '', '', '', '', '']);
        setUnlockedDossier(null);
        toast.success(`Patient QR Detected: ${parsed.patientName}`);
        // Focus first PIN input after brief delay
        setTimeout(() => {
          pinInputRefs.current[0]?.focus();
        }, 300);
      } else {
        toast.error('Scanned QR is not an Arogya Raksha Health Passport.');
      }
    } catch {
      toast.error('Could not decode QR payload. Ensure it is an Arogya Raksha Health Passport.');
    }
  };

  // Demo Scan Shortcut (Instant Simulation)
  const handleSimulateDemoScan = () => {
    const demoData = generateHealthPassportQR('usr_pat_8812');
    handleDetectedQR(demoData.qrString);
  };

  // PIN input handlers
  const handlePinChange = (idx: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of 6 digits
      const digits = value.replace(/[^0-9]/g, '').slice(0, 6).split('');
      const newDigits = [...pinDigits];
      digits.forEach((d, i) => {
        if (idx + i < 6) newDigits[idx + i] = d;
      });
      setPinDigits(newDigits);
      const nextFocus = Math.min(5, idx + digits.length);
      pinInputRefs.current[nextFocus]?.focus();
      return;
    }

    const digit = value.replace(/[^0-9]/g, '');
    const newDigits = [...pinDigits];
    newDigits[idx] = digit;
    setPinDigits(newDigits);

    // Auto-advance
    if (digit && idx < 5) {
      pinInputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[idx] && idx > 0) {
      pinInputRefs.current[idx - 1]?.focus();
    }
  };

  // Verify PIN and unlock full dossier
  const handleVerifyPin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!scannedPayload) return;

    const fullPin = pinDigits.join('');
    if (fullPin.length !== 6) {
      toast.error('Please enter the full 6-digit Consent PIN.');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      const result = verifyDoctorAccessPin(scannedPayload, fullPin);
      setIsVerifying(false);

      if (result.success) {
        toast.success('Patient Consent Verified! Access Granted.');
        const dossier = getFullPatientDossier(scannedPayload.userId);
        setUnlockedDossier(dossier);
        onPatientUnlocked?.(dossier);
      } else {
        toast.error(result.message);
      }
    }, 400);
  };

  const handleResetScan = () => {
    setScannedPayload(null);
    setUnlockedDossier(null);
    setPinDigits(['', '', '', '', '', '']);
    stopCamera();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── STEP 1: SCANNER INTERFACE (WHEN NO PATIENT UNLOCKED) ───────────── */}
      {!unlockedDossier && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Doctor Patient QR Passport Scanner
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Scan patient digital health card • 2-Factor Patient Consent Verification
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => { setScanMode('camera'); startCamera(); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${scanMode === 'camera' ? 'bg-white text-indigo-600 shadow-sm font-extrabold' : 'text-slate-600'}`}
              >
                Live Camera
              </button>
              <button
                onClick={() => { setScanMode('upload'); stopCamera(); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${scanMode === 'upload' ? 'bg-white text-indigo-600 shadow-sm font-extrabold' : 'text-slate-600'}`}
              >
                Upload Image
              </button>
              <button
                onClick={() => { setScanMode('demo'); stopCamera(); }}
                className={`px-3 py-1.5 rounded-lg transition-all ${scanMode === 'demo' ? 'bg-white text-indigo-600 shadow-sm font-extrabold' : 'text-slate-600'}`}
              >
                Quick Demo
              </button>
            </div>
          </div>

          {/* Scanner Viewport */}
          {!scannedPayload && (
            <div className="space-y-4">
              {scanMode === 'camera' && (
                <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video max-w-lg mx-auto flex flex-col items-center justify-center border border-slate-800 shadow-inner">
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scanning Overlay Reticle */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-56 h-56 border-2 border-indigo-400 rounded-3xl relative animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-xl" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-xl" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-xl" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-xl" />
                      </div>
                      <p className="absolute bottom-4 text-xs font-bold text-white bg-slate-900/80 px-3 py-1 rounded-full border border-white/20">
                        Align Patient QR Code within Frame
                      </p>
                    </div>
                  )}

                  {!cameraActive && (
                    <div className="p-6 text-center space-y-3">
                      <Camera className="h-10 w-10 text-slate-500 mx-auto" />
                      <div>
                        <p className="text-sm font-bold text-white">Camera is Ready</p>
                        <p className="text-xs text-slate-400 mt-0.5">Click below to activate your webcam or phone camera.</p>
                      </div>
                      <button
                        onClick={startCamera}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all"
                      >
                        Activate Scanner Camera
                      </button>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-x-4 bottom-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs text-center">
                      {cameraError}
                    </div>
                  )}
                </div>
              )}

              {scanMode === 'upload' && (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center max-w-lg mx-auto space-y-4 hover:border-indigo-500 transition-colors">
                  <Upload className="h-12 w-12 text-indigo-500 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Upload Patient Health QR Image</p>
                    <p className="text-xs text-slate-500 mt-1">Select PNG, JPG, or screenshot of patient health passport.</p>
                  </div>
                  <label className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all">
                    <span>Browse Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {scanMode === 'demo' && (
                <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-center max-w-lg mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-indigo-950">Quick One-Click Test Simulation</h4>
                    <p className="text-xs text-indigo-700 mt-1">
                      Simulate scanning the current logged-in patient&apos;s real-time QR passport without needing a second physical device.
                    </p>
                  </div>
                  <button
                    onClick={handleSimulateDemoScan}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all hover:scale-105"
                  >
                    Simulate Patient QR Scan (Rahul Sharma)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: THE UNIQUE ID / 2FA CONSENT CHALLENGE (THE TRICK!) ───── */}
          {scannedPayload && (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 md:p-7 border border-indigo-500/40 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                        QR Scanned Successfully
                      </span>
                      <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Locked by 2FA
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white mt-0.5">
                      {scannedPayload.patientName} ({scannedPayload.abhaId})
                    </h3>
                  </div>
                </div>

                <button
                  onClick={handleResetScan}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-lg text-xs font-bold transition-all self-start sm:self-auto"
                >
                  ✕ Cancel Scan
                </button>
              </div>

              {/* Security PIN Entry Box */}
              <div className="max-w-md mx-auto space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 mx-auto">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">Enter 6-Digit Patient Consent ID</h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    To comply with ABDM and patient privacy laws, ask the patient for the <strong>6-digit Unique Consent PIN</strong> displayed on their Medical Profile QR Card.
                  </p>
                </div>

                {/* 6 Digits Input Fields */}
                <form onSubmit={handleVerifyPin} className="space-y-4">
                  <div className="flex items-center justify-center gap-2.5">
                    {pinDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { pinInputRefs.current[idx] = el; }}
                        type="text"
                        maxLength={1}
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        className="w-12 h-14 rounded-2xl bg-white/10 border-2 border-indigo-400/50 text-center text-2xl font-black text-white outline-none focus:border-indigo-400 focus:bg-white/20 focus:ring-2 focus:ring-indigo-400/30 transition-all shadow-inner font-mono"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying || pinDigits.join('').length !== 6}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Verifying Patient Consent...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>Unlock Complete Medical Profile & History</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="text-[11px] text-slate-400">
                  Tip for testing: Look at the <strong>Health Passport QR</strong> tab on the patient&apos;s profile to find the 6-digit PIN.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: FULL UNLOCKED PATIENT MEDICAL DOSSIER & LIFETIME HISTORY ── */}
      {unlockedDossier && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          {/* Unlocked Top Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-emerald-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-lg">
                  ✓
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      CONSENT VERIFIED & UNLOCKED
                    </span>
                    <span className="text-xs text-emerald-300 font-mono">
                      {unlockedDossier.personal.abhaId}
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white mt-1">
                    {unlockedDossier.personal.fullName}
                  </h2>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    {unlockedDossier.personal.age} yrs • {unlockedDossier.personal.gender} • Blood Group: <strong className="text-rose-400 font-extrabold">{unlockedDossier.personal.bloodGroup}</strong> • 📍 {unlockedDossier.personal.village}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Dossier</span>
                </button>
                <button
                  onClick={handleResetScan}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Close & Lock
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-300">Blood Pressure</span>
                <p className="text-lg font-black text-white mt-0.5">
                  {unlockedDossier.vitals.bpSystolic}/{unlockedDossier.vitals.bpDiastolic} mmHg
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-300">Fasting Glucose</span>
                <p className="text-lg font-black text-amber-300 mt-0.5">
                  {unlockedDossier.vitals.sugarFasting} mg/dL
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-300">Pulse Rate</span>
                <p className="text-lg font-black text-emerald-300 mt-0.5">
                  {unlockedDossier.vitals.pulseRate} bpm
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-300">Lifetime Records</span>
                <p className="text-lg font-black text-indigo-300 mt-0.5">
                  {unlockedDossier.records.length} Saved Entries
                </p>
              </div>
            </div>
          </div>

          {/* Critical Medical Conditions & Drug Allergies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Drug Allergies Alert (CRITICAL) */}
            <div className="bg-white rounded-3xl p-6 border-2 border-rose-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-rose-600 border-b border-rose-100 pb-3">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-950">
                  Known Drug Allergies & Adverse Reactions
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {unlockedDossier.medical.allergies.map((allergy, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-black"
                  >
                    ⚠️ {allergy}
                  </span>
                ))}
              </div>
            </div>

            {/* Chronic Conditions */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-600 border-b border-slate-100 pb-3">
                <Heart className="h-5 w-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                  Diagnosed Chronic Health Conditions
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {unlockedDossier.medical.conditions.map((cond, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold"
                  >
                    • {cond}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Lifetime Medical History Timeline */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Patient Lifetime Medical History & Records ({unlockedDossier.records.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chronological consultation notes, digital prescriptions, and lab investigations.
                  </p>
                </div>
              </div>
            </div>

            {unlockedDossier.records.length > 0 ? (
              <div className="space-y-3">
                {unlockedDossier.records.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:bg-slate-100/70 transition-all text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase bg-indigo-100 text-indigo-800">
                          {rec.type.replace(/_/g, ' ')}
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm">{rec.title}</h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {new Date(rec.timestamp).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {rec.summary && (
                      <p className="text-slate-700 font-medium">{rec.summary}</p>
                    )}

                    {rec.aiResponse && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600">
                        <strong>Clinical Assessment:</strong> {rec.aiResponse}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                No past medical history records found for this patient ID yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
