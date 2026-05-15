import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Mail, Lock, ArrowRight, Code } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      
      // The ProtectedRoute or App logic will handle redirection based on role,
      // but we can manually route here as well for immediate feedback.
      if (role === 'student') navigate('/dashboard/student');
      else navigate('/dashboard/teacher');
      
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      console.error(err);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle(role);
      
      if (role === 'student') navigate('/dashboard/student');
      else navigate('/dashboard/teacher');
    } catch (err) {
      setError('Failed to log in with Google.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative overflow-hidden bg-slate-50">
      <div className="absolute top-20 left-20 w-64 h-64 bg-[#14b8a6] rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      <div className="absolute bottom-20 right-20 w-64 h-64 bg-[#f97316] rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#14b8a6] rounded-3xl shadow-[0_6px_0_0_#0f766e] flex items-center justify-center mx-auto mb-6 transform -rotate-6">
            <BrainCircuit className="w-10 h-10 text-white rotate-6" />
          </div>
          <h1 className="text-4xl font-black text-slate-800 mb-2">Welcome Back!</h1>
          <p className="text-lg font-bold text-slate-500">Sign in to your StudyOS workspace</p>
        </div>

        <Card className="p-8 border-t-4 border-t-[#14b8a6]">
          {/* Role Selection */}
          <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8 border-2 border-slate-200">
            <button
              onClick={() => setRole('student')}
              className={`flex-1 py-3 text-base font-extrabold rounded-xl transition-all ${
                role === 'student' ? 'bg-white text-[#14b8a6] shadow-sm border-2 border-slate-200' : 'text-slate-500 hover:text-slate-800 border-2 border-transparent'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setRole('teacher')}
              className={`flex-1 py-3 text-base font-extrabold rounded-xl transition-all ${
                role === 'teacher' ? 'bg-white text-[#8b5cf6] shadow-sm border-2 border-slate-200' : 'text-slate-500 hover:text-slate-800 border-2 border-transparent'
              }`}
            >
              Teacher
            </button>
          </div>

          {error && <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg text-sm font-bold">{error}</div>}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-base font-extrabold text-slate-700 pl-1">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-6 w-6 text-slate-400" />
                </div>
                <Input 
                  type="email" 
                  placeholder="you@university.edu" 
                  className="pl-12" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between pl-1">
                <label className="text-base font-extrabold text-slate-700">Password</label>
                <a href="#" className="text-sm font-extrabold text-[#14b8a6] hover:text-[#0d9488]">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-6 w-6 text-slate-400" />
                </div>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-12" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button disabled={loading} variant={role === 'student' ? 'primary' : 'purple'} className="w-full mt-8 py-4 text-lg" type="submit">
              {loading ? 'Signing In...' : <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-slate-100" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-400 font-extrabold">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button disabled={loading} onClick={handleGoogleLogin} variant="outline" className="w-full" type="button">
                Google
              </Button>
              <Button disabled={loading} variant="outline" className="w-full" type="button">
                <Code className="w-5 h-5 mr-2" /> GitHub
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-center text-base text-slate-500 mt-8 font-extrabold">
          Don't have an account?{' '}
          <Link to="/signup" className={`hover:underline transition-colors ${role === 'student' ? 'text-[#14b8a6]' : 'text-[#8b5cf6]'}`}>
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
