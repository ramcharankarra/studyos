import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Users, Search, Loader2, UserMinus, UserCheck, ShieldAlert, MoreVertical } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { adminLinks } from './AdminDashboard';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = users;
    if (filterRole !== 'all') {
      result = result.filter(u => u.role === filterRole);
    }
    if (searchTerm) {
      result = result.filter(u => 
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.id && u.id.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredUsers(result);
  }, [searchTerm, filterRole, users]);

  const handleToggleStatus = async (user) => {
    try {
      const newStatus = user.accountStatus === 'suspended' ? 'active' : 'suspended';
      await updateDoc(doc(db, 'users', user.id), {
        accountStatus: newStatus
      });
      setUsers(users.map(u => u.id === user.id ? { ...u, accountStatus: newStatus } : u));
    } catch (e) {
      alert("Failed to update status.");
    }
  };

  const handleDeleteUser = async (userId) => {
    if(!window.confirm("WARNING: This will delete the user record from Firestore. Proceed?")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.id !== userId));
    } catch (e) {
      alert("Failed to delete user.");
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
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center">
            <div className="w-10 h-10 bg-[#3b82f6] rounded-xl flex items-center justify-center shadow-sm mr-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            User Management
          </h1>
          <p className="text-slate-500 font-bold mt-2 ml-1">View, filter, suspend, and manage platform users.</p>
        </div>

        <Card className="p-4 border-2 border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between bg-white">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:outline-none focus:border-[#3b82f6] focus:bg-white transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <Button variant={filterRole === 'all' ? 'primary' : 'outline'} onClick={() => setFilterRole('all')} className={filterRole === 'all' ? 'bg-[#3b82f6] border-b-4 border-[#2563eb]' : 'border-2'}>All Users</Button>
            <Button variant={filterRole === 'student' ? 'primary' : 'outline'} onClick={() => setFilterRole('student')} className={filterRole === 'student' ? 'bg-[#3b82f6] border-b-4 border-[#2563eb]' : 'border-2'}>Students</Button>
            <Button variant={filterRole === 'teacher' ? 'primary' : 'outline'} onClick={() => setFilterRole('teacher')} className={filterRole === 'teacher' ? 'bg-[#3b82f6] border-b-4 border-[#2563eb]' : 'border-2'}>Teachers</Button>
            <Button variant={filterRole === 'admin' ? 'primary' : 'outline'} onClick={() => setFilterRole('admin')} className={filterRole === 'admin' ? 'bg-[#3b82f6] border-b-4 border-[#2563eb]' : 'border-2'}>Admins</Button>
          </div>
        </Card>

        <Card className="border-2 border-slate-100 shadow-sm overflow-hidden bg-white p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-100">
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs">User Info</th>
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs">Role</th>
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs">Status</th>
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs">Registered</th>
                  <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 font-bold">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-extrabold text-slate-800">{user.name || 'No Name Provided'}</div>
                        <div className="text-xs font-bold text-slate-500">{user.email}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">UID: {user.id}</div>
                      </td>
                      <td className="p-4">
                        <Badge 
                          variant={user.role === 'admin' ? 'purple' : user.role === 'teacher' ? 'blue' : 'primary'}
                          className="capitalize"
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {user.accountStatus === 'suspended' ? (
                          <Badge variant="danger" className="bg-red-100 text-red-700">Suspended</Badge>
                        ) : (
                          <Badge variant="success" className="bg-emerald-100 text-emerald-700">Active</Badge>
                        )}
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-600">
                        {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleToggleStatus(user)}
                            title={user.accountStatus === 'suspended' ? 'Reactivate User' : 'Suspend User'}
                            className={`p-2 rounded-lg transition-colors ${user.accountStatus === 'suspended' ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                          >
                            {user.accountStatus === 'suspended' ? <UserCheck className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete Permanently"
                            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                        </div>
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
