import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { 
  LayoutDashboard, Users, Video, FileText, BrainCircuit, 
  BarChart, Settings, Plus, Upload, PlayCircle, Sparkles, Target, Bell, Clock
} from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, collectionGroup } from 'firebase/firestore';

const teacherLinks = [
  { label: 'Dashboard', path: '/dashboard/teacher', icon: LayoutDashboard, color: '#8b5cf6' },
  { label: 'Manage Classes', path: '/dashboard/teacher/classes', icon: Users, color: '#3b82f6' },
  { label: 'Live Classes', path: '/dashboard/teacher/live', icon: Video, color: '#f43f5e' },
  { label: 'Assignments', path: '/dashboard/teacher/assignments', icon: FileText, color: '#10b981' },
  { label: 'Quiz Generator', path: '/dashboard/teacher/quizzes', icon: BrainCircuit, color: '#f59e0b' },
  { label: 'Analytics', path: '/dashboard/teacher/classes', icon: BarChart, color: '#14b8a6' },
  { label: 'Settings', path: '/dashboard/teacher/settings', icon: Settings, color: '#64748b' },
];

export function TeacherDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ totalStudents: 0, activeClasses: 0, totalAssignments: 0, avgScore: 0 });
  const [classProgressData, setClassProgressData] = useState([]);
  const [upcomingClass, setUpcomingClass] = useState(null);
  const [insight, setInsight] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [localUser, setLocalUser] = useState(null);

  useEffect(() => {
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        setLocalUser(user);
        setLoadingAuth(false);
      });
      return () => unsub();
    });
  }, []);

  useEffect(() => {
    if (loadingAuth === false && localUser?.uid) {
      const qNotif = query(
        collection(db, 'notifications'),
        where('userId', '==', localUser.uid)
      );

      const unsubscribe = onSnapshot(qNotif, (snapshot) => {
        const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notifs.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setActivities(notifs.slice(0, 5));
      });

      loadDashboardData(localUser.uid);

      return () => unsubscribe();
    }
  }, [loadingAuth, localUser]);

  const loadDashboardData = async (uid) => {
    try {
      // 1. Fetch Teacher's Subjects
      const subjectsSnap = await getDocs(query(collection(db, 'subjects'), where('teacherId', '==', uid)));
      const subjects = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const subjectIds = subjects.map(s => s.id);
      const subjectMap = subjects.reduce((acc, sub) => { acc[sub.id] = sub.subjectName; return acc; }, {});

      if (subjectIds.length === 0) {
        setStats({ totalStudents: 0, activeClasses: 0, totalAssignments: 0, avgScore: 0 });
        setIsLoading(false);
        return;
      }

      // 2. Fetch all other data in parallel
      const [enrollSnap, attemptsSnap, assignSnap, liveSnap] = await Promise.all([
        getDocs(collection(db, 'enrollments')),
        getDocs(collection(db, 'quizResults')),
        getDocs(query(collection(db, 'assignments'), where('teacherId', '==', uid))),
        getDocs(query(collection(db, 'liveClasses'), where('teacherId', '==', uid)))
      ]);

      // Process Enrollments
      const enrollments = enrollSnap.docs
        .map(d => d.data())
        .filter(e => subjectIds.includes(e.subjectId));
      
      // Process Quizzes
      const attempts = attemptsSnap.docs
        .map(d => d.data())
        .filter(a => subjectIds.includes(a.subjectId));
      
      // Calculate Overall Stats
      let totalScore = 0;
      let maxScore = 0;
      const subjectScores = {};

      attempts.forEach(a => {
        totalScore += (a.score || 0);
        maxScore += (a.totalScore || 1);
        
        if (!subjectScores[a.subjectId]) {
          subjectScores[a.subjectId] = { total: 0, max: 0, name: subjectMap[a.subjectId] };
        }
        subjectScores[a.subjectId].total += (a.score || 0);
        subjectScores[a.subjectId].max += (a.totalScore || 1);
      });

      const overallAvg = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      setStats({
        totalStudents: enrollments.length,
        activeClasses: subjects.length,
        totalAssignments: assignSnap.docs.length,
        avgScore: overallAvg
      });

      // Prepare Chart Data
      const progressData = Object.keys(subjectScores).map(subId => {
        const s = subjectScores[subId];
        return {
          name: s.name,
          average: Math.round((s.total / s.max) * 100)
        };
      });
      setClassProgressData(progressData);

      // Generate AI Insight
      if (progressData.length > 0) {
        const lowestClass = progressData.reduce((prev, current) => (prev.average < current.average) ? prev : current);
        if (lowestClass.average < 75) {
          setInsight({
            type: 'Alert',
            message: `Scores in ${lowestClass.name} have dropped to ${lowestClass.average}%. Consider scheduling a review session.`,
            color: 'text-[#f43f5e]',
            bg: 'bg-[#f43f5e]'
          });
        } else {
          setInsight({
            type: 'Success',
            message: `Great job! Your lowest performing class is still averaging a solid ${lowestClass.average}%.`,
            color: 'text-[#10b981]',
            bg: 'bg-[#10b981]'
          });
        }
      } else {
        setInsight(null);
      }

      // Next Upcoming Class
      const now = Date.now();
      const upcoming = liveSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.scheduledTimestamp > now)
        .sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp)[0];

      if (upcoming) {
        setUpcomingClass({
          ...upcoming,
          subjectName: subjectMap[upcoming.classroomId] || 'Unknown Subject'
        });
      }

    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLive = () => navigate('/dashboard/teacher/live');

  return (
    <DashboardLayout links={teacherLinks} role="teacher" userName="Teacher">
      <div className="space-y-8">
        
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Students" value={stats.totalStudents} icon={Users} color="blue" />
          <StatCard title="Active Classes" value={stats.activeClasses} icon={Video} color="coral" />
          <StatCard title="Total Assignments" value={stats.totalAssignments} icon={FileText} color="orange" />
          <StatCard title="Avg Class Score" value={`${stats.avgScore}%`} icon={BarChart} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Live Class Control Panel */}
            <Card className="p-8 border-t-4 border-t-[#f43f5e] bg-gradient-to-br from-white to-[#f43f5e]/5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black flex items-center text-slate-800">
                    <div className="w-10 h-10 bg-[#f43f5e] rounded-xl flex items-center justify-center shadow-[0_4px_0_0_#be123c] mr-4 transform rotate-3">
                      <Video className="w-5 h-5 text-white -rotate-3" />
                    </div>
                    Live Class Control
                  </h3>
                  <p className="text-slate-500 font-bold mt-2">Start a session or schedule upcoming classes.</p>
                </div>
                <Button onClick={navigateToLive} variant="primary" className="mt-6 sm:mt-0 bg-[#f43f5e] border-b-4 border-[#be123c] hover:bg-[#e11d48]">
                  <PlayCircle className="w-6 h-6 mr-2" />
                  Manage Sessions
                </Button>
              </div>

              <div className="bg-white rounded-3xl p-6 border-2 border-slate-100 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 mb-5 uppercase tracking-widest">Next Scheduled</h4>
                {isLoading ? (
                  <div className="p-6 text-center text-slate-400 font-bold">Loading schedule...</div>
                ) : upcomingClass ? (
                  <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-[#f43f5e]/30 transition-colors">
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-lg">{upcomingClass.title}</h5>
                      <p className="text-sm text-slate-500 mt-1 font-bold">{upcomingClass.subjectName}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="block font-black text-[#f43f5e] text-xl mb-1 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(upcomingClass.scheduledTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <a href={upcomingClass.meetingLink} target="_blank" rel="noreferrer" className="text-xs font-extrabold text-white inline-block bg-[#f43f5e] hover:bg-[#e11d48] px-3 py-1.5 rounded-lg border-b-2 border-[#be123c] transition-colors">Launch Class</a>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                    <Video className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-slate-500 font-bold">No upcoming sessions scheduled.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Student Analytics Chart */}
            <Card className="border-t-4 border-t-[#8b5cf6]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">Class Performance</h3>
                <Button onClick={() => navigate('/dashboard/teacher/classes')} variant="outline" className="text-sm font-bold py-2 px-4">View Report</Button>
              </div>
              <div className="h-[320px] w-full">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                     Loading chart...
                  </div>
                ) : classProgressData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <BarChart className="w-12 h-12 text-slate-300 mb-3" />
                    <h4 className="text-lg font-black text-slate-700">No Analytics Available</h4>
                    <p className="text-slate-500 font-bold mt-1">Students need to complete quizzes to generate reports.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={classProgressData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 14, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 14, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '16px', borderWidth: '2px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ fontWeight: 'bold', color: '#8b5cf6' }}
                      />
                      <Bar dataKey="average" name="Avg Score (%)" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={40} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

          </div>

          {/* Side Column */}
          <div className="space-y-8">
            
            {/* AI Quiz Generator */}
            <Card className="border-t-4 border-t-[#f59e0b]">
              <h3 className="text-xl font-black mb-3 flex items-center text-slate-800">
                <BrainCircuit className="w-6 h-6 mr-3 text-[#f59e0b]" />
                Quiz Generator
              </h3>
              <p className="text-base font-bold text-slate-500 mb-6 leading-relaxed">Generate fun MCQs directly from your lecture notes.</p>
              
              <div onClick={() => navigate('/dashboard/teacher/quizzes')} className="border-4 border-dashed border-slate-200 rounded-3xl p-8 text-center hover:border-[#f59e0b] hover:bg-[#f59e0b]/5 transition-colors bg-slate-50 cursor-pointer">
                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Upload className="w-8 h-8 text-[#f59e0b]" />
                </div>
                <p className="text-base text-slate-700 font-black">Drop Lecture PDF</p>
                <p className="text-sm font-bold text-slate-400 mt-2">or click to browse</p>
              </div>
              
              <Button onClick={() => navigate('/dashboard/teacher/quizzes')} variant="primary" className="w-full mt-6 bg-[#f59e0b] border-b-4 border-[#c2410c] hover:bg-[#ea580c] py-4">
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Quiz
              </Button>
            </Card>

            {/* AI Insights */}
            <Card className="bg-[#8b5cf6]/10 border-2 border-[#8b5cf6]/20">
              <h3 className="font-black mb-4 text-[#7c3aed] flex items-center text-lg">
                <Sparkles className="w-5 h-5 mr-2" /> AI Insights
              </h3>
              {isLoading ? (
                <p className="text-slate-500 font-bold">Analyzing class data...</p>
              ) : insight ? (
                <p className={`text-base font-bold leading-relaxed ${insight.color}`}>
                  <strong className={`${insight.bg} text-white font-black px-2 py-0.5 rounded-lg mr-1`}>{insight.type}:</strong> 
                  {insight.message}
                </p>
              ) : (
                <p className="text-slate-500 font-bold text-center py-4">
                  Need more student quiz data to generate insights.
                </p>
              )}
            </Card>

            {/* Activity Feed Widget */}
            <Card className="border-t-4 border-t-[#8b5cf6]">
              <h3 className="font-black mb-6 text-slate-800 text-xl flex items-center">
                <Bell className="w-5 h-5 mr-2 text-[#8b5cf6]" /> Recent Notifications
              </h3>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 font-bold bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    No recent activity
                  </div>
                ) : (
                  activities.map(act => (
                    <div key={act.id} className="flex flex-col p-4 rounded-2xl bg-white border-2 border-slate-100 shadow-sm hover:border-[#8b5cf6]/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-slate-700 text-sm line-clamp-1">{act.title}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg flex-shrink-0 ml-2 uppercase">
                          {act.createdAt ? new Date(act.createdAt.seconds * 1000).toLocaleDateString() : 'New'}
                        </span>
                      </div>
                      <span className="text-slate-500 font-medium text-xs line-clamp-2 leading-relaxed">{act.message}</span>
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
