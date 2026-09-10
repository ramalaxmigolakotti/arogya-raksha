"use client";
// ============================================================
// AROGYA RAKSHA — ORCHESTRATED MULTIMODAL AGENTIC AI ASSISTANT
// Multilingual Voice & Text AI with Human-in-the-Loop Permission Gates,
// Dynamic Model Complexity Selection, & Automatic Profile Pre-filling
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

// ─── SUPPORTED INDIAN & GLOBAL LANGUAGES ─────────────────────
const LANGUAGES = {
  en: { name: "English", flag: "🇬🇧", sarvam: "en-IN" },
  te: { name: "తెలుగు", flag: "🇮🇳", sarvam: "te-IN" },
  hi: { name: "हिंदी", flag: "🇮🇳", sarvam: "hi-IN" },
  ta: { name: "தமிழ்", flag: "🇮🇳", sarvam: "ta-IN" },
  kn: { name: "ಕನ್ನಡ", flag: "🇮🇳", sarvam: "kn-IN" },
  mr: { name: "मराठी", flag: "🇮🇳", sarvam: "mr-IN" },
  bn: { name: "বাংলা", flag: "🇮🇳", sarvam: "bn-IN" },
  gu: { name: "ગુજરાતી", flag: "🇮🇳", sarvam: "gu-IN" },
  pa: { name: "ਪੰਜਾਬੀ", flag: "🇮🇳", sarvam: "pa-IN" },
  or: { name: "ଓଡ଼ିଆ", flag: "🇮🇳", sarvam: "od-IN" },
  ml: { name: "മലയാളം", flag: "🇮🇳", sarvam: "ml-IN" },
  bho: { name: "भोजपुरी", flag: "🇮🇳", sarvam: "hi-IN" },
};

const QUICK_ACTIONS_I18N = {
  en: [
    { icon: "🧬", label: "Check Diabetes Risk", query: "Pre-fill my risk predictor for diabetes using my saved vitals" },
    { icon: "🩺", label: "Check Symptoms", query: "Pre-fill symptom checker with my vitals for headache and fever" },
    { icon: "📅", label: "Book Appointment", query: "I want to book an appointment with Dr. Sarah Jenkins" },
    { icon: "💊", label: "Order Dolo 650", query: "Order 1 strip of Dolo 650 to my address" },
    { icon: "🏥", label: "Find Hospitals", query: "Find emergency hospitals near me" },
    { icon: "📋", label: "My Medical Profile", query: "Open my medical profile" },
    { icon: "🛏️", label: "Hospital Admin Beds", query: "Navigate to hospital admin bed allocation" },
    { icon: "🧠", label: "Health Quiz", query: "Let's start a health quiz" },
  ],
  hi: [
    { icon: "🧬", label: "मधुमेह जोखिम जाँच", query: "मेरे सहेजे गए प्रोफाइल से मधुमेह जोखिम कैलकुलेटर भरें" },
    { icon: "🩺", label: "लक्षण जाँचें", query: "सिरदर्द और बुखार के लिए मेरे लक्षणों की जाँच करें" },
    { icon: "📅", label: "अपॉइंटमेंट बुक करें", query: "डॉ. सारा जेनकिंस के साथ अपॉइंटमेंट बुक करना चाहता हूँ" },
    { icon: "💊", label: "डोलो 650 मंगाएं", query: "मेरे पते पर डोलो 650 की 1 स्ट्रिप ऑर्डर करें" },
    { icon: "🏥", label: "नज़दीकी अस्पताल", query: "मेरे पास के आपातकालीन अस्पताल खोजें" },
    { icon: "📋", label: "मेरा मेडिकल प्रोफाइल", query: "मेरा मेडिकल प्रोफाइल खोलें" },
    { icon: "🧠", label: "स्वास्थ्य क्विज़", query: "स्वास्थ्य क्विज़ शुरू करें" },
  ],
  te: [
    { icon: "🧬", label: "డయాబెటిస్ రిస్క్", query: "నా సేవ్ చేసిన వైటల్స్‌తో డయాబెటిస్ రిస్క్ ప్రిడిక్టర్ నింపండి" },
    { icon: "🩺", label: "లక్షణాలు చూడండి", query: "నా తలనొప్పి మరియు జ్వరం లక్షణాలను పరీక్షించండి" },
    { icon: "📅", label: "అపాయింట్‌మెంట్", query: "డాక్టర్ సారా జెంకిన్స్‌తో అపాయింట్‌మెంట్ బుక్ చేయండి" },
    { icon: "💊", label: "డోలో 650 ఆర్డర్", query: "నా చిరునామాకు డోలో 650 ఆర్డర్ చేయండి" },
    { icon: "🏥", label: "సమీప ఆస్పత్రులు", query: "నాకు సమీపంలో ఎమర్జెన్సీ ఆస్పత్రులు కనుగొనండి" },
    { icon: "📋", label: "నా ప్రొఫైల్", query: "నా మెడికల్ ప్రొఫైల్ తెరవండి" },
  ],
  kn: [
    { icon: "🧬", label: "ಮಧುಮೇಹ ಅಪಾಯ", query: "ನನ್ನ ಸೇವ್ ಮಾಡಿದ ವೈಟಲ್ಸ್‌ನೊಂದಿಗೆ ಮಧುಮೇಹ ರಿಸ್ಕ್ ಪರೀಕ್ಷಿಸಿ" },
    { icon: "🩺", label: "ಲಕ್ಷಣ ಪರೀಕ್ಷೆ", query: "ಜ್ವರ ಮತ್ತು ತಲೆನೋವಿಗೆ ಲಕ್ಷಣ ಪರೀಕ್ಷೆ ನಡೆಸಿ" },
    { icon: "📅", label: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್", query: "ವೈದ್ಯರ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ" },
    { icon: "🏥", label: "ಆಸ್ಪತ್ರೆಗಳು", query: "ಹತ್ತಿರದ ತುರ್ತು ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಿ" },
  ],
  ta: [
    { icon: "🧬", label: "நீரிழிவு ஆபத்து", query: "என் மருத்துவ சுயவிவரத்தின் மூலம் நீரிழிவு அபாயத்தை சோதிக்கவும்" },
    { icon: "🩺", label: "அறிகுறி சோதனை", query: "என் அறிகுறிகளை பரிசோதிக்கவும்" },
    { icon: "📅", label: "சந்திப்பு பதிவு", query: "மருத்துவர் சந்திப்பை பதிவு செய்யவும்" },
    { icon: "🏥", label: "மருத்துவமனைகள்", query: "அருகிலுள்ள அவசர மருத்துவமனைகளை கண்டறியவும்" },
  ],
};

const WELCOME_MESSAGES = {
  en: (name) => `👋 Hello ${name}! I'm **MediBot**, your Autonomous Multimodal Healthcare Agent.\n\n🛡️ **Human-in-the-loop Guardrails**: I always ask for your permission before booking appointments or ordering medicine.\n⚡ **Live Model Routing**: I dynamically invoke specialized AI models based on clinical complexity.\n📋 **Automatic Pre-fill**: I use your saved vitals and chronic conditions automatically.\n\nAsk me anything in any Indian language, or tap a quick action below! 👇`,
  hi: (name) => `👋 नमस्ते ${name}! मैं **MediBot** हूँ, आपका स्वायत्त AI मेडिकल एजेंट।\n\n🛡️ **सहमति सुरक्षा**: अपॉइंटमेंट बुक करने या दवा ऑर्डर करने से पहले मैं हमेशा आपकी अनुमति लेता हूँ।\n📋 **ऑटो प्री-फिल**: आपके बीपी, मधुमेह और वाइटल्स सीधे आपके प्रोफाइल से इस्तेमाल होते हैं।\n\nबोलें या नीचे कोई विकल्प चुनें! 👇`,
  te: (name) => `👋 నమస్కారం ${name}! నేను **MediBot**, మీ అటానమస్ ఏజెంటిక్ AI వైద్య సహాయకుడిని.\n\n🛡️ **అనుమతి భద్రత**: అపాయింట్‌మెంట్ బుకింగ్ లేదా మందుల ఆర్డర్ చేసేముందు మీ అనుమతి అడుగుతాను.\n📋 **ఆటో ప్రీ-ఫిల్**: మీ ప్రొఫైల్ వైటల్స్ నేరుగా పరీక్షలకు అనుసంధానించబడతాయి.\n\nమాట్లాడండి లేదా కింద ఉన్న ఎంపికలను ఎంచుకోండి! 👇`,
  kn: (name) => `👋 ನಮಸ್ಕಾರ ${name}! ನಾನು **MediBot**, ನಿಮ್ಮ ಸ್ವಾಯತ್ತ AI ವೈದ್ಯಕೀಯ ಸಹಾಯಕ. ಯಾವುದೇ ಅನುಮತಿ ಅಗತ್ಯವಿದ್ದಾಗ ನಾನು ಮೊದಲು ನಿಮ್ಮನ್ನು ಕೇಳುತ್ತೇನೆ. ಕೆಳಗಿನ ಆಯ್ಕೆಗಳನ್ನು ಬಳಸಿ! 👇`,
  ta: (name) => `👋 வணக்கம் ${name}! நான் **MediBot**, உங்கள் AI மருத்துவ முகவர். மருத்துவ சந்திப்புகள் அல்லது மருந்து ஆர்டருக்கு முன் உங்கள் ஒப்புதல் பெறுவேன்! 👇`,
  mr: (name) => `👋 नमस्कार ${name}! मी **MediBot** आहे. अपॉइंटमेंट व औषध मागवण्यापूर्वी मी नेहमी तुमची संमती घेतो. विचारा! 👇`,
  bn: (name) => `👋 নমস্কার ${name}! আমি **MediBot**। বুকিং বা ওষুধ অর্ডারের আগে সর্বদা আপনার সম্মতি নেওয়া হবে। নিচে নির্বাচন করুন! 👇`,
  gu: (name) => `👋 નમસ્તે ${name}! હું **MediBot** છું, તમારો AI હેલ્થકેર એજન્ટ. હું હંમેશા તમારી મંજૂરી માંગીને કામ કરું છું. 👇`,
};

// ─── MODERN CSS STYLES ───────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .medibot-container * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }

  .medibot-fab {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    width: 62px; height: 62px; border-radius: 50%;
    background: linear-gradient(135deg, #00c896, #0095f6);
    border: none; cursor: pointer; box-shadow: 0 6px 28px rgba(0,200,150,0.45);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    animation: fabPulse 3s infinite;
  }
  .medibot-fab:hover { transform: scale(1.08); box-shadow: 0 8px 36px rgba(0,200,150,0.65); }
  .medibot-fab.open { transform: rotate(45deg) scale(0.92); background: linear-gradient(135deg, #ff4b6e, #ff6b35); }

  @keyframes fabPulse {
    0%,100% { box-shadow: 0 4px 24px rgba(0,200,150,0.45); }
    50% { box-shadow: 0 4px 32px rgba(0,200,150,0.75), 0 0 0 8px rgba(0,200,150,0.12); }
  }

  .medibot-panel {
    position: fixed; bottom: 105px; right: 28px; z-index: 9998;
    width: 440px; height: 660px; max-height: calc(100vh - 120px);
    background: #090d16; border-radius: 24px;
    border: 1px solid rgba(0,200,150,0.25);
    box-shadow: 0 24px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,200,150,0.15);
    display: flex; flex-direction: column; overflow: hidden;
    transform-origin: bottom right;
    animation: panelIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }

  @media (max-width: 600px) {
    .medibot-fab { bottom: 20px; right: 16px; width: 56px; height: 56px; }
    .medibot-panel {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      width: 100% !important; height: 100% !important; max-height: 100vh !important;
      border-radius: 0 !important; border: none;
    }
  }

  @keyframes panelIn {
    from { transform: scale(0.85) translateY(20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  .medibot-header {
    padding: 14px 18px;
    background: linear-gradient(135deg, rgba(0,200,150,0.15), rgba(0,149,246,0.12));
    border-bottom: 1px solid rgba(255,255,255,0.08);
    display: flex; align-items: center; gap: 10px;
  }

  .medibot-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: linear-gradient(135deg, #00c896, #0095f6);
    display: flex; align-items: center; justify-content: center;
    font-size: 19px; flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(0,200,150,0.3);
  }

  .medibot-header-info { flex: 1; min-width: 0; }
  .medibot-title { font-size: 14px; font-weight: 800; color: #fff; margin: 0; display: flex; align-items: center; gap: 6px; }
  .medibot-subtitle { font-size: 11px; color: #00c896; margin: 0; display: flex; align-items: center; gap: 5px; }
  .medibot-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #00c896; }

  .voice-wave {
    display: inline-flex; align-items: center; gap: 2px; height: 12px; margin-left: 4px;
  }
  .voice-bar {
    width: 2px; height: 100%; background: #00c896; border-radius: 2px;
    animation: soundWave 0.8s ease-in-out infinite alternate;
  }
  .voice-bar:nth-child(2) { animation-delay: 0.2s; height: 60%; }
  .voice-bar:nth-child(3) { animation-delay: 0.4s; height: 80%; }
  @keyframes soundWave { 0% { height: 20%; } 100% { height: 100%; } }

  .lang-selector {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
    color: #fff; font-size: 11px; border-radius: 8px; padding: 4px 6px;
    cursor: pointer; outline: none;
  }

  .icon-header-btn {
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
    color: #e2e8f0; font-size: 13px; border-radius: 8px; width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
  }
  .icon-header-btn:hover { background: rgba(0,200,150,0.2); color: #00c896; }

  .medibot-messages {
    flex: 1; overflow-y: auto; padding: 14px 16px;
    display: flex; flex-direction: column; gap: 12px;
    scrollbar-width: thin; scrollbar-color: rgba(0,200,150,0.3) transparent;
  }

  .msg-row { display: flex; gap: 8px; align-items: flex-end; }
  .msg-row.user { flex-direction: row-reverse; }

  .msg-avatar-sm {
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg, #00c896, #0095f6);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0;
  }

  .msg-bubble {
    max-width: 82%; padding: 10px 14px; border-radius: 16px;
    font-size: 13.5px; line-height: 1.55; word-wrap: break-word;
  }
  .msg-bubble.bot {
    background: rgba(255,255,255,0.06); color: #e8eaf6;
    border-radius: 4px 16px 16px 16px;
    border: 1px solid rgba(255,255,255,0.08);
  }
  .msg-bubble.user {
    background: linear-gradient(135deg, #00c896, #0095f6);
    color: #fff; border-radius: 16px 4px 16px 16px;
  }

  /* ─── PERMISSION GATE CONFIRMATION CARD ─── */
  .permission-gate-card {
    margin-top: 10px; padding: 14px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.08));
    border: 1.5px solid rgba(245,158,11,0.4);
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  }
  .permission-header {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
  }
  .permission-badge {
    font-size: 10px; font-weight: 800; text-transform: uppercase;
    background: rgba(245,158,11,0.2); color: #f59e0b;
    padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(245,158,11,0.3);
    display: flex; align-items: center; gap: 4px;
  }
  .permission-title {
    font-size: 13px; font-weight: 800; color: #fff; margin-bottom: 4px;
  }
  .permission-summary {
    font-size: 12px; color: #cbd5e1; line-height: 1.5; margin-bottom: 8px;
    background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: 8px;
  }
  .permission-cost {
    font-size: 11px; font-weight: 700; color: #34d399; margin-bottom: 10px;
    display: flex; align-items: center; gap: 4px;
  }
  .permission-actions {
    display: flex; gap: 8px;
  }
  .btn-approve {
    flex: 1; padding: 8px 12px; border-radius: 8px; border: none;
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 12px rgba(16,185,129,0.3); transition: all 0.2s;
  }
  .btn-approve:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(16,185,129,0.45); }
  .btn-cancel {
    padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
    background: rgba(255,255,255,0.06); color: #94a3b8; font-size: 12px; cursor: pointer;
  }
  .btn-cancel:hover { background: rgba(255,255,255,0.1); color: #fff; }

  /* ─── ACTION EXECUTION CARDS ─── */
  .action-success-card {
    margin-top: 8px; padding: 12px; border-radius: 12px;
    background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08));
    border: 1px solid rgba(16,185,129,0.3);
  }
  .action-token-badge {
    display: inline-block; font-size: 18px; font-weight: 900; color: #10b981;
    background: rgba(16,185,129,0.15); padding: 4px 10px; border-radius: 8px; margin: 4px 0;
  }

  .prefill-card {
    margin-top: 8px; padding: 12px; border-radius: 12px;
    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1));
    border: 1px solid rgba(99,102,241,0.3);
    font-size: 12px; color: #c4b5fd;
  }
  .prefill-card button {
    margin-top: 6px; width: 100%; padding: 6px; border-radius: 8px; border: none;
    background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
    font-size: 11.5px; font-weight: 700; cursor: pointer;
  }

  .nav-notification {
    margin-top: 8px; padding: 8px 12px; border-radius: 10px;
    background: rgba(0,200,150,0.1); border: 1px solid rgba(0,200,150,0.25);
    font-size: 12px; color: #00c896; display: flex; align-items: center; justify-content: space-between;
  }

  .model-pill {
    font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: #94a3b8; display: inline-flex; align-items: center; gap: 3px; margin-top: 4px;
  }

  .quick-actions {
    padding: 8px 14px; display: flex; gap: 6px; flex-wrap: wrap;
    border-top: 1px solid rgba(255,255,255,0.06); background: rgba(0,0,0,0.2);
  }
  .quick-action-btn {
    padding: 5px 10px; border-radius: 16px; font-size: 11px; font-weight: 600;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    color: #cbd5e1; cursor: pointer; transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 4px;
  }
  .quick-action-btn:hover {
    background: rgba(0,200,150,0.15); border-color: rgba(0,200,150,0.35); color: #fff;
  }

  .medibot-input-row {
    padding: 10px 14px; display: flex; gap: 8px; align-items: flex-end;
    border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.4);
  }

  .icon-btn {
    width: 38px; height: 38px; border-radius: 10px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: #cbd5e1; font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
  }
  .icon-btn:hover { background: rgba(0,200,150,0.15); color: #00c896; }
  .icon-btn.active {
    background: rgba(239,68,68,0.25); color: #ef4444; border-color: #ef4444;
    animation: micPulse 1.2s infinite;
  }
  @keyframes micPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
    50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
  }

  .medibot-input {
    flex: 1; background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
    color: #fff; font-size: 13.5px; padding: 9px 12px;
    outline: none; resize: none; min-height: 38px; max-height: 90px;
  }
  .medibot-input:focus { border-color: rgba(0,200,150,0.45); background: rgba(255,255,255,0.08); }

  .send-btn {
    width: 38px; height: 38px; border-radius: 10px;
    background: linear-gradient(135deg, #00c896, #0095f6);
    border: none; color: #fff; font-size: 15px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .typing-indicator { display: flex; gap: 4px; align-items: center; padding: 4px 2px; }
  .typing-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #00c896; animation: typingBounce 1.2s infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce {
    0%,80%,100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-6px); opacity: 1; }
  }
`;

export default function MediBotAgent({ userName = "Patient" }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { language, setLanguage } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState("");

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activeAudioRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Unread badge counter
  useEffect(() => {
    if (!isOpen && messages.length > 1) setUnreadCount((p) => p + 1);
  }, [messages]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // Set initial welcome greeting
  useEffect(() => {
    const welcomeFn = WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en;
    setMessages([
      {
        id: 1,
        role: "bot",
        content: welcomeFn(userName),
        timestamp: new Date(),
        modelUsed: "openai/gpt-oss-20b",
      },
    ]);
  }, [language, userName]);

  // Read saved medical profile from localStorage
  const getStoredMedicalProfile = useCallback(() => {
    try {
      const stored = localStorage.getItem("arogya_medical_profile");
      if (stored) return JSON.parse(stored);
    } catch { }
    return {
      name: userName || "Rahul Sharma",
      age: 34,
      gender: "Male",
      bpSystolic: 128,
      bpDiastolic: 84,
      isDiabetic: false,
      chronicConditions: "Mild Seasonal Asthma",
      allergies: "Penicillin",
      village: "Kothapeta",
    };
  }, [userName]);

  // ─── AUDIO PLAYBACK (Sarvam TTS Base64) ────────────────────
  const playAudioBase64 = useCallback((base64Audio) => {
    if (isVoiceMuted || !base64Audio) return;
    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      setIsSpeaking(true);

      audio.play().catch(() => setIsSpeaking(false));
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => setIsSpeaking(false);
    } catch (e) {
      console.warn("TTS Playback error:", e);
      setIsSpeaking(false);
    }
  }, [isVoiceMuted]);

  // Browser SpeechSynthesis Fallback
  const speakWithBrowserTTS = useCallback((text, lang) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || isVoiceMuted) return;
    try {
      window.speechSynthesis.cancel();
      const clean = (text || '').replace(/[*#_`~]/g, '').replace(/\[.*?\]\(.*?\)/g, '').slice(0, 350);
      const utterance = new SpeechSynthesisUtterance(clean);
      const langMap = {
        en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
        mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', ml: 'ml-IN', bho: 'hi-IN'
      };
      utterance.lang = langMap[lang] || 'en-IN';
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {}
  }, [isVoiceMuted]);

  // ─── SEND MESSAGE TO ORCHESTRATED AGENT ────────────────────
  const sendMessage = useCallback(
    async (text = input, overrideAction = null) => {
      const trimmed = (text || "").trim();
      if ((!trimmed && !uploadedImage && !overrideAction) || isLoading) return;

      const profile = getStoredMedicalProfile();

      // Check verbal confirmation if pending confirmation exists
      let actionToConfirm = overrideAction;
      if (!actionToConfirm && pendingConfirmation) {
        const affirmativeWords = ["yes", "confirm", "proceed", "approve", "ok", "ha", "haan", "avunu", "aam", "sari"];
        if (affirmativeWords.some((w) => trimmed.toLowerCase().includes(w))) {
          actionToConfirm = pendingConfirmation;
        }
      }

      if (trimmed) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: "user",
            content: trimmed,
            timestamp: new Date(),
            image: imagePreview,
          },
        ]);
      }

      setInput("");
      setIsLoading(true);
      const imageBase64 = uploadedImage;
      setUploadedImage(null);
      setImagePreview(null);

      try {
        const history = messages
          .filter((m) => m.role !== "system")
          .slice(-8)
          .map((m) => ({
            role: m.role === "bot" ? "assistant" : "user",
            content: m.content || "",
          }));

        if (trimmed && !overrideAction) {
          history.push({ role: "user", content: trimmed });
        }

        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            language,
            userName,
            userProfile: profile,
            imageBase64,
            voiceResponse: !isVoiceMuted,
            confirmedAction: actionToConfirm,
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Agent execution failed");

        // If action was confirmed, clear pending state
        if (actionToConfirm) {
          setPendingConfirmation(null);
        }

        // Process tool results (Permission gates, prefill, navigation)
        let toolResults = data.toolResults || [];
        for (const tr of toolResults) {
          const r = tr.result;
          if (r?.ui_action === "require_confirmation") {
            setPendingConfirmation(r.confirmation_data);
          } else if (r?.ui_action === "prefill_symptoms") {
            try {
              sessionStorage.setItem("pending_symptom_prefill", JSON.stringify(r.data));
            } catch { }
          } else if (r?.ui_action === "prefill_predictor") {
            try {
              sessionStorage.setItem("pending_predictor_prefill", JSON.stringify(r.data));
            } catch { }
          } else if (r?.ui_action === "navigate" || r?.ui_action === "navigate_with_filter") {
            setTimeout(() => {
              if (r.url) router.push(r.url);
            }, 1200);
          }
        }

        // Auto-play voice in preferred language
        if (data.audioBase64) {
          playAudioBase64(data.audioBase64);
        } else if (!isVoiceMuted && data.content) {
          speakWithBrowserTTS(data.content, language);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            content: data.content,
            timestamp: new Date(),
            toolResults,
            modelUsed: data.modelUsed,
            complexity: data.complexity,
            audioBase64: data.audioBase64,
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            content: `⚠️ Error: ${err.message}. Please try again.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, uploadedImage, imagePreview, isLoading, messages, language, userName, getStoredMedicalProfile, pendingConfirmation, isVoiceMuted, playAudioBase64, router]
  );

  // ─── HUMAN-IN-THE-LOOP ACTIONS ──────────────────────────────
  const handleApproveAction = (confirmationData) => {
    sendMessage(`Confirmed: ${confirmationData.title}`, confirmationData);
  };

  const handleCancelAction = () => {
    setPendingConfirmation(null);
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "bot",
        content: "Action cancelled. Let me know if you would like to do anything else! 😊",
        timestamp: new Date(),
      },
    ]);
  };

  // ─── VOICE INPUT (Dual Engine: Web Speech API Live Streaming + Sarvam saaras:v3) ───
  const startSarvamRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
        ? 'audio/webm;codecs=opus'
        : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm'))
          ? 'audio/webm'
          : (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4'))
            ? 'audio/mp4'
            : '';

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setVoiceStatus("Processing voice via Sarvam AI...");
        setIsLoading(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
          const targetLang = LANGUAGES[language]?.sarvam || "en-IN";

          const formData = new FormData();
          formData.append("audio", audioBlob, "audio.webm");
          formData.append("language", targetLang);

          const sttRes = await fetch("/api/speech-to-text", {
            method: "POST",
            body: formData,
          });

          const sttData = await sttRes.json();
          const transcript = sttData.transcript?.trim();

          if (transcript) {
            setInput(transcript);
            setVoiceStatus("");
            await sendMessage(transcript);
          } else {
            setVoiceStatus("");
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now(),
                role: "bot",
                content: "🎤 Could not understand the voice audio. Please try speaking clearly or typing.",
                timestamp: new Date(),
              },
            ]);
          }
        } catch (err) {
          console.error("Sarvam STT Failed:", err);
          setVoiceStatus("");
        } finally {
          setIsLoading(false);
          setIsRecording(false);
          setVoiceStatus("");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceStatus("Listening via Sarvam AI... Speak now 🎙️");

      // Auto stop after 8s
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 8000);
    } catch {
      alert("Microphone access is required to speak with MediBot. Please allow microphone permission in your browser.");
      setIsRecording(false);
      setVoiceStatus("");
    }
  };

  const toggleVoice = () => {
    // Stop if currently recording
    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { }
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current?.state === "recording") {
        try { mediaRecorderRef.current.stop(); } catch { }
      }
      setIsRecording(false);
      setVoiceStatus("");
      return;
    }

    // Engine 1: Native Web Speech API for real-time live interim feedback
    const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        const langCode = LANGUAGES[language]?.sarvam || "en-IN";
        recognition.lang = langCode;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        let accumulatedTranscript = "";

        recognition.onstart = () => {
          setIsRecording(true);
          setVoiceStatus("Listening... Speak now 🎙️");
        };

        recognition.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const transcriptText = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
              accumulatedTranscript = transcriptText;
            } else {
              interim += transcriptText;
            }
          }
          const currentText = (accumulatedTranscript || interim).trim();
          if (currentText) {
            setInput(currentText);
          }
        };

        recognition.onerror = (e) => {
          console.warn("[Web Speech error, falling back to Sarvam STT]:", e.error);
          setIsRecording(false);
          setVoiceStatus("");
          recognitionRef.current = null;

          if (e.error === "not-allowed") {
            alert("Microphone permission was denied. Please allow microphone access in your browser settings.");
          } else if (e.error !== "aborted") {
            startSarvamRecording();
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          setVoiceStatus("");
          recognitionRef.current = null;
          const finalText = accumulatedTranscript.trim();
          if (finalText) {
            sendMessage(finalText);
          }
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn("SpeechRecognition start failed, falling back to Sarvam STT", err);
      }
    }

    // Engine 2: Sarvam STT
    startSarvamRecording();
  };

  // ─── IMAGE UPLOAD ──────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result;
      if (typeof b64 === "string") {
        setUploadedImage(b64.split(",")[1]);
        setImagePreview(b64);
      }
    };
    reader.readAsDataURL(file);
  };

  // ─── RENDER TOOL RESULT BLOCKS ──────────────────────────────
  const renderToolResult = (tr, i) => {
    const r = tr.result;
    if (!r) return null;

    // 1. Permission Gate Card
    if (r.ui_action === "require_confirmation" && r.confirmation_data) {
      const cd = r.confirmation_data;
      return (
        <div key={i} className="permission-gate-card">
          <div className="permission-header">
            <div className="permission-badge">🛡️ Permission Gate</div>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Confirmation Required</span>
          </div>
          <div className="permission-title">{cd.title}</div>
          <div className="permission-summary">{cd.summary}</div>
          <div className="permission-cost">
            <span>💳 Estimated Cost:</span> <strong>{cd.estimated_cost}</strong>
          </div>
          <div className="permission-actions">
            <button className="btn-approve" onClick={() => handleApproveAction(cd)}>
              ✓ Approve & Execute
            </button>
            <button className="btn-cancel" onClick={handleCancelAction}>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    // 2. Appointment Booked Confirmation
    if (r.ui_action === "appointment_booked" && r.data) {
      return (
        <div key={i} className="action-success-card">
          <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
            ✓ Appointment Confirmed!
          </div>
          <div className="action-token-badge">Token #{r.data.tokenNumber}</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>
            <strong>{r.data.doctorName}</strong> ({r.data.specialty})<br />
            📅 {r.data.date} at {r.data.timeSlot} • Booking ID: {r.data.bookingId}
          </div>
          <button
            style={{ marginTop: 8, padding: "5px 10px", background: "rgba(16,185,129,0.2)", border: "1px solid #10b981", borderRadius: 6, color: "#10b981", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            onClick={() => router.push("/dashboard/appointments")}
          >
            View Appointments →
          </button>
        </div>
      );
    }

    // 3. Medicine Order Placed
    if (r.ui_action === "order_placed" && r.data) {
      return (
        <div key={i} className="action-success-card">
          <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>📦 Medicine Order Dispatched</div>
          <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
            Order ID: <strong>{r.data.orderId}</strong> • Total: <strong>₹{r.data.totalAmount}</strong><br />
            Delivery to: {r.data.deliveryAddress}<br />
            ETA: <span style={{ color: "#34d399" }}>{r.data.estimatedDelivery}</span>
          </div>
          <button
            style={{ marginTop: 8, padding: "5px 10px", background: "rgba(16,185,129,0.2)", border: "1px solid #10b981", borderRadius: 6, color: "#10b981", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            onClick={() => router.push("/dashboard/medicines")}
          >
            Track Order in Pharmacy →
          </button>
        </div>
      );
    }

    // 4. Hospital Admin Operations
    if (r.ui_action === "admin_operation" && r.data) {
      return (
        <div key={i} className="action-success-card" style={{ borderColor: "rgba(6,182,212,0.3)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#22d3ee" }}>🏥 Hospital Admin Operation Succeeded</div>
          <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
            Op ID: {r.data.operationId} • Action: <strong>{r.data.operation}</strong><br />
            Ward: {r.data.ward} • Assigned Bed: <strong>{r.data.bedNumber}</strong>
          </div>
          <button
            style={{ marginTop: 8, padding: "5px 10px", background: "rgba(6,182,212,0.2)", border: "1px solid #22d3ee", borderRadius: 6, color: "#22d3ee", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            onClick={() => router.push("/dashboard/hospital_admin")}
          >
            Open Hospital Admin Console →
          </button>
        </div>
      );
    }

    // 5. Prefill Symptoms
    if (r.ui_action === "prefill_symptoms") {
      return (
        <div key={i} className="prefill-card">
          <div style={{ fontWeight: 800, color: "#a78bfa" }}>📋 Vitals Pre-filled to Symptom Checker</div>
          <div>Symptoms: {r.data?.symptoms?.join(", ")} | BP: {r.data?.bpSystolic}/{r.data?.bpDiastolic} mmHg</div>
          <button onClick={() => router.push("/dashboard/symptoms")}>Open Symptom Checker →</button>
        </div>
      );
    }

    // 6. Prefill Predictor
    if (r.ui_action === "prefill_predictor") {
      return (
        <div key={i} className="prefill-card">
          <div style={{ fontWeight: 800, color: "#a78bfa" }}>🧬 Biomarkers Pre-filled to Risk Predictor</div>
          <div>Predictor: {r.data?.predictor_type} | Age: {r.data?.age} | Diabetic: {r.data?.isDiabetic ? "Yes" : "No"}</div>
          <button onClick={() => router.push("/dashboard/predictors")}>Open Health Predictors →</button>
        </div>
      );
    }

    // 7. Navigation
    if (r.ui_action === "navigate" || r.ui_action === "navigate_with_filter") {
      return (
        <div key={i} className="nav-notification">
          <span>🗺️ Navigating to <strong>{r.page || r.url}</strong>...</span>
          <button
            style={{ background: "none", border: "none", color: "#00c896", fontWeight: 700, cursor: "pointer", fontSize: 12 }}
            onClick={() => r.url && router.push(r.url)}
          >
            Go Now →
          </button>
        </div>
      );
    }

    return null;
  };

  // ─── RENDER INDIVIDUAL MESSAGE ──────────────────────────────
  const renderMessage = (msg) => {
    const isBot = msg.role === "bot";
    return (
      <div key={msg.id} className={`msg-row ${isBot ? "bot" : "user"}`}>
        {isBot && <div className="msg-avatar-sm">🤖</div>}
        <div style={{ maxWidth: "84%" }}>
          <div className={`msg-bubble ${isBot ? "bot" : "user"}`}>
            {msg.image && (
              <img
                src={msg.image}
                alt="attachment"
                style={{ width: "100%", borderRadius: 8, marginBottom: 8, maxHeight: 160, objectFit: "cover" }}
              />
            )}
            <div style={{ whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>

            {/* Render any tool results attached to this message */}
            {msg.toolResults?.map((tr, i) => renderToolResult(tr, i))}

            {/* Model Complexity pill badge */}
            {isBot && msg.modelUsed && (
              <div className="model-pill">
                <span>✦</span>
                <span>{msg.modelUsed.split("/")[1] || msg.modelUsed}</span>
                {msg.complexity && (
                  <span style={{ color: msg.complexity === "complex" ? "#f43f5e" : msg.complexity === "vision" ? "#a855f7" : "#10b981" }}>
                    • {msg.complexity.toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Audio replay button in preferred language */}
          {isBot && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <button
                onClick={() => msg.audioBase64 ? playAudioBase64(msg.audioBase64) : speakWithBrowserTTS(msg.content, language)}
                style={{
                  background: isSpeaking ? "rgba(0,200,150,0.18)" : "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(0,200,150,0.3)",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  color: "#00c896",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title={`Listen in ${LANGUAGES[language]?.name || "preferred language"}`}
              >
                <span>🔊</span>
                <span>{isSpeaking ? "Speaking..." : `Listen (${LANGUAGES[language]?.name || "Voice"})`}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <div className="medibot-container">
        {/* Floating Action Button */}
        <button
          className={`medibot-fab ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen(!isOpen)}
          title="Open MediBot AI Agent"
        >
          {isOpen ? (
            <span style={{ fontSize: 22, color: "#fff" }}>✕</span>
          ) : (
            <span style={{ fontSize: 26 }}>🤖</span>
          )}
          {!isOpen && unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                background: "#ff4b6e",
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* Floating Chat Modal Panel */}
        {isOpen && (
          <div className="medibot-panel">
            {/* Header */}
            <div className="medibot-header">
              <div className="medibot-avatar">🤖</div>
              <div className="medibot-header-info">
                <div className="medibot-title">
                  MediBot AI
                  <span style={{ fontSize: 9, padding: "2px 5px", background: "rgba(0,200,150,0.15)", color: "#00c896", borderRadius: 4, fontWeight: 700 }}>
                    ORCHESTRATED
                  </span>
                </div>
                <div className="medibot-subtitle">
                  <span className="medibot-online-dot" />
                  <span>Sarvam Speech + Groq</span>
                  {isSpeaking && (
                    <div className="voice-wave">
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                    </div>
                  )}
                </div>
              </div>

              {/* Audio Mute/Unmute Toggle */}
              <button
                className="icon-header-btn"
                onClick={() => setIsVoiceMuted(!isVoiceMuted)}
                title={isVoiceMuted ? "Unmute Voice" : "Mute Voice"}
              >
                {isVoiceMuted ? "🔇" : "🔊"}
              </button>

              {/* Language Selector */}
              <select
                className="lang-selector"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                  <option key={code} value={code}>
                    {flag} {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Conversation Messages */}
            <div className="medibot-messages">
              {messages.map(renderMessage)}

              {isLoading && (
                <div className="msg-row bot">
                  <div className="msg-avatar-sm">🤖</div>
                  <div className="msg-bubble bot">
                    <div className="typing-indicator">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Buttons */}
            {messages.length <= 2 && (
              <div className="quick-actions">
                {(QUICK_ACTIONS_I18N[language] || QUICK_ACTIONS_I18N.en).map((qa) => (
                  <button
                    key={qa.label}
                    className="quick-action-btn"
                    onClick={() => sendMessage(qa.query)}
                  >
                    <span>{qa.icon}</span>
                    <span>{qa.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Image Preview if selected */}
            {imagePreview && (
              <div style={{ position: "relative", padding: "6px 14px", display: "inline-block" }}>
                <img
                  src={imagePreview}
                  alt="preview"
                  style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", border: "1px solid #00c896" }}
                />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setUploadedImage(null);
                  }}
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 10,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#ff4b6e",
                    border: "none",
                    color: "#fff",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {/* Bottom Input Area */}
            <div className="medibot-input-row">
              <button
                className="icon-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Scan Medicine / Upload Report"
              >
                📸
              </button>

              <button
                className={`icon-btn ${isRecording ? "active" : ""}`}
                onClick={toggleVoice}
                title={isRecording ? "Stop Recording" : "Voice Consultation"}
              >
                {isRecording ? "⏹" : "🎤"}
              </button>

              <textarea
                ref={inputRef}
                className="medibot-input"
                placeholder={`Ask or command in ${LANGUAGES[language]?.name || "English"}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
              />

              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={(!input.trim() && !imagePreview) || isLoading}
                title="Send Message"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2z" />
                </svg>
              </button>
            </div>

            {/* Hidden File Input for Camera/Gallery */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </div>
        )}
      </div>
    </>
  );
}
