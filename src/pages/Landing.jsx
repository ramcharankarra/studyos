import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Brain, Clock, Sparkles, GraduationCap, Users, BrainCircuit } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div className="flex flex-col min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 border-b-2 border-slate-100 bg-slate-50">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#14b8a6] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-20 w-32 h-32 bg-[#f97316] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-32 h-32 bg-[#8b5cf6] rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border-2 border-slate-200 shadow-sm mb-8 transform -rotate-2">
              <Sparkles className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-base font-extrabold text-slate-700">The Fun Way to Learn</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 text-slate-800">
              AI-Powered Personalized <br className="hidden md:block" />
              <span className="text-[#14b8a6]">Learning Workspace</span>
            </h1>
            
            <p className="mt-4 text-xl font-bold text-slate-500 max-w-3xl mx-auto mb-10 leading-relaxed">
              Transform your academic journey with intelligent study planning, AI assistants, personalized quizzes, and interactive online classes.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <Link to="/signup">
                <Button variant="primary" className="w-full sm:w-auto text-lg px-8 py-4 shadow-[0_6px_0_0_#0f766e]">Get Started for Free</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="w-full sm:w-auto text-lg px-8 py-4">Login to Workspace</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-800">Supercharge your studies</h2>
            <p className="text-slate-500 font-bold max-w-2xl mx-auto text-xl">Everything you need to excel academically, powered by colorful and helpful AI.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card hover className="p-8 border-b-4 border-b-[#8b5cf6]">
              <div className="w-16 h-16 rounded-2xl bg-[#8b5cf6] flex items-center justify-center mb-6 shadow-[0_4px_0_0_#6d28d9] transform -rotate-3">
                <Brain className="w-8 h-8 text-white rotate-3" />
              </div>
              <h3 className="text-2xl font-extrabold mb-3 text-slate-800">AI Study Assistant</h3>
              <p className="text-slate-500 font-bold text-lg leading-relaxed">Get instant answers, concept explanations, and personalized summaries for your lectures.</p>
            </Card>
            <Card hover className="p-8 border-b-4 border-b-[#f97316]">
              <div className="w-16 h-16 rounded-2xl bg-[#f97316] flex items-center justify-center mb-6 shadow-[0_4px_0_0_#c2410c] transform rotate-3">
                <BookOpen className="w-8 h-8 text-white -rotate-3" />
              </div>
              <h3 className="text-2xl font-extrabold mb-3 text-slate-800">Smart Quizzes</h3>
              <p className="text-slate-500 font-bold text-lg leading-relaxed">Automatically generate flashcards and practice tests from your uploaded materials.</p>
            </Card>
            <Card hover className="p-8 border-b-4 border-b-[#22c55e]">
              <div className="w-16 h-16 rounded-2xl bg-[#22c55e] flex items-center justify-center mb-6 shadow-[0_4px_0_0_#15803d] transform -rotate-3">
                <Clock className="w-8 h-8 text-white rotate-3" />
              </div>
              <h3 className="text-2xl font-extrabold mb-3 text-slate-800">Adaptive Planning</h3>
              <p className="text-slate-500 font-bold text-lg leading-relaxed">Our AI optimizes your study schedule based on your learning speed and upcoming deadlines.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Workflows Section */}
      <section id="workflows" className="py-24 relative bg-slate-50 border-t-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-800">Built for both <span className="text-[#14b8a6]">Students</span> and <span className="text-[#8b5cf6]">Teachers</span></h2>
              <div className="space-y-10 mt-10">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-[#14b8a6] shadow-[0_4px_0_0_#0f766e] flex items-center justify-center transform -rotate-6">
                    <GraduationCap className="w-8 h-8 text-white rotate-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-extrabold mb-2 text-slate-800">Student Workflow</h4>
                    <p className="text-slate-500 font-bold text-lg leading-relaxed">Organize notes, track assignments, and utilize AI tutors to master difficult subjects faster.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-[#8b5cf6] shadow-[0_4px_0_0_#6d28d9] flex items-center justify-center transform rotate-6">
                    <Users className="w-8 h-8 text-white -rotate-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-extrabold mb-2 text-slate-800">Teacher Workflow</h4>
                    <p className="text-slate-500 font-bold text-lg leading-relaxed">Manage online classes, distribute materials, and let AI grade quizzes automatically.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-[#f59e0b] rounded-3xl transform rotate-3 shadow-lg"></div>
              <Card className="p-2 border-none bg-white shadow-xl relative z-10 rounded-3xl transform -rotate-2">
                <div className="rounded-2xl border-4 border-dashed border-slate-200 bg-slate-50 p-6 h-[400px] flex flex-col items-center justify-center text-slate-400">
                  <BrainCircuit className="w-24 h-24 mb-4 text-[#14b8a6]" />
                  <p className="font-extrabold text-xl text-slate-400">Interactive Workspace Dashboard</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 relative bg-white border-t-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-16 text-slate-800">Loved by learners worldwide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="text-left p-8 border-b-4 border-b-[#f59e0b]">
                <div className="flex text-[#f59e0b] mb-6">
                  {[1, 2, 3, 4, 5].map((star) => <Sparkles key={star} className="w-5 h-5 mr-1 fill-current" />)}
                </div>
                <p className="text-slate-600 font-bold mb-8 leading-relaxed text-lg line-clamp-3">
                  "StudyOS completely changed how I prepare for exams. The AI summaries save me hours of reading, and the smart quizzes are actually fun!"
                </p>
                <div className="flex items-center gap-4 pt-4 border-t-2 border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-[#14b8a6] flex items-center justify-center font-extrabold text-white text-xl shadow-[0_4px_0_0_#0f766e]">
                    A
                  </div>
                  <div>
                    <h5 className="font-extrabold text-slate-800 text-base">Alex Johnson</h5>
                    <p className="text-sm text-slate-500 font-bold">Computer Science Student</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
