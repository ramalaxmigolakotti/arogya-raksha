"use client";
// ============================================================
// MEDIBOT AI AGENT COMPONENT
// Floating AI chatbot with multilingual voice/text support
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

// ─── CONSTANTS ───────────────────────────────────────────────
const LANGUAGES = {
  en: { name: "English", flag: "🇬🇧" },
  te: { name: "తెలుగు", flag: "🇮🇳" },
  hi: { name: "हिंदी", flag: "🇮🇳" },
  ta: { name: "தமிழ்", flag: "🇮🇳" },
  kn: { name: "ಕನ್ನಡ", flag: "🇮🇳" },
  mr: { name: "मराठी", flag: "🇮🇳" },
  bn: { name: "বাংলা", flag: "🇮🇳" },
  bho: { name: "भोजपुरी", flag: "🇮🇳" },
};

const QUICK_ACTIONS_I18N = {
  en: [
    { icon: "🧬", label: "Risk Predictor", query: "I want to check my health risk score for diabetes" },
    { icon: "📋", label: "My Profile", query: "Open my medical profile and vitals" },
    { icon: "👨‍⚕️", label: "Find Doctors", query: "Find me a doctor" },
    { icon: "📅", label: "Book Appointment", query: "I want to book a doctor appointment" },
    { icon: "💊", label: "Medicine Help", query: "I need medicine suggestions for my symptoms" },
    { icon: "🏥", label: "Nearby Hospitals", query: "Find nearby hospitals for me" },
    { icon: "🧠", label: "Health Quiz", query: "Let's play a health quiz" },
    { icon: "📸", label: "Scan Medicine", query: "I want to scan a medicine" },
    { icon: "🩺", label: "Symptom Check", query: "Check my symptoms" },
    { icon: "📊", label: "Health Analytics", query: "Show me my health analytics" },
    { icon: "🫀", label: "Heart Risk", query: "Check my heart disease risk" },
    { icon: "🧘", label: "Mental Health", query: "Assess my mental health risk score" },
  ],
  hi: [
    { icon: "🧬", label: "जोखिम जाँच", query: "मेरे मधुमेह जोखिम स्कोर की जाँच करें" },
    { icon: "📋", label: "मेरा प्रोफाइल", query: "मेरा मेडिकल प्रोफाइल खोलें" },
    { icon: "👨‍⚕️", label: "डॉक्टर खोजें", query: "मुझे एक डॉक्टर खोजें" },
    { icon: "📅", label: "अपॉइंटमेंट", query: "मुझे डॉक्टर की अपॉइंटमेंट बुक करनी है" },
    { icon: "💊", label: "दवा सहायता", query: "मेरे लक्षणों के लिए दवा सुझाएं" },
    { icon: "🏥", label: "नज़दीकी अस्पताल", query: "मेरे पास के अस्पताल खोजें" },
    { icon: "🧠", label: "स्वास्थ्य क्विज़", query: "स्वास्थ्य क्विज़ खेलते हैं" },
    { icon: "📸", label: "दवा स्कैन", query: "मैं दवा स्कैन करना चाहता हूँ" },
    { icon: "🩺", label: "लक्षण जाँच", query: "मेरे लक्षण जाँचें" },
    { icon: "📊", label: "स्वास्थ्य विश्लेषण", query: "मेरा स्वास्थ्य विश्लेषण दिखाएं" },
    { icon: "🫀", label: "हृदय जोखिम", query: "मेरे हृदय रोग जोखिम की जाँच करें" },
    { icon: "🧘", label: "मानसिक स्वास्थ्य", query: "मेरे मानसिक स्वास्थ्य जोखिम का आकलन करें" },
  ],
  te: [
    { icon: "🧬", label: "ప్రమాద అంచనా", query: "నా డయాబెటిస్ ప్రమాద స్కోర్ చూడండి" },
    { icon: "📋", label: "నా ప్రొఫైల్", query: "నా మెడికల్ ప్రొఫైల్ తెరవండి" },
    { icon: "👨‍⚕️", label: "డాక్టర్ కనుగొను", query: "నాకు డాక్టర్ కనుగొనండి" },
    { icon: "📅", label: "అపాయింట్‌మెంట్", query: "నాకు డాక్టర్ అపాయింట్‌మెంట్ బుక్ చేయండి" },
    { icon: "💊", label: "మందుల సహాయం", query: "నా లక్షణాలకు మందులు సూచించండి" },
    { icon: "🏥", label: "సమీప ఆస్పత్రి", query: "నాకు సమీపంలో ఆస్పత్రులు కనుగొనండి" },
    { icon: "🧠", label: "క్విజ్", query: "ఆరోగ్య క్విజ్ ఆడదాం" },
    { icon: "📸", label: "మందు స్కాన్", query: "నేను మందు స్కాన్ చేయాలి" },
    { icon: "🩺", label: "లక్షణ పరీక్ష", query: "నా లక్షణాలు చూడండి" },
    { icon: "📊", label: "ఆరోగ్య విశ్లేషణ", query: "నా ఆరోగ్య విశ్లేషణ చూపించండి" },
  ],
  kn: [
    { icon: "🧬", label: "ಅಪಾಯ ಪರೀಕ್ಷೆ", query: "ನನ್ನ ಮಧುಮೇಹ ಅಪಾಯ ಸ್ಕೋರ್ ಪರಿಶೀಲಿಸಿ" },
    { icon: "📋", label: "ನನ್ನ ಪ್ರೊಫೈಲ್", query: "ನನ್ನ ವೈದ್ಯಕೀಯ ಪ್ರೊಫೈಲ್ ತೆರೆಯಿರಿ" },
    { icon: "👨‍⚕️", label: "ವೈದ್ಯರನ್ನು ಹುಡುಕಿ", query: "ನನಗೆ ವೈದ್ಯರನ್ನು ಹುಡುಕಿ" },
    { icon: "📅", label: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್", query: "ನನಗೆ ವೈದ್ಯರ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ" },
    { icon: "💊", label: "ಔಷಧ ಸಹಾಯ", query: "ನನ್ನ ಲಕ್ಷಣಗಳಿಗೆ ಔಷಧ ಸೂಚಿಸಿ" },
    { icon: "🏥", label: "ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆ", query: "ನನ್ನ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳನ್ನು ಹುಡುಕಿ" },
    { icon: "🧠", label: "ಕ್ವಿಜ್", query: "ಆರೋಗ್ಯ ಕ್ವಿಜ್ ಆಡೋಣ" },
    { icon: "📸", label: "ಔಷಧ ಸ್ಕ್ಯಾನ್", query: "ನಾನು ಔಷಧ ಸ್ಕ್ಯಾನ್ ಮಾಡಬೇಕು" },
    { icon: "🩺", label: "ಲಕ್ಷಣ ಪರೀಕ್ಷೆ", query: "ನನ್ನ ಲಕ್ಷಣಗಳನ್ನು ಪರಿಶೀಲಿಸಿ" },
    { icon: "📊", label: "ಆರೋಗ್ಯ ವಿಶ್ಲೇಷಣೆ", query: "ನನ್ನ ಆರೋಗ್ಯ ವಿಶ್ಲೇಷಣೆ ತೋರಿಸಿ" },
  ],
  ta: [
    { icon: "🧬", label: "ஆபத்து சோதனை", query: "என் நீரிழிவு ஆபத்து மதிப்பெண் பாருங்கள்" },
    { icon: "📋", label: "என் சுயவிவரம்", query: "என் மருத்துவ சுயவிவரம் திறக்கவும்" },
    { icon: "👨‍⚕️", label: "மருத்துவர் தேடு", query: "எனக்கு மருத்துவர் கண்டறியுங்கள்" },
    { icon: "📅", label: "சந்திப்பு", query: "மருத்துவர் சந்திப்பு பதிவு செய்ய வேண்டும்" },
    { icon: "💊", label: "மருந்து உதவி", query: "என் அறிகுறிகளுக்கு மருந்து தேவை" },
    { icon: "🏥", label: "அருகில் மருத்துவமனை", query: "அருகிலுள்ள மருத்துவமனைகளை கண்டறியுங்கள்" },
    { icon: "🧠", label: "வினாடி வினா", query: "ஆரோக்கிய வினாடி வினா விளையாடலாம்" },
    { icon: "📸", label: "மருந்து ஸ்கேன்", query: "மருந்து ஸ்கேன் செய்ய வேண்டும்" },
    { icon: "🩺", label: "அறிகுறி சோதனை", query: "என் அறிகுறிகளை சோதிக்கவும்" },
    { icon: "📊", label: "ஆரோக்கிய பகுப்பாய்வு", query: "என் ஆரோக்கிய பகுப்பாய்வு காட்டுங்கள்" },
  ],
};

const WELCOME_MESSAGES = {
  en: (name) => `👋 Hi ${name}! I'm **MediBot**, your Agentic AI medical assistant.\n\nI'm equipped with **12 AI tools** to help you:\n• 🧬 Run Disease Risk Predictors\n• 📋 Manage your Medical Profile\n• 👨‍⚕️ Find Doctors & Book Appointments\n• 💊 Suggest medicines\n• 🧠 Play health quizzes\n• 📊 View Health Analytics\n• 🏥 Find nearby hospitals\n• 🎤 Talk to me in your language!\n\nTap any action below or just ask me! 👇`,
  hi: (name) => `👋 नमस्ते ${name}! मैं **MediBot** हूँ, आपका AI मेडिकल सहायक।\n\nमेरे पास **12 AI टूल्स** हैं:\n• 🧬 रोग जोखिम भविष्यवाणी\n• 📋 मेडिकल प्रोफाइल प्रबंधन\n• 👨‍⚕️ डॉक्टर खोजें और अपॉइंटमेंट बुक करें\n• 💊 दवा सुझाव\n• 🧠 स्वास्थ्य क्विज़\n• 📊 स्वास्थ्य विश्लेषण\n• 🏥 नज़दीकी अस्पताल\n\nनीचे कोई भी विकल्प चुनें या मुझसे पूछें! 👇`,
  te: (name) => `👋 హాయ్ ${name}! నేను **MediBot**, మీ AI వైద్య సహాయకుడిని.\n\nనా దగ్గర **12 AI టూల్స్** ఉన్నాయి:\n• 🧬 వ్యాధి ప్రమాద అంచనా\n• 📋 మెడికల్ ప్రొఫైల్ నిర్వహణ\n• 👨‍⚕️ డాక్టర్ కనుగొని అపాయింట్‌మెంట్ బుక్ చేయండి\n• 💊 మందుల సూచన\n\nకింద ఏదైనా ఎంచుకోండి లేదా నన్ను అడగండి! 👇`,
  kn: (name) => `👋 ನಮಸ್ಕಾರ ${name}! ನಾನು **MediBot**, ನಿಮ್ಮ AI ವೈದ್ಯಕೀಯ ಸಹಾಯಕ.\n\nನನ್ನ ಬಳಿ **12 AI ಪರಿಕರಗಳು** ಇವೆ:\n• 🧬 ರೋಗ ಅಪಾಯ ಮುನ್ಸೂಚನೆ\n• 📋 ವೈದ್ಯಕೀಯ ಪ್ರೊಫೈಲ್ ನಿರ್ವಹಣೆ\n• 👨‍⚕️ ವೈದ್ಯರನ್ನು ಹುಡುಕಿ ಮತ್ತು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ\n• 💊 ಔಷಧ ಸಲಹೆ\n• 🧠 ಆರೋಗ್ಯ ಕ್ವಿಜ್\n• 📊 ಆರೋಗ್ಯ ವಿಶ್ಲೇಷಣೆ\n• 🏥 ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗಳು\n\nಕೆಳಗಿನ ಯಾವುದಾದರೂ ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ನನ್ನನ್ನು ಕೇಳಿ! 👇`,
  ta: (name) => `👋 வணக்கம் ${name}! நான் **MediBot**, உங்கள் AI மருத்துவ உதவியாளர்.\n\nஎன்னிடம் **12 AI கருவிகள்** உள்ளன:\n• 🧬 நோய் ஆபத்து மதிப்பீடு\n• 📋 மருத்துவ சுயவிவர மேலாண்மை\n• 👨‍⚕️ மருத்துவரைக் கண்டறிந்து சந்திப்பு பதிவு செய்யுங்கள்\n• 💊 மருந்து பரிந்துரை\n\nகீழே ஏதாவது தேர்வு செய்யுங்கள் அல்லது என்னிடம் கேளுங்கள்! 👇`,
  mr: (name) => `👋 नमस्कार ${name}! मी **MediBot** आहे, तुमचा AI वैद्यकीय सहाय्यक.\n\nमाझ्याकडे **12 AI साधने** आहेत. खाली कोणताही पर्याय निवडा! 👇`,
  bn: (name) => `👋 হ্যালো ${name}! আমি **MediBot**, আপনার AI চিকিৎসা সহকারী.\n\nআমার কাছে **12 AI টুল** আছে. নীচে যেকোনো বিকল্প বেছে নিন! 👇`,
  bho: (name) => `👋 प्रणाम ${name}! हम **MediBot** हईं, रउरा AI डॉक्टर सहायक.\n\nहमरा लगे **12 AI औजार** बा. नीचे कवनो विकल्प चुनीं! 👇`,
};

// ─── STYLES ──────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  .medibot-container * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }

  .medibot-fab {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    width: 62px; height: 62px; border-radius: 50%;
    background: linear-gradient(135deg, #00c896, #0095f6);
    border: none; cursor: pointer; box-shadow: 0 4px 24px rgba(0,200,150,0.45);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
    animation: fabPulse 3s infinite;
  }
  .medibot-fab:hover { transform: scale(1.1); box-shadow: 0 8px 32px rgba(0,200,150,0.6); }
  .medibot-fab.open { transform: rotate(45deg) scale(0.9); background: linear-gradient(135deg, #ff4b6e, #ff6b35); }

  @keyframes fabPulse {
    0%,100% { box-shadow: 0 4px 24px rgba(0,200,150,0.45); }
    50% { box-shadow: 0 4px 32px rgba(0,200,150,0.75), 0 0 0 8px rgba(0,200,150,0.12); }
  }

  .medibot-panel {
    position: fixed; bottom: 105px; right: 28px; z-index: 9998;
    width: 400px; height: 600px;
    background: #0a0e1a; border-radius: 24px;
    border: 1px solid rgba(0,200,150,0.2);
    box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,200,150,0.1);
    display: flex; flex-direction: column; overflow: hidden;
    transform-origin: bottom right;
    animation: panelIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }

  @media (max-width: 600px) {
    .medibot-fab { bottom: 20px; right: 16px; width: 58px; height: 58px; }
    .medibot-panel {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      width: 100% !important;
      height: 100% !important;
      border-radius: 0 !important;
      border: none;
    }
    .medibot-close-mobile { display: flex !important; }
    .medibot-header { padding: 14px 16px; padding-top: max(14px, env(safe-area-inset-top)); }
    .medibot-messages { padding: 12px; }
    .medibot-input-row { padding: 10px 12px; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
    .quick-actions { padding: 8px 12px; gap: 6px; }
    .quick-action-btn { padding: 7px 11px; font-size: 12px; }
    .icon-btn { width: 44px; height: 44px; font-size: 18px; border-radius: 12px; }
    .icon-btn.mic-btn { width: 52px; height: 52px; font-size: 22px; background: rgba(0,200,150,0.15); border-color: rgba(0,200,150,0.4); color: #00c896; }
    .icon-btn.mic-btn.active { background: rgba(255,75,110,0.25); border-color: #ff4b6e; color: #ff4b6e; }
    .send-btn { width: 48px; height: 48px; font-size: 18px; }
    .medibot-input { font-size: 15px; padding: 10px 12px; }
    .msg-bubble { font-size: 14px; max-width: 85%; }
    .medibot-title { font-size: 16px; }
  }

  @keyframes panelIn {
    from { transform: scale(0.7) translateY(20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  .medibot-header {
    padding: 16px 20px;
    background: linear-gradient(135deg, rgba(0,200,150,0.15), rgba(0,149,246,0.1));
    border-bottom: 1px solid rgba(255,255,255,0.07);
    display: flex; align-items: center; gap: 12px;
  }

  .medibot-avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: linear-gradient(135deg, #00c896, #0095f6);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(0,200,150,0.3), 0 0 16px rgba(0,200,150,0.3);
    animation: avatarGlow 2s infinite alternate;
  }

  @keyframes avatarGlow {
    from { box-shadow: 0 0 0 2px rgba(0,200,150,0.3), 0 0 16px rgba(0,200,150,0.3); }
    to { box-shadow: 0 0 0 3px rgba(0,200,150,0.5), 0 0 24px rgba(0,200,150,0.5); }
  }

  .medibot-header-info { flex: 1; }
  .medibot-title { font-size: 15px; font-weight: 700; color: #fff; margin: 0; }
  .medibot-subtitle { font-size: 11px; color: #00c896; margin: 0; display: flex; align-items: center; gap: 4px; }
  .medibot-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #00c896; animation: blink 1.5s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .lang-selector {
    background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
    color: #fff; font-size: 11px; border-radius: 8px; padding: 4px 8px;
    cursor: pointer; outline: none; font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .medibot-messages {
    flex: 1; overflow-y: auto; padding: 16px;
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
    max-width: 78%; padding: 10px 14px; border-radius: 16px;
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

  .msg-bubble.bot pre { white-space: pre-wrap; font-family: inherit; margin: 0; }

  .tool-action-card {
    margin-top: 8px; padding: 10px 12px;
    background: rgba(0,200,150,0.1); border: 1px solid rgba(0,200,150,0.25);
    border-radius: 10px; font-size: 12px; color: #00c896;
  }
  .tool-action-card button {
    margin-top: 6px; padding: 5px 12px;
    background: linear-gradient(135deg, #00c896, #0095f6);
    border: none; border-radius: 6px; color: #fff;
    font-size: 12px; cursor: pointer; font-weight: 600;
  }

  .typing-indicator { display: flex; gap: 4px; align-items: center; padding: 6px 2px; }
  .typing-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #00c896; animation: typingBounce 1.2s infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce {
    0%,80%,100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-8px); opacity: 1; }
  }

  .quick-actions {
    padding: 10px 16px; display: flex; gap: 7px; flex-wrap: wrap;
    border-top: 1px solid rgba(255,255,255,0.05);
  }
  .quick-action-btn {
    padding: 5px 10px; border-radius: 20px; font-size: 11px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    color: #ccd; cursor: pointer; white-space: nowrap; transition: all 0.2s;
    display: flex; align-items: center; gap: 4px; font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .quick-action-btn:hover { background: rgba(0,200,150,0.15); border-color: rgba(0,200,150,0.4); color: #fff; }

  .medibot-input-row {
    padding: 12px 16px; display: flex; gap: 8px; align-items: flex-end;
    border-top: 1px solid rgba(255,255,255,0.07);
    background: rgba(0,0,0,0.3);
  }

  .input-actions { display: flex; gap: 6px; align-items: center; }

  .icon-btn {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    color: #aab; font-size: 15px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
  }
  .icon-btn:hover { background: rgba(0,200,150,0.15); color: #00c896; border-color: rgba(0,200,150,0.3); }
  .icon-btn.active { background: rgba(255,75,110,0.2); color: #ff4b6e; border-color: rgba(255,75,110,0.4); animation: recordPulse 1s infinite; }
  @keyframes recordPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

  .medibot-input {
    flex: 1; background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
    color: #fff; font-size: 13.5px; padding: 10px 14px;
    outline: none; resize: none; font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 40px; max-height: 100px; line-height: 1.5; transition: border-color 0.2s;
  }
  .medibot-input::placeholder { color: rgba(255,255,255,0.3); }
  .medibot-input:focus { border-color: rgba(0,200,150,0.4); background: rgba(255,255,255,0.08); }

  .send-btn {
    width: 40px; height: 40px; border-radius: 12px;
    background: linear-gradient(135deg, #00c896, #0095f6);
    border: none; color: #fff; font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    flex-shrink: 0;
  }
  .send-btn:hover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(0,200,150,0.4); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .img-preview {
    position: relative; display: inline-block; margin: 4px 16px 0;
  }
  .img-preview img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(0,200,150,0.3); }
  .img-preview-close {
    position: absolute; top: -6px; right: -6px; width: 18px; height: 18px;
    border-radius: 50%; background: #ff4b6e; border: none; color: #fff;
    font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  }

  .quiz-container {
    background: rgba(0,200,150,0.06); border: 1px solid rgba(0,200,150,0.2);
    border-radius: 14px; padding: 14px; margin-top: 6px;
  }
  .quiz-question { font-size: 13.5px; color: #e8eaf6; font-weight: 600; margin-bottom: 10px; }
  .quiz-option {
    width: 100%; text-align: left; padding: 8px 12px; margin-bottom: 6px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px; color: #ccd; font-size: 12.5px; cursor: pointer; transition: all 0.2s;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .quiz-option:hover { background: rgba(0,200,150,0.12); border-color: rgba(0,200,150,0.3); color: #fff; }
  .quiz-option.correct { background: rgba(0,200,150,0.2); border-color: #00c896; color: #00c896; }
  .quiz-option.wrong { background: rgba(255,75,110,0.2); border-color: #ff4b6e; color: #ff4b6e; }
  .quiz-progress { font-size: 11px; color: #888; margin-bottom: 8px; }
  .quiz-score { font-size: 13px; color: #00c896; font-weight: 700; text-align: center; padding: 10px; }

  .booking-form {
    background: rgba(0,149,246,0.08); border: 1px solid rgba(0,149,246,0.2);
    border-radius: 14px; padding: 14px; margin-top: 6px;
  }
  .booking-form input, .booking-form select {
    width: 100%; padding: 8px 10px; margin-bottom: 8px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; color: #fff; font-size: 12.5px; outline: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .booking-form input::placeholder { color: rgba(255,255,255,0.3); }
  .booking-form select option { background: #1a1f35; }
  .booking-submit {
    width: 100%; padding: 9px; background: linear-gradient(135deg, #0095f6, #00c896);
    border: none; border-radius: 8px; color: #fff; font-size: 13px;
    font-weight: 600; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .medicine-card {
    background: rgba(255,165,0,0.08); border: 1px solid rgba(255,165,0,0.2);
    border-radius: 10px; padding: 10px; margin-top: 4px;
  }
  .medicine-name { font-size: 14px; font-weight: 700; color: #ffa500; }
  .medicine-info { font-size: 12px; color: #bbc; line-height: 1.6; }
  .disclaimer { font-size: 11px; color: #ff4b6e; margin-top: 6px; padding: 5px 8px; background: rgba(255,75,110,0.1); border-radius: 6px; }

  .nav-notification {
    padding: 10px 14px; background: rgba(0,200,150,0.1);
    border: 1px solid rgba(0,200,150,0.25); border-radius: 10px;
    font-size: 12px; color: #00c896; display: flex; align-items: center; gap: 8px;
  }

  .prediction-card {
    margin-top: 8px; padding: 14px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1));
    border: 1px solid rgba(99,102,241,0.3);
  }
  .prediction-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .prediction-title { font-size: 13px; font-weight: 700; color: #a78bfa; }
  .prediction-score {
    font-size: 22px; font-weight: 900; padding: 4px 12px; border-radius: 10px;
  }
  .prediction-score.low { background: rgba(16,185,129,0.2); color: #10b981; }
  .prediction-score.moderate { background: rgba(245,158,11,0.2); color: #f59e0b; }
  .prediction-score.high { background: rgba(239,68,68,0.2); color: #ef4444; }
  .prediction-score.very-high { background: rgba(220,38,38,0.3); color: #dc2626; }
  .prediction-factors { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
  .prediction-factor {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 8px; border-radius: 8px; font-size: 11px;
    background: rgba(255,255,255,0.04);
  }
  .prediction-factor .name { color: #e8eaf6; font-weight: 600; }
  .prediction-factor .impact { font-weight: 700; }
  .prediction-factor .impact.increases { color: #ef4444; }
  .prediction-factor .impact.decreases { color: #10b981; }
  .prediction-factor .impact.neutral { color: #6b7280; }
  .prediction-advice {
    margin-top: 10px; padding: 8px 10px; border-radius: 8px;
    background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2);
    font-size: 11px; color: #fbbf24; line-height: 1.6;
  }

  .profile-action-card {
    margin-top: 8px; padding: 12px; border-radius: 12px;
    background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.08));
    border: 1px solid rgba(99,102,241,0.25);
    font-size: 12px; color: #818cf8; display: flex; align-items: center; gap: 10px;
  }
  .profile-action-card button {
    padding: 6px 14px; border-radius: 8px; border: none;
    background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
  }
  .profile-action-card button:hover { transform: scale(1.03); }

  .doctor-action-card {
    margin-top: 8px; padding: 12px; border-radius: 12px;
    background: linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.08));
    border: 1px solid rgba(6,182,212,0.25);
    font-size: 12px; color: #22d3ee; display: flex; align-items: center; gap: 10px;
  }
  .doctor-action-card button {
    padding: 6px 14px; border-radius: 8px; border: none;
    background: linear-gradient(135deg, #06b6d4, #0ea5e9); color: #fff;
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
  }
  .doctor-action-card button:hover { transform: scale(1.03); }

  .analytics-card {
    margin-top: 8px; padding: 12px; border-radius: 12px;
    background: linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.08));
    border: 1px solid rgba(34,197,94,0.25);
    font-size: 12px; color: #4ade80; display: flex; align-items: center; gap: 10px;
  }
  .analytics-card button {
    padding: 6px 14px; border-radius: 8px; border: none;
    background: linear-gradient(135deg, #22c55e, #10b981); color: #fff;
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: all 0.2s;
  }
  .analytics-card button:hover { transform: scale(1.03); }

  .agentic-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 800;
    background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.2));
    border: 1px solid rgba(99,102,241,0.3);
    color: #a78bfa; letter-spacing: 0.5px;
    animation: agenticPulse 2s infinite;
  }
  @keyframes agenticPulse {
    0%,100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function MediBotAgent({ userName = "Patient" }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [activeWidget, setActiveWidget] = useState(null);
  const [quizState, setQuizState] = useState(null);
  const [bookingData, setBookingData] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen && messages.length > 1) setUnreadCount((p) => p + 1);
  }, [messages]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  // Set welcome message based on language
  useEffect(() => {
    const welcomeFn = WELCOME_MESSAGES[language] || WELCOME_MESSAGES.en;
    setMessages([{
      id: 1,
      role: "bot",
      content: welcomeFn(userName),
      timestamp: new Date(),
    }]);
  }, [language, userName]);

  // ─── PLAY AUDIO (Sarvam TTS base64) ──────────────────────
  const playAudio = (base64Audio) => {
    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch(() => {});
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Audio playback failed', e);
    }
  };

  // ─── SEND MESSAGE (Multi-Agent Pipeline) ───────────────────
  const sendMessage = useCallback(
    async (text = input) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg = {
        id: Date.now(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
        image: imagePreview,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      const imageBase64 = uploadedImage;
      setUploadedImage(null);
      setImagePreview(null);

      try {
        const history = messages
          .filter((m) => m.role !== "system")
          .slice(-8)
          .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.content }));

        // ── For Indian languages: use Multi-Agent + Sarvam TTS ──
        const useMultiAgent = language !== 'en';

        if (useMultiAgent) {
          // Multi-agent pipeline with Sarvam voice
          const res = await fetch("/api/multi-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: trimmed,
              language,
              history,
              generateVoice: true,
              userName,
            }),
          });

          const data = await res.json();
          if (!data.success) throw new Error(data.error || 'Multi-agent failed');

          // Auto-play Sarvam TTS response
          if (data.audioBase64) playAudio(data.audioBase64);

          // Handle emergency
          if (data.agents?.emergency?.isEmergency) {
            router.push('/dashboard/emergency');
          }

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "bot",
              content: data.response,
              timestamp: new Date(),
              agentData: data.agents,
              hasAudio: !!data.audioBase64,
              audioBase64: data.audioBase64,
            },
          ]);

        } else {
          // English: use standard agentic AI
          history.push({ role: "user", content: trimmed });
          const res = await fetch("/api/agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "chat", messages: history, language, userName, imageBase64 }),
          });

          const data = await res.json();
          if (!data.success) throw new Error(data.error);

          // Handle tool actions
          if (data.toolResults?.length > 0) {
            for (const tr of data.toolResults) {
              const action = tr.result?.ui_action;
              if (action === "navigate" || action === "navigate_with_filter") {
                router.push(tr.result.url || "/dashboard");
              } else if (action === "open_quiz") {
                await startQuiz(tr.result.data);
              } else if (action === "open_booking_form") {
                setActiveWidget("booking");
                setBookingData(tr.result.data || {});
              }
            }
          }

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              role: "bot",
              content: data.content,
              timestamp: new Date(),
              toolResults: data.toolResults,
            },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            content: `⚠️ Sorry, I encountered an error: ${err.message}. Please try again.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, language, userName, uploadedImage, imagePreview, router]
  );

  // ─── VOICE INPUT (Sarvam STT for Indian languages) ────────
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);

  const toggleVoice = async () => {
    // Stop if recording
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // English: use browser Web Speech API (faster)
    if (language === 'en') {
      if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        alert("Speech recognition not supported in this browser.");
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      recognitionRef.current = rec;
      rec.lang = 'en-IN';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(transcript);
        setIsRecording(false);
        setTimeout(() => sendMessage(transcript), 400);
      };
      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);
      rec.start();
      setIsRecording(true);
      return;
    }

    // Indian languages: record audio → Sarvam STT → Multi-Agent
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsLoading(true);

        try {
          // Convert to blob and send to Sarvam STT
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const SARVAM_LANG_MAP = {
            hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
            ml: 'ml-IN', mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN',
            pa: 'pa-IN', or: 'od-IN', as: 'as-IN', ur: 'ur-IN',
            bho: 'hi-IN', mai: 'hi-IN', ne: 'hi-IN',
          };

          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('language', SARVAM_LANG_MAP[language] || 'hi-IN');

          const sttRes = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
          });

          const sttData = await sttRes.json();
          const transcript = sttData.transcript?.trim();

          if (transcript) {
            setInput(transcript);
            // Show transcript in chat
            setMessages(prev => [...prev, {
              id: Date.now(),
              role: 'user',
              content: transcript,
              timestamp: new Date(),
              voiceInput: true,
            }]);
            // Auto-send through multi-agent pipeline
            await sendMessage(transcript);
          } else {
            setMessages(prev => [...prev, {
              id: Date.now() + 1, role: 'bot',
              content: '🎤 Could not understand audio. Please speak clearly or type your message.',
              timestamp: new Date(),
            }]);
          }
        } catch (e) {
          console.error('STT error', e);
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 10000);

    } catch (e) {
      alert('Microphone access denied. Please allow microphone permission.');
      setIsRecording(false);
    }
  };

  // ─── TEXT TO SPEECH ───────────────────────────────────────
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ""));
    const langMap = { en: "en-IN", te: "te-IN", hi: "hi-IN", ta: "ta-IN", kn: "kn-IN", ml: "ml-IN", mr: "mr-IN", bn: "bn-IN", bho: "hi-IN" };
    utterance.lang = langMap[language] || "en-IN";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // ─── IMAGE UPLOAD ─────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target.result.split(",")[1]);
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ─── QUIZ FLOW ────────────────────────────────────────────
  const startQuiz = async (config) => {
    setActiveWidget("quiz");
    setIsLoading(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quiz",
          language,
          quizConfig: {
            topic: config?.topic || "general_health",
            difficulty: config?.difficulty || "medium",
            numQuestions: config?.num_questions || 5,
          },
        }),
      });
      const data = await res.json();
      if (data.questions?.length) {
        setQuizState({ questions: data.questions, current: 0, score: 0, answered: null, finished: false });
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: "bot", content: "🧠 **Health Quiz started!** Answer below 👇", timestamp: new Date(), isQuizStart: true },
        ]);
      }
    } catch {}
    setIsLoading(false);
  };

  const handleQuizAnswer = (option) => {
    if (!quizState || quizState.answered !== null) return;
    const current = quizState.questions[quizState.current];
    const correct = option.startsWith(current.correct);
    const newScore = correct ? quizState.score + 1 : quizState.score;
    setQuizState((prev) => ({ ...prev, answered: option, score: newScore }));
    setTimeout(() => {
      const nextIdx = quizState.current + 1;
      if (nextIdx >= quizState.questions.length) {
        setQuizState((prev) => ({ ...prev, finished: true, score: newScore }));
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(), role: "bot",
            content: `🎉 Quiz complete! You scored **${newScore}/${quizState.questions.length}**!\n${newScore >= quizState.questions.length * 0.7 ? "Excellent health knowledge! 🌟" : "Keep learning about health! 📚"}`,
            timestamp: new Date(),
          },
        ]);
        setActiveWidget(null);
        setQuizState(null);
      } else {
        setQuizState((prev) => ({ ...prev, current: nextIdx, answered: null }));
      }
    }, 1500);
  };

  // ─── BOOKING SUBMIT ───────────────────────────────────────
  const handleBookingSubmit = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(), role: "bot",
        content: `✅ Appointment booked!\n📋 **${bookingData.specialty || "General"}**\n📅 ${bookingData.date || "TBD"} at ${bookingData.time || "TBD"}\n👤 Patient: ${bookingData.patient_name || userName}\n\nYou'll receive a confirmation shortly.`,
        timestamp: new Date(),
      },
    ]);
    setActiveWidget(null);
    router.push("/dashboard/appointments");
  };

  // ─── RENDER MESSAGE ───────────────────────────────────────
  const renderMessage = (msg) => {
    const isBot = msg.role === "bot";
    return (
      <div key={msg.id} className={`msg-row ${isBot ? "bot" : "user"}`}>
        {isBot && <div className="msg-avatar-sm">🤖</div>}
        <div>
          <div className={`msg-bubble ${isBot ? "bot" : "user"}`}>
            {msg.image && (
              <img src={msg.image} alt="uploaded" style={{ width: "100%", borderRadius: 8, marginBottom: 6, maxHeight: 150, objectFit: "cover" }} />
            )}
            <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap", fontSize: "inherit" }}>
              {msg.content?.replace(/\*\*(.*?)\*\*/g, "$1")}
            </pre>
            {msg.toolResults?.map((tr, i) => {
              const r = tr.result;
              if (r?.ui_action === "navigate" || r?.ui_action === "navigate_with_filter") {
                return <div key={i} className="nav-notification">🗺️ {t('navigating') || 'Navigating to'} {r.page || r.url}...</div>;
              }
              if (r?.ui_action === "show_medicine_suggestions") {
                return (
                  <div key={i} className="medicine-card">
                    <div className="medicine-name">💊 Symptoms: {r.data?.symptoms?.join(", ")}</div>
                    <div className="medicine-info">Severity: {r.data?.severity}</div>
                    <div className="disclaimer">⚠️ {t('disclaimerText') || 'Always consult a licensed doctor before taking any medication.'}</div>
                  </div>
                );
              }
              if (r?.ui_action === "show_prediction" && r?.data) {
                const d = r.data;
                const scoreClass = d.riskScore < 20 ? 'low' : d.riskScore < 40 ? 'moderate' : d.riskScore < 60 ? 'high' : 'very-high';
                return (
                  <div key={i} className="prediction-card">
                    <div className="prediction-header">
                      <div>
                        <div className="prediction-title">🧬 {d.predictor || d.predictorType}</div>
                        <span className="agentic-badge">✦ AI PREDICTION</span>
                      </div>
                      <div className={`prediction-score ${scoreClass}`}>{d.riskScore}%</div>
                    </div>
                    <div style={{fontSize: 11, color: '#9ca3af', marginBottom: 6}}>Risk Level: <strong style={{color: scoreClass === 'low' ? '#10b981' : scoreClass === 'moderate' ? '#f59e0b' : '#ef4444'}}>{d.riskLevel}</strong></div>
                    {d.factors?.length > 0 && (
                      <div className="prediction-factors">
                        {d.factors.slice(0, 5).map((f, fi) => (
                          <div key={fi} className="prediction-factor">
                            <span className="name">{f.name}: {f.value}</span>
                            <span className={`impact ${f.impact}`}>{f.impact === 'increases' ? '⬆ Risk' : f.impact === 'decreases' ? '⬇ Safe' : '— Neutral'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {d.advice?.length > 0 && (
                      <div className="prediction-advice">
                        💡 {d.advice.slice(0, 3).join(' • ')}
                      </div>
                    )}
                    <button style={{marginTop:8,width:'100%',padding:'7px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}} onClick={() => router.push('/dashboard/predictors')}>
                      {t('predictorsTitle') || 'View All Predictors'} →
                    </button>
                  </div>
                );
              }
              if (r?.action === "MANAGE_PROFILE") {
                return (
                  <div key={i} className="profile-action-card">
                    <span>📋 {t('medicalProfile') || 'Opening your Medical Profile'}</span>
                    <button onClick={() => router.push('/dashboard/profile')}>{t('medicalProfile') || 'Go to Profile'} →</button>
                  </div>
                );
              }
              if (r?.action === "FIND_DOCTORS") {
                return (
                  <div key={i} className="doctor-action-card">
                    <span>👨‍⚕️ {r.message || t('findDoctors') || 'Browsing doctors'}</span>
                    <button onClick={() => router.push('/dashboard/doctors')}>{t('doctors') || 'View Doctors'} →</button>
                  </div>
                );
              }
              if (r?.action === "SHOW_ANALYTICS") {
                return (
                  <div key={i} className="analytics-card">
                    <span>📊 {r.message || t('analyticsTitle') || 'Opening health analytics'}</span>
                    <button onClick={() => router.push('/dashboard/analytics')}>{t('analyticsTitle') || 'View Analytics'} →</button>
                  </div>
                );
              }
              return null;
            })}

            {/* ── Multi-Agent Data Cards (Indian language responses) ── */}
            {msg.agentData && (() => {
              const { triage, medicine, hospital, emergency } = msg.agentData;
              return (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Emergency Banner */}
                  {emergency?.isEmergency && (
                    <div style={{ background: 'rgba(255,59,48,0.2)', border: '1px solid #ff3b30', borderRadius: 10, padding: '8px 12px', color: '#ff6b6b', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      🚨 {emergency.message || 'EMERGENCY — Call 108 immediately!'}
                    </div>
                  )}
                  {/* Severity Badge */}
                  {triage?.severity && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: triage.severity === 'emergency' ? 'rgba(255,59,48,0.25)' : triage.severity === 'severe' ? 'rgba(255,149,0,0.25)' : triage.severity === 'moderate' ? 'rgba(255,204,0,0.2)' : 'rgba(52,199,89,0.2)',
                        color: triage.severity === 'emergency' ? '#ff6b6b' : triage.severity === 'severe' ? '#ff9500' : triage.severity === 'moderate' ? '#ffd60a' : '#34c759',
                        border: `1px solid currentColor`
                      }}>
                        {triage.severity === 'emergency' ? '🚨' : triage.severity === 'severe' ? '⚠️' : triage.severity === 'moderate' ? '🟡' : '🟢'} {triage.severity?.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, color: '#888' }}>{hospital?.facilityType}</span>
                    </div>
                  )}
                  {/* Medicines */}
                  {medicine?.medicines?.length > 0 && (
                    <div className="medicine-card">
                      <div className="medicine-name">💊 Recommended Medicines</div>
                      {medicine.medicines.slice(0, 3).map((m, i) => (
                        <div key={i} className="medicine-info" style={{ marginTop: 4 }}>
                          <strong style={{ color: '#ffa500' }}>{m.name}</strong>{m.brand ? ` (${m.brand})` : ''} — {m.dosage}
                        </div>
                      ))}
                      {medicine.homeRemedies?.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#7dd3a8' }}>
                          🌿 {medicine.homeRemedies.slice(0, 3).join(' • ')}
                        </div>
                      )}
                      <div className="disclaimer">⚠️ {medicine.disclaimer || 'Always consult a doctor before taking any medicine.'}</div>
                    </div>
                  )}
                  {/* Hospital Recommendation */}
                  {hospital?.specialty && hospital.specialty !== 'General Medicine' && (
                    <div className="doctor-action-card">
                      <span>🏥 {hospital.specialty} • {hospital.facilityType}</span>
                      <button onClick={() => router.push('/dashboard/hospitals')}>Find Hospital →</button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          {isBot && (
            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
              <button
                onClick={() => msg.audioBase64 ? playAudio(msg.audioBase64) : speakText(msg.content)}
                style={{ background: 'none', border: 'none', color: '#555', fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}
                title={msg.audioBase64 ? 'Replay Sarvam voice' : 'Read aloud'}
              >
                {msg.audioBase64 ? '🔈' : '🔊'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── RENDER QUIZ ──────────────────────────────────────────
  const renderQuiz = () => {
    if (!quizState || quizState.finished) return null;
    const q = quizState.questions[quizState.current];
    return (
      <div className="quiz-container">
        <div className="quiz-progress">Question {quizState.current + 1}/{quizState.questions.length} • Score: {quizState.score}</div>
        <div className="quiz-question">{q.question}</div>
        {q.options.map((opt) => {
          let cls = "quiz-option";
          if (quizState.answered !== null) {
            if (opt.startsWith(q.correct)) cls += " correct";
            else if (opt === quizState.answered && !opt.startsWith(q.correct)) cls += " wrong";
          }
          return <button key={opt} className={cls} onClick={() => handleQuizAnswer(opt)} disabled={quizState.answered !== null}>{opt}</button>;
        })}
        {quizState.answered !== null && <div style={{ fontSize: 12, color: "#aab", marginTop: 8 }}>💡 {q.explanation}</div>}
      </div>
    );
  };

  // ─── RENDER BOOKING ───────────────────────────────────────
  const renderBookingForm = () => {
    if (activeWidget !== "booking") return null;
    const specialties = ["General Physician", "Cardiologist", "Dermatologist", "Orthopedic", "Pediatrician", "Neurologist", "ENT Specialist", "Gynecologist", "Ophthalmologist", "Psychiatrist"];
    return (
      <div className="booking-form">
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0095f6", marginBottom: 10 }}>📅 {t('bookAppointment') || 'Book Appointment'}</div>
        <input placeholder={t('patientName') || 'Your name'} defaultValue={userName} onChange={(e) => setBookingData((p) => ({ ...p, patient_name: e.target.value }))} />
        <select defaultValue={bookingData.specialty || ""} onChange={(e) => setBookingData((p) => ({ ...p, specialty: e.target.value }))}>
          <option value="" disabled>{t('specialty') || 'Select Specialty'}</option>
          {specialties.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="date" min={new Date().toISOString().split("T")[0]} onChange={(e) => setBookingData((p) => ({ ...p, date: e.target.value }))} />
        <input type="time" onChange={(e) => setBookingData((p) => ({ ...p, time: e.target.value }))} />
        <input placeholder={t('reasonForVisit') || 'Reason for visit'} onChange={(e) => setBookingData((p) => ({ ...p, reason: e.target.value }))} />
        <button className="booking-submit" onClick={handleBookingSubmit}>{t('confirmBooking') || 'Confirm Booking'} ✓</button>
        <button onClick={() => setActiveWidget(null)} style={{ width: "100%", padding: 8, background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer", marginTop: 6 }}>{t('cancel') || 'Cancel'}</button>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="medibot-container">
        <button className={`medibot-fab ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(!isOpen)} title="MediBot AI Assistant">
          {isOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <span style={{ fontSize: 26 }}>🤖</span>
          )}
          {!isOpen && unreadCount > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, background: "#ff4b6e", color: "#fff", fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="medibot-panel">
            <div className="medibot-header">
              {/* Mobile back button */}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'none',
                  background: 'none', border: 'none', color: '#aab',
                  fontSize: 22, cursor: 'pointer', padding: '0 4px',
                  lineHeight: 1, flexShrink: 0,
                }}
                className="medibot-close-mobile"
                title="Close"
              >←</button>
              <div className="medibot-avatar">🤖</div>
              <div className="medibot-header-info">
                <div className="medibot-title">MediBot AI <span className="agentic-badge">✦ AGENTIC AI · 12 TOOLS</span></div>
                <div className="medibot-subtitle">
                  <span className="medibot-online-dot" />
                  ⚡ Sarvam AI · Always available
                </div>
              </div>
              <select className="lang-selector" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {Object.entries(LANGUAGES).map(([code, { name, flag }]) => (
                  <option key={code} value={code}>{flag} {name}</option>
                ))}
              </select>
            </div>

            <div className="medibot-messages">
              {messages.map(renderMessage)}
              {quizState && !quizState.finished && renderQuiz()}
              {activeWidget === "booking" && renderBookingForm()}
              {isLoading && (
                <div className="msg-row bot">
                  <div className="msg-avatar-sm">🤖</div>
                  <div className="msg-bubble bot">
                    <div className="typing-indicator">
                      <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 2 && (
              <div className="quick-actions">
                {(QUICK_ACTIONS_I18N[language] || QUICK_ACTIONS_I18N.en).map((qa) => (
                  <button key={qa.label} className="quick-action-btn" onClick={() => sendMessage(qa.query)}>
                    {qa.icon} {qa.label}
                  </button>
                ))}
              </div>
            )}

            {imagePreview && (
              <div className="img-preview" style={{ padding: "4px 16px 0" }}>
                <img src={imagePreview} alt="preview" />
                <button className="img-preview-close" onClick={() => { setImagePreview(null); setUploadedImage(null); }}>✕</button>
              </div>
            )}

            <div className="medibot-input-row">
              <div className="input-actions">
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Upload image">📸</button>
                <button className={`icon-btn mic-btn ${isRecording ? 'active' : ''}`} onClick={toggleVoice} title={isRecording ? 'Stop recording' : 'Voice input'}>
                  {isRecording ? '⏹' : '🎤'}
                </button>
              </div>
              <textarea
                ref={inputRef}
                className="medibot-input"
                placeholder={`Ask me anything... (${LANGUAGES[language]?.name || "English"})`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                rows={1}
              />
              <button className="send-btn" onClick={() => sendMessage()} disabled={(!input.trim() && !imagePreview) || isLoading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2z"/>
                </svg>
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleImageUpload} />

          </div>
        )}
      </div>
    </>
  );
}
