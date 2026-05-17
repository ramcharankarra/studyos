import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Users, BookOpen, BarChart, AlertTriangle, Trophy, Plus, ChevronRight, X, Loader2, Edit3, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, updateDoc, query, where, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// Sidebar links
import { LayoutDashboard, Video, FileText, BrainCircuit, Settings } from 'lucide-react';
const teacherLinks = [
  { label: 'Dashboard', path: '/dashboard/teacher', icon: LayoutDashboard, color: '#8b5cf6' },
  { label: 'Manage Classes', path: '/dashboard/teacher/classes', icon: Users, color: '#3b82f6' },
  { label: 'Live Classes', path: '/dashboard/teacher/live', icon: Video, color: '#f43f5e' },
  { label: 'Assignments', path: '/dashboard/teacher/assignments', icon: FileText, color: '#10b981' },
  { label: 'Quiz Generator', path: '/dashboard/teacher/quizzes', icon: BrainCircuit, color: '#f59e0b' },
  { label: 'Analytics', path: '/dashboard/teacher/classes', icon: BarChart, color: '#14b8a6' },
  { label: 'Settings', path: '/dashboard/teacher/settings', icon: Settings, color: '#64748b' },
];

export function TeacherClasses() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectDesc, setEditSubjectDesc] = useState('');
  
  // Analytics State
  const [activeSubject, setActiveSubject] = useState(null);
  const [subjectAttempts, setSubjectAttempts] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [localUser, setLocalUser] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoadingAuth(false);
    }, 3000);

    const unsub = onAuthStateChanged(auth, (user) => {
      setLocalUser(user || null);
      setLoadingAuth(false);
      clearTimeout(timeout);
    });

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (loadingAuth) return;

    if (!localUser?.uid) {
      navigate('/login');
      return;
    }

    loadSubjects(localUser.uid);
  }, [loadingAuth, localUser, navigate]);

  const loadSubjects = async (uid) => {
    try {
      console.log("Current User:", localUser);
      console.log("UID:", uid);
      console.log("Fetching teacher subjects...");

      const q = query(
        collection(db, 'subjects'),
        where('teacherId', '==', uid)
      );
      const snap = await getDocs(q);
      
      console.log("Fetched subjects count:", snap.size);
      
      const fetchedSubjects = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched subjects:", fetchedSubjects);

      fetchedSubjects.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setSubjects(fetchedSubjects);
    } catch (error) {
      console.error("Failed to load subjects:", error);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !currentUser) return;
    
    try {
      const subjectId = crypto.randomUUID();
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const newSub = {
        id: subjectId,
        subjectName: newSubjectName,
        description: newSubjectDesc,
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName || 'Teacher',
        classCode: code,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'subjects', subjectId), newSub);
      setSubjects([newSub, ...subjects]);
      setNewSubjectName('');
      setNewSubjectDesc('');
      setShowCreateForm(false);
    } catch (err) {
      console.error("Failed to create subject:", err);
    }
  };

  const handleUpdateSubject = async () => {
    if (!editSubjectName.trim() || !activeSubject) return;
    
    try {
      await updateDoc(doc(db, 'subjects', activeSubject.id), {
        subjectName: editSubjectName,
        description: editSubjectDesc
      });
      
      const updatedSub = { ...activeSubject, subjectName: editSubjectName, description: editSubjectDesc };
      setSubjects(subjects.map(s => s.id === activeSubject.id ? updatedSub : s));
      setActiveSubject(updatedSub);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update subject:", err);
    }
  };

  const handleDeleteSubject = async (e, subjectId) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    
    try {
      await deleteDoc(doc(db, 'subjects', subjectId));
      setSubjects(subjects.filter(s => s.id !== subjectId));
      if (activeSubject?.id === subjectId) setActiveSubject(null);
    } catch (err) {
      console.error("Failed to delete subject:", err);
    }
  };

  const loadSubjectAnalytics = async (subject) => {
    setActiveSubject(subject);
    setIsEditing(false);
    setEditSubjectName(subject.subjectName);
    setEditSubjectDesc(subject.description || '');
    
    try {
      // 1. Load Quiz Results
      const qAttempts = query(collection(db, 'quizResults'), where('classId', '==', subject.id));
      const snapAttempts = await getDocs(qAttempts);
      setSubjectAttempts(snapAttempts.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // 2. Load Enrolled Students from top-level enrollments
      const qEnroll = query(collection(db, 'enrollments'), where('subjectId', '==', subject.id));
      const snapEnroll = await getDocs(qEnroll);
      setEnrolledStudents(snapEnroll.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
    } catch (err) {
      console.error("Failed to load analytics or enrollments:", err);
      // Fallbacks
      setSubjectAttempts([]);
      setEnrolledStudents([]);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout links={teacherLinks} role="teacher" userName="Teacher">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#3b82f6]" />
        </div>
      </DashboardLayout>
    );
  }

  // Calculate Analytics derived data
  const totalAttempts = subjectAttempts.length;
  const avgScore = totalAttempts > 0 
    ? Math.round(subjectAttempts.reduce((acc, a) => acc + (a.score / (a.totalMarks || 1) * 100), 0) / totalAttempts) 
    : 0;
    
  return (
    <DashboardLayout links={teacherLinks} role="teacher" userName="Teacher">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <div className="w-10 h-10 bg-[#3b82f6] rounded-xl flex items-center justify-center shadow-sm mr-3">
                <Users className="w-6 h-6 text-white" />
              </div>
              Subject Management
            </h1>
            <p className="text-slate-500 font-bold mt-2 ml-1">Create subjects, manage enrollments, and track analytics.</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(!showCreateForm)} 
            variant="primary" 
            className="bg-[#3b82f6] border-b-4 border-[#1d4ed8] hover:bg-[#2563eb]"
          >
            {showCreateForm ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
            {showCreateForm ? "Cancel" : "New Subject"}
          </Button>
        </div>

        {showCreateForm && (
          <Card className="p-6 border-t-4 border-t-[#3b82f6] bg-white shadow-sm flex flex-col md:flex-row items-start md:items-end gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-2">Subject Name</label>
              <Input 
                value={newSubjectName} 
                onChange={(e) => setNewSubjectName(e.target.value)} 
                placeholder="e.g. Introduction to DBMS" 
                className="font-bold border-2 focus:border-[#3b82f6] focus:ring-[#3b82f6]/20"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
              <Input 
                value={newSubjectDesc} 
                onChange={(e) => setNewSubjectDesc(e.target.value)} 
                placeholder="Optional description" 
                className="font-bold border-2 focus:border-[#3b82f6] focus:ring-[#3b82f6]/20"
              />
            </div>
            <Button onClick={handleCreateSubject} variant="primary" className="bg-[#3b82f6] border-b-4 border-[#1d4ed8] hover:bg-[#2563eb] h-[52px] w-full md:w-auto">
              Create Subject
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Subject List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-slate-500" /> Your Subjects
            </h2>
            
            {subjects.length === 0 ? (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="font-bold text-slate-400">No subjects created yet.</p>
              </div>
            ) : (
              subjects.map(subject => (
                <div 
                  key={subject.id}
                  onClick={() => loadSubjectAnalytics(subject)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${
                    activeSubject?.id === subject.id 
                      ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#1d4ed8]' 
                      : 'bg-white border-slate-100 hover:border-[#3b82f6]/30 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-black truncate mr-2 flex flex-col">
                    <span>{subject.subjectName}</span>
                    <span className="text-xs font-bold text-slate-400 mt-1">{subject.classCode}</span>
                  </div>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleDeleteSubject(e, subject.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Analytics & Students Dashboard */}
          <div className="lg:col-span-2">
            {!activeSubject ? (
              <Card className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 shadow-none">
                <BarChart className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="font-black text-slate-500 text-xl">Select a Subject</h3>
                <p className="font-bold text-slate-400 mt-2">Click a subject on the left to view deep analytics.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
                  {isEditing ? (
                    <div className="flex-1 mr-4 w-full">
                      <Input 
                        value={editSubjectName} 
                        onChange={(e) => setEditSubjectName(e.target.value)} 
                        className="mb-2 font-black text-xl border-2 focus:border-[#3b82f6]"
                      />
                      <Input 
                        value={editSubjectDesc} 
                        onChange={(e) => setEditSubjectDesc(e.target.value)} 
                        placeholder="Class Description"
                        className="font-bold text-sm border-2 focus:border-[#3b82f6]"
                      />
                      <div className="mt-3 flex gap-2">
                        <Button onClick={handleUpdateSubject} variant="primary" className="bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#047857] py-1 px-4 h-10">
                          <Save className="w-4 h-4 mr-2" /> Save
                        </Button>
                        <Button onClick={() => setIsEditing(false)} variant="outline" className="py-1 px-4 h-10 font-bold border-2">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h2 className="text-2xl font-black text-slate-800">{activeSubject.subjectName}</h2>
                        <button onClick={() => setIsEditing(true)} className="ml-3 p-1.5 text-slate-400 hover:text-[#3b82f6] hover:bg-[#3b82f6]/10 rounded-lg transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-slate-500 mt-1">{activeSubject.description || "No description provided."}</p>
                    </div>
                  )}
                  
                  {!isEditing && (
                    <div className="mt-4 sm:mt-0 bg-[#8b5cf6]/10 border-2 border-[#8b5cf6]/30 p-3 rounded-xl flex items-center">
                      <div>
                        <p className="text-xs font-black text-[#7c3aed] uppercase tracking-widest mb-0.5">Invite Code</p>
                        <p className="text-xl font-black text-slate-800 tracking-wider">{activeSubject.classCode || 'N/A'}</p>
                      </div>
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(activeSubject.classCode || '');
                          alert("Class code copied to clipboard!");
                        }} 
                        variant="outline" 
                        className="ml-4 font-bold border-2 text-[#7c3aed] border-[#7c3aed]/30 hover:bg-[#7c3aed]/10"
                      >
                        Copy
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-6 bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] border-none text-white shadow-sm text-center">
                    <p className="font-black text-blue-100 text-sm uppercase tracking-widest mb-1">Average Score</p>
                    <h3 className="text-5xl font-black">{avgScore}%</h3>
                  </Card>
                  <Card className="p-6 bg-white border-2 border-slate-100 shadow-sm text-center">
                    <p className="font-black text-slate-400 text-sm uppercase tracking-widest mb-1">Total Enrollments</p>
                    <h3 className="text-5xl font-black text-slate-800">{enrolledStudents.length}</h3>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Enrolled Students */}
                  <Card className="p-6 border-t-4 border-t-[#10b981] shadow-sm">
                    <h3 className="font-black text-slate-800 flex items-center mb-4 text-xl">
                      <Users className="w-5 h-5 text-[#10b981] mr-2" /> Enrolled Students
                    </h3>
                    {enrolledStudents.length === 0 ? (
                      <p className="text-sm font-bold text-slate-400 text-center py-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-100">
                        No students enrolled yet. Share the class code!
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {enrolledStudents.map((student, idx) => (
                          <li 
                            key={student.id} 
                            className="flex justify-between items-center p-4 bg-white rounded-xl border-2 border-slate-100 hover:border-[#10b981]/30 transition-colors"
                          >
                            <div className="flex flex-col">
                              <span className="font-black text-slate-700 text-lg">{student.studentName || 'Unknown Student'}</span>
                              <span className="font-bold text-slate-400 text-xs">ID: {student.studentId?.substring(0,8)}</span>
                            </div>
                            <span className="font-bold text-[#10b981] bg-[#10b981]/10 px-3 py-1 rounded-lg text-sm">
                              Joined {student.joinedAt ? new Date(student.joinedAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>

              </div>
            )}
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
