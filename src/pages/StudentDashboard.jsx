import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LayoutDashboard, Video, FileText, BrainCircuit, Target, Calendar, Settings, TrendingUp, Sparkles, BookOpen, Clock, Lightbulb } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { generateLearningProfile } from '../lib/gemini';

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

export function StudentDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [stats, setStats] = useState({ avgScore: 0, classesJoined: 0, quizzesDone: 0, aiQueries: 0 });
  const [performanceData, setPerformanceData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [learningInsight, setLearningInsight] = useState(null);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser) return;
    try {
      const [enrollSnap, quizSnap, aiSnap, classesSnap, subjectsSnap, recSnap, insightSnap] = await Promise.all([
        getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'quizResults'), where('studentId', '==', currentUser.uid), orderBy('submittedAt', 'desc'))),
        getDocs(collection(db, 'users', currentUser.uid, 'ai_sessions')),
        getDocs(query(collection(db, 'liveClasses'))),
        getDocs(collection(db, 'subjects')),
        getDocs(query(collection(db, 'recommendations'), where('studentId', '==', currentUser.uid))),
        getDocs(query(collection(db, 'learningInsights'), where('studentId', '==', currentUser.uid)))
      ]);

      const enrolledIds = enrollSnap.docs.map(d => d.data().subjectId || d.data().classId);
      const quizAttempts = quizSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const aiSessionsCount = aiSnap.docs.length;
      
      const allLiveClasses = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const subjects = subjectsSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().subjectName;
        return acc;
      }, {});

      // Calculate Stats
      const quizzesDone = quizAttempts.length;
      const classesJoined = enrolledIds.length;
      let avgScore = 0;
      if (quizzesDone > 0) {
        const totalScore = quizAttempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
        const totalMax = quizAttempts.reduce((acc, curr) => acc + (curr.totalMarks || curr.totalScore || 1), 0);
        avgScore = Math.round((totalScore / totalMax) * 100);
      }
      
      setStats({
        avgScore,
        classesJoined,
        quizzesDone,
        aiQueries: aiSessionsCount
      });

      // Prepare Performance Chart Data
      if (quizzesDone > 0) {
        const recentQuizzes = quizAttempts.slice(0, 7).reverse();
        const chartData = recentQuizzes.map((q, idx) => ({
          name: `Quiz ${idx + 1}`,
          score: Math.round(((q.score || 0) / (q.totalMarks || q.totalScore || 1)) * 100)
        }));
        setPerformanceData(chartData);
      } else {
        setPerformanceData([]);
      }

      // Load AI Insights & Recommendations
      if (!recSnap.empty) {
        setRecommendations(recSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
      if (!insightSnap.empty) {
        setLearningInsight(insightSnap.docs[0].data().message);
      } else {
        // Generate AI Recommendations if none exist and we have data
        if (quizzesDone > 0 && enrolledIds.length > 0) {
          generateAndSaveAIInsights(quizAttempts, subjects);
        }
      }

      // Filter Upcoming Classes
      const upcoming = allLiveClasses
        .filter(c => enrolledIds.includes(c.classroomId) && c.status !== 'ended')
        .map(c => ({
          ...c,
          subjectName: subjects[c.classroomId] || 'Unknown Subject'
        }))
        .sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp)
        .slice(0, 4);
      
      setUpcomingClasses(upcoming);

    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAndSaveAIInsights = async (quizAttempts, subjects) => {
    setIsGeneratingAI(true);
    try {
      const attemptsSummary = quizAttempts.slice(0, 5).map(q => ({
        subject: subjects[q.classId] || 'Subject',
        score: Math.round(((q.score || 0) / (q.totalMarks || 1)) * 100)
      }));
      
      const profile = await generateLearningProfile(attemptsSummary, Object.values(subjects));
      
      // Save Recommendations
      const newRecs = profile.masteryLevels.map(ml => ({
        studentId: currentUser.uid,
        title: ml.subject,
        message: `Current mastery level: ${ml.level}`,
        relatedSubject: ml.subject,
        mastery: ml.progress,
        type: ml.progress < 70 ? 'Revise' : 'Focus',
        createdAt: serverTimestamp()
      }));
      
      const recsToSet = [];
      for (const rec of newRecs) {
        const docRef = doc(collection(db, 'recommendations'));
        await setDoc(docRef, rec);
        recsToSet.push({ id: docRef.id, ...rec });
      }
      setRecommendations(recsToSet);

      // Save Insight
      if (profile.aiInsight) {
        const insightDocRef = doc(collection(db, 'learningInsights'));
        await setDoc(insightDocRef, {
          studentId: currentUser.uid,
          message: profile.aiInsight,
          createdAt: serverTimestamp()
        });
        setLearningInsight(profile.aiInsight);
      }
      
    } catch (err) {
      console.error("AI Generation failed:", err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleJoinClass = async (cls) => {
    try {
      // Record Attendance
      await setDoc(doc(collection(db, 'attendance')), {
        liveClassId: cls.id,
        studentId: currentUser.uid,
        studentName: currentUser.displayName || 'Student',
        joinTime: Date.now(),
        createdAt: serverTimestamp()
      });
      // Open Meeting Link
      window.open(cls.meetingLink, '_blank');
    } catch (err) {
      console.error("Failed to join class and record attendance:", err);
      alert("Failed to join class properly.");
    }
  };

  return (
    <DashboardLayout links={studentLinks} role="student" userName="Student">
      <div className="space-y-8">
        
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Average Score" value={`${stats.avgScore}%`} icon={TrendingUp} color="teal" />
          <StatCard title="Classes Joined" value={stats.classesJoined} icon={BookOpen} color="orange" />
          <StatCard title="Quizzes Done" value={stats.quizzesDone} icon={Target} color="blue" />
          <StatCard title="AI Queries" value={stats.aiQueries} icon={BrainCircuit} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* AI Learning Insights Panel */}
            {learningInsight && (
              <Card className="border-t-4 border-t-[#8b5cf6] bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-purple-900 mb-2">Your AI Learning Insight</h3>
                    <p className="text-purple-800 font-medium leading-relaxed">{learningInsight}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Personalized Recommendations */}
            <Card className="border-t-4 border-t-[#f59e0b]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black flex items-center text-slate-800">
                  <Sparkles className="w-7 h-7 mr-3 text-[#f59e0b]" />
                  AI Study Recommendations
                </h3>
                {isGeneratingAI && <Loader2 className="w-5 h-5 animate-spin text-[#f59e0b]" />}
              </div>
              
              <div className="space-y-6">
                {isLoading || isGeneratingAI ? (
                  <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    {isGeneratingAI ? 'Generating your personalized insights...' : 'Loading insights...'}
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <Target className="w-12 h-12 text-slate-300 mb-3" />
                    <h4 className="text-lg font-black text-slate-700">No Insights Yet</h4>
                    <p className="text-slate-500 font-bold mt-1">Complete quizzes to receive AI recommendations.</p>
                  </div>
                ) : (
                  recommendations.map((rec, idx) => {
                    const isRevise = rec.type === 'Revise';
                    const mainColor = isRevise ? '#f43f5e' : '#f59e0b';
                    const btnColor = isRevise ? 'bg-[#f43f5e] border-[#be123c] hover:bg-[#e11d48]' : 'bg-[#f59e0b] border-[#c2410c] hover:bg-[#ea580c]';
                    const progVariant = isRevise ? 'coral' : 'orange';

                    return (
                      <div key={idx} className="p-6 rounded-3xl bg-white border-2 border-slate-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-extrabold text-slate-800 flex items-center gap-2 text-xl">
                              <span className="text-white px-2 py-0.5 rounded-lg text-sm" style={{ backgroundColor: mainColor }}>{rec.type}</span> {rec.title}
                            </h4>
                            <p className="text-base font-bold text-slate-500 mt-2">
                              {rec.message}
                            </p>
                          </div>
                          <Button onClick={() => navigate('/dashboard/student/quizzes')} variant="primary" className={`border-b-4 text-white ${btnColor}`}>
                            {isRevise ? 'Review Topic' : 'Continue'}
                          </Button>
                        </div>
                        {rec.mastery !== undefined && (
                          <div className="mt-5">
                            <div className="flex justify-between text-sm font-bold text-slate-400 mb-2">
                              <span>Mastery Level</span>
                              <span style={{ color: mainColor }}>{rec.mastery}%</span>
                            </div>
                            <ProgressBar value={rec.mastery} variant={progVariant} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Performance Graph */}
            <Card className="border-t-4 border-t-[#3b82f6]">
              <h3 className="text-2xl font-black mb-8 text-slate-800">Quiz Performance</h3>
              <div className="h-[300px] w-full">
                {isLoading ? (
                   <div className="h-full flex items-center justify-center text-slate-400 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                     Loading chart...
                   </div>
                ) : performanceData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <TrendingUp className="w-12 h-12 text-slate-300 mb-3" />
                    <h4 className="text-lg font-black text-slate-700">No Analytics Available</h4>
                    <p className="text-slate-500 font-bold mt-1">Take your first quiz to generate your progress graph.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 14, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 14, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', borderWidth: '2px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

          </div>

          {/* Side Column */}
          <div className="space-y-8">
            
            {/* Live Classes (Updated for Attendance) */}
            <Card className="border-t-4 border-t-[#f43f5e]">
              <h3 className="text-xl font-black mb-6 text-slate-800 flex items-center">
                <Video className="w-5 h-5 mr-2 text-[#f43f5e]" /> Live Sessions
              </h3>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="p-4 text-center text-slate-400 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    Loading classes...
                  </div>
                ) : upcomingClasses.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <Video className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-slate-500 font-bold">No upcoming sessions.</p>
                  </div>
                ) : (
                  upcomingClasses.map(cls => (
                    <div key={cls.id} className={`p-5 rounded-2xl border-2 transition-colors ${cls.status === 'active' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100 hover:border-[#f43f5e]/50'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-xs font-bold uppercase tracking-widest flex items-center ${cls.status === 'active' ? 'text-red-600' : 'text-[#f43f5e]'}`}>
                          <Clock className="w-3 h-3 mr-1" /> {new Date(cls.scheduledTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {cls.status === 'active' && (
                          <span className="flex items-center text-xs font-black text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded-md">
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5 animate-pulse"></span> LIVE
                          </span>
                        )}
                      </div>
                      <h4 className="font-extrabold text-slate-700 text-lg mb-1">{cls.title}</h4>
                      <p className="text-sm font-bold text-slate-500 mb-4">{cls.subjectName}</p>
                      
                      {cls.status === 'active' ? (
                        <Button onClick={() => handleJoinClass(cls)} variant="primary" className="w-full bg-[#f43f5e] border-b-4 border-[#be123c] hover:bg-[#e11d48]">
                          Join Live Session
                        </Button>
                      ) : (
                        <div className="w-full text-center py-2 bg-slate-100 text-slate-500 font-bold rounded-xl text-sm border-2 border-slate-200">
                          Starts on {new Date(cls.scheduledTimestamp).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
