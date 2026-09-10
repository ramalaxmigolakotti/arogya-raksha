'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Paperclip, MoreVertical, Sparkles, Activity, Loader2, Trash2 } from 'lucide-react';
import HealthcareCTA from '@/components/HealthcareCTA';
import { useLanguage } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';
import { persistMedicalRecord } from '@/lib/medicalHistoryService';
import FeaturePastHistoryModal from '@/components/FeaturePastHistoryModal';


interface Message {
  id: number;
  role: 'user' | 'ai';
  text: string;
  time: string;
}

export default function AIAssistant() {
  const { user } = useUser();
  const { user: userProfile } = useUserRole();
  const { t, language } = useLanguage();
  const firstName = user?.firstName || userProfile?.name?.split(' ')[0] || 'there';

  const [messages, setMessages] = useState<Message[]>([]);

  const LANG_GREETINGS: Record<string, string> = {
    en: `Hello, ${firstName}. I am **Arogya AI**, your personal healthcare assistant. I can help you analyze medical reports, check your symptoms, or answer any health-related questions. How can I assist you today?`,
    hi: `नमस्ते, ${firstName}। मैं **Arogya AI** हूँ, आपका व्यक्तिगत स्वास्थ्य सहायक। मैं आपकी मेडिकल रिपोर्ट का विश्लेषण करने, आपके लक्षणों की जांच करने, या किसी भी स्वास्थ्य संबंधी प्रश्न का उत्तर देने में मदद कर सकता हूँ। आज मैं आपकी कैसे मदद कर सकता हूँ?`,
    te: `నమస్కారం, ${firstName}. నేను **Arogya AI**, మీ వ్యక్తిగత ఆరోగ్య సహాయకుడిని. మీ వైద్య నివేదికలను విశ్లేషించడంలో, మీ లక్షణాలను తనిఖీ చేయడంలో లేదా ఆరోగ్య సంబంధిత ప్రశ్నలకు సమాధానం ఇవ్వడంలో నేను సహాయం చేయగలను. ఈ రోజు నేను మీకు ఎలా సహాయం చేయగలను?`,
    ta: `வணக்கம், ${firstName}. நான் **Arogya AI**, உங்கள் தனிப்பட்ட சுகாதார உதவியாளர். மருத்துவ அறிக்கைகளை பகுப்பாய்வு செய்வது, அறிகுறிகளை சரிபார்ப்பது அல்லது சுகாதார கேள்விகளுக்கு பதிலளிப்பது போன்றவற்றில் உதவ முடியும். இன்று உங்களுக்கு எப்படி உதவலாம்?`,
    kn: `ನಮಸ್ಕಾರ, ${firstName}. ನಾನು **Arogya AI**, ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಆರೋಗ್ಯ ಸಹಾಯಕ. ವೈದ್ಯಕೀಯ ವರದಿಗಳನ್ನು ವಿಶ್ಲೇಷಿಸಲು, ರೋಗಲಕ್ಷಣಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಅಥವಾ ಆರೋಗ್ಯ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರ ನೀಡಲು ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`,
    mr: `नमस्कार, ${firstName}. मी **Arogya AI** आहे, तुमचा वैयक्तिक आरोग्य सहाय्यक. मी तुमच्या वैद्यकीय अहवालांचे विश्लेषण करण्यात, लक्षणे तपासण्यात किंवा आरोग्य प्रश्नांची उत्तरे देण्यात मदत करू शकतो. आज मी तुम्हाला कशी मदत करू?`,
    bn: `নমস্কার, ${firstName}। আমি **Arogya AI**, আপনার ব্যক্তিগত স্বাস্থ্য সহায়ক। আমি আপনার মেডিকেল রিপোর্ট বিশ্লেষণ করতে, লক্ষণ পরীক্ষা করতে বা স্বাস্থ্য সংক্রান্ত প্রশ্নের উত্তর দিতে সাহায্য করতে পারি। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?`,
    bho: `प्रणाम, ${firstName}। हम **Arogya AI** हईं, रउआ के निजी स्वास्थ्य सहायक। हम रउआ के मेडिकल रिपोर्ट के जांच करे में, लक्षण देखे में आ स्वास्थ्य संबंधी सवालन के जवाब देवे में मदद कर सकत बानी। आज हम रउआ के कइसे मदद करीं?`,
  };

  // Set initial greeting with real user name — language-aware
  useEffect(() => {
    const greeting = LANG_GREETINGS[language] || LANG_GREETINGS['en'];
    setMessages([{
      id: 1,
      role: 'ai',
      text: greeting,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  }, [firstName, language]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    // Create placeholder AI message
    const aiMessageId = Date.now() + 1;
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'ai',
      text: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      // Build conversation history for API
      const conversationHistory = messages
        .filter(m => m.id !== 1) // skip initial greeting
        .map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text,
        }));
      conversationHistory.push({ role: 'user', content: userMessage.text });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory, userName: user?.firstName || 'User', language }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to get AI response');
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let fullText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullText += parsed.content;
                  setMessages(prev =>
                    prev.map(m => m.id === aiMessageId ? { ...m, text: fullText } : m)
                  );
                }
              } catch {
                // skip
              }
            }
          }
        }

        // Auto-save consultation to persistent authenticated history
        if (fullText.trim()) {
          persistMedicalRecord(userProfile?.id || 'usr_pat_8812', {
            type: 'ai_doctor_consultation',
            title: `AI Consultation: ${userMessage.text.slice(0, 45)}...`,
            userQuery: userMessage.text,
            aiResponse: fullText,
            summary: fullText.slice(0, 160),
            metadata: {
              language,
              time: userMessage.time,
            },
          }).catch(() => {});
        }
      }
    } catch (error: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMessageId
            ? { ...m, text: `⚠️ Sorry, I encountered an error: ${error.message}. Please try again.` }
            : m
        )
      );
    }

    setIsStreaming(false);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      role: 'ai',
      text: `Chat cleared. How can I help you today, ${firstName}?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  // Simple markdown-like rendering for bold text
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl -mx-40 -my-40 opacity-50 z-0 pointer-events-none"></div>

      {/* Chat Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white/50 backdrop-blur-sm z-10">
         <div className="flex items-center gap-4">
            <div className="relative">
               <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                 <Bot className="h-6 w-6 text-white" />
               </div>
               <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
               <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 {t('askAIDoctorTitle')}
                 <Sparkles className="h-4 w-4 text-emerald-500" />
               </h2>
               <p className="text-sm text-emerald-600 font-medium">
                 {isStreaming ? `✍️ ${t('typingStatus')}` : t('alwaysOnline')}
               </p>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <FeaturePastHistoryModal
              featureTitle="AI Consultations"
              types={['ai_doctor_consultation', 'symptom_check']}
              icon="🤖"
              buttonLabel="Past Consultations"
            />
            <button onClick={clearChat}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors border border-slate-200">
               <Trash2 className="h-4 w-4" /> {t('clearChat')}
            </button>
         </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 z-10 scroll-smooth">
         <div className="text-center">
            <span className="bg-slate-100 text-slate-500 text-xs font-semibold px-3 py-1 rounded-full">{t('today')}</span>
         </div>

         {messages.map((msg) => (
           <div key={msg.id} className={`flex max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>

             <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-100 ml-4' : 'bg-emerald-100 mr-4'}`}>
               {msg.role === 'user' ? <User className="h-5 w-5 text-slate-600" /> : <Activity className="h-5 w-5 text-emerald-600" />}
             </div>

             <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
               <div className={`p-4 rounded-2xl ${
                 msg.role === 'user'
                   ? 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/10'
                   : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
               }`}>
                 <p className="text-[15px] leading-relaxed relative z-10 whitespace-pre-wrap">
                   {msg.text || (
                     <span className="flex items-center gap-2 text-slate-400">
                       <Loader2 className="h-4 w-4 animate-spin" /> {t('thinking')}
                     </span>
                   )}
                 </p>
               </div>
               <span className="text-xs text-slate-400 mt-1 font-medium px-1">{msg.time}</span>
             </div>
           </div>
         ))}
         <div ref={chatEndRef} />
      </div>

      {/* Healthcare CTA — Loan & Nearby Hospitals */}
      {messages.length > 3 && (
        <div className="px-4 pt-3 pb-0 z-10 border-t border-emerald-100 bg-emerald-50/30">
          <HealthcareCTA variant="compact" context="Need treatment? Explore financial options or find hospitals" />
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 z-10">
         <form onSubmit={handleSend} className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('askPlaceholder')}
              disabled={isStreaming}
              className="w-full pl-5 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal shadow-inner shadow-slate-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={`absolute right-3 p-2.5 rounded-xl flex items-center justify-center transition-all ${
                input.trim() && !isStreaming
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:-translate-y-0.5'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-0.5" />}
            </button>
         </form>
         <div className="text-center mt-3">
           <p className="text-xs text-slate-400 font-medium">{t('aiDisclaimer')}</p>
         </div>
      </div>
    </div>
  );
}
