import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BrainCircuit, Sparkles, Plus, Loader2, Save, X, Target, FileText, CheckCircle2, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, setDoc, query, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { generateQuiz } from '../lib/gemini';
import { LayoutDashboard, Users, Video, BarChart, Settings } from 'lucide-react';

const teacherLinks = [
  { label: 'Dashboard', path: '/dashboard/teacher', icon: LayoutDashboard, color: '#8b5cf6' },
  { label: 'Manage Classes', path: '/dashboard/teacher/classes', icon: Users, color: '#3b82f6' },
  { label: 'Live Classes', path: '/dashboard/teacher/live', icon: Video, color: '#f43f5e' },
  { label: 'Assignments', path: '/dashboard/teacher/assignments', icon: FileText, color: '#10b981' },
  { label: 'Quiz Generator', path: '/dashboard/teacher/quizzes', icon: BrainCircuit, color: '#f59e0b' },
  { label: 'Analytics', path: '/dashboard/teacher/classes', icon: BarChart, color: '#14b8a6' },
  { label: 'Settings', path: '/dashboard/teacher/settings', icon: Settings, color: '#64748b' },
];

export function TeacherQuizzes() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Generator State
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [topic, setTopic] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [contextText, setContextText] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  
  // New Metadata Fields
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  
  const [error, setError] = useState('');
  
  // Preview State
  const [previewQuiz, setPreviewQuiz] = useState(null);

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
    if (localUser?.uid) {
      loadQuizzes(localUser.uid);
    }
  }, [loadingAuth, localUser]);

  const loadQuizzes = async (uid) => {
    try {
      const q = query(
        collection(db, 'quizzes'),
        where('teacherId', '==', uid)
      );
      const snapshot = await getDocs(q);
      const fetchedQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedQuizzes.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setQuizzes(fetchedQuizzes);
      
      const qSub = query(
        collection(db, 'subjects'),
        where('teacherId', '==', uid)
      );
      const subSnap = await getDocs(qSub);
      setSubjects(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [subjectId, setSubjectId] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please provide a topic.');
      return;
    }
    if (!subjectId) {
      setError('Please select a subject to attach this quiz to. If you have no subjects, create one in Manage Classes first.');
      return;
    }
    setError('');
    setIsGenerating(true);
    try {
      const generatedQuestions = await generateQuiz(topic, contextText, numQuestions);
      setPreviewQuiz({
        title: quizTitle.trim() || `${topic} Quiz`,
        questions: generatedQuestions
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!previewQuiz || !localUser) return;
    try {
      const quizId = crypto.randomUUID();
      const selectedSubject = subjects.find(s => s.id === subjectId);
      
      const newQuiz = {
        id: quizId,
        title: previewQuiz.title,
        description: description,
        difficulty: difficulty,
        dueDate: dueDate,
        teacherId: localUser.uid,
        teacherName: localUser.displayName || 'Teacher',
        subjectId: subjectId,
        subjectName: selectedSubject ? selectedSubject.subjectName : '',
        status: 'draft',
        questions: previewQuiz.questions,
        createdAt: serverTimestamp(),
      };
      
      await setDoc(doc(db, 'quizzes', quizId), newQuiz);
      setQuizzes([newQuiz, ...quizzes]);
      setPreviewQuiz(null);
      setShowGenerator(false);
      setTopic('');
      setQuizTitle('');
      setContextText('');
      setDescription('');
      setDueDate('');
    } catch (err) {
      setError("Failed to save quiz: " + err.message);
    }
  };

  const handleDelete = async (quizId) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'quizzes', quizId));
      setQuizzes(quizzes.filter(q => q.id !== quizId));
    } catch (err) {
      console.error("Failed to delete quiz:", err);
    }
  };

  const handlePublish = async (quizId) => {
    try {
      await setDoc(doc(db, 'quizzes', quizId), { status: 'published' }, { merge: true });
      setQuizzes(quizzes.map(q => q.id === quizId ? { ...q, status: 'published' } : q));
    } catch (err) {
      console.error("Failed to publish quiz:", err);
      alert("Failed to publish quiz.");
    }
  };

  const handleCopyLink = (quizId) => {
    const url = `${window.location.origin}/quiz/${quizId}`;
    navigator.clipboard.writeText(url);
    alert("Quiz link copied to clipboard!");
  };

  return (
    <DashboardLayout links={teacherLinks} role="teacher" userName="Teacher">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <div className="w-10 h-10 bg-[#f59e0b] rounded-xl flex items-center justify-center shadow-sm mr-3">
                <BrainCircuit className="w-6 h-6 text-white" />
              </div>
              Quiz Generator
            </h1>
            <p className="text-slate-500 font-bold mt-2 ml-1">Generate AI quizzes or manage your existing ones.</p>
          </div>
          <Button 
            onClick={() => setShowGenerator(!showGenerator)} 
            variant="primary" 
            className="bg-[#f59e0b] border-b-4 border-[#c2410c] hover:bg-[#ea580c]"
          >
            {showGenerator ? <X className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
            {showGenerator ? "Cancel" : "Create New Quiz"}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border-2 border-red-100 font-bold">
            {error}
          </div>
        )}

        {showGenerator && !previewQuiz && (
          <Card className="p-8 border-t-4 border-t-[#f59e0b] bg-white shadow-sm">
            <h2 className="text-xl font-black text-slate-800 mb-6">AI Quiz Configuration</h2>
            {subjects.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-500 mb-4">Create a subject first before generating quizzes.</p>
                <Button onClick={() => navigate('/dashboard/teacher/classes')} variant="primary" className="bg-[#3b82f6] border-b-4 border-[#2563eb] hover:bg-[#2563eb]">
                  Go to Manage Classes
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Assign to Subject</label>
                  <select 
                    value={subjectId} 
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#f59e0b] focus:ring-[#f59e0b]/20"
                  >
                    <option value="">-- Select a Subject --</option>
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.subjectName} {sub.classCode ? `(${sub.classCode})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quiz Title (Optional)</label>
                  <Input 
                    value={quizTitle} 
                    onChange={(e) => setQuizTitle(e.target.value)} 
                    placeholder="e.g. Midterm Physics Exam" 
                    className="font-bold border-2 mb-6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quiz Topic</label>
                  <Input 
                    value={topic} 
                    onChange={(e) => setTopic(e.target.value)} 
                    placeholder="e.g. Photosynthesis, World War 2, Python Basics" 
                    className="font-bold border-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Number of Questions</label>
                  <select 
                    value={numQuestions} 
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#f59e0b] focus:ring-[#f59e0b]/20"
                  >
                    <option value={3}>3 Questions (Quick Test)</option>
                    <option value={5}>5 Questions (Standard)</option>
                    <option value={10}>10 Questions (Full Assessment)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Quiz Description</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="e.g. This quiz covers chapters 1-3. Please take your time." 
                    className="w-full h-20 p-4 rounded-xl border-2 border-slate-200 font-medium focus:border-[#f59e0b] focus:ring-[#f59e0b]/20 custom-scrollbar resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Difficulty</label>
                    <select 
                      value={difficulty} 
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-200 font-bold focus:border-[#f59e0b] focus:ring-[#f59e0b]/20"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Medium">Medium</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Due Date (Optional)</label>
                    <Input 
                      type="date"
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)} 
                      className="font-bold border-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Context Material (Optional)</label>
                  <textarea 
                    value={contextText} 
                    onChange={(e) => setContextText(e.target.value)} 
                    placeholder="Paste your lecture notes here and the AI will only generate questions based on this text..." 
                    className="w-full h-32 p-4 rounded-xl border-2 border-slate-200 font-medium focus:border-[#f59e0b] focus:ring-[#f59e0b]/20 custom-scrollbar resize-none"
                  />
                </div>
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !subjectId}
                  variant="primary" 
                  className={`w-full py-4 shadow-sm text-lg ${!subjectId ? 'bg-slate-300 border-b-4 border-slate-400 text-slate-500 hover:bg-slate-300' : 'bg-[#f59e0b] border-b-4 border-[#c2410c] hover:bg-[#ea580c]'}`}
                >
                  {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6 mr-2" />}
                  {isGenerating ? "Generating..." : "Generate Magic Quiz"}
                </Button>
              </div>
            )}
          </Card>
        )}

        {previewQuiz && (
          <Card className="p-8 border-t-4 border-t-[#10b981] bg-white shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">Quiz Preview: {previewQuiz.title}</h2>
              <div className="space-x-3">
                <Button variant="outline" onClick={() => setPreviewQuiz(null)} className="font-bold border-2">Discard</Button>
                <Button variant="primary" onClick={handleSaveQuiz} className="bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#059669]">
                  <Save className="w-5 h-5 mr-2" /> Save & Assign
                </Button>
              </div>
            </div>
            
            <div className="space-y-6">
              {previewQuiz.questions.map((q, idx) => (
                <div key={idx} className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <h3 className="font-black text-slate-800 mb-4">{idx + 1}. {q.question}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className={`p-3 rounded-xl border-2 font-bold ${opt === q.correctAnswer ? 'bg-[#10b981]/10 border-[#10b981] text-[#059669]' : 'bg-white border-slate-200 text-slate-600'}`}>
                        {opt}
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border-2 border-blue-100 text-sm font-bold flex items-start">
                    <Sparkles className="w-5 h-5 mr-2 flex-shrink-0 text-blue-500" />
                    <div>
                      <span className="text-blue-900 font-black">Explanation:</span> {q.explanation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!showGenerator && !previewQuiz && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-slate-800 flex items-center">
              <Target className="w-5 h-5 mr-2 text-slate-500" /> Your Assigned Quizzes
            </h2>
            
            {isLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#f59e0b] mx-auto" />
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-400">You haven't created any quizzes yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quizzes.map(quiz => (
                  <Card key={quiz.id} className="p-6 border-2 border-slate-100 hover:border-[#f59e0b]/50 transition-colors shadow-sm flex flex-col h-full">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-lg text-slate-800 line-clamp-2">{quiz.title}</h3>
                        <button onClick={() => handleDelete(quiz.id)} className="text-slate-400 hover:text-red-500 p-1">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex gap-2 items-center mb-4">
                        {quiz.status === 'published' ? (
                          <span className="inline-block px-2 py-1 bg-[#10b981]/10 text-[#10b981] text-xs font-black uppercase rounded-lg border border-[#10b981]/20">Published</span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-500 text-xs font-black uppercase rounded-lg border border-slate-200">Draft</span>
                        )}
                        <span className="inline-block px-2 py-1 bg-blue-50 text-blue-600 text-xs font-black uppercase rounded-lg border border-blue-100">{quiz.subjectName || 'No Subject'}</span>
                      </div>
                      
                      <p className="text-sm font-bold text-slate-500 mb-1 flex items-center">
                        <Target className="w-4 h-4 mr-1.5" />
                        {quiz.questions.length} Questions • {quiz.difficulty || 'Medium'}
                      </p>
                      {quiz.dueDate && (
                        <p className="text-sm font-bold text-slate-400 mb-4 flex items-center">
                          Due: {new Date(quiz.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="pt-4 border-t-2 border-slate-50 flex gap-2">
                      {quiz.status !== 'published' ? (
                        <Button onClick={() => handlePublish(quiz.id)} variant="primary" className="flex-1 bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#059669]">
                          Publish
                        </Button>
                      ) : (
                        <Button onClick={() => handleCopyLink(quiz.id)} variant="primary" className="flex-1 bg-blue-500 border-b-4 border-blue-700 hover:bg-blue-600">
                          <Copy className="w-4 h-4 mr-2" /> Copy Link
                        </Button>
                      )}
                      <Button variant="outline" className={`font-bold border-2 ${quiz.status === 'published' ? 'flex-1' : 'flex-1'}`}>
                        View Results
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        
      </div>
    </DashboardLayout>
  );
}
