import React from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Settings, ShieldAlert, Key, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Import teacherLinks from Dashboard to keep it DRY or redefine here
import { LayoutDashboard, Users, Video, FileText, BrainCircuit, BarChart } from 'lucide-react';
const teacherLinks = [
  { label: 'Dashboard', path: '/dashboard/teacher', icon: LayoutDashboard, color: '#8b5cf6' },
  { label: 'Manage Classes', path: '/dashboard/teacher/classes', icon: Users, color: '#3b82f6' },
  { label: 'Live Classes', path: '/dashboard/teacher/live', icon: Video, color: '#f43f5e' },
  { label: 'Assignments', path: '/dashboard/teacher/assignments', icon: FileText, color: '#10b981' },
  { label: 'Quiz Generator', path: '/dashboard/teacher/quizzes', icon: BrainCircuit, color: '#f59e0b' },
  { label: 'Analytics', path: '/dashboard/teacher/classes', icon: BarChart, color: '#14b8a6' },
  { label: 'Settings', path: '/dashboard/teacher/settings', icon: Settings, color: '#64748b' },
];

export function TeacherSettings() {
  const { currentUser } = useAuth();

  return (
    <DashboardLayout links={teacherLinks} role="teacher" userName="Teacher">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center">
            <div className="w-10 h-10 bg-slate-500 rounded-xl flex items-center justify-center shadow-sm mr-3">
              <Settings className="w-6 h-6 text-white" />
            </div>
            Account Settings
          </h1>
          <p className="text-slate-500 font-bold mt-2 ml-1">Manage your professional profile and security preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-1 space-y-4">
            <Card className="p-4 border-2 border-slate-100 shadow-sm bg-white cursor-pointer hover:border-[#8b5cf6] transition-colors border-[#8b5cf6] bg-[#8b5cf6]/5">
              <div className="flex items-center">
                <User className="w-5 h-5 text-[#8b5cf6] mr-3" />
                <span className="font-bold text-slate-800">Profile Information</span>
              </div>
            </Card>
            <Card className="p-4 border-2 border-slate-100 shadow-sm bg-white cursor-pointer hover:border-[#3b82f6] transition-colors">
              <div className="flex items-center">
                <Key className="w-5 h-5 text-slate-400 mr-3" />
                <span className="font-bold text-slate-600">Security & Password</span>
              </div>
            </Card>
            <Card className="p-4 border-2 border-slate-100 shadow-sm bg-white cursor-pointer hover:border-red-400 transition-colors">
              <div className="flex items-center">
                <ShieldAlert className="w-5 h-5 text-slate-400 mr-3" />
                <span className="font-bold text-slate-600">Danger Zone</span>
              </div>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 border-t-4 border-t-[#8b5cf6] shadow-sm bg-white">
              <h2 className="text-xl font-black text-slate-800 mb-6 border-b-2 border-slate-100 pb-4">Personal Details</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input type="text" disabled value={currentUser?.email || ''} className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-500 cursor-not-allowed" />
                  <p className="text-xs font-bold text-slate-400 mt-2">Your email is managed by your authentication provider.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Display Name</label>
                  <input type="text" placeholder="Dr. John Doe" className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-800 focus:border-[#8b5cf6] outline-none transition-colors" />
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t-2 border-slate-100 flex justify-end">
                <button className="px-6 py-2 bg-[#8b5cf6] text-white font-bold rounded-xl hover:bg-[#7c3aed] transition-colors">
                  Save Changes
                </button>
              </div>
            </Card>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
