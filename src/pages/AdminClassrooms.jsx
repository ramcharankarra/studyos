import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { BookOpen, Search, Loader2, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { adminLinks } from './AdminDashboard';

export function AdminClassrooms() {
  const [classrooms, setClassrooms] = useState([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      const clsSnap = await getDocs(collection(db, 'subjects'));
      const clsData = clsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClassrooms(clsData);
      setFilteredClassrooms(clsData);
    } catch (e) {
      console.error("Failed to load classrooms:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = classrooms;
    if (searchTerm) {
      result = result.filter(c => 
        (c.subjectName && c.subjectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.classCode && c.classCode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredClassrooms(result);
  }, [searchTerm, classrooms]);

  const handleDeleteClassroom = async (classroomId) => {
    if(!window.confirm("WARNING: This will permanently delete the classroom from the platform. Proceed?")) return;
    try {
      await deleteDoc(doc(db, 'subjects', classroomId));
      setClassrooms(classrooms.filter(c => c.id !== classroomId));
    } catch (e) {
      alert("Failed to delete classroom.");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout links={adminLinks} role="admin" userName="Admin">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-12 h-12 animate-spin text-[#10b981]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout links={adminLinks} role="admin" userName="Admin">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center">
            <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center shadow-sm mr-3">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            Classroom Oversight
          </h1>
          <p className="text-slate-500 font-bold mt-2 ml-1">Monitor all active educational ecosystems and apply moderation.</p>
        </div>

        <Card className="p-4 border-2 border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between bg-white">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by subject name or invite code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:outline-none focus:border-[#10b981] focus:bg-white transition-colors"
            />
          </div>
        </Card>

        <Card className="border-2 border-slate-100 shadow-sm overflow-hidden bg-white p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100">
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs">Subject Name</th>
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs">Invite Code</th>
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs">Teacher ID</th>
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs">Created</th>
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs text-right">Moderation</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassrooms.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 font-bold">No classrooms found.</td>
                  </tr>
                ) : (
                  filteredClassrooms.map((cls) => (
                    <tr key={cls.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-extrabold text-slate-800">{cls.subjectName}</div>
                      </td>
                      <td className="p-4">
                        <Badge variant="purple" className="font-mono">{cls.classCode}</Badge>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500">
                        {cls.teacherId}
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-600">
                        {cls.createdAt ? new Date(cls.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleDeleteClassroom(cls.id)}
                          title="Force Delete Classroom"
                          className="p-2 inline-flex items-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
