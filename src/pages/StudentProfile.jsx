import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { User, Award, BookOpen, Target, TrendingUp, Sparkles, Loader2, BrainCircuit, Activity, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { generateProfileInsights } from '../lib/gemini';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';

// Sidebar links
import { LayoutDashboard, Users, Video, FileText, Settings } from 'lucide-react';
const studentLinks = [
  { label: 'Dashboard', path: '/dashboard/student', icon: LayoutDashboard, color: '#3b82f6' },
  { label: 'My Classes', path: '/dashboard/student/classes', icon: Users, color: '#f43f5e' },
  { label: 'AI Assistant', path: '/dashboard/student/ai', icon: BrainCircuit, color: '#8b5cf6' },
  { label: 'Notes', path: '/dashboard/student/notes', icon: FileText, color: '#10b981' },
  { label: 'Quizzes', path: '/dashboard/student/quizzes', icon: Target, color: '#f59e0b' },
  { label: 'Learning Path', path: '/dashboard/student/path', icon: TrendingUp, color: '#ec4899' },
  { label: 'Assignments', path: '/dashboard/student/assignments', icon: FileText, color: '#10b981' },
  { label: 'Profile', path: '/dashboard/student/profile', icon: User, color: '#64748b' },
];

export function StudentProfile() {
  const { currentUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stats, setStats] = useState({
    avgScore: 0,
    completionRate: 0,
    subjectsCount: 0,
    badges: []
  });
  const [radarData, setRadarData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  
  useEffect(() => {
    loadProfileData();
  }, [currentUser]);

  const loadProfileData = async () => {
    if (!currentUser) return;
    try {
      // 1. Fetch Enrollments
      const enrollSnap = await getDocs(collection(db, 'users', currentUser.uid, 'enrollments'));
      const subjectIds = enrollSnap.docs.map(d => d.data().subjectId);
      
      // Fetch Subject names
      const subSnap = await getDocs(collection(db, 'subjects'));
      const subsMap = {};
      subSnap.docs.forEach(d => {
        if (subjectIds.includes(d.id)) subsMap[d.id] = d.data().subjectName;
      });

      // 2. Fetch Quiz Attempts
      const quizSnap = await getDocs(collection(db, 'users', currentUser.uid, 'quiz_attempts'));
      const attempts = quizSnap.docs.map(d => d.data());
      
      // Calculate Subject Averages for Radar Chart
      const subjectScores = {};
      attempts.forEach(a => {
        if (a.subjectId && subsMap[a.subjectId]) {
          if (!subjectScores[subsMap[a.subjectId]]) subjectScores[subsMap[a.subjectId]] = { total: 0, count: 0 };
          subjectScores[subsMap[a.subjectId]].total += a.percentage;
          subjectScores[subsMap[a.subjectId]].count += 1;
        }
      });
      
      const newRadarData = Object.keys(subjectScores).map(sub => ({
        subject: sub,
        score: Math.round(subjectScores[sub].total / subjectScores[sub].count),
        fullMark: 100
      }));
      setRadarData(newRadarData);

      // 3. Fetch Submissions
      const submSnap = await getDocs(query(collection(db, 'submissions'), where('studentId', '==', currentUser.uid)));
      const submissions = submSnap.docs.map(d => d.data());

      // Overall stats
      const totalScore = attempts.reduce((acc, a) => acc + a.percentage, 0);
      const avgScore = attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0;
      
      // Badges Logic
      const newBadges = [];
      if (avgScore >= 90) newBadges.push({ name: 'Quiz Master', icon: Target, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' });
      if (submissions.length >= 5) newBadges.push({ name: 'Assignment Champ', icon: FileText, color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' });
      if (attempts.length >= 10) newBadges.push({ name: 'Consistent Learner', icon: TrendingUp, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' });
      if (newBadges.length === 0) newBadges.push({ name: 'Rising Star', icon: Sparkles, color: 'text-[#ec4899]', bg: 'bg-[#ec4899]/10' });

      setStats({
        avgScore,
        completionRate: submissions.length > 0 ? 100 : 0, // Simplified for UI
        subjectsCount: subjectIds.length,
        badges: newBadges
      });

      // Activity Chart (mocking recent days)
      const mockActivity = [
        { name: 'Mon', activity: attempts.length > 0 ? 2 : 0 },
        { name: 'Tue', activity: submissions.length > 0 ? 1 : 0 },
        { name: 'Wed', activity: 3 },
        { name: 'Thu', activity: 1 },
        { name: 'Fri', activity: 4 },
        { name: 'Sat', activity: 0 },
        { name: 'Sun', activity: 2 },
      ];
      setActivityData(mockActivity);

      // Check for cached AI insights
      const profileRef = doc(db, 'users', currentUser.uid, 'profile', 'insights');
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setAiInsights(profileSnap.data());
      } else {
        // Trigger auto generation if radar data exists and no insights
        if (newRadarData.length > 0) {
          generateInsights(newRadarData, avgScore, submissions.length);
        }
      }

    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = async (radar, avg, subms) => {
    setIsGenerating(true);
    try {
      const perfData = {
        subjectAverages: radar,
        overallAverage: avg,
        totalAssignmentsSubmitted: subms
      };
      
      const insights = await generateProfileInsights(perfData);
      
      await setDoc(doc(db, 'users', currentUser.uid, 'profile', 'insights'), {
        ...insights,
        updatedAt: serverTimestamp()
      });
      
      setAiInsights(insights);
    } catch(e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout links={studentLinks} role="student" userName="Student">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#8b5cf6]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout links={studentLinks} role="student" userName="Student">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        {/* Profile Header */}
        <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#8b5cf6]/20 to-[#ec4899]/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] flex items-center justify-center text-5xl font-black text-white shadow-[0_8px_0_0_rgba(0,0,0,0.1)] transform -rotate-3">
              {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">{currentUser?.displayName || 'Student Profile'}</h1>
              <p className="text-lg font-bold text-slate-500 mt-2">{currentUser?.email}</p>
              
              <div className="flex flex-wrap gap-4 mt-6 justify-center md:justify-start">
                <Badge variant="purple" className="px-4 py-2 text-sm"><BookOpen className="w-4 h-4 mr-2"/> {stats.subjectsCount} Enrolled Subjects</Badge>
                <Badge variant="success" className="px-4 py-2 text-sm"><Target className="w-4 h-4 mr-2"/> {stats.avgScore}% Avg Quiz Score</Badge>
                <Badge variant="primary" className="px-4 py-2 text-sm"><Activity className="w-4 h-4 mr-2"/> Active Learner</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* AI Academic Insights */}
        {aiInsights ? (
          <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 border-none shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-[#ec4899]/20 rounded-full blur-2xl -mr-10 -mb-10 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                <BrainCircuit className="w-8 h-8 text-[#ec4899]" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-black text-[#ec4899] uppercase tracking-widest mb-2 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" /> Gemini AI Academic Profile
                </h2>
                <p className="text-xl font-bold leading-relaxed text-slate-200 italic">
                  "{aiInsights.insight}"
                </p>
                <div className="flex gap-6 mt-6">
                  <div>
                    <span className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Strongest Area</span>
                    <span className="font-extrabold text-[#10b981]">{aiInsights.strongestSubject}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Focus Required</span>
                    <span className="font-extrabold text-[#f43f5e]">{aiInsights.weakestSubject}</span>
                  </div>
                </div>
              </div>
              <Button onClick={() => generateInsights(radarData, stats.avgScore, 1)} disabled={isGenerating} variant="outline" className="text-white border-white/20 hover:bg-white/10">
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5 mr-2" />}
                Refresh
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 border-2 border-slate-100 flex items-center justify-between bg-white shadow-sm">
            <div>
              <h3 className="font-black text-xl text-slate-800 mb-2">AI Profile Insight</h3>
              <p className="font-bold text-slate-500">Take some quizzes to generate your AI academic identity.</p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Radar Chart (Subject Mastery) */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="p-6 border-t-4 border-t-[#8b5cf6] bg-white shadow-sm h-[400px] flex flex-col">
              <h3 className="text-xl font-black text-slate-800 flex items-center mb-6">
                <Target className="w-5 h-5 mr-2 text-[#8b5cf6]" /> Subject Mastery
              </h3>
              {radarData.length < 3 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                  <Radar className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="font-bold text-slate-500 text-sm">Need at least 3 subjects<br/>with quiz data to map.</p>
                </div>
              ) : (
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Score" dataKey="score" stroke="#8b5cf6" strokeWidth={3} fill="#8b5cf6" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Achievements */}
            <Card className="p-6 border-t-4 border-t-[#f59e0b] bg-white shadow-sm">
              <h3 className="text-xl font-black text-slate-800 flex items-center mb-6">
                <Award className="w-5 h-5 mr-2 text-[#f59e0b]" /> Achievements
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {stats.badges.map((badge, idx) => (
                  <div key={idx} className={`p-4 rounded-2xl border-2 border-slate-100 flex flex-col items-center text-center ${badge.bg}`}>
                    <badge.icon className={`w-8 h-8 ${badge.color} mb-2`} />
                    <span className="font-extrabold text-sm text-slate-700 leading-tight">{badge.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Activity Chart & Stats */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6 border-t-4 border-t-[#3b82f6] bg-white shadow-sm h-[400px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-[#3b82f6]" /> Weekly Activity
                </h3>
                <Badge variant="blue">Active Streak: 4 Days</Badge>
              </div>
              <div className="flex-1 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontWeight: 700, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 700 }}
                      itemStyle={{ color: '#3b82f6', fontWeight: 900 }}
                    />
                    <Line type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={5} dot={{ stroke: '#3b82f6', strokeWidth: 3, r: 6, fill: '#fff' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6 border-2 border-slate-100 shadow-sm flex items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#10b981]/10 flex items-center justify-center mr-4">
                  <FileText className="w-6 h-6 text-[#10b981]" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Completion Rate</p>
                  <h4 className="text-2xl font-black text-slate-800">{stats.completionRate}%</h4>
                </div>
              </Card>
              <Card className="p-6 border-2 border-slate-100 shadow-sm flex items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#f43f5e]/10 flex items-center justify-center mr-4">
                  <Calendar className="w-6 h-6 text-[#f43f5e]" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Joined</p>
                  <h4 className="text-2xl font-black text-slate-800">This Month</h4>
                </div>
              </Card>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
