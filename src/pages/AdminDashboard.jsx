import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Users, BookOpen, Target, FileText, Loader2, BarChart2, ShieldAlert, Activity, LayoutDashboard, Settings, Database } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { seedDemoData } from '../lib/seedData';

export const adminLinks = [
  { label: 'Platform Overview', path: '/dashboard/admin', icon: LayoutDashboard, color: '#8b5cf6' },
  { label: 'User Management', path: '/dashboard/admin/users', icon: Users, color: '#3b82f6' },
  { label: 'Classrooms', path: '/dashboard/admin/classrooms', icon: BookOpen, color: '#10b981' },
  { label: 'System Settings', path: '#', icon: Settings, color: '#64748b' },
];

export function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    students: 0,
    teachers: 0,
    classrooms: 0,
    quizzes: 0,
    submissions: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentClassrooms, setRecentClassrooms] = useState([]);
  const [growthData, setGrowthData] = useState([]);

  useEffect(() => {
    loadPlatformData();
  }, []);

  const loadPlatformData = async () => {
    try {
      // Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const studentsCount = usersData.filter(u => u.role === 'student').length;
      const teachersCount = usersData.filter(u => u.role === 'teacher').length;
      
      // Fetch Classrooms
      const classesSnap = await getDocs(collection(db, 'subjects'));
      const classesData = classesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch Quizzes & Submissions
      const quizzesSnap = await getDocs(collection(db, 'quizzes'));
      const submsSnap = await getDocs(collection(db, 'submissions'));

      setStats({
        totalUsers: usersData.length,
        students: studentsCount,
        teachers: teachersCount,
        classrooms: classesData.length,
        quizzes: quizzesSnap.docs.length,
        submissions: submsSnap.docs.length
      });

      // Recent Users (Mocking recent by just sorting if createdAt exists, otherwise slicing)
      const sortedUsers = usersData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);
      setRecentUsers(sortedUsers);

      const sortedClasses = classesData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);
      setRecentClassrooms(sortedClasses);

      // Mock Growth Data
      setGrowthData([
        { name: 'Jan', users: Math.floor(usersData.length * 0.2) },
        { name: 'Feb', users: Math.floor(usersData.length * 0.4) },
        { name: 'Mar', users: Math.floor(usersData.length * 0.6) },
        { name: 'Apr', users: Math.floor(usersData.length * 0.8) },
        { name: 'May', users: usersData.length },
      ]);

    } catch (e) {
      console.error("Failed to load admin dashboard:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout links={adminLinks} role="admin" userName="Admin">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#8b5cf6]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout links={adminLinks} role="admin" userName="Admin">
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-sm mr-3">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              Admin Command Center
            </h1>
            <p className="text-slate-500 font-bold mt-2 ml-1">Platform overview, metrics, and system activity.</p>
          </div>
          <button 
            onClick={seedDemoData}
            className="flex items-center px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
          >
            <Database className="w-4 h-4 mr-2" /> Seed Demo Data
          </button>
        </div>

        {/* Top KPI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-b-4 border-b-[#8b5cf6] bg-white shadow-sm flex items-center">
            <div className="w-14 h-14 rounded-2xl bg-[#8b5cf6]/10 flex items-center justify-center mr-4">
              <Users className="w-7 h-7 text-[#8b5cf6]" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Total Users</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.totalUsers}</h4>
            </div>
          </Card>
          
          <Card className="p-6 border-b-4 border-b-[#3b82f6] bg-white shadow-sm flex items-center">
            <div className="w-14 h-14 rounded-2xl bg-[#3b82f6]/10 flex items-center justify-center mr-4">
              <BookOpen className="w-7 h-7 text-[#3b82f6]" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Active Classrooms</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.classrooms}</h4>
            </div>
          </Card>

          <Card className="p-6 border-b-4 border-b-[#f59e0b] bg-white shadow-sm flex items-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f59e0b]/10 flex items-center justify-center mr-4">
              <Target className="w-7 h-7 text-[#f59e0b]" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Total Quizzes</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.quizzes}</h4>
            </div>
          </Card>

          <Card className="p-6 border-b-4 border-b-[#10b981] bg-white shadow-sm flex items-center">
            <div className="w-14 h-14 rounded-2xl bg-[#10b981]/10 flex items-center justify-center mr-4">
              <FileText className="w-7 h-7 text-[#10b981]" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">Submissions</p>
              <h4 className="text-3xl font-black text-slate-800">{stats.submissions}</h4>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Charts Area */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="p-6 border-2 border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-800 text-xl flex items-center">
                  <BarChart2 className="w-5 h-5 text-slate-400 mr-2" /> Platform Growth
                </h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growthData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{fill: '#64748b', fontWeight: 700}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill: '#64748b', fontWeight: 700}} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 700}} />
                    <Bar dataKey="users" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6 border-2 border-slate-100 bg-slate-800 text-white shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">Student Ratio</p>
                  <h4 className="text-2xl font-black">{stats.totalUsers > 0 ? Math.round((stats.students / stats.totalUsers) * 100) : 0}%</h4>
                </div>
                <Users className="w-10 h-10 text-slate-600" />
              </Card>
              <Card className="p-6 border-2 border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">Teacher Ratio</p>
                  <h4 className="text-2xl font-black text-slate-800">{stats.totalUsers > 0 ? Math.round((stats.teachers / stats.totalUsers) * 100) : 0}%</h4>
                </div>
                <BookOpen className="w-10 h-10 text-slate-200" />
              </Card>
            </div>
          </div>

          {/* Activity Feeds */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-0 border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-800 flex items-center text-sm uppercase tracking-widest">
                  <Activity className="w-4 h-4 text-emerald-500 mr-2" /> Recent Users
                </h3>
              </div>
              <div className="p-0">
                {recentUsers.map((user, i) => (
                  <div key={user.id} className={`p-4 flex items-center justify-between ${i !== recentUsers.length -1 ? 'border-b border-slate-100' : ''}`}>
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs mr-3">
                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 truncate w-32">{user.name || 'Unknown'}</p>
                        <p className="text-xs font-bold text-slate-400">{user.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-0 border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-black text-slate-800 flex items-center text-sm uppercase tracking-widest">
                  <BookOpen className="w-4 h-4 text-blue-500 mr-2" /> Recent Classes
                </h3>
              </div>
              <div className="p-0">
                {recentClassrooms.map((cls, i) => (
                  <div key={cls.id} className={`p-4 flex items-center justify-between ${i !== recentClassrooms.length -1 ? 'border-b border-slate-100' : ''}`}>
                    <div>
                      <p className="text-sm font-bold text-slate-800 truncate w-40">{cls.subjectName}</p>
                      <p className="text-xs font-bold text-slate-400">Code: {cls.classCode}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
