import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { FileText, Plus, Users, Calendar, Loader2, Trash2, Edit, Link as LinkIcon, Upload, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, orderBy, deleteDoc, writeBatch, collectionGroup, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

// Sidebar links
import { LayoutDashboard, Video, BrainCircuit, BarChart, Settings } from 'lucide-react';
const teacherLinks = [
  { label: 'Dashboard', path: '/dashboard/teacher', icon: LayoutDashboard, color: '#8b5cf6' },
  { label: 'Manage Classes', path: '/dashboard/teacher/classes', icon: Users, color: '#3b82f6' },
  { label: 'Live Classes', path: '/dashboard/teacher/live', icon: Video, color: '#f43f5e' },
  { label: 'Assignments', path: '/dashboard/teacher/assignments', icon: FileText, color: '#10b981' },
  { label: 'Quiz Generator', path: '/dashboard/teacher/quizzes', icon: BrainCircuit, color: '#f59e0b' },
  { label: 'Analytics', path: '/dashboard/teacher/classes', icon: BarChart, color: '#14b8a6' },
  { label: 'Settings', path: '/dashboard/teacher/settings', icon: Settings, color: '#64748b' },
];

export function TeacherAssignments() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissionsCount, setSubmissionsCount] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [link, setLink] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review states
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [activeSubmissions, setActiveSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  
  // Grading states
  const [gradeInputs, setGradeInputs] = useState({});
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [savingGrades, setSavingGrades] = useState({});

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      // 1. Load subjects
      const qSub = query(collection(db, 'subjects'), where('teacherId', '==', currentUser.uid));
      const subSnap = await getDocs(qSub);
      setSubjects(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 2. Load assignments
      const qAssign = query(collection(db, 'assignments'), where('teacherId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
      const assignSnap = await getDocs(qAssign);
      const assignmentsData = assignSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(assignmentsData);

      // 3. Load submission counts
      const counts = {};
      for (const a of assignmentsData) {
        const qSubmissions = query(collection(db, 'assignmentSubmissions'), where('assignmentId', '==', a.id));
        const subSnap = await getDocs(qSubmissions);
        counts[a.id] = subSnap.docs.length;
      }
      setSubmissionsCount(counts);

    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!title || !subjectId || !description || !dueDate) {
      alert("Please fill all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedDateTime = new Date(`${dueDate}T${dueTime || '23:59'}`);
      const assignmentId = crypto.randomUUID();
      
      let attachmentUrl = null;
      if (attachmentFile) {
        const storageRef = ref(storage, `assignments/${assignmentId}/${attachmentFile.name}`);
        await uploadBytes(storageRef, attachmentFile);
        attachmentUrl = await getDownloadURL(storageRef);
      }
      
      const newAssignment = {
        title,
        description,
        classroomId: subjectId,
        teacherId: currentUser.uid,
        link: link || null,
        attachmentUrl: attachmentUrl,
        dueTimestamp: combinedDateTime.getTime(),
        createdAt: serverTimestamp(),
      };

      const docRef = doc(db, 'assignments', assignmentId);
      await setDoc(docRef, newAssignment);
      
      setAssignments([{ id: assignmentId, ...newAssignment }, ...assignments]);
      setSubmissionsCount(prev => ({ ...prev, [assignmentId]: 0 }));
      
      // Dispatch Notifications
      try {
        const enrollGroupQuery = query(collection(db, 'enrollments'), where('subjectId', '==', subjectId));
        const enrollGroupSnap = await getDocs(enrollGroupQuery);
        
        const batch = writeBatch(db);
        enrollGroupSnap.docs.forEach(enrollDoc => {
          const userId = enrollDoc.data().studentId;
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: userId,
            type: 'announcement',
            title: 'New Assignment Posted',
            message: `A new assignment "${title}" has been posted. Due: ${combinedDateTime.toLocaleString()}`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      } catch (e) {
        console.error("Failed to send notifications:", e);
      }

      // Reset
      setTitle('');
      setDescription('');
      setLink('');
      setDueDate('');
      setDueTime('');
      setAttachmentFile(null);
      setShowForm(false);
      
    } catch (err) {
      console.error("Failed to create assignment:", err);
      alert("Failed to create. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if(!window.confirm("Delete this assignment? All submissions will also be orphaned.")) return;
    try {
      await deleteDoc(doc(db, 'assignments', id));
      setAssignments(assignments.filter(a => a.id !== id));
      if (activeAssignment?.id === id) setActiveAssignment(null);
    } catch(e) {}
  };

  const getSubjectName = (id) => {
    const sub = subjects.find(s => s.id === id);
    return sub ? sub.subjectName : 'Unknown Subject';
  };

  const handleViewSubmissions = async (assignment) => {
    setActiveAssignment(assignment);
    setIsLoadingSubmissions(true);
    try {
      const qSub = query(collection(db, 'assignmentSubmissions'), where('assignmentId', '==', assignment.id));
      const snap = await getDocs(qSub);
      const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveSubmissions(subs);
      
      const gInputs = {};
      const fInputs = {};
      subs.forEach(s => {
        gInputs[s.id] = s.grade || '';
        fInputs[s.id] = s.feedback || '';
      });
      setGradeInputs(gInputs);
      setFeedbackInputs(fInputs);
      
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleSaveGrade = async (submissionId) => {
    setSavingGrades(prev => ({ ...prev, [submissionId]: true }));
    try {
      const grade = gradeInputs[submissionId];
      const feedback = feedbackInputs[submissionId];
      
      await updateDoc(doc(db, 'assignmentSubmissions', submissionId), {
        grade: grade,
        feedback: feedback
      });
      
      setActiveSubmissions(subs => subs.map(s => s.id === submissionId ? { ...s, grade, feedback } : s));
      alert("Grade saved successfully!");
    } catch (err) {
      console.error("Failed to save grade:", err);
      alert("Failed to save grade.");
    } finally {
      setSavingGrades(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  return (
    <DashboardLayout links={teacherLinks} role="teacher" userName="Teacher">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center shadow-sm mr-3">
                <FileText className="w-6 h-6 text-white" />
              </div>
              Assignment Center
            </h1>
            <p className="text-slate-500 font-bold mt-2 ml-1">Create assignments, track submissions, and provide feedback.</p>
          </div>
          {!activeAssignment && (
            <Button 
              onClick={() => setShowForm(!showForm)} 
              variant="primary" 
              className="bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#059669]"
            >
              <Plus className="w-5 h-5 mr-2" />
              {showForm ? 'Cancel' : 'Create Assignment'}
            </Button>
          )}
        </div>

        {activeAssignment ? (
          <div className="animate-in slide-in-from-right-8 space-y-6">
            <button 
              onClick={() => setActiveAssignment(null)}
              className="font-bold text-slate-400 hover:text-slate-700 transition-colors flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Assignments
            </button>
            
            <Card className="p-6 border-t-4 border-t-[#3b82f6] bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-black uppercase text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-1 rounded-lg mb-2 inline-block">
                    {getSubjectName(activeAssignment.classroomId)}
                  </span>
                  <h2 className="text-2xl font-black text-slate-800">{activeAssignment.title}</h2>
                </div>
                <Badge variant="outline" className="font-bold text-sm">
                  Due: {new Date(activeAssignment.dueTimestamp).toLocaleDateString()}
                </Badge>
              </div>
              <p className="text-slate-600 font-medium whitespace-pre-wrap">{activeAssignment.description}</p>
              {activeAssignment.attachmentUrl && (
                <a href={activeAssignment.attachmentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center text-sm font-bold text-[#10b981] bg-[#10b981]/10 px-4 py-2 rounded-xl">
                  <LinkIcon className="w-4 h-4 mr-2" /> Download Attached File
                </a>
              )}
            </Card>

            <h3 className="text-xl font-black text-slate-800 flex items-center pt-4">
              <Users className="w-5 h-5 mr-2 text-slate-500" /> Student Submissions ({activeSubmissions.length})
            </h3>
            
            {isLoadingSubmissions ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#10b981] mx-auto" />
              </div>
            ) : activeSubmissions.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <p className="font-bold text-slate-400">No submissions yet for this assignment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeSubmissions.map(sub => (
                  <Card key={sub.id} className={`p-6 border-2 transition-all ${sub.grade ? 'border-green-200 bg-green-50/30' : 'border-slate-100 bg-white'}`}>
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-3">
                          <div>
                            <h4 className="font-black text-slate-800 text-lg">{sub.studentName || 'Student'}</h4>
                            <p className="text-xs font-bold text-slate-400">Submitted: {new Date(sub.submittedAt?.seconds * 1000).toLocaleString()}</p>
                          </div>
                          {sub.grade && (
                            <Badge className="bg-green-100 text-green-700 font-black px-3 py-1 text-sm border-2 border-green-200">
                              Graded: {sub.grade}
                            </Badge>
                          )}
                        </div>
                        
                        {sub.submissionUrl && (
                          <a href={sub.submissionUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-[#3b82f6] hover:text-[#1d4ed8] bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                            <LinkIcon className="w-4 h-4 mr-2" /> View Submitted File
                          </a>
                        )}
                        {sub.link && (
                          <a href={sub.link} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-[#8b5cf6] hover:text-[#6d28d9] bg-purple-50 px-4 py-2 rounded-xl border border-purple-100 ml-2">
                            <LinkIcon className="w-4 h-4 mr-2" /> External Link
                          </a>
                        )}
                        {sub.content && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <p className="text-sm font-medium text-slate-600 whitespace-pre-wrap">{sub.content}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="lg:w-1/3 bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Grade</label>
                            <Input 
                              value={gradeInputs[sub.id]} 
                              onChange={e => setGradeInputs({...gradeInputs, [sub.id]: e.target.value})} 
                              placeholder="e.g. 95/100, A+, etc."
                              className="font-bold border-2 focus:border-[#10b981]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Feedback</label>
                            <textarea 
                              value={feedbackInputs[sub.id]} 
                              onChange={e => setFeedbackInputs({...feedbackInputs, [sub.id]: e.target.value})}
                              placeholder="Great job on the introduction..."
                              className="w-full h-20 p-3 rounded-xl border-2 border-slate-200 font-medium focus:border-[#10b981] custom-scrollbar resize-none outline-none text-sm"
                            />
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleSaveGrade(sub.id)}
                          disabled={savingGrades[sub.id]}
                          className="w-full mt-3 bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#059669] py-2"
                        >
                          {savingGrades[sub.id] ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                          Save Grade
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {showForm && (
              <Card className="p-6 border-t-4 border-t-[#10b981] bg-white shadow-lg animate-in slide-in-from-top-4">
                <h2 className="text-xl font-black text-slate-800 mb-6">Create New Assignment</h2>
                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Assignment Title</label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Chapter 4 Essay" className="font-bold border-2 focus:border-[#10b981]" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Classroom</label>
                      <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#10b981] focus:ring-[#10b981]/20 outline-none transition-colors">
                        <option value="">-- Select Subject --</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Instructions / Description</label>
                    <textarea 
                      value={description} onChange={e => setDescription(e.target.value)} required
                      placeholder="Explain what the students need to do..." 
                      className="w-full h-32 p-4 rounded-xl border-2 border-slate-200 font-medium focus:border-[#10b981] focus:ring-[#10b981]/20 custom-scrollbar resize-none outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Due Date</label>
                      <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="font-bold border-2 focus:border-[#10b981]" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Due Time (Optional)</label>
                      <Input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className="font-bold border-2 focus:border-[#10b981]" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">File Attachment (Optional)</label>
                      <input 
                        type="file" 
                        onChange={e => setAttachmentFile(e.target.files[0])}
                        className="w-full p-2.5 rounded-xl border-2 border-slate-200 font-bold focus:border-[#10b981] focus:ring-[#10b981]/20 outline-none transition-colors bg-white text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#10b981]/10 file:text-[#10b981] hover:file:bg-[#10b981]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Resource Link (Optional)</label>
                      <Input value={link} onChange={e => setLink(e.target.value)} type="url" placeholder="https://..." className="font-bold border-2 focus:border-[#10b981]" />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={isSubmitting} variant="primary" className="bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#059669] px-8">
                      {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
                      Publish Assignment
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <div className="space-y-4">
              <h2 className="text-xl font-black text-slate-800 flex items-center">
                Recent Assignments
              </h2>
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mt-8" />
              ) : assignments.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-black text-slate-500">No Assignments Yet</h3>
                  <p className="font-bold text-slate-400 mt-2">Click 'Create Assignment' to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {assignments.map(assign => (
                    <Card key={assign.id} className="p-6 border-l-4 border-l-[#10b981] bg-white shadow-sm flex flex-col h-full hover:border-[#10b981]/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-black uppercase text-[#10b981] bg-[#10b981]/10 px-2 py-1 rounded-lg">
                          {getSubjectName(assign.classroomId)}
                        </span>
                        <button onClick={() => handleDeleteAssignment(assign.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                      </div>
                      <h3 className="font-black text-xl text-slate-800 mb-2">{assign.title}</h3>
                      <p className="text-sm font-medium text-slate-600 mb-4 line-clamp-2">{assign.description}</p>
                      
                      {assign.attachmentUrl && (
                        <div className="mb-4">
                          <span className="inline-flex items-center text-xs font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 px-2 py-1 rounded-lg">
                            <Upload className="w-3 h-3 mr-1" /> Has Attachment
                          </span>
                        </div>
                      )}

                      <div className="mt-auto pt-4 border-t-2 border-slate-50 flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date</span>
                          <span className="text-sm font-extrabold text-slate-700 flex items-center">
                            <Calendar className="w-4 h-4 mr-1.5 text-slate-400" />
                            {new Date(assign.dueTimestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Submissions</span>
                          <Badge variant="success" className="bg-[#10b981] text-white">
                            {submissionsCount[assign.id] || 0} Submitted
                          </Badge>
                        </div>
                      </div>
                      
                      <Button onClick={() => handleViewSubmissions(assign)} variant="outline" className="w-full font-bold border-2">
                        View Submissions
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
