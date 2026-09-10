import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Sparkles, ChevronUp, User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';

interface Message {
  id: number;
  role: 'user' | 'ai';
  text: string;
  time: string;
}

interface QuickLink {
  label: string;
  href: string;
}

interface AIFloatingPanelProps {
  featureName: string;
  context: string;
  quickPrompts?: string[];
  quickLinks?: QuickLink[];
}

export default function AIFloatingPanel({ featureName, context, quickPrompts = [], quickLinks = [] }: AIFloatingPanelProps) {
  const { user } = useUserRole();
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with context-aware greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: Date.now(),
        role: 'ai',
        text: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your AI assistant for **${featureName}**. How can I help you?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  }, [isOpen, messages.length, featureName, user?.name]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async (textToSubmit: string = input) => {
    if (!textToSubmit.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      text: textToSubmit.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    const aiMessageId = Date.now() + 1;
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'ai',
      text: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, aiMessage]);

    try {
      // Build conversation history for API, prepending system context
      const conversationHistory = [
        { role: 'system', content: `You are Arogya AI assisting with the ${featureName} feature. Context: ${context}. Keep answers concise and helpful.` },
        ...messages.map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text,
        })),
        { role: 'user', content: userMessage.text }
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory, userName: user?.name?.split(' ')[0] || 'User', language }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

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
                  setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, text: fullText } : m));
                }
              } catch { }
            }
          }
        }
      }
    } catch (error: any) {
      setMessages(prev => prev.map(m => m.id === aiMessageId ? { ...m, text: `⚠️ Error: ${error.message}` } : m));
    }
    setIsStreaming(false);
  };

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
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-transform flex items-center justify-center animate-bounce"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-300"></span>
          </span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[550px] max-h-[80vh] bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-300">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-xl">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">AI Assistant</h3>
                <p className="text-[11px] text-emerald-100 font-medium">Context: {featureName}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-emerald-100 hover:text-white transition-colors">
              <ChevronUp className="h-5 w-5 translate-y-0.5 rotate-180" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                  }`}>
                    {renderText(msg.text) || <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium px-1">{msg.time}</span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          {!isStreaming && messages.length < 3 && quickPrompts.length > 0 && (
            <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="whitespace-nowrap px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100">
            <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about this feature..."
                disabled={isStreaming}
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm placeholder:text-slate-400 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="absolute right-2 p-2 bg-emerald-600 text-white rounded-lg disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
