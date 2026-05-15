import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BrainCircuit, Send, Sparkles, User, Loader2, BookOpen, MessageSquarePlus, MessageSquare } from 'lucide-react';
import { askAssistant } from '../lib/gemini';
import { cn } from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';

// We need to define links again or pass them via props, but for simplicity we'll just import them or redefine
import { LayoutDashboard, FileText, Target, Calendar, Settings, Video, Trash2, TrendingUp } from 'lucide-react';
const studentLinks = [
  { label: 'Dashboard', path: '/dashboard/student', icon: LayoutDashboard, color: '#3b82f6' },
  { label: 'My Classes', path: '/dashboard/student/classes', icon: Video, color: '#f43f5e' },
  { label: 'AI Assistant', path: '/dashboard/student/ai', icon: BrainCircuit, color: '#8b5cf6' },
  { label: 'Notes', path: '/dashboard/student/notes', icon: FileText, color: '#10b981' },
  { label: 'Quizzes', path: '/dashboard/student/quizzes', icon: Target, color: '#f59e0b' },
  { label: 'Learning Path', path: '/dashboard/student/path', icon: TrendingUp, color: '#ec4899' },
  { label: 'Assignments', path: '/dashboard/student/assignments', icon: FileText, color: '#10b981' },
  { label: 'Profile', path: '/dashboard/student/profile', icon: Settings, color: '#64748b' },
];

const SUGGESTED_PROMPTS = [
  { text: "Explain DBMS normalization", icon: BookOpen, color: "teal" },
  { text: "Summarize CNN in deep learning", icon: BrainCircuit, color: "purple" },
  { text: "Generate quiz questions for Operating Systems", icon: Target, color: "orange" },
  { text: "Help me prepare for Linear Algebra exam", icon: Sparkles, color: "coral" }
];

const colorMap = {
  teal: "bg-[#14b8a6]/10 text-[#0f766e] hover:bg-[#14b8a6]/20 border-[#14b8a6]/20",
  purple: "bg-[#8b5cf6]/10 text-[#6d28d9] hover:bg-[#8b5cf6]/20 border-[#8b5cf6]/20",
  orange: "bg-[#f97316]/10 text-[#c2410c] hover:bg-[#f97316]/20 border-[#f97316]/20",
  coral: "bg-[#f43f5e]/10 text-[#be123c] hover:bg-[#f43f5e]/20 border-[#f43f5e]/20"
};

const DEFAULT_WELCOME = [
  { role: 'assistant', content: 'Hello! I am your StudyOS AI Mentor. Start a new chat or pick a topic below!' }
];

export function AIAssistant() {
  const { currentUser } = useAuth();
  
  // Inbox State
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  
  // Chat State
  const [messages, setMessages] = useState(DEFAULT_WELCOME);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const messagesEndRef = useRef(null);

  // 1. Load all sessions on mount
  useEffect(() => {
    async function loadSessions() {
      if (!currentUser) return;
      try {
        const q = query(
          collection(db, 'users', currentUser.uid, 'ai_sessions'),
          orderBy('updatedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const loadedSessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setSessions(loadedSessions);
        
        // If we have sessions, load the most recent one automatically
        if (loadedSessions.length > 0) {
          setActiveSessionId(loadedSessions[0].id);
          setMessages(loadedSessions[0].messages);
        } else {
          setMessages(DEFAULT_WELCOME);
        }
      } catch (error) {
        console.error("Failed to load chat sessions:", error);
      } finally {
        setIsInitializing(false);
      }
    }
    loadSessions();
  }, [currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // 2. Start a completely new chat
  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages(DEFAULT_WELCOME);
    setInput('');
  };

  // 3. Switch between active chats
  const switchSession = (sessionId) => {
    const targetSession = sessions.find(s => s.id === sessionId);
    if (targetSession) {
      setActiveSessionId(sessionId);
      setMessages(targetSession.messages);
      setInput('');
    }
  };

  // Delete a specific chat session
  const deleteSession = async (e, sessionId) => {
    e.stopPropagation(); // Prevent triggering switchSession
    if (!currentUser) return;
    
    try {
      // Remove from Firestore
      await deleteDoc(doc(db, 'users', currentUser.uid, 'ai_sessions', sessionId));
      
      // Update local state
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(remainingSessions);
      
      // If we deleted the currently active session, switch to another or clear
      if (activeSessionId === sessionId) {
        if (remainingSessions.length > 0) {
          setActiveSessionId(remainingSessions[0].id);
          setMessages(remainingSessions[0].messages);
        } else {
          startNewChat();
        }
      }
    } catch (error) {
      console.error("Failed to delete chat session:", error);
    }
  };

  // 4. Handle sending a message
  const handleSend = async (textToSubmit = input) => {
    if (!textToSubmit.trim() || !currentUser) return;

    const userMessage = { role: 'user', content: textToSubmit };
    const isFirstMessage = activeSessionId === null;
    
    // Determine the current message history
    // If it's a new chat, wipe the DEFAULT_WELCOME so we don't save it
    const previousMessages = isFirstMessage ? [] : messages;
    const newMessages = [...previousMessages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    let currentSessionId = activeSessionId;

    try {
      // If it's a completely new chat, generate ID and Title
      if (isFirstMessage) {
        currentSessionId = crypto.randomUUID();
        const generatedTitle = textToSubmit.length > 30 ? textToSubmit.substring(0, 30) + '...' : textToSubmit;
        
        const newSessionData = {
          id: currentSessionId,
          title: generatedTitle,
          messages: newMessages,
          updatedAt: serverTimestamp()
        };

        // Save to DB
        await setDoc(doc(db, 'users', currentUser.uid, 'ai_sessions', currentSessionId), newSessionData);
        
        // Update local state
        setSessions(prev => [newSessionData, ...prev]);
        setActiveSessionId(currentSessionId);
      } else {
        // Update existing chat with user's message
        await updateDoc(doc(db, 'users', currentUser.uid, 'ai_sessions', currentSessionId), {
          messages: newMessages,
          updatedAt: serverTimestamp()
        });
      }

      // 5. Ask AI for response
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await askAssistant(apiMessages);
      
      const finalMessages = [...newMessages, { role: 'assistant', content: response }];
      setMessages(finalMessages);
      
      // 6. Save AI's response to DB
      await updateDoc(doc(db, 'users', currentUser.uid, 'ai_sessions', currentSessionId), {
        messages: finalMessages,
        updatedAt: serverTimestamp()
      });
      
      // Update local session list so the active chat jumps to top (if we want that behavior)
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: finalMessages } : s));

    } catch (error) {
      const errorMessages = [...newMessages, { 
        role: 'assistant', 
        content: `**Error:** ${error.message}` 
      }];
      setMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <DashboardLayout links={studentLinks} role="student" userName="Student">
        <div className="flex-1 flex items-center justify-center h-[calc(100vh-140px)]">
          <Loader2 className="w-10 h-10 animate-spin text-[#8b5cf6]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout links={studentLinks} role="student" userName="Student">
      <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-6 max-w-7xl mx-auto">
        
        {/* Left Column: Inbox Sidebar */}
        <div className="w-full md:w-72 flex-shrink-0 flex flex-col bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b-2 border-slate-100 bg-slate-50/50">
            <Button onClick={startNewChat} variant="purple" className="w-full font-bold py-3 shadow-[0_4px_0_0_#6d28d9]">
              <MessageSquarePlus className="w-5 h-5 mr-2" />
              New Chat
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="text-center p-4 mt-4">
                <BrainCircuit className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">No previous chats.</p>
              </div>
            ) : (
              sessions.map(session => (
                <div 
                  key={session.id}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all border-2 group cursor-pointer",
                    activeSessionId === session.id 
                      ? "bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20" 
                      : "bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:border-slate-100"
                  )}
                  onClick={() => switchSession(session.id)}
                >
                  <div className="flex items-center min-w-0 flex-1 mr-2">
                    <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0 opacity-60" />
                    <span className="truncate">{session.title}</span>
                  </div>
                  <button
                    onClick={(e) => deleteSession(e, session.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Main Chat Area */}
        <Card className="flex-1 flex flex-col p-0 overflow-hidden border-t-4 border-t-[#8b5cf6] shadow-sm">
          
          {/* Header */}
          <div className="px-6 py-5 border-b-2 border-slate-100 bg-white flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-800 flex items-center">
                <div className="w-8 h-8 bg-[#8b5cf6] rounded-xl flex items-center justify-center shadow-sm mr-3">
                  <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                {activeSessionId ? "Ongoing Mentorship" : "StudyOS AI Assistant"}
              </h1>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-xl bg-[#8b5cf6] flex items-center justify-center shadow-sm mr-3 flex-shrink-0">
                    <BrainCircuit className="w-6 h-6 text-white" />
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] rounded-3xl p-5 shadow-sm text-base leading-relaxed",
                  msg.role === 'user' 
                    ? "bg-[#14b8a6] text-white rounded-br-sm border-b-4 border-[#0f766e]" 
                    : "bg-white text-slate-700 rounded-bl-sm border-2 border-slate-100"
                )}>
                  {msg.role === 'user' ? (
                    <p className="font-bold">{msg.content}</p>
                  ) : (
                    <div className="prose prose-slate max-w-none prose-p:font-bold prose-headings:font-black prose-a:text-[#8b5cf6] prose-strong:text-slate-800">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center shadow-sm ml-3 flex-shrink-0">
                    <User className="w-6 h-6 text-slate-500" />
                  </div>
                )}

              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-10 h-10 rounded-xl bg-[#8b5cf6] flex items-center justify-center shadow-sm mr-3 flex-shrink-0">
                  <BrainCircuit className="w-6 h-6 text-white" />
                </div>
                <div className="bg-white text-slate-500 rounded-3xl rounded-bl-sm p-5 border-2 border-slate-100 shadow-sm flex items-center space-x-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#8b5cf6]" />
                  <span className="font-bold">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t-2 border-slate-100">
            {/* Suggested Prompts */}
            {messages.length === 1 && !activeSessionId && (
              <div className="mb-4 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSend(prompt.text)}
                    className={cn(
                      "flex items-center px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all active:translate-y-0.5",
                      colorMap[prompt.color]
                    )}
                  >
                    <prompt.icon className="w-4 h-4 mr-2" />
                    {prompt.text}
                  </button>
                ))}
              </div>
            )}
            
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
              className="flex items-center gap-3"
            >
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your tutor anything..." 
                className="flex-1 h-14 bg-slate-50 border-2 focus:border-[#8b5cf6] focus:ring-[#8b5cf6]/20 font-bold"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                variant="purple" 
                className="h-14 px-6 shadow-[0_4px_0_0_#6d28d9]"
                disabled={isLoading || !input.trim()}
              >
                <Send className="w-6 h-6" />
              </Button>
            </form>
            <p className="text-center text-xs font-bold text-slate-400 mt-3">
              AI can make mistakes. Verify important information.
            </p>
          </div>

        </Card>
      </div>
    </DashboardLayout>
  );
}
