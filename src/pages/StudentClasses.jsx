import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle2, BookOpen, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore';

// Sidebar links
import { LayoutDashboard, Video, FileText, BrainCircuit, Target, Calendar, Settings, ArrowRight, TrendingUp } from 'lucide-react';
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

export function StudentClasses() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [allSubjects, setAllSubjects] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      // 1. Load all available subjects created by teachers
      const subSnap = await getDocs(collection(db, 'subjects'));
      const subjects = subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllSubjects(subjects);
      
      // 2. Load current student's enrollments
      const enrollQ = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));
      const enrollSnap = await getDocs(enrollQ);
      const enrolledIds = enrollSnap.docs.map(doc => doc.data().subjectId);
      setEnrollments(enrolledIds);
      
    } catch (err) {
      console.error("Failed to load class data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinClass = async () => {
    if (!currentUser || !joinCode.trim()) return;
    setJoinError('');
    setIsJoining(true);
    
    try {
      const codeUpper = joinCode.trim().toUpperCase();
      
      // 1. Check if class exists
      const q = query(collection(db, 'subjects'), where('classCode', '==', codeUpper));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setJoinError('Invalid Class Code. Please check and try again.');
        setIsJoining(false);
        return;
      }
      
      const subjectDoc = snap.docs[0];
      const subjectId = subjectDoc.id;
      
      // 2. Check if already enrolled
      if (enrollments.includes(subjectId)) {
        setJoinError('You are already enrolled in this class.');
        setIsJoining(false);
        return;
      }
      
      // 3. Enroll
      const enrollmentId = `${currentUser.uid}_${subjectId}`;
      await setDoc(doc(db, 'enrollments', enrollmentId), {
        studentId: currentUser.uid,
        studentName: currentUser.displayName || 'Student',
        subjectId: subjectId,
        classId: subjectId,
        joinedAt: serverTimestamp(),
        enrolledAt: serverTimestamp()
      });
      
      setEnrollments([...enrollments, subjectId]);
      setJoinCode('');
      
    } catch (err) {
      console.error("Failed to join class:", err);
      setJoinError("An error occurred. Please try again.");
    } finally {
      setIsJoining(false);
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

  const enrolledSubjects = allSubjects.filter(sub => enrollments.includes(sub.id));
  const availableSubjects = allSubjects.filter(sub => !enrollments.includes(sub.id));

  return (
    <DashboardLayout links={studentLinks} role="student" userName="Student">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <div className="w-10 h-10 bg-[#f43f5e] rounded-xl flex items-center justify-center shadow-sm mr-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              My Classes
            </h1>
            <p className="text-slate-500 font-bold mt-2 ml-1">Enroll in subjects to unlock specific quizzes and learning paths.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Join Classroom Card */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <Users className="w-6 h-6 mr-2 text-[#3b82f6]" /> Join a Classroom
            </h2>
            <Card className="p-6 border-t-4 border-t-[#3b82f6] bg-white shadow-sm">
              <p className="text-sm font-bold text-slate-500 mb-6">Ask your teacher for the class code, then enter it here.</p>
              
              {joinError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-bold">
                  {joinError}
                </div>
              )}
              
              <div className="space-y-4">
                <Input 
                  value={joinCode} 
                  onChange={(e) => setJoinCode(e.target.value)} 
                  placeholder="Class Code (e.g. MATH84)" 
                  className="font-bold border-2 text-lg uppercase tracking-wider text-center"
                />
                <Button 
                  onClick={handleJoinClass}
                  disabled={isJoining || !joinCode.trim()}
                  variant="primary" 
                  className="w-full py-4 bg-[#3b82f6] border-b-4 border-[#1d4ed8] hover:bg-[#2563eb]"
                >
                  {isJoining ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Users className="w-5 h-5 mr-2" />}
                  Join Classroom
                </Button>
              </div>
            </Card>
          </div>

          {/* My Enrolled Classes */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <CheckCircle2 className="w-6 h-6 mr-2 text-[#10b981]" /> Enrolled Subjects
            </h2>
            
            {enrolledSubjects.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center h-[300px] flex flex-col items-center justify-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-500 text-lg">You are not enrolled in any subjects yet.</p>
                <p className="font-bold text-slate-400 text-sm mt-2">Use the Join Classroom form to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {enrolledSubjects.map(sub => (
                  <Card 
                    key={sub.id} 
                    onClick={() => navigate(`/dashboard/student/classes/${sub.id}`)}
                    className="p-6 border-t-4 border-t-[#10b981] hover:border-t-[#059669] bg-white shadow-sm flex flex-col h-full cursor-pointer hover:shadow-md transition-all group"
                  >
                    <div className="flex-1">
                      <h3 className="font-black text-xl text-slate-800 mb-2 group-hover:text-[#10b981] transition-colors">{sub.subjectName}</h3>
                      <p className="text-sm font-bold text-slate-400 mb-6">Instructor: {sub.teacherId.substring(0,5)}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t-2 border-slate-50">
                      <div className="text-xs font-black text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-lg">Enrolled</div>
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#10b981] transition-colors group-hover:translate-x-1" />
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
