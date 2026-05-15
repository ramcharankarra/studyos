import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { FileText, Calendar, Loader2, Link as LinkIcon, Send, BrainCircuit, CheckCircle2, Upload, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateAssignmentFeedback } from '../lib/gemini';

// Sidebar links
import { LayoutDashboard, Users, Video, Target, TrendingUp, Settings } from 'lucide-react';
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

export function StudentAssignments() {
  const { currentUser } = useAuth();
  
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [subjects, setSubjects] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Active assignment state
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Feedback state
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      // 1. Get enrollments (top-level collection)
      const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid)));
      const subjectIds = enrollSnap.docs.map(d => d.data().subjectId);
      
      if (subjectIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // 2. Get Subjects for mapping names
      const subSnap = await getDocs(collection(db, 'subjects'));
      const subsMap = {};
      subSnap.docs.forEach(d => {
        if (subjectIds.includes(d.id)) subsMap[d.id] = d.data().subjectName;
      });
      setSubjects(subsMap);

      // 3. Get Assignments for those subjects
      const assignSnap = await getDocs(query(collection(db, 'assignments'), orderBy('dueTimestamp', 'asc')));
      const filteredAssignments = assignSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(a => subjectIds.includes(a.classroomId));
        
      setAssignments(filteredAssignments);

      // 4. Get Submissions for this student (now assignmentSubmissions)
      const submsSnap = await getDocs(query(collection(db, 'assignmentSubmissions'), where('studentId', '==', currentUser.uid)));
      const submsMap = {};
      submsSnap.docs.forEach(doc => {
        submsMap[doc.data().assignmentId] = { id: doc.id, ...doc.data() };
      });
      setSubmissions(submsMap);

    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetAiFeedback = async () => {
    if (!submissionText.trim()) {
      alert("Please write some content to get feedback.");
      return;
    }
    
    setIsGeneratingFeedback(true);
    try {
      const feedback = await generateAssignmentFeedback(activeAssignment.description, submissionText);
      setAiFeedback(feedback);
    } catch (e) {
      alert("Failed to get AI feedback.");
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submissionText.trim() && !submissionLink.trim() && !submissionFile) {
      alert("Please provide text, a link, or upload a file for your submission.");
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionId = crypto.randomUUID();
      
      let submissionUrl = null;
      if (submissionFile) {
        const storageRef = ref(storage, `submissions/${submissionId}/${submissionFile.name}`);
        await uploadBytes(storageRef, submissionFile);
        submissionUrl = await getDownloadURL(storageRef);
      }

      const submissionData = {
        assignmentId: activeAssignment.id,
        studentId: currentUser.uid,
        studentName: currentUser.displayName || 'Student',
        teacherId: activeAssignment.teacherId,
        content: submissionText || null,
        link: submissionLink || null,
        submissionUrl: submissionUrl,
        aiFeedback: aiFeedback || null,
        status: 'submitted',
        submittedAt: serverTimestamp(),
      };

      const docRef = doc(db, 'assignmentSubmissions', submissionId);
      await setDoc(docRef, submissionData);
      
      setSubmissions(prev => ({ ...prev, [activeAssignment.id]: { id: submissionId, ...submissionData } }));
      
      // Notify Teacher
      try {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          userId: activeAssignment.teacherId,
          type: 'assignment',
          title: 'New Submission',
          message: `A student submitted work for "${activeAssignment.title}".`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      } catch(e) {}

      setActiveAssignment(null);
      setSubmissionText('');
      setSubmissionLink('');
      setSubmissionFile(null);
      setAiFeedback(null);
      alert("Assignment submitted successfully!");
    } catch (err) {
      console.error("Failed to submit:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingAssignments = assignments.filter(a => !submissions[a.id] && a.dueTimestamp > Date.now());
  const overdueAssignments = assignments.filter(a => !submissions[a.id] && a.dueTimestamp <= Date.now());
  const completedAssignments = assignments.filter(a => submissions[a.id]);

  if (isLoading) {
    return (
      <DashboardLayout links={studentLinks} role="student" userName="Student">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#10b981]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout links={studentLinks} role="student" userName="Student">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center">
            <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center shadow-sm mr-3">
              <FileText className="w-6 h-6 text-white" />
            </div>
            Assignment Hub
          </h1>
          <p className="text-slate-500 font-bold mt-2 ml-1">Manage, write, and submit your coursework.</p>
        </div>

        {activeAssignment ? (
          <div className="animate-in slide-in-from-right-8 space-y-6">
            <button 
              onClick={() => { setActiveAssignment(null); setAiFeedback(null); setSubmissionFile(null); }}
              className="font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              ← Back to Assignments
            </button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Assignment Details */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 border-t-4 border-t-[#3b82f6] bg-white shadow-sm">
                  <h2 className="text-2xl font-black text-slate-800 mb-2">{activeAssignment.title}</h2>
                  <span className="inline-block text-xs font-black uppercase tracking-widest text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-1 rounded-lg mb-4">
                    {subjects[activeAssignment.classroomId]}
                  </span>
                  <div className="flex items-center text-sm font-bold text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Calendar className="w-4 h-4 mr-2 text-[#f43f5e]" /> 
                    Due: {new Date(activeAssignment.dueTimestamp).toLocaleString()}
                  </div>
                  
                  <h3 className="font-extrabold text-slate-700 mb-2">Instructions</h3>
                  <p className="text-slate-600 font-medium whitespace-pre-wrap leading-relaxed mb-6">
                    {activeAssignment.description}
                  </p>
                  
                  <div className="space-y-3">
                    {activeAssignment.attachmentUrl && (
                      <a href={activeAssignment.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center w-full justify-center px-4 py-3 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 font-bold text-sm rounded-xl transition-colors border border-[#10b981]/20">
                        <Upload className="w-4 h-4 mr-2" /> Download Attached File
                      </a>
                    )}
                    {activeAssignment.link && (
                      <a href={activeAssignment.link} target="_blank" rel="noreferrer" className="inline-flex items-center w-full justify-center px-4 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-sm rounded-xl transition-colors border border-blue-200">
                        <LinkIcon className="w-4 h-4 mr-2" /> View External Link
                      </a>
                    )}
                  </div>
                </Card>
              </div>

              {/* Submission Area */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6 border-2 border-slate-100 bg-white shadow-sm">
                  <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
                    <Send className="w-5 h-5 mr-2 text-[#10b981]" /> Your Submission
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Upload File (PDF, DOCX, Image)</label>
                      <input 
                        type="file" 
                        onChange={e => setSubmissionFile(e.target.files[0])}
                        className="w-full font-bold text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#10b981]/10 file:text-[#10b981] hover:file:bg-[#10b981]/20 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="flex justify-between items-end mb-2">
                        <span className="block text-sm font-bold text-slate-700">Or write your answer</span>
                        <Button 
                          type="button"
                          onClick={handleGetAiFeedback}
                          disabled={isGeneratingFeedback || !submissionText.trim()}
                          variant="outline" 
                          className="text-xs py-1 px-3 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                        >
                          {isGeneratingFeedback ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <BrainCircuit className="w-3 h-3 mr-1" />}
                          Get AI Feedback
                        </Button>
                      </label>
                      <textarea 
                        value={submissionText} onChange={e => setSubmissionText(e.target.value)}
                        placeholder="Start typing your essay or response here..." 
                        className="w-full h-48 p-4 rounded-2xl border-2 border-slate-200 font-medium focus:border-[#10b981] focus:ring-[#10b981]/20 custom-scrollbar resize-none outline-none transition-colors text-sm"
                      />
                    </div>
                    
                    {aiFeedback && (
                      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-100">
                        <h4 className="font-black text-purple-800 flex items-center mb-2">
                          <BrainCircuit className="w-4 h-4 mr-2" /> AI TA Feedback
                        </h4>
                        <p className="text-sm font-bold text-purple-900/80 whitespace-pre-wrap leading-relaxed">
                          {aiFeedback}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Or attach external document (e.g. Google Doc link)</label>
                      <Input value={submissionLink} onChange={e => setSubmissionLink(e.target.value)} type="url" placeholder="https://docs.google.com/..." className="font-bold border-2 focus:border-[#10b981]" />
                    </div>

                    <Button type="submit" disabled={isSubmitting} variant="primary" className="w-full bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#059669] py-4 text-lg">
                      {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
                      Submit Assignment
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pending */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 border-b-2 border-slate-200 pb-2">Pending ({pendingAssignments.length})</h3>
              {pendingAssignments.length === 0 && (
                <Card className="p-5 border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center py-8">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                    <CheckCircle2 className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-400 text-sm">No pending assignments!</p>
                </Card>
              )}
              {pendingAssignments.map(assign => (
                <Card key={assign.id} className="p-5 border-t-4 border-t-[#3b82f6] bg-white shadow-sm hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => setActiveAssignment(assign)}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-0.5 rounded-md">
                      {subjects[assign.classroomId]}
                    </span>
                    {assign.attachmentUrl && <Upload className="w-4 h-4 text-[#3b82f6]" />}
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-lg leading-tight mb-2">{assign.title}</h4>
                  <p className="text-xs font-bold text-slate-500 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> Due {new Date(assign.dueTimestamp).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>

            {/* Overdue */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-[#f43f5e] border-b-2 border-red-200 pb-2">Overdue ({overdueAssignments.length})</h3>
              {overdueAssignments.length === 0 && (
                <Card className="p-5 border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center py-8">
                  <p className="font-bold text-slate-400 text-sm">You're all caught up!</p>
                </Card>
              )}
              {overdueAssignments.map(assign => (
                <Card key={assign.id} className="p-5 border-t-4 border-t-[#f43f5e] bg-white shadow-sm hover:-translate-y-1 transition-transform cursor-pointer" onClick={() => setActiveAssignment(assign)}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase text-[#f43f5e] bg-[#f43f5e]/10 px-2 py-0.5 rounded-md">
                      {subjects[assign.classroomId]}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-lg leading-tight mb-2">{assign.title}</h4>
                  <p className="text-xs font-bold text-[#f43f5e] flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> Was due {new Date(assign.dueTimestamp).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>

            {/* Submitted & Graded */}
            <div className="space-y-4">
              <h3 className="text-lg font-black text-[#10b981] border-b-2 border-green-200 pb-2">Submitted ({completedAssignments.length})</h3>
              {completedAssignments.length === 0 && (
                <Card className="p-5 border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center py-8">
                  <p className="font-bold text-slate-400 text-sm">No submissions yet.</p>
                </Card>
              )}
              {completedAssignments.map(assign => {
                const sub = submissions[assign.id];
                return (
                  <Card key={assign.id} className={`p-5 border-2 ${sub.grade ? 'border-purple-200 bg-purple-50/30' : 'border-green-100 bg-green-50/50'} shadow-sm`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black uppercase text-[#10b981] bg-[#10b981]/20 px-2 py-0.5 rounded-md">
                        {subjects[assign.classroomId]}
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                    </div>
                    <h4 className="font-extrabold text-slate-700 text-lg leading-tight mb-2">{assign.title}</h4>
                    <p className="text-xs font-bold text-slate-500 mb-3">
                      Submitted {new Date(sub.submittedAt?.seconds * 1000).toLocaleDateString()}
                    </p>
                    
                    {sub.grade ? (
                      <div className="mt-3 p-3 bg-white rounded-xl border-2 border-purple-100 shadow-sm">
                        <div className="flex justify-between items-center mb-2 border-b-2 border-slate-50 pb-2">
                          <span className="text-xs font-black uppercase text-slate-400">Teacher Grade</span>
                          <span className="font-black text-purple-600 bg-purple-100 px-2 py-0.5 rounded-lg text-sm">{sub.grade}</span>
                        </div>
                        {sub.feedback && (
                          <div>
                            <span className="flex items-center text-xs font-black uppercase text-slate-400 mb-1">
                              <MessageSquare className="w-3 h-3 mr-1" /> Feedback
                            </span>
                            <p className="text-sm font-medium text-slate-600 leading-snug">{sub.feedback}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs font-bold text-[#f59e0b] bg-[#f59e0b]/10 px-3 py-2 rounded-lg border border-[#f59e0b]/20 flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> Pending Grade
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
