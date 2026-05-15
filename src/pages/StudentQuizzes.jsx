import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Target, BrainCircuit, CheckCircle2, XCircle, ChevronRight, ChevronLeft, Loader2, PlayCircle, BarChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';

// Sidebar links for students
import { LayoutDashboard, Video, FileText, Settings, TrendingUp } from 'lucide-react';
const studentLinks = [
  { label: 'Dashboard', path: '/dashboard/student', icon: LayoutDashboard, color: '#3b82f6' },
  { label: 'My Classes', path: '#', icon: Video, color: '#f43f5e' },
  { label: 'AI Assistant', path: '/dashboard/student/ai', icon: BrainCircuit, color: '#8b5cf6' },
  { label: 'Notes', path: '/dashboard/student/notes', icon: FileText, color: '#10b981' },
  { label: 'Quizzes', path: '/dashboard/student/quizzes', icon: Target, color: '#f59e0b' },
  { label: 'Learning Path', path: '/dashboard/student/path', icon: TrendingUp, color: '#ec4899' },
  { label: 'Assignments', path: '/dashboard/student/assignments', icon: FileText, color: '#10b981' },
  { label: 'Profile', path: '/dashboard/student/profile', icon: Settings, color: '#64748b' },
];
import { Calendar } from 'lucide-react'; // Ensure it's imported for the links array

export function StudentQuizzes() {
  const { currentUser } = useAuth();
  
  // Dashboard State
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Attempt State
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { 0: "Option A", 1: "Option C" }
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Results State
  const [results, setResults] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, [currentUser]);

  const loadDashboard = async () => {
    if (!currentUser) return;
    try {
      // 1. Get enrollments
      const enrollQ = query(collection(db, 'enrollments'), where('studentId', '==', currentUser.uid));
      const enrollSnap = await getDocs(enrollQ);
      const enrolledSubjectIds = enrollSnap.docs.map(doc => doc.data().subjectId);
      
      // 2. Load available quizzes (filtered by enrolled subjects and published status)
      const qQuizzes = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
      const snapQuizzes = await getDocs(qQuizzes);
      let loadedQuizzes = snapQuizzes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (enrolledSubjectIds.length > 0) {
        loadedQuizzes = loadedQuizzes.filter(q => 
          enrolledSubjectIds.includes(q.subjectId) && 
          q.status === 'published'
        );
      } else {
        loadedQuizzes = []; // No enrollments = no quizzes
      }
      setQuizzes(loadedQuizzes);
      
      // 3. Load student attempts
      const qAttempts = query(collection(db, 'quizResults'), where('studentId', '==', currentUser.uid), orderBy('submittedAt', 'desc'));
      const snapAttempts = await getDocs(qAttempts);
      setAttempts(snapAttempts.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setResults(null);
  };

  const handleSelectOption = (option) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQuestionIdx]: option }));
  };

  const nextQuestion = () => {
    if (currentQuestionIdx < activeQuiz.questions.length - 1) {
      setCurrentQuestionIdx(curr => curr + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(curr => curr - 1);
    }
  };

  const submitQuiz = async () => {
    setIsSubmitting(true);
    let correctCount = 0;
    const weakTopicsArr = [];
    
    // Calculate Score
    activeQuiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correctCount++;
      } else {
        // Simple heuristic: could save keywords from question to weak topics
        weakTopicsArr.push(`Missed concept in Q${idx + 1}`);
      }
    });

    const score = correctCount;
    const total = activeQuiz.questions.length;
    const percentage = Math.round((score / total) * 100);
    
    const attemptData = {
      studentId: currentUser.uid,
      studentName: currentUser.displayName || 'Student',
      classId: activeQuiz.subjectId,
      subjectId: activeQuiz.subjectId, // keep for backward compatibility
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      score,
      totalScore: total, // For compatibility
      totalMarks: total,
      percentage,
      answers: selectedAnswers,
      weakTopics: weakTopicsArr,
      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp() // For compatibility
    };

    try {
      await setDoc(doc(collection(db, 'quizResults')), attemptData);
      setResults({ ...attemptData, questions: activeQuiz.questions });
      setActiveQuiz(null);
      
      // Notify Teacher
      try {
        if (activeQuiz.teacherId) {
          const notifRef = doc(collection(db, 'notifications'));
          await setDoc(notifRef, {
            userId: activeQuiz.teacherId, // Send to teacher
            type: 'quiz',
            title: 'Quiz Completed',
            message: `A student scored ${percentage}% on your quiz "${activeQuiz.title}".`,
            isRead: false,
            createdAt: serverTimestamp()
          });
        }
      } catch (e) { console.error("Failed to notify teacher:", e); }

      // Reload attempts in background
      const qAttempts = query(collection(db, 'quizResults'), where('studentId', '==', currentUser.uid), orderBy('submittedAt', 'desc'));
      const snapAttempts = await getDocs(qAttempts);
      setAttempts(snapAttempts.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      alert("Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout links={studentLinks} role="student" userName="Student">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#f59e0b]" />
        </div>
      </DashboardLayout>
    );
  }

  // 1. Show Results View
  if (results) {
    return (
      <DashboardLayout links={studentLinks} role="student" userName="Student">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-8 border-t-4 border-t-[#10b981] bg-white text-center shadow-sm">
            <h1 className="text-3xl font-black text-slate-800 mb-2">Quiz Complete!</h1>
            <p className="text-slate-500 font-bold mb-8">You finished: {results.quizTitle}</p>
            
            <div className="flex items-center justify-center space-x-12 mb-8">
              <div className="text-center">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Score</p>
                <p className="text-5xl font-black text-[#10b981]">{results.percentage}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Correct</p>
                <p className="text-5xl font-black text-slate-700">{results.score}/{results.total}</p>
              </div>
            </div>
            
            <Button onClick={() => setResults(null)} variant="primary" className="bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#059669]">
              Back to Dashboard
            </Button>
          </Card>

          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <BrainCircuit className="w-6 h-6 mr-2 text-[#8b5cf6]" /> AI Detailed Review
          </h2>
          
          <div className="space-y-4">
            {results.questions.map((q, idx) => {
              const studentAnswer = results.answers[idx];
              const isCorrect = studentAnswer === q.correctAnswer;
              
              return (
                <Card key={idx} className={`p-6 border-l-4 ${isCorrect ? 'border-l-[#10b981]' : 'border-l-[#f43f5e]'} bg-white shadow-sm`}>
                  <div className="flex items-start">
                    {isCorrect ? (
                      <CheckCircle2 className="w-6 h-6 text-[#10b981] mr-3 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-[#f43f5e] mr-3 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="w-full">
                      <h3 className="font-black text-lg text-slate-800 mb-4">{q.question}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {q.options.map((opt, oIdx) => {
                          let optStyle = "bg-slate-50 border-slate-200 text-slate-600";
                          if (opt === q.correctAnswer) {
                            optStyle = "bg-[#10b981]/10 border-[#10b981] text-[#059669]"; // Correct one
                          } else if (opt === studentAnswer && !isCorrect) {
                            optStyle = "bg-[#f43f5e]/10 border-[#f43f5e] text-[#be123c]"; // Wrong picked one
                          }
                          return (
                            <div key={oIdx} className={`p-3 rounded-xl border-2 font-bold ${optStyle}`}>
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                      {!isCorrect && (
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border-2 border-blue-100 text-sm font-bold flex items-start">
                          <BrainCircuit className="w-5 h-5 mr-2 flex-shrink-0 text-blue-500" />
                          <div>
                            <span className="text-blue-900 font-black">AI Explanation:</span> {q.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 2. Show Active Quiz Taking UI
  if (activeQuiz) {
    const q = activeQuiz.questions[currentQuestionIdx];
    const isLastQuestion = currentQuestionIdx === activeQuiz.questions.length - 1;
    const progressPercent = ((currentQuestionIdx + 1) / activeQuiz.questions.length) * 100;

    return (
      <DashboardLayout links={studentLinks} role="student" userName="Student">
        <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-140px)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800">{activeQuiz.title}</h2>
              <p className="text-sm font-bold text-slate-400">Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</p>
            </div>
            <Button onClick={() => setActiveQuiz(null)} variant="outline" className="font-bold border-2">Exit</Button>
          </div>
          
          <div className="w-full bg-slate-200 h-3 rounded-full mb-8 overflow-hidden">
            <div className="bg-[#f59e0b] h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          <Card className="flex-1 p-8 bg-white shadow-sm border-t-4 border-t-[#f59e0b] flex flex-col">
            <div className="mb-6 flex justify-between items-center text-sm font-bold text-slate-400">
              <span>{activeQuiz.difficulty || 'Medium'} Difficulty</span>
              {activeQuiz.dueDate && <span>Due: {new Date(activeQuiz.dueDate).toLocaleDateString()}</span>}
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-8 leading-relaxed">{q.question}</h3>
            
            <div className="space-y-4 flex-1">
              {q.options.map((opt, idx) => {
                const isSelected = selectedAnswers[currentQuestionIdx] === opt;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full p-5 rounded-2xl border-4 text-left font-bold text-lg transition-all ${
                      isSelected 
                        ? 'border-[#f59e0b] bg-[#f59e0b]/5 text-[#c2410c] transform scale-[1.01]' 
                        : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            
            <div className="flex justify-between mt-8 pt-6 border-t-2 border-slate-100">
              <Button onClick={prevQuestion} disabled={currentQuestionIdx === 0} variant="outline" className="font-bold border-2 py-3 px-6">
                <ChevronLeft className="w-5 h-5 mr-1" /> Previous
              </Button>
              {isLastQuestion ? (
                <Button 
                  onClick={submitQuiz} 
                  disabled={isSubmitting || Object.keys(selectedAnswers).length < activeQuiz.questions.length} 
                  variant="primary" 
                  className="bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#059669] py-3 px-8 text-lg"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  Submit Quiz
                </Button>
              ) : (
                <Button onClick={nextQuestion} variant="primary" className="bg-slate-800 border-b-4 border-slate-900 hover:bg-slate-700 py-3 px-6">
                  Next <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              )}
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // 3. Show Dashboard
  return (
    <DashboardLayout links={studentLinks} role="student" userName="Student">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <div className="w-10 h-10 bg-[#f59e0b] rounded-xl flex items-center justify-center shadow-sm mr-3">
                <Target className="w-6 h-6 text-white" />
              </div>
              Quiz Hub
            </h1>
            <p className="text-slate-500 font-bold mt-2 ml-1">Test your knowledge and track your performance.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center mb-4">
              <PlayCircle className="w-5 h-5 mr-2 text-[#f59e0b]" /> Available Assessments
            </h2>
            
            {quizzes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-400">No quizzes available right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {quizzes.map(quiz => {
                  // Check if student has taken this quiz already
                  const pastAttempt = attempts.find(a => a.quizId === quiz.id);
                  
                  return (
                    <Card key={quiz.id} className="p-6 border-t-4 border-t-[#f59e0b] bg-white shadow-sm flex flex-col h-full">
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-black text-lg text-slate-800 line-clamp-2">{quiz.title}</h3>
                          {pastAttempt && <CheckCircle2 className="w-5 h-5 text-[#10b981]" title="Completed" />}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-4">
                          <span className={`text-xs font-black uppercase px-2 py-1 rounded-lg border ${
                            quiz.difficulty === 'Easy' || quiz.difficulty === 'Beginner' ? 'bg-green-50 text-green-600 border-green-200' :
                            quiz.difficulty === 'Hard' || quiz.difficulty === 'Advanced' ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-yellow-50 text-yellow-600 border-yellow-200'
                          }`}>
                            {quiz.difficulty || 'Medium'}
                          </span>
                          <span className="text-sm font-bold text-slate-400">{quiz.questions.length} Questions</span>
                        </div>
                        
                        {quiz.description && (
                          <p className="text-sm font-medium text-slate-600 mb-4 line-clamp-2">{quiz.description}</p>
                        )}
                        
                        {quiz.dueDate && (
                          <p className="text-xs font-bold text-slate-400 mb-6 flex items-center">
                            <Calendar className="w-4 h-4 mr-1" /> Due: {new Date(quiz.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      {pastAttempt ? (
                        <div className="flex items-center justify-between pt-4 border-t-2 border-slate-50">
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase">Previous Score</p>
                            <p className="text-lg font-black text-[#10b981]">{pastAttempt.percentage}%</p>
                          </div>
                          <Button onClick={() => startQuiz(quiz)} variant="outline" className="font-bold text-sm border-2">Retake</Button>
                        </div>
                      ) : (
                        <Button onClick={() => startQuiz(quiz)} variant="primary" className="w-full bg-[#f59e0b] border-b-4 border-[#c2410c] hover:bg-[#ea580c]">
                          Start Quiz
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="space-y-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center mb-4">
              <BarChart className="w-5 h-5 mr-2 text-[#3b82f6]" /> Performance
            </h2>
            <Card className="bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] border-none text-white p-6 shadow-sm">
              <p className="font-black text-blue-100 text-sm uppercase tracking-widest mb-1">Total Quizzes Taken</p>
              <h3 className="text-4xl font-black mb-6">{attempts.length}</h3>
              <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <p className="font-bold text-sm mb-1 flex justify-between"><span>Average Score</span> <span className="font-black">
                  {attempts.length > 0 ? Math.round(attempts.reduce((acc, a) => acc + a.percentage, 0) / attempts.length) : 0}%
                </span></p>
                <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-[#10b981] h-full" style={{ width: `${attempts.length > 0 ? Math.round(attempts.reduce((acc, a) => acc + a.percentage, 0) / attempts.length) : 0}%` }} />
                </div>
              </div>
            </Card>
            
            <Card className="border-2 border-slate-100 shadow-sm p-6 bg-white">
              <h3 className="font-black text-slate-800 mb-4 flex items-center"><BrainCircuit className="w-4 h-4 mr-2 text-[#f43f5e]" /> Weak Topics Identified</h3>
              {attempts.length === 0 ? (
                <p className="text-sm font-bold text-slate-400">Take some quizzes to identify weak areas.</p>
              ) : (
                <ul className="space-y-2">
                  <li className="text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">Review Database Normalization</li>
                  <li className="text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">Practice Calculus Limits</li>
                  <li className="text-sm font-bold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">Study Machine Learning Models</li>
                </ul>
              )}
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
