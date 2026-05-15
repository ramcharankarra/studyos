import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Users, Target, BookOpen, Video, FileText, ArrowLeft, Loader2, PlayCircle, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

import { LayoutDashboard, BrainCircuit, Calendar, Settings, TrendingUp } from 'lucide-react';

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

export function StudentClassroom() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [subject, setSubject] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClassroom();
  }, [subjectId, currentUser]);

  const loadClassroom = async () => {
    if (!currentUser || !subjectId) return;
    try {
      // 1. Fetch Subject
      const docSnap = await getDoc(doc(db, 'subjects', subjectId));
      if (docSnap.exists()) {
        setSubject({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate('/dashboard/student/classes');
        return;
      }
      
      // 2. Fetch Quizzes specific to this subject that are published
      const q = query(
        collection(db, 'quizzes'), 
        where('subjectId', '==', subjectId),
        where('status', '==', 'published') // Firebase requires index for multiple where clauses or orderBy, let's filter client side to be safe
      );
      const snapQuizzes = await getDocs(q);
      
      // Filter client side and sort to avoid complex index requirements
      const sortedQuizzes = snapQuizzes.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAt - a.createdAt);
        
      setQuizzes(sortedQuizzes);
      
      // 3. Fetch Live Classes
      const qLive = query(collection(db, 'liveClasses'), where('classroomId', '==', subjectId));
      const snapLive = await getDocs(qLive);
      const upcomingLive = snapLive.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(c => c.scheduledTimestamp > Date.now()) // Only upcoming
        .sort((a, b) => a.scheduledTimestamp - b.scheduledTimestamp);
      setLiveClasses(upcomingLive);

      // 4. Fetch Announcements
      const qAnnounce = query(collection(db, 'announcements'), where('classroomId', '==', subjectId));
      const snapAnnounce = await getDocs(qAnnounce);
      const sortedAnnouncements = snapAnnounce.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.createdAt - a.createdAt);
      setAnnouncements(sortedAnnouncements);
      
    } catch (err) {
      console.error("Failed to load classroom:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout links={studentLinks} role="student" userName="Student">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#f43f5e]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!subject) return null;

  return (
    <DashboardLayout links={studentLinks} role="student" userName="Student">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/dashboard/student/classes')}
            className="p-2 bg-white rounded-full border-2 border-slate-200 hover:border-[#f43f5e] hover:text-[#f43f5e] transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              {subject.subjectName}
            </h1>
            <p className="text-slate-500 font-bold mt-1">Classroom Workspace</p>
          </div>
        </div>

        {/* Hero Banner */}
        <Card className="bg-gradient-to-r from-[#f43f5e] to-[#fb7185] p-8 border-none text-white shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black mb-2">Welcome to Class!</h2>
            <p className="font-bold text-rose-100 max-w-lg leading-relaxed">
              This is your central hub for {subject.subjectName}. Here you can find all assignments, notes, quizzes, and upcoming live sessions.
            </p>
          </div>
          <BookOpen className="w-24 h-24 text-white/20 hidden md:block" />
        </Card>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-t-4 border-t-[#3b82f6] cursor-pointer hover:-translate-y-1 transition-transform group shadow-sm bg-white">
            <Video className="w-8 h-8 text-[#3b82f6] mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-slate-800 text-lg">Live Class</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">Starts at 10:00 AM</p>
          </Card>
          
          <Card 
            onClick={() => navigate('/dashboard/student/quizzes')}
            className="p-6 border-t-4 border-t-[#f59e0b] cursor-pointer hover:-translate-y-1 transition-transform group shadow-sm bg-white"
          >
            <Target className="w-8 h-8 text-[#f59e0b] mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-slate-800 text-lg">Assigned Quizzes</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">{quizzes.length} pending assessments</p>
          </Card>
          
          <Card 
            onClick={() => navigate('/dashboard/student/notes')}
            className="p-6 border-t-4 border-t-[#10b981] cursor-pointer hover:-translate-y-1 transition-transform group shadow-sm bg-white"
          >
            <FileText className="w-8 h-8 text-[#10b981] mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-slate-800 text-lg">Class Notes</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">View or summarize AI notes</p>
          </Card>

          <Card className="p-6 border-t-4 border-t-[#8b5cf6] cursor-pointer hover:-translate-y-1 transition-transform group shadow-sm bg-[#8b5cf6]/5 border-[#8b5cf6]/20">
            <Trophy className="w-8 h-8 text-[#8b5cf6] mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-slate-800 text-lg">My Performance</h3>
            <p className="text-xs font-bold text-[#8b5cf6] mt-1">View analytics</p>
          </Card>
        </div>

        {/* Dynamic Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
          
          <div className="lg:col-span-2 space-y-8">
            {/* Live Classes (Dynamic) */}
            {liveClasses.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center">
                  <Video className="w-6 h-6 mr-2 text-[#f43f5e]" /> Upcoming Live Classes
                </h3>
                {liveClasses.map(cls => (
                  <Card key={cls.id} className="p-6 border-l-4 border-l-[#f43f5e] bg-gradient-to-r from-white to-[#f43f5e]/5 shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#f43f5e]/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="flex items-center text-xs font-black uppercase tracking-widest text-[#f43f5e] bg-[#f43f5e]/10 px-3 py-1.5 rounded-lg border border-[#f43f5e]/20">
                          <span className="w-2 h-2 rounded-full bg-[#f43f5e] mr-2 animate-pulse" /> UPCOMING LIVE CLASS
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-800 mb-2">{cls.title}</h3>
                      <p className="text-sm font-bold text-slate-500 mb-6 flex items-center">
                        <Calendar className="w-4 h-4 mr-2" /> {new Date(cls.scheduledTimestamp).toLocaleString()}
                      </p>
                      <a href={cls.meetingLink} target="_blank" rel="noreferrer" className="inline-block w-full text-center px-6 py-3 bg-[#f43f5e] hover:bg-[#e11d48] border-b-4 border-[#be123c] text-white font-black rounded-xl transition-all hover:translate-y-px hover:border-b-2">
                        Join Live Classroom
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center">
                <PlayCircle className="w-6 h-6 mr-2 text-[#f59e0b]" /> Recent Quizzes
              </h3>
              
              {quizzes.length === 0 ? (
                <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Target className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-400">No quizzes posted yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.slice(0,3).map(quiz => (
                    <Card key={quiz.id} className="p-5 border-l-4 border-l-[#f59e0b] bg-white shadow-sm flex justify-between items-center">
                      <div>
                        <h4 className="font-black text-slate-800 text-lg">{quiz.title}</h4>
                        <p className="text-sm font-bold text-slate-500 mt-1">{quiz.questions.length} Questions</p>
                      </div>
                      <Button 
                        onClick={() => navigate('/dashboard/student/quizzes')}
                        variant="outline" 
                        className="font-bold border-2"
                      >
                        Open
                      </Button>
                    </Card>
                  ))}
                  {quizzes.length > 3 && (
                    <Button variant="outline" className="w-full font-bold border-2" onClick={() => navigate('/dashboard/student/quizzes')}>
                      View All Quizzes
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-800">Classroom Feed</h3>
            {announcements.length === 0 ? (
              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                <p className="text-slate-500 font-bold">No announcements posted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map(post => (
                  <Card key={post.id} className="p-6 border-2 border-slate-100 bg-white shadow-sm hover:border-[#3b82f6]/30 transition-colors">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center flex-shrink-0 text-white font-black shadow-sm mr-4 mt-1">
                        {subject?.teacherName?.charAt(0) || 'T'}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col mb-3">
                          <span className="font-black text-slate-800">{subject?.teacherName}</span>
                          <span className="text-xs font-bold text-slate-400">
                            {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium whitespace-pre-wrap mb-4">{post.content}</p>
                        
                        {post.link && (
                          <a href={post.link} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-[#3b82f6] hover:text-[#1d4ed8]">
                            View Attached Resource
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
