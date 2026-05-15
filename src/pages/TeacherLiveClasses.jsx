import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Video, Calendar, Link as LinkIcon, MessageSquare, Megaphone, Loader2, Trash2, Clock, PlayCircle, StopCircle, Users as UsersIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, orderBy, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';

// Sidebar links
import { LayoutDashboard, Users, FileText, BrainCircuit, BarChart, Settings } from 'lucide-react';
const teacherLinks = [
  { label: 'Dashboard', path: '/dashboard/teacher', icon: LayoutDashboard, color: '#8b5cf6' },
  { label: 'Manage Classes', path: '/dashboard/teacher/classes', icon: Users, color: '#3b82f6' },
  { label: 'Live Classes', path: '/dashboard/teacher/live', icon: Video, color: '#f43f5e' },
  { label: 'Assignments', path: '/dashboard/teacher/assignments', icon: FileText, color: '#10b981' },
  { label: 'Quiz Generator', path: '/dashboard/teacher/quizzes', icon: BrainCircuit, color: '#f59e0b' },
  { label: 'Analytics', path: '/dashboard/teacher/classes', icon: BarChart, color: '#14b8a6' },
  { label: 'Settings', path: '/dashboard/teacher/settings', icon: Settings, color: '#64748b' },
];

export function TeacherLiveClasses() {
  const { currentUser } = useAuth();
  
  const [subjects, setSubjects] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [activeTab, setActiveTab] = useState('schedule');
  
  // Schedule Form
  const [classTitleValue, setClassTitleValue] = useState('');
  const [classSubjectId, setClassSubjectId] = useState('');
  const [classDate, setClassDate] = useState('');
  const [classTime, setClassTime] = useState('');
  const [classLink, setClassLink] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  // Announcement Form
  const [announceSubjectId, setAnnounceSubjectId] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [announceLink, setAnnounceLink] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Session Management
  const [activeSessionView, setActiveSessionView] = useState(null);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const qSub = query(collection(db, 'subjects'), where('teacherId', '==', currentUser.uid));
      const subSnap = await getDocs(qSub);
      setSubjects(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const qLive = query(collection(db, 'liveClasses'), where('teacherId', '==', currentUser.uid), orderBy('scheduledTimestamp', 'desc'));
      const liveSnap = await getDocs(qLive);
      setLiveClasses(liveSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const qAnnounce = query(collection(db, 'announcements'), where('teacherId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
      const announceSnap = await getDocs(qAnnounce);
      setAnnouncements(announceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (err) {
      console.error("Failed to load live class data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleClass = async (e) => {
    e.preventDefault();
    if (!classTitleValue || !classSubjectId || !classDate || !classTime || !classLink) {
      alert("Please fill all required fields.");
      return;
    }

    setIsScheduling(true);
    try {
      const combinedDateTime = new Date(`${classDate}T${classTime}`);
      const newClass = {
        title: classTitleValue,
        classroomId: classSubjectId,
        teacherId: currentUser.uid,
        meetingLink: classLink,
        status: 'scheduled',
        scheduledTimestamp: combinedDateTime.getTime(),
        createdAt: serverTimestamp(),
      };

      const docRef = doc(collection(db, 'liveClasses'));
      await setDoc(docRef, newClass);
      
      setLiveClasses([{ id: docRef.id, ...newClass }, ...liveClasses]);
      
      try {
        const enrollQuery = query(collection(db, 'enrollments'), where('subjectId', '==', classSubjectId));
        const enrollSnap = await getDocs(enrollQuery);
        
        const batch = writeBatch(db);
        enrollSnap.docs.forEach(enrollDoc => {
          const userId = enrollDoc.data().studentId;
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: userId,
            type: 'live_class',
            title: 'New Live Class Scheduled',
            message: `${getSubjectName(classSubjectId)} has a new live class: ${classTitleValue} on ${classDate} at ${classTime}.`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      } catch (e) {
        console.error("Failed to send notifications:", e);
      }

      setClassTitleValue('');
      setClassLink('');
      alert("Class scheduled successfully!");
    } catch (err) {
      console.error("Failed to schedule class:", err);
      alert("Failed to schedule. Please try again.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announceSubjectId || !announceContent) {
      alert("Please select a subject and write an announcement.");
      return;
    }

    setIsPosting(true);
    try {
      const newPost = {
        classroomId: announceSubjectId,
        teacherId: currentUser.uid,
        content: announceContent,
        link: announceLink || null,
        createdAt: serverTimestamp(),
      };

      const docRef = doc(collection(db, 'announcements'));
      await setDoc(docRef, newPost);
      
      setAnnouncements([{ id: docRef.id, ...newPost }, ...announcements]);
      
      try {
        const enrollQuery = query(collection(db, 'enrollments'), where('subjectId', '==', announceSubjectId));
        const enrollSnap = await getDocs(enrollQuery);
        
        const batch = writeBatch(db);
        enrollSnap.docs.forEach(enrollDoc => {
          const userId = enrollDoc.data().studentId;
          const notifRef = doc(collection(db, 'notifications'));
          batch.set(notifRef, {
            userId: userId,
            type: 'announcement',
            title: 'New Announcement',
            message: `Instructor posted in ${getSubjectName(announceSubjectId)}: ${announceContent.substring(0, 50)}...`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      } catch (e) {
        console.error("Failed to send notifications:", e);
      }

      setAnnounceContent('');
      setAnnounceLink('');
      alert("Announcement posted successfully!");
    } catch (err) {
      console.error("Failed to post announcement:", err);
      alert("Failed to post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteClass = async (id) => {
    if(!window.confirm("Delete this live class?")) return;
    try {
      await deleteDoc(doc(db, 'liveClasses', id));
      setLiveClasses(liveClasses.filter(c => c.id !== id));
      if (activeSessionView?.id === id) setActiveSessionView(null);
    } catch(e) {}
  };

  const handleDeleteAnnouncement = async (id) => {
    if(!window.confirm("Delete this announcement?")) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch(e) {}
  };

  const getSubjectName = (id) => {
    const sub = subjects.find(s => s.id === id);
    return sub ? sub.subjectName : 'Unknown Subject';
  };

  const handleUpdateSessionStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'liveClasses', id), { status });
      setLiveClasses(liveClasses.map(c => c.id === id ? { ...c, status } : c));
      
      if (status === 'active') {
        const cls = liveClasses.find(c => c.id === id);
        if (cls) {
          // Notify students that class has started
          const enrollQuery = query(collection(db, 'enrollments'), where('subjectId', '==', cls.classroomId));
          const enrollSnap = await getDocs(enrollQuery);
          const batch = writeBatch(db);
          enrollSnap.docs.forEach(enrollDoc => {
            const userId = enrollDoc.data().studentId;
            batch.set(doc(collection(db, 'notifications')), {
              userId: userId,
              type: 'live_class',
              title: 'Class is Live!',
              message: `${cls.title} has started! Join now.`,
              isRead: false,
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update session status.");
    }
  };

  const handleViewAttendance = async (cls) => {
    setActiveSessionView(cls);
    setIsLoadingAttendance(true);
    try {
      const qAtt = query(collection(db, 'attendance'), where('liveClassId', '==', cls.id));
      const attSnap = await getDocs(qAtt);
      setSessionAttendance(attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Failed to load attendance:", err);
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  return (
    <DashboardLayout links={teacherLinks} role="teacher" userName="Teacher">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <div className="w-10 h-10 bg-[#f43f5e] rounded-xl flex items-center justify-center shadow-sm mr-3">
                <Video className="w-6 h-6 text-white" />
              </div>
              Live Classes & Connect
            </h1>
            <p className="text-slate-500 font-bold mt-2 ml-1">Schedule sessions, manage live attendance, and blast announcements.</p>
          </div>
        </div>

        {activeSessionView ? (
          <div className="animate-in slide-in-from-right-8 space-y-6">
            <button 
              onClick={() => setActiveSessionView(null)}
              className="font-bold text-slate-400 hover:text-slate-700 transition-colors flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </button>
            
            <Card className="p-6 border-t-4 border-t-[#f43f5e] bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-black uppercase text-[#f43f5e] bg-[#f43f5e]/10 px-2 py-1 rounded-lg mb-2 inline-block">
                    {getSubjectName(activeSessionView.classroomId)}
                  </span>
                  <h2 className="text-2xl font-black text-slate-800">{activeSessionView.title}</h2>
                </div>
                <Badge variant={activeSessionView.status === 'active' ? 'success' : 'default'} className="font-bold text-sm uppercase">
                  {activeSessionView.status || 'Scheduled'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 mt-6">
                {activeSessionView.status !== 'ended' && (
                  <a href={activeSessionView.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl border border-blue-200">
                    <LinkIcon className="w-4 h-4 mr-2" /> Open Meeting Link
                  </a>
                )}
                {activeSessionView.status === 'active' && (
                  <Button onClick={() => handleUpdateSessionStatus(activeSessionView.id, 'ended')} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 font-bold">
                    <StopCircle className="w-4 h-4 mr-2" /> End Session
                  </Button>
                )}
                {activeSessionView.status === 'scheduled' && (
                  <Button onClick={() => handleUpdateSessionStatus(activeSessionView.id, 'active')} variant="primary" className="bg-[#10b981] border-[#059669] hover:bg-[#059669]">
                    <PlayCircle className="w-4 h-4 mr-2" /> Start Session Now
                  </Button>
                )}
              </div>
            </Card>

            <h3 className="text-xl font-black text-slate-800 flex items-center pt-4">
              <UsersIcon className="w-5 h-5 mr-2 text-slate-500" /> Attendance ({sessionAttendance.length})
            </h3>
            
            {isLoadingAttendance ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#f43f5e] mx-auto" />
              </div>
            ) : sessionAttendance.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                <p className="font-bold text-slate-400">No students have joined yet.</p>
              </div>
            ) : (
              <Card className="overflow-hidden border-2 border-slate-100 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-100">
                        <th className="p-4 font-black text-slate-500 text-sm uppercase tracking-wider">Student Name</th>
                        <th className="p-4 font-black text-slate-500 text-sm uppercase tracking-wider">Join Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-50">
                      {sessionAttendance.map(att => (
                        <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-800 flex items-center">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mr-3">
                              {att.studentName ? att.studentName.charAt(0) : 'S'}
                            </div>
                            {att.studentName || 'Unknown Student'}
                          </td>
                          <td className="p-4 font-bold text-slate-500">
                            {new Date(att.joinTime).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Creation Forms */}
            <div className="lg:col-span-1 space-y-6">
              <div className="flex space-x-2 p-1 bg-slate-100 rounded-xl font-bold">
                <button 
                  onClick={() => setActiveTab('schedule')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'schedule' ? 'bg-white shadow-sm text-[#f43f5e]' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Video className="w-4 h-4 mr-2" /> Schedule
                </button>
                <button 
                  onClick={() => setActiveTab('announce')}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'announce' ? 'bg-white shadow-sm text-[#3b82f6]' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Megaphone className="w-4 h-4 mr-2" /> Post
                </button>
              </div>

              {activeTab === 'schedule' ? (
                <Card className="p-6 border-t-4 border-t-[#f43f5e] bg-white shadow-sm">
                  <h2 className="text-xl font-black text-slate-800 mb-6">Schedule Live Class</h2>
                  <form onSubmit={handleScheduleClass} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Classroom</label>
                      <select value={classSubjectId} onChange={e => setClassSubjectId(e.target.value)} required className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#f43f5e] focus:ring-[#f43f5e]/20">
                        <option value="">-- Select Subject --</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Session Title</label>
                      <Input value={classTitleValue} onChange={e => setClassTitleValue(e.target.value)} required placeholder="e.g. Midterm Review Q&A" className="font-bold border-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Date</label>
                        <Input type="date" value={classDate} onChange={e => setClassDate(e.target.value)} required className="font-bold border-2" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Time</label>
                        <Input type="time" value={classTime} onChange={e => setClassTime(e.target.value)} required className="font-bold border-2" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Meeting Link (Meet/Zoom)</label>
                      <Input value={classLink} onChange={e => setClassLink(e.target.value)} type="url" required placeholder="https://meet.google.com/..." className="font-bold border-2" />
                    </div>
                    <Button type="submit" disabled={isScheduling} variant="primary" className="w-full bg-[#f43f5e] border-b-4 border-[#be123c] hover:bg-[#e11d48]">
                      {isScheduling ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Calendar className="w-5 h-5 mr-2" />}
                      Schedule Session
                    </Button>
                  </form>
                </Card>
              ) : (
                <Card className="p-6 border-t-4 border-t-[#3b82f6] bg-white shadow-sm">
                  <h2 className="text-xl font-black text-slate-800 mb-6">Post Announcement</h2>
                  <form onSubmit={handlePostAnnouncement} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Classroom</label>
                      <select value={announceSubjectId} onChange={e => setAnnounceSubjectId(e.target.value)} required className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#3b82f6] focus:ring-[#3b82f6]/20">
                        <option value="">-- Select Subject --</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.subjectName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Message</label>
                      <textarea 
                        value={announceContent} onChange={e => setAnnounceContent(e.target.value)} required
                        placeholder="Type your announcement here..." 
                        className="w-full h-32 p-4 rounded-xl border-2 border-slate-200 font-medium focus:border-[#3b82f6] focus:ring-[#3b82f6]/20 custom-scrollbar resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Resource Link (Optional)</label>
                      <Input value={announceLink} onChange={e => setAnnounceLink(e.target.value)} type="url" placeholder="e.g. Google Drive PDF Link" className="font-bold border-2" />
                    </div>
                    <Button type="submit" disabled={isPosting} variant="primary" className="w-full bg-[#3b82f6] border-b-4 border-[#1d4ed8] hover:bg-[#2563eb]">
                      {isPosting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Megaphone className="w-5 h-5 mr-2" />}
                      Blast Announcement
                    </Button>
                  </form>
                </Card>
              )}
            </div>

            {/* Feeds */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Live Classes Feed */}
              <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center">
                  <Video className="w-5 h-5 mr-2 text-[#f43f5e]" /> Scheduled Classes
                </h2>
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                ) : liveClasses.length === 0 ? (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-bold">No upcoming classes scheduled.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {liveClasses.map(cls => (
                      <Card key={cls.id} className={`p-5 border-l-4 ${cls.status === 'active' ? 'border-l-[#10b981] bg-green-50/30' : 'border-l-[#f43f5e] bg-white'} shadow-sm flex flex-col h-full`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg ${cls.status === 'active' ? 'bg-[#10b981]/10 text-[#10b981]' : 'bg-[#f43f5e]/10 text-[#f43f5e]'}`}>
                            {getSubjectName(cls.classroomId)}
                          </span>
                          <button onClick={() => handleDeleteClass(cls.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        <h3 className="font-black text-lg text-slate-800 mb-1">{cls.title}</h3>
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant={cls.status === 'active' ? 'success' : 'outline'} className="text-xs uppercase font-black">
                            {cls.status || 'scheduled'}
                          </Badge>
                          {cls.status === 'active' && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>}
                        </div>
                        
                        <div className="mt-auto space-y-3">
                          <p className="text-sm font-bold text-slate-500 flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            {new Date(cls.scheduledTimestamp).toLocaleString()}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {cls.status === 'scheduled' && (
                              <Button onClick={() => handleUpdateSessionStatus(cls.id, 'active')} variant="primary" className="bg-[#10b981] border-[#059669] hover:bg-[#059669] w-full text-xs">
                                Start Session
                              </Button>
                            )}
                            {cls.status === 'active' && (
                              <Button onClick={() => handleUpdateSessionStatus(cls.id, 'ended')} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 font-bold w-full text-xs">
                                End Session
                              </Button>
                            )}
                            <Button onClick={() => handleViewAttendance(cls)} variant="outline" className="font-bold border-2 w-full text-xs col-span-2 sm:col-span-1">
                              Attendance
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Announcements Feed */}
              <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-800 flex items-center">
                  <Megaphone className="w-5 h-5 mr-2 text-[#3b82f6]" /> Recent Announcements
                </h2>
                {isLoading ? null : announcements.length === 0 ? (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-500 font-bold">No announcements posted.</div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map(post => (
                      <Card key={post.id} className="p-5 border-2 border-slate-100 bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-black uppercase text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-1 rounded-lg">
                            {getSubjectName(post.classroomId)}
                          </span>
                          <button onClick={() => handleDeleteAnnouncement(post.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                        <p className="font-medium text-slate-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                        {post.link && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <a href={post.link} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-bold text-[#3b82f6] hover:text-[#1d4ed8]">
                              <LinkIcon className="w-4 h-4 mr-1.5" /> Attached Resource
                            </a>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
