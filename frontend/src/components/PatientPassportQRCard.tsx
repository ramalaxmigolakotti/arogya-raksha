'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield, QrCode, RefreshCw, Copy, Check, Download,
  Printer, User, Heart, Lock, KeyRound, Sparkles, CheckCircle2,
  AlertTriangle, Phone, MapPin, Eye, ExternalLink
} from 'lucide-react';
import {
  generateHealthPassportQR,
  regenerateConsentPin,
  getOrCreateConsentPin,
  HealthPassportPayload,
} from '@/lib/medicalPassportService';
import toast from 'react-hot-toast';

interface Props {
  userId: string;
  userProfile?: { name?: string; village?: string };
  medicalProfile?: any;
  className?: string;
}

export default function PatientPassportQRCard({
  userId,
  userProfile,
  medicalProfile,
  className = '',
}: Props) {
  const [passport, setPassport] = useState<{
    qrString: string;
    payload: HealthPassportPayload;
    consentPin: string;
  } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedAbha, setCopiedAbha] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const refreshPassport = () => {
    const data = generateHealthPassportQR(userId, userProfile, medicalProfile);
    setPassport(data);
  };

  useEffect(() => {
    refreshPassport();
    const handleUpdate = () => refreshPassport();
    window.addEventListener('arogya-pin-regenerated', handleUpdate);
    window.addEventListener('medicalProfileUpdated', handleUpdate);
    return () => {
      window.removeEventListener('arogya-pin-regenerated', handleUpdate);
      window.removeEventListener('medicalProfileUpdated', handleUpdate);
    };
  }, [userId, userProfile, medicalProfile]);

  const handleRegeneratePin = () => {
    setIsRegenerating(true);
    const newPinData = regenerateConsentPin(userId);
    refreshPassport();
    setTimeout(() => {
      setIsRegenerating(false);
      toast.success(`New 6-Digit Consent PIN generated: ${newPinData.pin}`);
    }, 400);
  };

  const copyToClipboard = (text: string, type: 'pin' | 'abha') => {
    navigator.clipboard.writeText(text).catch(() => {});
    if (type === 'pin') {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    } else {
      setCopiedAbha(true);
      setTimeout(() => setCopiedAbha(false), 2000);
    }
    toast.success(`Copied ${type.toUpperCase()} to clipboard!`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!passport) return null;

  const { payload, consentPin } = passport;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-4 md:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                ABDM VERIFIED
              </span>
              <span className="text-xs text-emerald-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Real-time 2FA Active
              </span>
            </div>
            <h3 className="font-extrabold text-base mt-0.5">Real-Time Medical QR Passport</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRegeneratePin}
            disabled={isRegenerating}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate Consent PIN</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white text-indigo-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print ID Card</span>
          </button>
        </div>
      </div>

      {/* Main High-Tech Digital Health ID Card */}
      <div
        ref={cardRef}
        className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 border border-indigo-500/30 shadow-2xl relative overflow-hidden space-y-6"
      >
        {/* Decorative glowing backdrops */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-lg text-lg">
              AR
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-indigo-300">
                National Health Authority • Ayushman Bharat Digital Mission
              </p>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white mt-0.5">
                Arogya Raksha Universal Health Passport
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Secure 2FA
            </span>
          </div>
        </div>

        {/* Card Body: QR Code + Patient Bio + 2FA PIN */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          {/* QR Code Container (Left) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center bg-white p-5 rounded-2xl shadow-xl text-center space-y-3">
            <div className="p-2 border-2 border-slate-900 rounded-xl bg-white">
              <QRCodeSVG
                value={passport.qrString}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                Scan via Doctor Scanner
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Encrypted Patient Payload v2.0
              </p>
            </div>
          </div>

          {/* Patient Details & Unique PIN (Right) */}
          <div className="md:col-span-8 space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono font-bold text-indigo-300">ABHA Number:</span>
                <span className="text-xs font-mono font-black text-white">{payload.abhaId}</span>
                <button
                  onClick={() => copyToClipboard(payload.abhaId, 'abha')}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-indigo-300"
                >
                  {copiedAbha ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white mt-1">
                {payload.patientName}
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                <span>📍 {payload.village}</span>
                <span>•</span>
                <span>Gender: {payload.gender}</span>
                <span>•</span>
                <span>DOB: {payload.dob}</span>
              </p>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-3 gap-3 bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Blood Group</span>
                <p className="text-lg font-black text-rose-400 mt-0.5">{payload.bloodGroup}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Emergency Contact</span>
                <p className="text-xs font-extrabold text-white mt-1 font-mono truncate">{payload.emergencyPhone}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Insurance ID</span>
                <p className="text-xs font-extrabold text-emerald-400 mt-1 font-mono">YSR-AAROGYASRI</p>
              </div>
            </div>

            {/* THE UNIQUE CONSENT PIN BOX (2-FACTOR ACCESS TRICK) */}
            <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 p-4 md:p-5 rounded-2xl border border-blue-400/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/30 flex items-center justify-center text-blue-300">
                    <KeyRound className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-200">
                      Unique Consent PIN (Required by Doctor)
                    </h4>
                    <p className="text-[10px] text-slate-300">
                      Doctor enters this 6-digit ID after scanning to unlock your medical dossier.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(consentPin, 'pin')}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                >
                  {copiedPin ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedPin ? 'Copied' : 'Copy PIN'}</span>
                </button>
              </div>

              {/* 6-Digit Display Cells */}
              <div className="flex items-center gap-2 pt-1">
                {consentPin.split('').map((digit, idx) => (
                  <div
                    key={idx}
                    className="w-10 h-12 rounded-xl bg-slate-950/80 border-2 border-blue-400/50 flex items-center justify-center text-xl font-black text-blue-300 shadow-inner"
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-blue-200/90 leading-relaxed font-medium">
                🔒 <strong>Privacy Guarantee:</strong> Scanning the QR code alone will <em>not</em> expose your records. 
                The doctor must type this unique 6-digit PIN into their scanner terminal to unlock your medical history.
              </p>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 pt-4 text-[10px] text-slate-400 relative z-10 font-mono">
          <div>ISSUED UNDER GOVT OF INDIA ABDM STANDARDS • ID: {payload.userId}</div>
          <div>TIMESTAMP: {new Date(payload.issuedAt).toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
}
