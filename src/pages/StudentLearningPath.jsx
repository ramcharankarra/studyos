import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BrainCircuit, Target, TrendingUp, BookOpen, Sparkles, Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { generateLearningProfile } from '../lib/gemini';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';

// Sidebar links
import { LayoutDashboard, Users, Video, FileText, Settings, Calendar } from 'lucide-react';
const studentLinks = [
  { label: 'Dashboard', path: '/dashboard/student', icon: LayoutDashboard, color: '#3b82f6' },
  { label: 'My Classes', path: '/dashboard/student/classes', icon: Users, color: '#f43f5e' },
  { label: 'AI Assistant', path: '/dashboard/student/ai', icon: BrainCircuit, color: '#8b5cf6' },
  { label: 'Notes', path: '/dashboard/student/notes', icon: FileText, color: '#10b981' },
  { label: 'Quizzes', path: '/dashboard/student/quizzes', icon: Target, color: '#f59e0b' },
  { label: 'Learning Path', path: '/dashboard/student/path', icon: TrendingUp, color: '#ec4899' },
  { label: 'Assignments', path: '/dashboard/student/assignments', icon: FileText, color: '#10b981' },
  { label: 'Profile', path: '/dashboard/student/profile', icon: Settings, color: '#64748b' },
];

export function StudentLearningPath() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      // 1. Fetch raw attempt data for charts
      const snapAttempts = await getDocs(collection(db, 'users', currentUser.uid, 'quiz_attempts'));
      const attemptsData = snapAttempts.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.createdAt - b.createdAt); // oldest first for charts
        
      setAttempts(attemptsData);
      
      // Build chart data
      const mappedChart = attemptsData.map((a, i) => ({
        name: `Quiz ${i+1}`,
        score: a.percentage
      }));
      setChartData(mappedChart);

      // 2. Fetch cached profile if exists
      const docSnap = await getDoc(doc(db, 'users', currentUser.uid, 'learning_profile', 'current'));
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    } catch (err) {
      console.error("Error loading learning path:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProfile = async () => {
    if (!currentUser) return;
    setIsGenerating(true);
    
    try {
      // Gather context
      const enrollSnap = await getDocs(collection(db, 'users', currentUser.uid, 'enrollments'));
      const enrolledSubjectIds = enrollSnap.docs.map(d => d.data().subjectId);
      
      let subjectsData = [];
      if (enrolledSubjectIds.length > 0) {
        const subSnap = await getDocs(collection(db, 'subjects'));
        subjectsData = subSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(s => enrolledSubjectIds.includes(s.id));
      }

      // Simplify attempts data to avoid massive tokens
      const attemptsSummary = attempts.map(a => ({
        quizTitle: a.quizTitle,
        percentage: a.percentage,
        weakTopics: a.weakTopics
      }));

      const newProfile = await generateLearningProfile(attemptsSummary, subjectsData);
      
      // Cache it
      await setDoc(doc(db, 'users', currentUser.uid, 'learning_profile', 'current'), {
        ...newProfile,
        updatedAt: serverTimestamp()
      });
      
      // Dispatch AI Alert Notifications
      try {
        if (newProfile.weakTopics && newProfile.weakTopics.length > 0) {
          const batch = writeBatch(db);
          newProfile.weakTopics.forEach(topic => {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              userId: currentUser.uid,
              type: 'ai_alert',
              title: 'AI Study Alert',
              message: `You seem to be struggling with ${topic}. Review this topic soon!`,
              isRead: false,
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
        }
      } catch (e) { console.error("Failed to dispatch AI alerts:", e); }

      setProfile(newProfile);
    } catch (err) {
      console.error("Failed to generate profile:", err);
      alert("Failed to analyze data. Make sure you have taken some quizzes first!");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout links={studentLinks} role="student" userName="Student">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#ec4899]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout links={studentLinks} role="student" userName="Student">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ec4899] to-[#db2777] rounded-xl flex items-center justify-center shadow-sm mr-3">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              AI Learning Path
            </h1>
            <p className="text-slate-500 font-bold mt-2 ml-1">Your personalized, adaptive educational journey.</p>
          </div>
          <Button 
            onClick={handleGenerateProfile} 
            disabled={isGenerating}
            variant="outline" 
            className="font-bold border-2 text-[#ec4899] border-[#ec4899]/30 hover:bg-[#ec4899]/10"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
            Refresh Analysis
          </Button>
        </div>

        {!profile ? (
          <Card className="bg-gradient-to-r from-[#ec4899]/10 to-[#8b5cf6]/10 border-2 border-[#ec4899]/20 p-12 text-center shadow-sm">
            <Sparkles className="w-16 h-16 text-[#ec4899] mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-800 mb-2">Initialize Your AI Profile</h2>
            <p className="font-bold text-slate-500 mb-8 max-w-xl mx-auto">
              We need to analyze your past quiz scores and classroom activity to generate your personalized learning path.
            </p>
            <Button 
              onClick={handleGenerateProfile} 
              disabled={isGenerating}
              variant="primary" 
              className="bg-gradient-to-r from-[#ec4899] to-[#8b5cf6] border-b-4 border-[#be185d] hover:brightness-110 px-8 py-4 text-lg"
            >
              {isGenerating ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <BrainCircuit className="w-6 h-6 mr-2" />}
              {isGenerating ? "Analyzing your brain..." : "Generate My Learning Path"}
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            
            {/* AI Insight Hero */}
            <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 border-none shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#ec4899]/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-sm font-black text-[#ec4899] uppercase tracking-widest mb-3 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" /> Gemini AI Insight
                </h2>
                <p className="text-xl font-medium leading-relaxed text-slate-200">
                  "{profile.aiInsight}"
                </p>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Col: Weak Topics & Goals */}
              <div className="lg:col-span-1 space-y-8">
                
                {/* Daily Goals */}
                <Card className="p-6 border-t-4 border-t-[#10b981] bg-white shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 flex items-center mb-6">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-[#10b981]" /> Actionable Goals
                  </h3>
                  <div className="space-y-4">
                    {profile.dailyGoals?.map((goal, idx) => (
                      <div key={idx} className="flex items-start bg-slate-50 p-4 rounded-xl border-2 border-slate-100">
                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 mr-3 flex-shrink-0 mt-0.5" />
                        <p className="font-bold text-slate-700 text-sm">{goal}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Weak Topics Alert */}
                <Card className="p-6 border-t-4 border-t-[#f43f5e] bg-[#f43f5e]/5 border-x-2 border-b-2 border-x-[#f43f5e]/10 border-b-[#f43f5e]/10 shadow-sm">
                  <h3 className="text-xl font-black text-[#e11d48] flex items-center mb-6">
                    <AlertTriangle className="w-5 h-5 mr-2" /> Focus Areas
                  </h3>
                  <div className="space-y-3">
                    {profile.weakTopics?.map((topic, idx) => (
                      <div key={idx} className="bg-white px-4 py-3 rounded-xl border border-red-100 font-bold text-sm text-slate-700 shadow-sm">
                        • {topic}
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => navigate('/dashboard/student/quizzes')} variant="primary" className="w-full mt-6 bg-[#f43f5e] border-b-4 border-[#be123c] hover:bg-[#e11d48]">
                    Practice These Topics
                  </Button>
                </Card>

              </div>

              {/* Right Col: Charts & Mastery */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Trend Chart */}
                <Card className="p-6 border-2 border-slate-100 bg-white shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 flex items-center mb-6">
                    <TrendingUp className="w-5 h-5 mr-2 text-[#3b82f6]" /> Performance Trajectory
                  </h3>
                  {chartData.length < 2 ? (
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="font-bold text-slate-400">Take more quizzes to generate your learning curve.</p>
                    </div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontWeight: 700, fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#94a3b8', fontWeight: 700, fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 700 }}
                            itemStyle={{ color: '#ec4899', fontWeight: 900 }}
                          />
                          <Area type="monotone" dataKey="score" stroke="#ec4899" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </Card>

                {/* Subject Mastery */}
                <Card className="p-6 border-2 border-slate-100 bg-white shadow-sm">
                  <h3 className="text-xl font-black text-slate-800 flex items-center mb-6">
                    <Target className="w-5 h-5 mr-2 text-[#f59e0b]" /> Subject Mastery
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {profile.masteryLevels?.map((mastery, idx) => {
                      let colorClass = "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20"; // Intermediate
                      let barColor = "bg-[#f59e0b]";
                      if (mastery.level === 'Advanced') {
                        colorClass = "text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20";
                        barColor = "bg-[#10b981]";
                      } else if (mastery.level === 'Beginner') {
                        colorClass = "text-[#f43f5e] bg-[#f43f5e]/10 border-[#f43f5e]/20";
                        barColor = "bg-[#f43f5e]";
                      }
                      
                      return (
                        <div key={idx} className={`p-5 rounded-2xl border-2 ${colorClass}`}>
                          <div className="flex justify-between items-end mb-4">
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">{mastery.level}</p>
                              <h4 className="font-black text-xl">{mastery.subject}</h4>
                            </div>
                            <div className="text-2xl font-black">{mastery.progress}%</div>
                          </div>
                          <div className="w-full bg-white/50 h-2 rounded-full overflow-hidden">
                            <div className={`${barColor} h-full rounded-full transition-all duration-1000`} style={{ width: `${mastery.progress}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
