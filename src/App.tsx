import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Layers, 
  ChevronDown, 
  Sparkles, 
  ArrowUp,
  Globe,
  Paperclip,
  Circle,
  Terminal,
  User,
  MoreVertical,
  Menu,
  ChevronUp,
  Plus,
  Search
} from 'lucide-react';
import { chatWithAI, AIProvider, ChatMessage, generateTitle, streamResponse } from './services/aiService';
import { ChatSession } from './types';
import { Sidebar } from './components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const THINKING_PHRASES = ["Thinking...", "The Shining Thinking...", "Reflecting...", "Forming response..."];

// Memoized message component for polished AI workspace look
const MessageItem = memo(({ message, provider }: { message: ChatMessage, provider?: string }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex flex-col gap-1.5 max-w-[90%] md:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Content area - No icons as per user request */}
        <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed transition-all ${
          isUser 
          ? 'bg-bg-alt border border-border text-text' 
          : 'bg-white text-text'
        }`}>
          <div className={`prose prose-neutral max-w-none prose-sm sm:prose-base prose-p:leading-relaxed prose-pre:bg-bg-alt prose-pre:border prose-pre:border-border prose-pre:rounded-xl transition-opacity duration-200 ${message.isStreaming ? 'opacity-90' : 'opacity-100'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content + (message.isStreaming ? ' ●' : '')}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

MessageItem.displayName = 'MessageItem';

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('framr_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<AIProvider>(AIProvider.GEMINI);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [thinkingIndex, setThinkingIndex] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync sidebar state
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Sync sessions to localStorage
  useEffect(() => {
    localStorage.setItem('framr_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setThinkingIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      provider: activeProvider,
      isPinned: false,
      createdAt: Date.now(),
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    let currentSessionId = activeSessionId;
    let currentSessions = [...sessions];

    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        provider: activeProvider,
        isPinned: false,
        createdAt: Date.now(),
      };
      currentSessions = [newSession, ...currentSessions];
      currentSessionId = newSession.id;
      setSessions(currentSessions);
      setActiveSessionId(currentSessionId);
    }

    const userMessage: ChatMessage = { role: 'user', content: input };
    const sessionToUpdate = currentSessions.find(s => s.id === currentSessionId);
    if (!sessionToUpdate) return;

    const updatedMessages = [...sessionToUpdate.messages, userMessage];
    sessionToUpdate.messages = updatedMessages;
    setSessions([...currentSessions]);
    
    setInput('');
    setIsLoading(true);
    setShowReasoning(false);

    try {
      const fullResponse = await chatWithAI(updatedMessages, activeProvider);
      
      // Initialize streaming message
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: '', 
        isStreaming: true 
      };
      
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, assistantMessage] };
        }
        return s;
      }));

      // Flush updates in batches to the UI
      await streamResponse(
        fullResponse,
        (currentText) => {
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              const msgs = [...s.messages];
              if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: currentText };
              }
              return { ...s, messages: msgs };
            }
            return s;
          }));
        },
        () => {
          // Finalize session
          setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
              const msgs = [...s.messages];
              if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], isStreaming: false };
              }
              
              // Handle Title Generation
              if (s.title === 'New Chat' && msgs.length >= 2) {
                generateTitle(userMessage.content).then(newTitle => {
                  setSessions(current => current.map(cs => cs.id === s.id ? { ...cs, title: newTitle } : cs));
                });
              }

              return { ...s, messages: msgs };
            }
            return s;
          }));
          setIsLoading(false);
        }
      );

    } catch (error: any) {
      console.error('Chat error:', error);
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { 
            ...s, 
            messages: [...s.messages, { 
              role: 'assistant', 
              content: "I encountered an error. Please check your AI provider configuration." 
            }] 
          };
        }
        return s;
      }));
      setIsLoading(false);
    }
  };

  const deleteSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    if (activeSessionId === id) setActiveSessionId(null);
  };

  const renameSession = (id: string, newTitle: string) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, title: newTitle } : s));
  };

  const pinSession = (id: string) => {
    setSessions(sessions.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
  };  const [showReasoning, setShowReasoning] = useState(false);

  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.plus-menu-container') && !target.closest('.model-menu-container')) {
        setIsPlusMenuOpen(false);
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-bg overflow-hidden text-text selection:bg-black/5 selection:text-black">
      <Sidebar 
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={createNewChat}
        onSelectSession={setActiveSessionId}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        onPinSession={pinSession}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col relative min-w-0 h-full bg-white">
        {/* Floating Toggle for Sidebar */}
        <AnimatePresence>
          {isSidebarCollapsed && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => setIsSidebarCollapsed(false)}
              className="absolute top-4 left-4 p-2 bg-white border border-border rounded-xl shadow-sm hover:bg-bg-alt z-50 transition-all active:scale-95"
            >
              <Menu className="w-5 h-5 text-text" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Main Conversation Area - Notion-like centered scrollable */}
        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth flex flex-col relative">
          <div className={`flex flex-col w-full max-w-[900px] mx-auto px-6 ${messages.length === 0 ? 'flex-1 justify-center' : 'py-12'}`}>
            <AnimatePresence mode="wait">
              {messages.length === 0 ? (
                <motion.div 
                  key="welcome"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex flex-col items-center justify-center text-center -mt-20"
                >
                  <div className="mb-8 p-3 rounded-2xl bg-bg-alt border border-border inline-flex">
                    <Sparkles className="w-6 h-6 text-black/20" />
                  </div>
                  <h1 className="text-3xl font-bold text-text tracking-tight mb-4">
                    Welcome to Framr AI
                  </h1>
                  <p className="text-text-dim text-sm max-w-sm mb-12 leading-relaxed">
                    Collaborate with Gemini, Groq, and NVIDIA models in a single, minimal environment.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-xl">
                    {[
                      "Explain quantum computing in simple terms",
                      "Write a professional email to a client",
                      "Analyze current AI market trends",
                      "Help me design a minimal dashboard"
                    ].map((s) => (
                      <button 
                        key={s}
                        onClick={() => { setInput(s); }}
                        className="px-4 py-3 rounded-xl border border-border text-sm text-text-dim hover:border-text/20 hover:text-text hover:bg-bg-alt transition-all text-left bg-white shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-10">
                  {messages.map((message, index) => (
                    <MessageItem key={index} message={message} provider={activeSession?.provider} />
                  ))}

                  {isLoading && (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-5 h-5 rounded-full border-2 border-border border-t-black animate-spin" />
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-white animate-pulse rounded-full" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-text tracking-tight animate-shimmer bg-[length:200%_100%] bg-clip-text text-transparent bg-gradient-to-r from-text-dim via-text to-text-dim">
                            {THINKING_PHRASES[thinkingIndex]}
                          </span>
                          <span className="text-[10px] text-text-dim/60 font-medium uppercase tracking-[0.2em] animate-pulse">Shining Wisdom</span>
                        </div>
                      </div>
                      
                      {isSearchEnabled && (
                        <div className="flex items-center gap-4 animate-fade-in pl-1">
                          <div className="p-1.5 rounded-lg bg-blue-50">
                            <Globe className="w-4 h-4 text-blue-500 animate-spin-slow" />
                          </div>
                          <span className="text-[11px] text-blue-500 font-bold uppercase tracking-[0.15em]">Browsing Neural Web...</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </AnimatePresence>

            {/* Prompt Area Container - Floating in middle when empty, sticky at bottom otherwise */}
            <div className={`w-full transition-all duration-700 ${messages.length === 0 ? 'mt-12' : 'sticky bottom-0 pb-4 pt-2 -mx-6 px-6 bg-white z-40'}`}>
              <div className="max-w-[900px] mx-auto w-full">
                <div className={`flex flex-col bg-white border border-border rounded-[28px] shadow-sm focus-within:shadow-md focus-within:border-text/20 transition-all relative ${isSearchEnabled || showReasoning ? 'pt-2' : ''}`}>
                  {/* Active Tools Section - Displayed above input if active */}
                  <AnimatePresence>
                    {(isSearchEnabled || showReasoning) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex px-4 py-2 gap-2 flex-wrap border-b border-border/10 mb-1"
                      >
                        {isSearchEnabled && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50/50 text-blue-600 rounded-full text-[11px] font-bold uppercase tracking-wider border border-blue-100/50">
                            <Globe className="w-3 h-3" />
                            <span>Web Search</span>
                            <button onClick={() => setIsSearchEnabled(false)} className="ml-1 hover:text-blue-800 transition-colors">×</button>
                          </div>
                        )}
                        {showReasoning && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-bg-alt/50 text-text rounded-full text-[11px] font-bold uppercase tracking-wider border border-border">
                            <Terminal className="w-3 h-3" />
                            <span>Thinking Mode</span>
                            <button onClick={() => setShowReasoning(false)} className="ml-1 hover:text-text-dim transition-colors">×</button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="Ask me anything..."
                    className="w-full px-5 py-4 pb-12 bg-transparent resize-none text-[15px] text-text border-none focus:ring-0 min-h-[56px] max-h-[30vh] custom-scrollbar leading-relaxed"
                    rows={1}
                  />
                  
                  <div className="absolute bottom-1.5 left-0 right-0 h-10 flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      {/* Plus Menu Toggle - No Box */}
                      <div className="relative plus-menu-container">
                        <button 
                          onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                          className={`flex items-center gap-1 text-text-dim hover:text-text transition-colors p-1 rounded-full hover:bg-bg-alt ${isPlusMenuOpen ? 'text-text' : ''}`}
                        >
                          <Plus className={`w-5 h-5 transition-transform duration-200 ${isPlusMenuOpen ? 'rotate-45' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isPlusMenuOpen && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.98, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.98, y: 10 }}
                              className="absolute bottom-full left-0 mb-4 w-56 bg-white border border-border shadow-2xl rounded-2xl overflow-hidden py-1 z-50"
                            >
                              <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-text-dim border-b border-border/50 mb-1">Tools</div>
                              <button 
                                onClick={() => { setIsSearchEnabled(!isSearchEnabled); setIsPlusMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-bg-alt transition-colors font-medium"
                              >
                                <Globe className={`w-4 h-4 ${isSearchEnabled ? 'text-blue-500' : 'text-text-dim'}`} />
                                <span className="flex-1 text-left">Web Search</span>
                                {isSearchEnabled && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              </button>
                              <button 
                                onClick={() => { setShowReasoning(!showReasoning); setIsPlusMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-bg-alt transition-colors font-medium"
                              >
                                <Terminal className="w-4 h-4 text-text-dim" />
                                <span className="flex-1 text-left">Thinking Mode</span>
                                {showReasoning && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Model Selector - Minimalist No Box */}
                      <div className="relative model-menu-container">
                        <button 
                          onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                          className="flex items-center gap-1.5 text-text-dim hover:text-text transition-colors p-1.5 rounded-full hover:bg-bg-alt"
                        >
                          <span className="text-[12px] font-bold text-text-dim tracking-tight uppercase px-1">
                            {activeProvider}
                          </span>
                          <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 rotate-180 ${isModelMenuOpen ? 'rotate-0' : 'rotate-180'}`} />
                        </button>

                        <AnimatePresence>
                          {isModelMenuOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.98 }}
                              className="absolute bottom-full left-0 mb-4 w-64 bg-white border border-border shadow-2xl rounded-2xl overflow-hidden py-1 z-50"
                            >
                              <div className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-text-dim border-b border-border/50 mb-1">Select Model</div>
                              {[
                                { id: AIProvider.GEMINI, desc: 'Advanced reasoning and context' },
                                { id: AIProvider.GROQ, desc: 'Ultra-fast inference speed' },
                                { id: AIProvider.NVIDIA, desc: 'High performance compute' }
                              ].map((prov) => (
                                <button
                                  key={prov.id}
                                  onClick={() => {
                                    setActiveProvider(prov.id as AIProvider);
                                    setIsModelMenuOpen(false);
                                  }}
                                  className={`w-full flex flex-col items-start px-4 py-3 text-sm hover:bg-bg-alt transition-colors ${activeProvider === prov.id ? 'bg-bg-alt/50' : ''}`}
                                >
                                  <span className="font-bold text-text text-[13px]">{prov.id}</span>
                                  <span className="text-[11px] text-text-dim font-normal text-left">{prov.desc}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button className="p-2 hover:bg-bg-alt rounded-full transition-all text-text-dim hover:text-text group">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`flex items-center justify-center w-9 h-9 rounded-full transition-all ${
                          input.trim() && !isLoading 
                          ? 'bg-black text-white hover:bg-black/90 shadow-md active:scale-95' 
                          : 'bg-bg-alt text-text-dim/20'
                        }`}
                      >
                        <ArrowUp className="w-4.5 h-4.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] text-text-dim/40 mt-3 font-medium">
                  Framr AI can make mistakes. Check important info.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

