import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Target, BrainCircuit, CheckCircle2, XCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

// Sidebar links for students
import { LayoutDashboard, Video, FileText, Settings, TrendingUp } from 'lucide-react';
const studentLinks = [
  { label: 'Dashboard', path: '/dashboard/student', icon: LayoutDashboard, color: '#3b82f6' },
  { label: 'My Classes', path: '/dashboard/student/classes', icon: Video, color: '#f43f5e' },
  { label: 'AI Assistant', path: '/dashboard/student/ai', icon: BrainCircuit, color: '#8b5cf6' },
  { label: 'Notes', path: '/dashboard/student/notes', icon: FileText, color: '#10b981' },
  { label: 'Quizzes', path: '/dashboard/student/quizzes', icon: Target, color: '#f59e0b' },
  { label: 'Learning Path', path: '/dashboard/student/path', icon: TrendingUp, color: '#ec4899' },
  { label: 'Assignments', path: '/dashboard/student/assignments', icon: FileText, color: '#10b981' },
  { label: 'Profile', path: '/dashboard/student/profile', icon: Settings, color: '#64748b' },
];

export function TakeQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    loadQuiz();
  }, [currentUser, quizId]);

  const loadQuiz = async () => {
    try {
      // 1. Check if student already took it
      const attemptQ = query(
        collection(db, 'quizResults'), 
        where('studentId', '==', currentUser.uid),
        where('quizId', '==', quizId)
      );
      const attemptSnap = await getDocs(attemptQ);
      
      // 2. Load quiz data
      const docRef = doc(db, 'quizzes', quizId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const quizData = { id: docSnap.id, ...docSnap.data() };
        if (quizData.status !== 'published') {
          setError("This quiz is not currently published or available.");
        } else {
          setActiveQuiz(quizData);
          if (!attemptSnap.empty) {
             setResults({ ...attemptSnap.docs[0].data(), questions: quizData.questions });
          }
        }
      } else {
        setError("Quiz not found.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load quiz.");
    } finally {
      setIsLoading(false);
    }
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
    
    activeQuiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correctCount++;
      } else {
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
      subjectId: activeQuiz.subjectId, 
      subjectName: activeQuiz.subjectName || '',
      quizId: activeQuiz.id,
      quizTitle: activeQuiz.title,
      score,
      totalScore: total,
      totalMarks: total,
      percentage,
      answers: selectedAnswers,
      weakTopics: weakTopicsArr,
      submittedAt: serverTimestamp(),
      createdAt: serverTimestamp() 
    };

    try {
      await setDoc(doc(collection(db, 'quizResults')), attemptData);
      setResults({ ...attemptData, questions: activeQuiz.questions });
      
      // Notify Teacher
      if (activeQuiz.teacherId) {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          userId: activeQuiz.teacherId,
          type: 'quiz',
          title: 'Quiz Completed',
          message: `A student scored ${percentage}% on your quiz "${activeQuiz.title}".`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
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

  if (error) {
    return (
      <DashboardLayout links={studentLinks} role="student" userName="Student">
        <div className="max-w-3xl mx-auto text-center py-12 bg-white rounded-3xl border-2 border-dashed border-red-200">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800 mb-2">Unavailable</h2>
          <p className="font-bold text-slate-500">{error}</p>
          <Button onClick={() => navigate('/dashboard/student/quizzes')} className="mt-6 border-2 font-bold" variant="outline">Back to Quizzes</Button>
        </div>
      </DashboardLayout>
    );
  }

  // Show Results
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
                <p className="text-5xl font-black text-slate-700">{results.score}/{results.totalScore}</p>
              </div>
            </div>
            
            <Button onClick={() => navigate('/dashboard/student/quizzes')} variant="primary" className="bg-[#10b981] border-b-4 border-[#059669] hover:bg-[#059669]">
              Back to Dashboard
            </Button>
          </Card>

          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <BrainCircuit className="w-6 h-6 mr-2 text-[#8b5cf6]" /> Detailed Review
          </h2>
          
          <div className="space-y-4">
            {results.questions?.map((q, idx) => {
              const studentAnswer = results.answers?.[idx];
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
                            optStyle = "bg-[#10b981]/10 border-[#10b981] text-[#059669]"; 
                          } else if (opt === studentAnswer && !isCorrect) {
                            optStyle = "bg-[#f43f5e]/10 border-[#f43f5e] text-[#be123c]"; 
                          }
                          return (
                            <div key={oIdx} className={`p-3 rounded-xl border-2 font-bold ${optStyle}`}>
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                      {!isCorrect && q.explanation && (
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

  // Active Quiz View
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
          <Button onClick={() => navigate('/dashboard/student/quizzes')} variant="outline" className="font-bold border-2">Exit</Button>
        </div>
        
        <div className="w-full bg-slate-200 h-3 rounded-full mb-8 overflow-hidden">
          <div className="bg-[#f59e0b] h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>

        <Card className="flex-1 p-8 bg-white shadow-sm border-t-4 border-t-[#f59e0b] flex flex-col">
          <div className="mb-6 flex justify-between items-center text-sm font-bold text-slate-400">
            <span className="flex items-center"><Target className="w-4 h-4 mr-1" /> {activeQuiz.subjectName || 'Subject'}</span>
            <span>{activeQuiz.difficulty || 'Medium'}</span>
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
