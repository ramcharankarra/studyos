import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { User, Award, BookOpen, Target, TrendingUp, Sparkles, Loader2, BrainCircuit, Activity, Calendar, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';
import { useParams, useNavigate } from 'react-router-dom';

// Sidebar links
import { LayoutDashboard, Users, Video, FileText, BarChart, Settings } from 'lucide-react';
const teacherLinks = [
  { label: 'Dashboard', path: '/dashboard/teacher', icon: LayoutDashboard, color: '#8b5cf6' },
  { label: 'Manage Classes', path: '/dashboard/teacher/classes', icon: Users, color: '#3b82f6' },
  { label: 'Live Classes', path: '/dashboard/teacher/live', icon: Video, color: '#f43f5e' },
  { label: 'Assignments', path: '/dashboard/teacher/assignments', icon: FileText, color: '#10b981' },
  { label: 'Quiz Generator', path: '/dashboard/teacher/quizzes', icon: BrainCircuit, color: '#f59e0b' },
  { label: 'Analytics', path: '/dashboard/teacher/classes', icon: BarChart, color: '#14b8a6' },
  { label: 'Settings', path: '/dashboard/teacher/settings', icon: Settings, color: '#64748b' },
];

export function TeacherStudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
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
  }, [studentId]);

  const loadProfileData = async () => {
    if (!studentId) return;
    try {
      // Since we don't have a users collection indexed cleanly, we'll construct mock identity.
      // But let's check if the user doc exists.
      const userRef = doc(db, 'users', studentId);
      const userSnap = await getDoc(userRef);
      const studentName = userSnap.exists() && userSnap.data().displayName ? userSnap.data().displayName : `Student ${studentId.substring(0, 5)}`;
      const studentEmail = userSnap.exists() && userSnap.data().email ? userSnap.data().email : 'Student Account';

      setStudentData({ name: studentName, email: studentEmail });

      // 1. Fetch Enrollments
      const enrollSnap = await getDocs(collection(db, 'users', studentId, 'enrollments'));
      const subjectIds = enrollSnap.docs.map(d => d.data().subjectId);
      
      const subSnap = await getDocs(collection(db, 'subjects'));
      const subsMap = {};
      subSnap.docs.forEach(d => {
        if (subjectIds.includes(d.id)) subsMap[d.id] = d.data().subjectName;
      });

      // 2. Fetch Quiz Attempts
      const quizSnap = await getDocs(collection(db, 'users', studentId, 'quiz_attempts'));
      const attempts = quizSnap.docs.map(d => d.data());
      
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
      const submSnap = await getDocs(query(collection(db, 'submissions'), where('studentId', '==', studentId)));
      const submissions = submSnap.docs.map(d => d.data());

      const totalScore = attempts.reduce((acc, a) => acc + a.percentage, 0);
      const avgScore = attempts.length > 0 ? Math.round(totalScore / attempts.length) : 0;
      
      const newBadges = [];
      if (avgScore >= 90) newBadges.push({ name: 'Quiz Master', icon: Target, color: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' });
      if (submissions.length >= 5) newBadges.push({ name: 'Assignment Champ', icon: FileText, color: 'text-[#10b981]', bg: 'bg-[#10b981]/10' });
      if (attempts.length >= 10) newBadges.push({ name: 'Consistent Learner', icon: TrendingUp, color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10' });
      if (newBadges.length === 0) newBadges.push({ name: 'Rising Star', icon: Sparkles, color: 'text-[#ec4899]', bg: 'bg-[#ec4899]/10' });

      setStats({
        avgScore,
        completionRate: submissions.length > 0 ? 100 : 0,
        subjectsCount: subjectIds.length,
        badges: newBadges
      });

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

      // Fetch AI insights
      const profileRef = doc(db, 'users', studentId, 'profile', 'insights');
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        setAiInsights(profileSnap.data());
      }

    } catch (e) {
      console.error("Failed to load profile:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout links={teacherLinks} role="teacher" userName="Teacher">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#8b5cf6]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout links={teacherLinks} role="teacher" userName="Teacher">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        <button 
          onClick={() => navigate('/dashboard/teacher/classes')}
          className="flex items-center text-slate-400 font-bold hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Classes
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#8b5cf6]/20 to-[#3b82f6]/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6] flex items-center justify-center text-5xl font-black text-white shadow-[0_8px_0_0_rgba(0,0,0,0.1)] transform -rotate-3">
              {studentData?.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl font-black text-slate-800 tracking-tight">{studentData?.name}</h1>
              <p className="text-lg font-bold text-slate-500 mt-2">{studentData?.email}</p>
              
              <div className="flex flex-wrap gap-4 mt-6 justify-center md:justify-start">
                <Badge variant="purple" className="px-4 py-2 text-sm"><BookOpen className="w-4 h-4 mr-2"/> {stats.subjectsCount} Enrolled Subjects</Badge>
                <Badge variant="success" className="px-4 py-2 text-sm"><Target className="w-4 h-4 mr-2"/> {stats.avgScore}% Avg Quiz Score</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* AI Academic Insights */}
        {aiInsights ? (
          <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 border-none shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-[#3b82f6]/20 rounded-full blur-2xl -mr-10 -mb-10 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/20">
                <BrainCircuit className="w-8 h-8 text-[#3b82f6]" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-black text-[#3b82f6] uppercase tracking-widest mb-2 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2" /> Teacher's AI Summary
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
            </div>
          </Card>
        ) : (
          <Card className="p-8 border-2 border-slate-100 flex items-center justify-between bg-white shadow-sm">
            <div>
              <h3 className="font-black text-xl text-slate-800 mb-2">No AI Data Available</h3>
              <p className="font-bold text-slate-500">The student needs to generate their AI profile first.</p>
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
          </div>

          {/* Activity Chart & Stats */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6 border-t-4 border-t-[#3b82f6] bg-white shadow-sm h-[400px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-[#3b82f6]" /> Weekly Activity
                </h3>
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
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
