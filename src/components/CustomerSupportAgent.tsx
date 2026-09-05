import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bell, ShieldCheck, CreditCard, Sparkles, HelpCircle, MessageSquare, Award, Trash2, Facebook, Twitter, Instagram, MessageCircle, Globe } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

interface CustomerSupportAgentProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'sw';
}

const getLocaleDetails = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Nairobi";
    const userLang = navigator.language || "en-KE";
    return `${timezone} (${userLang})`;
  } catch (_) {
    return "Africa/Nairobi (en-KE)";
  }
};

export default function CustomerSupportAgent({ isOpen, onClose, language }: CustomerSupportAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested questions based on language
  const suggestions = language === 'en' ? [
    { text: "What are the accepted payment methods?", icon: CreditCard },
    { text: "How do I upgrade to VIP Premium?", icon: CreditCard },
    { text: "What is customer support email & phone number?", icon: MessageSquare },
    { text: "How do league alert notifications work?", icon: Bell }
  ] : [
    { text: "Njia zipi za malipo zinazokubaliwa?", icon: CreditCard },
    { text: "Ninalipia vipi kujiunga na VIP Premium?", icon: CreditCard },
    { text: "Nambari na barua pepe ya huduma kwa wateja ni gani?", icon: MessageSquare },
    { text: "Arifa za ligi hufanya kazi vipi?", icon: Bell }
  ];

  const welcomeMessage = language === 'en'
    ? "Hello! I'm **Rafiki Support AI**, your personal customer success representative. Ask me any questions about our payment options (**M-Pesa Buy Goods Till 6881472 - John Mushira**, **M-Pesa Send Money 0716483642**, **Airtel Money 0735309361**, **T-Kash 0773266691**, **Equity Bank 0620187419406**, **Payoneer/Pesapal/Skrill johnmushira@gmail.com**, **Visa 4478 **** **** 9885**), customer support contacts (**0716483642 / rafikibc1000@gmail.com**), or upgrading to **VIP Premium**! How can I assist you today?"
    : "Habari! Mimi ni **Rafiki Support AI**, msaidizi wako wa huduma kwa wateja. Niulize maswali yoyote kuhusu njia zetu za malipo (**M-Pesa Buy Goods Till 6881472 - John Mushira**, **M-Pesa Send Money 0716483642**, **Airtel Money 0735309361**, **T-Kash 0773266691**, **Equity Bank 0620187419406**, **Payoneer/Pesapal/Skrill johnmushira@gmail.com**, **Visa 4478 **** **** 9885**), mawasiliano ya msaada (**0716483642 / rafikibc1000@gmail.com**), au kujiunga na **VIP Premium**! Ningependa kukusaidia vipi leo?";

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rafiki-customer-support-chat-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } else {
        setMessages([
          {
            id: 'welcome',
            sender: 'agent',
            text: welcomeMessage,
            timestamp: new Date()
          }
        ]);
      }
    } catch (e) {
      console.error("Failed to load customer support chat history", e);
    }
  }, [language, welcomeMessage]);

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('rafiki-customer-support-chat-v1', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/customer-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          language,
          locale: getLocaleDetails()
        })
      });

      if (!response.ok) {
        throw new Error("Customer support API call failed");
      }

      const data = await response.json();
      
      const agentMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        text: data.answer || (language === 'en' ? "I apologize, but I couldn't generate a reply right now. Please try again." : "Samahani, sikufaulu kujibu kwa sasa. Tafadhali jaribu tena."),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (err) {
      console.error("Error sending message to Support Agent:", err);
      const errorMessage: Message = {
        id: `msg-err-${Date.now()}`,
        sender: 'agent',
        text: language === 'en' 
          ? "My apologies, I encountered a brief network glitch. Let's try that again in a second."
          : "Samahani sana, nimepata hitilafu ndogo ya mtandao. Hebu tujaribu tena baada ya sekunde moja.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    handleSend(suggestionText);
  };

  const clearChat = () => {
    if (window.confirm(language === 'sw' ? 'Je, ungependa kufuta historia yote ya mazungumzo?' : 'Do you want to delete all conversation history?')) {
      const welcomeMsg = {
        id: 'welcome',
        sender: 'agent',
        text: welcomeMessage,
        timestamp: new Date()
      };
      setMessages([welcomeMsg]);
      localStorage.removeItem('rafiki-customer-support-chat-v1');
    }
  };

  // Safe client-side markdown formatter
  const formatMessageText = (text: string) => {
    const parseBold = (raw: string) => {
      const parts = raw.split(/\*\*([^*]+)\*\*/g);
      return parts.map((part, idx) => {
        if (idx % 2 === 1) {
          return <strong key={idx} className="font-sans font-black text-blue-400">{part}</strong>;
        }
        return part;
      });
    };

    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-gray-300 leading-relaxed mb-1">
            {parseBold(trimmed.substring(2))}
          </li>
        );
      }
      return (
        <p key={idx} className="text-xs text-gray-200 leading-relaxed mb-2 last:mb-0">
          {parseBold(line)}
        </p>
      );
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs cursor-pointer"
          />

          {/* Chat drawer container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-zinc-950 border-l border-zinc-900 shadow-2xl z-50 flex flex-col justify-between overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center relative">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-zinc-950 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-sans font-black text-white tracking-tight flex items-center gap-1.5">
                    Rafiki Support AI
                    <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold rounded-md border border-blue-500/20 uppercase tracking-widest">Agent</span>
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono">
                    {language === 'en' ? 'Online • Ready to Assist' : 'Yuko Mtandaoni • Tayari Kukusaidia'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearChat}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-zinc-800/50 rounded-xl transition-all active:scale-95 cursor-pointer"
                  title={language === 'en' ? "Clear conversation history" : "Futa mazungumzo"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Official Social Media Channels Banner */}
            <div className="px-3.5 py-2 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                {language === 'en' ? 'Channels:' : 'Mitandao:'}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href="https://chat.whatsapp.com/IWwD0roFnr70ulTORf8vBQ?s=cl&p=a&mlu=4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-medium transition-all"
                  title="WhatsApp Community Group"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href="https://t.me/+QXMSJqVZWMo1NTU0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 rounded-lg text-[10px] font-medium transition-all"
                  title="Telegram VIP Channel"
                >
                  <Send className="w-3 h-3" />
                  <span>Telegram</span>
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61593522495692"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg text-[10px] font-medium transition-all"
                  title="Official Facebook Page"
                >
                  <Facebook className="w-3 h-3" />
                  <span>Facebook</span>
                </a>
                <a
                  href="https://x.com/Blaisejondez"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-gray-300 hover:text-white rounded-lg text-[10px] font-medium transition-all"
                  title="Twitter / X (@Blaisejondez)"
                >
                  <Twitter className="w-3 h-3" />
                  <span>Twitter</span>
                </a>
                <a
                  href="https://www.instagram.com/rafikisportspredict?igsi=MXJzMXFtb2U2M2hhZg=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-400 rounded-lg text-[10px] font-medium transition-all"
                  title="Official Instagram (@rafikisportspredict)"
                >
                  <Instagram className="w-3 h-3" />
                  <span>Instagram</span>
                </a>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5 shadow-md">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    <div className="max-w-[80%] space-y-1">
                      <div className={`p-3.5 rounded-2xl border text-xs shadow-lg ${
                        isUser
                          ? 'bg-zinc-900 border-zinc-800 text-white rounded-tr-none'
                          : 'bg-zinc-900/40 border-zinc-900 text-gray-100 rounded-tl-none relative overflow-hidden'
                      }`}>
                        {!isUser && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                        )}
                        <div className={!isUser ? "pl-1.5" : ""}>
                          {formatMessageText(msg.text)}
                        </div>
                      </div>
                      <span className={`block text-[9px] font-mono text-gray-500 ${isUser ? 'text-right pr-1' : 'pl-2'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {loading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-900/60 p-3.5 rounded-2xl rounded-tl-none shadow-lg max-w-[80%]">
                    <div className="flex items-center gap-1.5 py-1 px-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions panel (Only shown when not loading & empty or user just got a response) */}
            {!loading && (
              <div className="p-3 border-t border-zinc-900 bg-zinc-950/80 space-y-2">
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider px-1">
                  {language === 'en' ? 'Suggested Topics' : 'Mada Yanayopendekezwa'}
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {suggestions.map((sug, idx) => {
                    const IconComp = sug.icon;
                    return (
                      <button
                        key={`support-sug-${idx}`}
                        onClick={() => handleSuggestionClick(sug.text)}
                        className="text-left w-full p-2 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-[11px] font-medium text-gray-300 hover:text-white rounded-xl transition-all active:scale-98 flex items-center gap-2 cursor-pointer"
                      >
                        <div className="p-1 rounded-lg bg-zinc-950 text-blue-400 border border-zinc-850 shrink-0">
                          <IconComp className="w-3 h-3" />
                        </div>
                        <span className="truncate">{sug.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-4 bg-zinc-900/50 border-t border-zinc-800/80 flex items-center gap-2.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={language === 'en' ? "Describe your issue or ask a question..." : "Eleza tatizo lako au uliza swali..."}
                disabled={loading}
                className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 text-xs text-white rounded-xl py-2.5 px-3.5 outline-none font-sans placeholder-gray-500 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-800 disabled:text-gray-600 text-black rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/15"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
