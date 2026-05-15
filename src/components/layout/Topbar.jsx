import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, Megaphone, Video, BrainCircuit, Target, Trash2 } from 'lucide-react';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';

export function Topbar({ setMobileMenuOpen, userName, role }) {
  const { currentUser, userRole } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  
  // Use Firebase data if available, otherwise fallback to props
  const displayRole = userRole || role;
  const displayName = currentUser?.displayName || userName;
  const accentColor = displayRole === 'teacher' ? 'bg-[#8b5cf6]' : 'bg-[#14b8a6]';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen to notifications real-time
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { isRead: true });
    } catch (e) { console.error(e); }
  };

  const handleClearAll = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      setShowNotifications(false);
    } catch (e) { console.error(e); }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'announcement': return <Megaphone className="w-4 h-4 text-[#3b82f6]" />;
      case 'live_class': return <Video className="w-4 h-4 text-[#f43f5e]" />;
      case 'ai_alert': return <BrainCircuit className="w-4 h-4 text-[#ec4899]" />;
      case 'quiz': return <Target className="w-4 h-4 text-[#f59e0b]" />;
      default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <header className="h-20 flex items-center justify-between px-6 bg-white border-b-2 border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center flex-1">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 -ml-2 mr-3 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
        >
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="hidden sm:flex items-center flex-1 max-w-lg">
          <div className="relative w-full">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold" />
            <Input 
              placeholder="Search classes, assignments..." 
              className="pl-12 h-12 bg-slate-100 border-transparent text-base rounded-full shadow-none focus:bg-white focus:border-[#14b8a6]"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 text-slate-400 hover:text-slate-700 rounded-2xl hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-3 h-3 bg-[#f43f5e] rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 max-h-[80vh] bg-white rounded-2xl shadow-2xl border-2 border-slate-100 flex flex-col overflow-hidden z-50 transform origin-top-right transition-all">
              <div className="p-4 border-b-2 border-slate-50 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                <h3 className="font-black text-slate-800">Notifications</h3>
                <div className="flex space-x-3 items-center">
                  {unreadCount > 0 && <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{unreadCount} New</span>}
                  {notifications.length > 0 && (
                    <button onClick={handleClearAll} className="text-slate-400 hover:text-red-500 transition-colors" title="Clear All">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold flex flex-col items-center">
                    <Bell className="w-8 h-8 mb-2 opacity-20" />
                    <p>All caught up!</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => handleMarkAsRead(n.id)}
                      className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex items-start ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mr-3 mt-1 ${!n.isRead ? 'bg-white shadow-sm border border-slate-200' : 'bg-slate-100'}`}>
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.isRead ? 'font-black text-slate-800' : 'font-bold text-slate-600'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">
                          {n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-[#3b82f6] ml-2 mt-2 flex-shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4 pl-6 border-l-2 border-slate-200">
          <div className="hidden md:block text-right">
            <p className="text-base font-extrabold text-slate-800 leading-none">{displayName}</p>
            <p className="text-sm text-slate-500 mt-1 capitalize font-bold">{displayRole}</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl ${accentColor} flex items-center justify-center text-lg font-extrabold text-white shadow-[0_4px_0_0_rgba(0,0,0,0.1)] transform rotate-2`}>
            {displayName ? displayName.charAt(0).toUpperCase() : '?'}
          </div>
        </div>
      </div>
    </header>
  );
}
