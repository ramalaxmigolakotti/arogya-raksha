'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  MessageSquare, Monitor, Users, Settings,
  ArrowLeft, Copy, CheckCircle2, Clock
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import Link from 'next/link';

export default function VideoCallPage() {
  const { t, language } = useLanguage();
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[70vh] text-slate-400">Loading video call…</div>}>
      <VideoCallContent />
    </Suspense>
  );
}

function VideoCallContent() {
  const searchParams = useSearchParams();
  const doctorName = searchParams.get('doctor') || 'Doctor';
  const doctorPhone = searchParams.get('phone') || '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callState, setCallState] = useState<'waiting' | 'connecting' | 'connected' | 'ended'>('waiting');
  const [callDuration, setCallDuration] = useState(0);
  const [roomId] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [copied, setCopied] = useState(false);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.log('Camera access denied or not available');
      }
    }
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'connected') {
      interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsMicOn(!isMicOn);
    }
  };

  const startCall = () => {
    setCallState('connecting');
    // Send room link via WhatsApp
    const msg = `🎥 Video Call Room\n\nRoom ID: ${roomId}\nDoctor: ${doctorName}\n\nJoin the video consultation now!`;
    window.open(`https://wa.me/91${doctorPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    setTimeout(() => setCallState('connected'), 3000);
  };

  const endCall = () => {
    setCallState('ended');
    stream?.getTracks().forEach(track => track.stop());
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (callState === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
          <PhoneOff className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-800">Call Ended</h2>
        <p className="text-slate-500">Duration: {formatDuration(callDuration)}</p>
        <div className="flex gap-4">
          <Link href="/dashboard/doctors" className="bg-slate-900 text-white font-bold px-8 py-3 rounded-2xl hover:bg-slate-800 transition-all">
            Back to Doctors
          </Link>
          <a href={`https://wa.me/91${doctorPhone}`} target="_blank" rel="noopener noreferrer"
            className="bg-[#25D366] text-white font-bold px-8 py-3 rounded-2xl hover:bg-[#20BD5A] transition-all flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Message on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/doctors" className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Video Consultation</h1>
            <p className="text-sm text-slate-500 font-medium">with {doctorName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyRoomId} className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            Room: {roomId}
          </button>
          {callState === 'connected' && (
            <div className="flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-xl">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-emerald-700">{formatDuration(callDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Video */}
        <div className="lg:col-span-3 relative bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl" style={{ minHeight: '500px' }}>
          {isVideoOn ? (
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover absolute inset-0" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <VideoOff className="h-10 w-10 text-slate-400" />
              </div>
              <p className="text-slate-400 font-bold">Camera Off</p>
            </div>
          )}

          {/* Status overlay */}
          {callState === 'waiting' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-10 text-center border border-white/20">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Video className="h-10 w-10 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Ready to Connect</h3>
                <p className="text-white/60 text-sm mb-6">Click start to begin video consultation with {doctorName}</p>
                <button onClick={startCall}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 flex items-center gap-3 mx-auto text-lg">
                  <Phone className="h-5 w-5" /> Start Call & Notify via WhatsApp
                </button>
              </div>
            </div>
          )}

          {callState === 'connecting' && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-10">
              <div className="w-20 h-20 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-6" />
              <h3 className="text-2xl font-black text-white mb-2">Connecting...</h3>
              <p className="text-white/60 text-sm">Waiting for {doctorName} to join</p>
            </div>
          )}

          {/* Doctor's small video (simulated) */}
          {callState === 'connected' && (
            <div className="absolute top-6 right-6 w-48 h-36 bg-slate-800 rounded-2xl border-2 border-white/20 shadow-xl overflow-hidden z-10">
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
              </div>
              <p className="absolute bottom-2 left-3 text-xs font-bold text-white/80">{doctorName}</p>
            </div>
          )}

          {/* Controls Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
            <button onClick={toggleMic}
              className={`p-4 rounded-2xl transition-all shadow-xl ${isMicOn ? 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30' : 'bg-red-500 text-white'}`}>
              {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </button>
            <button onClick={toggleVideo}
              className={`p-4 rounded-2xl transition-all shadow-xl ${isVideoOn ? 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30' : 'bg-red-500 text-white'}`}>
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </button>
            {callState === 'connected' && (
              <button onClick={endCall}
                className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all shadow-xl shadow-red-500/30 hover:scale-110">
                <PhoneOff className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Consultation Info</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Users className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-bold text-slate-700">{doctorName}</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold text-slate-700">Room: {roomId}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <a href={`https://wa.me/91${doctorPhone}`} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-100">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <span className="text-sm font-bold text-green-700">WhatsApp</span>
              </a>
              <a href={`tel:+91${doctorPhone}`}
                className="w-full flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-100">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-700">Call +91 {doctorPhone}</span>
              </a>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
            <p className="text-xs font-bold text-amber-700 leading-relaxed">
              💡 <strong>Tip:</strong> Share the Room ID with your doctor via WhatsApp so they can join the consultation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
