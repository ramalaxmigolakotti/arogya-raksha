'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff,
  MessageSquare, Users, ArrowLeft, Copy, CheckCircle2, Clock,
  Send, Wifi, WifiOff, Share2
} from 'lucide-react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function VideoCallPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[70vh] text-slate-400">Loading…</div>}>
      <VideoCallContent />
    </Suspense>
  );
}

function VideoCallContent() {
  const searchParams = useSearchParams();
  const doctorName  = searchParams.get('doctor') || 'Doctor';
  const doctorPhone = searchParams.get('phone')  || '';

  /* ── Refs ───────────────────────────────────────────────────────────────── */
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const socketRef      = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  /* ── State ──────────────────────────────────────────────────────────────── */
  const [isVideoOn, setIsVideoOn]   = useState(true);
  const [isMicOn, setIsMicOn]       = useState(true);
  const [callState, setCallState]   = useState<'setup'|'waiting'|'connecting'|'connected'|'ended'>('setup');
  const [callDuration, setCallDuration] = useState(0);
  const [roomId]     = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [copied, setCopied]         = useState(false);
  const [isHost, setIsHost]         = useState(true);
  const [messages, setMessages]     = useState<{from: string; text: string; time: string}[]>([]);
  const [msgInput, setMsgInput]     = useState('');
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [cameraError, setCameraError] = useState('');

  /* ── Camera Setup ────────────────────────────────────────────────────────── */
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCallState('waiting');
      } catch {
        setCameraError('Camera/mic access denied. Please allow permissions and reload.');
        setCallState('waiting');
      }
    }
    startCamera();
    return () => localStreamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  /* ── Call timer ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (callState !== 'connected') return;
    const iv = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(iv);
  }, [callState]);

  /* ── WebRTC + Socket.IO Signaling ────────────────────────────────────────── */
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Remote stream → video element
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setRemoteConnected(true);
      setCallState('connected');
    };

    // ICE candidates → send to peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setRemoteConnected(false);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [roomId]);

  const startCall = useCallback(async () => {
    setCallState('connecting');
    setIsHost(true);

    // Connect to backend Socket.IO
    const socket = io(BACKEND, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('webrtc:join', { roomId, name: 'Patient' });

    // When another peer joins → create offer
    socket.on('webrtc:peer-joined', async () => {
      const pc = createPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { roomId, offer });
    });

    // Receive answer
    socket.on('webrtc:answer', async ({ answer }: any) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Receive ICE candidates
    socket.on('webrtc:ice-candidate', async ({ candidate }: any) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    // Receive offer (if joining existing room)
    socket.on('webrtc:offer', async ({ offer }: any) => {
      const pc = createPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { roomId, answer });
    });

    // Chat messages
    socket.on('webrtc:chat', (msg: any) => {
      setMessages(prev => [...prev, { from: msg.from, text: msg.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    });

    socket.on('webrtc:peer-left', () => {
      setRemoteConnected(false);
      setMessages(prev => [...prev, { from: 'System', text: '👋 Doctor has left the call', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    });

    // Notify doctor via WhatsApp with join link
    const joinUrl = `${window.location.origin}/dashboard/video-call?room=${roomId}&join=1&doctor=${encodeURIComponent(doctorName)}`;
    const msg = `🎥 *Video Consultation Request*\n\nHello ${doctorName},\nYour patient is waiting for a video consultation.\n\n🔗 Join Link: ${joinUrl}\n📋 Room ID: ${roomId}\n\nPlease click the link to join.`;
    window.open(`https://wa.me/91${doctorPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  }, [roomId, doctorName, doctorPhone, createPeerConnection]);

  const endCall = () => {
    pcRef.current?.close();
    socketRef.current?.emit('webrtc:leave', { roomId });
    socketRef.current?.disconnect();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    setCallState('ended');
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoOn(v => !v);
  };
  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMicOn(m => !m);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendMessage = () => {
    if (!msgInput.trim() || !socketRef.current) return;
    const msg = { from: 'You', text: msgInput.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, msg]);
    socketRef.current.emit('webrtc:chat', { roomId, from: 'Patient', text: msgInput.trim() });
    setMsgInput('');
  };

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  /* ── Call Ended Screen ─────────────────────────────────────────────────── */
  if (callState === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center">
          <PhoneOff className="h-12 w-12 text-rose-500" />
        </div>
        <h2 className="text-3xl font-black text-slate-800">Call Ended</h2>
        <p className="text-slate-500">Duration: {fmt(callDuration)}</p>
        <div className="flex gap-4">
          <Link href="/dashboard/doctors" className="bg-slate-900 text-white font-bold px-8 py-3 rounded-2xl hover:bg-slate-800 transition-all">
            Back to Doctors
          </Link>
          {doctorPhone && (
            <a href={`https://wa.me/91${doctorPhone}`} target="_blank" rel="noopener noreferrer"
              className="bg-[#25D366] text-white font-bold px-8 py-3 rounded-2xl hover:bg-[#20BD5A] transition-all flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Message Doctor
            </a>
          )}
        </div>
      </div>
    );
  }

  /* ── Main UI ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12">
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
              <span className="text-sm font-bold text-emerald-700">{fmt(callDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Camera Error */}
      {cameraError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <WifiOff className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-amber-700 font-medium text-sm">{cameraError}</p>
        </div>
      )}

      {/* Video + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Video Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl" style={{ minHeight: '480px' }}>

            {/* Remote Video (doctor) */}
            <video ref={remoteVideoRef} autoPlay playsInline
              className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-300 ${remoteConnected ? 'opacity-100' : 'opacity-0'}`} />

            {/* Waiting overlay */}
            {!remoteConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
                {callState === 'waiting' && (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Video className="h-10 w-10 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">Ready to Connect</h3>
                    <p className="text-white/50 text-sm mb-8">Click &quot;Start Call&quot; to notify {doctorName} via WhatsApp</p>
                    <button onClick={startCall}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 flex items-center gap-3 mx-auto">
                      <Phone className="h-5 w-5" /> Start Call
                    </button>
                  </div>
                )}
                {callState === 'connecting' && (
                  <div className="text-center">
                    <div className="w-20 h-20 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <h3 className="text-xl font-black text-white mb-2">Waiting for {doctorName}…</h3>
                    <p className="text-white/50 text-sm">Notification sent via WhatsApp. Room: <strong className="text-white">{roomId}</strong></p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Wifi className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs text-emerald-400 font-medium">WebRTC signaling active</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Local video (self preview — bottom right) */}
            <div className="absolute bottom-6 right-6 w-40 h-28 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl z-10 bg-slate-800">
              {isVideoOn
                ? <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><VideoOff className="h-6 w-6 text-slate-400" /></div>
              }
              <span className="absolute bottom-1.5 left-2 text-xs font-bold text-white/80">You</span>
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
              <button onClick={toggleMic}
                className={`p-4 rounded-2xl transition-all shadow-xl ${isMicOn ? 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30' : 'bg-rose-500 text-white'}`}>
                {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
              </button>
              <button onClick={toggleVideo}
                className={`p-4 rounded-2xl transition-all shadow-xl ${isVideoOn ? 'bg-white/20 backdrop-blur-md text-white hover:bg-white/30' : 'bg-rose-500 text-white'}`}>
                {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </button>
              {(callState === 'connecting' || callState === 'connected') && (
                <button onClick={endCall} className="p-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl transition-all shadow-xl shadow-rose-500/30 hover:scale-110">
                  <PhoneOff className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-md">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Session Info</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                <Users className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-bold text-slate-700">{doctorName}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold text-slate-700">Room: {roomId}</span>
              </div>
              <div className={`flex items-center gap-2 p-2.5 rounded-xl ${remoteConnected ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                {remoteConnected ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-slate-400" />}
                <span className={`text-sm font-bold ${remoteConnected ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {remoteConnected ? 'Connected' : 'Waiting…'}
                </span>
              </div>
            </div>
          </div>

          {/* Live Chat */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-md flex flex-col" style={{ height: '280px' }}>
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" /> Chat
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-xs text-slate-400 text-center mt-4">Chat messages will appear here</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`text-xs rounded-xl p-2.5 ${m.from === 'You' ? 'bg-emerald-50 text-emerald-800 ml-4' : m.from === 'System' ? 'bg-slate-100 text-slate-500 text-center' : 'bg-blue-50 text-blue-800 mr-4'}`}>
                  {m.from !== 'System' && <p className="font-bold mb-0.5">{m.from}</p>}
                  <p>{m.text}</p>
                  <p className="text-[10px] opacity-60 mt-0.5 text-right">{m.time}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-100 flex gap-2">
              <input
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message…"
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-emerald-400"
              />
              <button onClick={sendMessage} disabled={!msgInput.trim()}
                className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40">
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Share link */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Share join link
            </p>
            <p className="text-xs text-indigo-600">
              Room <strong>{roomId}</strong> — Doctor joins using the WhatsApp link or by entering the Room ID.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
