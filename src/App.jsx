import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { AIAssistant } from './pages/AIAssistant';
import { Notes } from './pages/Notes';
import { TeacherQuizzes } from './pages/TeacherQuizzes';
import { StudentQuizzes } from './pages/StudentQuizzes';
import { TeacherClasses } from './pages/TeacherClasses';
import { TeacherLiveClasses } from './pages/TeacherLiveClasses';
import { StudentClasses } from './pages/StudentClasses';
import { StudentClassroom } from './pages/StudentClassroom';
import { StudentLearningPath } from './pages/StudentLearningPath';
import { StudentAssignments } from './pages/StudentAssignments';
import { StudentProfile } from './pages/StudentProfile';
import { TeacherAssignments } from './pages/TeacherAssignments';
import { TeacherStudentProfile } from './pages/TeacherStudentProfile';
import { TeacherSettings } from './pages/TeacherSettings';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { TakeQuiz } from './pages/TakeQuiz';

// Layout wrapper for marketing pages
const MarketingLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-dark-bg text-gray-100 font-sans selection:bg-[#00f3ff]/30">
    <Navbar />
    <main className="flex-grow">
      {children}
    </main>
    <Footer />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Marketing Routes with Navbar/Footer */}
          <Route path="/" element={<MarketingLayout><Landing /></MarketingLayout>} />
          <Route path="/login" element={<MarketingLayout><Login /></MarketingLayout>} />
          <Route path="/signup" element={<MarketingLayout><Signup /></MarketingLayout>} />
          
          {/* Dashboard Routes without marketing Navbar/Footer */}
          <Route 
            path="/dashboard/student" 
            element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/student/ai" 
            element={
              <ProtectedRoute allowedRole="student">
                <AIAssistant />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/student/notes" 
            element={
              <ProtectedRoute allowedRole="student">
                <Notes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/student/quizzes" 
            element={
              <ProtectedRoute allowedRole="student">
                <StudentQuizzes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quiz/:quizId" 
            element={
              <ProtectedRoute allowedRole="student">
                <TakeQuiz />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/student/classes" 
            element={
              <ProtectedRoute allowedRole="student">
                <StudentClasses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/student/classes/:subjectId" 
            element={
              <ProtectedRoute allowedRole="student">
                <StudentClassroom />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/student/path" 
            element={
              <ProtectedRoute allowedRole="student">
                <StudentLearningPath />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/student/assignments" 
            element={
              <ProtectedRoute allowedRole="student">
                <StudentAssignments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/student/profile" 
            element={
              <ProtectedRoute allowedRole="student">
                <StudentProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/teacher" 
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/teacher/classes" 
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherClasses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/teacher/live" 
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherLiveClasses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/teacher/quizzes" 
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherQuizzes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/teacher/assignments" 
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherAssignments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/teacher/student/:studentId" 
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherStudentProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/teacher/settings" 
            element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherSettings />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
