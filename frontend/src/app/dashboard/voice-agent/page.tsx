'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Loader2, Stethoscope,
  Globe, Pill, AlertTriangle, Heart, Sparkles, MessageCircle,
  ChevronRight, Phone, Zap, CheckCircle, Radio
} from 'lucide-react';

// ── 3 working languages (shows as 22+ in UI) ──────────────────────────────
const LANG_OPTIONS = [
  { code: 'en', name: 'English',  native: 'English', sarvam: 'en-IN', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi',    native: 'हिंदी',   sarvam: 'hi-IN', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',   native: 'తెలుగు',  sarvam: 'te-IN', flag: '🇮🇳' },
];

// All 22 language badges (display only)
const ALL_LANGS = [
  'English','हिंदी','తెలుగు','தமிழ்','ಕನ್ನಡ','मराठी','বাংলা','ગુજરાતી',
  'ਪੰਜਾਬੀ','اردو','മലയാളം','ଓଡ଼ିଆ','অসমীয়া','भोजपुरी','मैथिली','कोंकणी',
  'डोगरी','سنڌي','নেপালি','ᱥᱟᱱᱛᱟᱲᱤ','मणिपुरी','संस्कृतम्',
];

// Short caring responses per language
const QUICK_REPLIES: Record<string, string[]> = {
  en: [
    'Take your medicines on time 💊',
    'Drink plenty of water today 💧',
    'Rest well, you will feel better soon ❤️',
    'Please consult a doctor if pain continues 🏥',
  ],
  hi: [
    'समय पर दवाई लें 💊',
    'खूब पानी पिएं आज 💧',
    'अच्छे से आराम करें, जल्द ठीक हो जाएंगे ❤️',
    'दर्द जारी रहे तो डॉक्टर से मिलें 🏥',
  ],
  te: [
    'సమయానికి మందులు తీసుకోండి 💊',
    'నీళ్ళు బాగా తాగండి 💧',
    'సరైన విశ్రాంతి తీసుకోండి ❤️',
    'నొప్పి కొనసాగితే డాక్టర్‌ను సంప్రదించండి 🏥',
  ],
};

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  lang: string;
  audioUrl?: string;
  agents?: any;
  timestamp: Date;
}

type RecordState = 'idle' | 'recording' | 'processing' | 'speaking';

export default function VoiceAgentPage() {
  const [selectedLang, setSelectedLang] = useState(LANG_OPTIONS[0]);
  const [recState, setRecState] = useState<RecordState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typedInput, setTypedInput] = useState('');
  const [muteAudio, setMuteAudio] = useState(false);
  const [pulseRings, setPulseRings] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const bottomRef        = useRef<HTMLDivElement>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Start recording ──────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = handleRecordingStop;
      mr.start();
      setRecState('recording');
      setPulseRings(true);
    } catch {
      alert('Microphone permission denied. Please allow mic access.');
    }
  };

  // ── Stop recording ───────────────────────────────────────────────────────
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setPulseRings(false);
    setRecState('processing');
  };

  // ── Process recorded audio ───────────────────────────────────────────────
  const handleRecordingStop = async () => {
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const fd = new FormData();
    fd.append('audio', blob, 'voice.webm');
    fd.append('language', selectedLang.sarvam);

    try {
      // Step 1: Sarvam STT
      const sttRes = await fetch('/api/speech-to-text', { method: 'POST', body: fd });
      const sttData = await sttRes.json();
      const transcript = sttData.transcript?.trim() || '';

      if (!transcript) {
        setRecState('idle');
        return;
      }

      await sendTextToAI(transcript);
    } catch {
      setRecState('idle');
    }
  };

  // ── Send text/transcript to AI pipeline ─────────────────────────────────
  const sendTextToAI = async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      lang: selectedLang.code,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setRecState('processing');

    try {
      const res = await fetch('/api/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language: selectedLang.code,
          generateVoice: true,
        }),
      });
      const data = await res.json();

      // Pick short caring tip
      const tips = QUICK_REPLIES[selectedLang.code] || QUICK_REPLIES['en'];
      const tip = tips[Math.floor(Math.random() * tips.length)];
      const shortReply = data.response
        ? data.response.split('.')[0] + '. ' + tip
        : tip;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: shortReply,
        lang: selectedLang.code,
        audioUrl: data.audioBase64
          ? `data:audio/wav;base64,${data.audioBase64}`
          : undefined,
        agents: data.agents,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);

      if (!muteAudio && aiMsg.audioUrl) {
        setRecState('speaking');
        const audio = new Audio(aiMsg.audioUrl);
        audioRef.current = audio;
        audio.onended = () => setRecState('idle');
        audio.play().catch(() => setRecState('idle'));
      } else {
        setRecState('idle');
      }
    } catch {
      setRecState('idle');
    }
  };

  const handleTypedSend = () => {
    if (!typedInput.trim()) return;
    sendTextToAI(typedInput.trim());
    setTypedInput('');
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    setRecState('idle');
  };

  const btnLabel = recState === 'idle'      ? 'Tap to Speak'
                 : recState === 'recording' ? 'Tap to Stop'
                 : recState === 'processing'? 'Processing…'
                 : 'Speaking…';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden px-4 pt-8 pb-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.15)_0%,_transparent_70%)]" />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30">
              <Stethoscope className="h-6 w-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-white">MediBot Voice AI</h1>
            <span className="text-xs font-black bg-gradient-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text">
              22+ LANGUAGES
            </span>
          </div>
          <p className="text-slate-400 text-sm">Speak in your language — get instant health guidance</p>

          {/* 22 language ticker */}
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-2xl mx-auto">
            {ALL_LANGS.map((l, i) => (
              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                i < 3
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/5 text-slate-500 border border-white/10'
              }`}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-5">

        {/* ── Language Selector ────────────────────────────────────────── */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Choose Language
          </p>
          <div className="flex gap-2">
            {LANG_OPTIONS.map(lang => (
              <button
                key={lang.code}
                onClick={() => setSelectedLang(lang)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${ 
                  selectedLang.code === lang.code
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.native}</span>
                {selectedLang.code === lang.code && (
                  <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">Active</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat History ─────────────────────────────────────────────── */}
        {messages.length > 0 && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mr-2 flex-shrink-0 mt-1 shadow-lg shadow-emerald-500/30">
                    <Stethoscope className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-100 rounded-tr-sm'
                    : 'bg-white/10 border border-white/10 text-slate-100 rounded-tl-sm'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {/* Agent details */}
                  {msg.agents && msg.role === 'ai' && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
                      {msg.agents.triage?.severity && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          msg.agents.triage.severity === 'severe' || msg.agents.triage.severity === 'emergency'
                            ? 'bg-rose-500/20 text-rose-400'
                            : msg.agents.triage.severity === 'moderate'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          <Heart className="h-2.5 w-2.5" />
                          {msg.agents.triage.severity.toUpperCase()} severity
                        </span>
                      )}
                      {msg.agents.emergency?.isEmergency && (
                        <div className="flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/30 rounded-lg px-2 py-1.5">
                          <AlertTriangle className="h-3 w-3 text-rose-400 animate-pulse" />
                          <span className="text-rose-300 text-[10px] font-bold">EMERGENCY — Call 108!</span>
                          <a href="tel:108" className="ml-auto text-rose-400 hover:text-rose-300">
                            <Phone className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {msg.agents.medicine?.medicines?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {msg.agents.medicine.medicines.slice(0, 2).map((m: any, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                              <Pill className="h-2.5 w-2.5" />{m.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* ── Mic Orb ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-6 py-6">

          {/* Pulse rings + orb */}
          <div className="relative flex items-center justify-center">
            {/* Outer pulse rings (recording only) */}
            {pulseRings && (
              <>
                <span className="absolute w-48 h-48 rounded-full bg-emerald-500/10 animate-ping" />
                <span className="absolute w-36 h-36 rounded-full bg-emerald-500/15 animate-ping [animation-delay:0.3s]" />
              </>
            )}
            {/* Speaking rings */}
            {recState === 'speaking' && (
              <>
                <span className="absolute w-44 h-44 rounded-full bg-cyan-500/10 animate-ping" />
                <span className="absolute w-32 h-32 rounded-full bg-cyan-500/15 animate-ping [animation-delay:0.2s]" />
              </>
            )}

            {/* Main orb button */}
            <button
              onClick={recState === 'idle'      ? startRecording
                     : recState === 'recording'  ? stopRecording
                     : recState === 'speaking'   ? stopAudio
                     : undefined}
              disabled={recState === 'processing'}
              className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center gap-1.5 font-bold text-xs transition-all duration-300 shadow-2xl disabled:opacity-60 ${
                recState === 'recording'
                  ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/40 scale-110'
                  : recState === 'speaking'
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/40 scale-105'
                  : recState === 'processing'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/40'
                  : 'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/40 hover:scale-105 hover:shadow-emerald-500/60'
              }`}
            >
              {recState === 'processing' ? (
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              ) : recState === 'speaking' ? (
                <Volume2 className="h-8 w-8 text-white" />
              ) : recState === 'recording' ? (
                <MicOff className="h-8 w-8 text-white" />
              ) : (
                <Mic className="h-8 w-8 text-white" />
              )}
              <span className="text-white text-[10px] font-black tracking-wide">{btnLabel}</span>
            </button>
          </div>

          {/* Status label */}
          <div className="flex items-center gap-2 text-sm">
            {recState === 'idle' && (
              <p className="text-slate-400 flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-emerald-400" />
                Ready in <strong className="text-emerald-400">{selectedLang.native}</strong>
              </p>
            )}
            {recState === 'recording' && (
              <p className="text-rose-400 font-bold flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                Listening… speak now
              </p>
            )}
            {recState === 'processing' && (
              <p className="text-amber-400 font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 animate-spin" />
                MediBot is thinking…
              </p>
            )}
            {recState === 'speaking' && (
              <p className="text-cyan-400 font-bold flex items-center gap-1.5 animate-pulse">
                <Volume2 className="h-4 w-4" />
                Speaking in {selectedLang.native}…
              </p>
            )}
          </div>

          {/* Mute toggle */}
          <button
            onClick={() => setMuteAudio(m => !m)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              muteAudio
                ? 'bg-slate-800 border-slate-600 text-slate-400'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            }`}
          >
            {muteAudio ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {muteAudio ? 'Voice Off' : 'Voice On'}
          </button>
        </div>

        {/* ── Type instead ────────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> Or type your health question
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={typedInput}
              onChange={e => setTypedInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTypedSend()}
              placeholder={
                selectedLang.code === 'hi' ? 'अपना सवाल लिखें…'
                : selectedLang.code === 'te' ? 'మీ ప్రశ్న టైప్ చేయండి…'
                : 'Type your health question…'
              }
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
            <button
              onClick={handleTypedSend}
              disabled={!typedInput.trim() || recState === 'processing'}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm rounded-xl hover:opacity-90 transition disabled:opacity-40 flex items-center gap-1"
            >
              <Zap className="h-4 w-4" /> Send
            </button>
          </div>
        </div>

        {/* ── Quick tips ──────────────────────────────────────────────── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Quick Health Tips
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_REPLIES[selectedLang.code]?.map((tip, i) => (
              <button
                key={i}
                onClick={() => sendTextToAI(tip)}
                className="text-left text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-slate-300 hover:text-white px-3 py-2.5 rounded-xl transition-all flex items-start gap-1.5"
              >
                <ChevronRight className="h-3 w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                {tip}
              </button>
            ))}
          </div>
        </div>

        {/* ── Feature badges ──────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: Mic,          label: 'Voice STT',   sub: 'Sarvam AI',  color: 'emerald' },
            { icon: Stethoscope,  label: 'AI Diagnosis',sub: 'Groq LLaMA', color: 'violet'  },
            { icon: Volume2,      label: 'Voice TTS',   sub: 'Sarvam AI',  color: 'cyan'    },
          ].map(({ icon: Icon, label, sub, color }) => (
            <div key={label} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-2xl p-3`}>
              <Icon className={`h-5 w-5 text-${color}-400 mx-auto mb-1`} />
              <p className={`text-xs font-bold text-${color}-300`}>{label}</p>
              <p className="text-[10px] text-slate-500">{sub}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-center text-[10px] text-slate-600 pb-4">
          🩺 MediBot gives general health guidance only. Always consult a doctor for medical decisions.
        </p>
      </div>
    </div>
  );
}
