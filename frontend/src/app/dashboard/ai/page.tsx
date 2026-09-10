'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Paperclip, MoreVertical, Sparkles, Activity, Loader2, Trash2 } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import HealthcareCTA from '@/components/HealthcareCTA';
import { useLanguage } from '@/context/LanguageContext';

interface Message {
  id: number;
  role: 'user' | 'ai';
  text: string;
  time: string;
}

export default function AIAssistant() {
  const { user } = useUser();
  const { t, language } = useLanguage();
  const firstName = user?.firstName || 'there';

  const [messages, setMessages] = useState<Message[]>([]);

  // Set initial greeting with real user name
  useEffect(() => {
    setMessages([{
      id: 1,
      role: 'ai',
      text: `Hello, ${firstName}. I am **Arogya AI**, your personal healthcare assistant. I can help you analyze medical reports, check your symptoms, or answer any health-related questions. How can I assist you today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  }, [firstName]);
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
            <button onClick={clearChat}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors border border-slate-200">
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
