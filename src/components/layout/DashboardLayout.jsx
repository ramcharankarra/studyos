import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Menu, User, Bell, Trash2, Megaphone, Video, BrainCircuit, Target, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { cn } from '../ui/Button';

export function DashboardLayout({ children, links, role, userName }) {
  const { logout, currentUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = React.useRef(null);
  const accentColor = role === 'teacher' ? '#8b5cf6' : '#14b8a6';

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
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800 selection:bg-[#14b8a6]/20">
      <Sidebar links={links} role={role} />

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-72 bg-white border-r-2 border-slate-200 z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between h-20 px-6 border-b-2 border-slate-100">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center transform -rotate-3 shadow-sm mr-3" style={{ backgroundColor: accentColor }}>
                    <BrainCircuit className="w-6 h-6 text-white rotate-3" />
                  </div>
                  <span className="text-2xl font-extrabold tracking-tight text-slate-800">
                    Study<span style={{ color: accentColor }}>OS</span>
                  </span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {links.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center px-4 py-3 rounded-2xl text-base font-bold transition-all",
                        isActive 
                          ? "bg-slate-100 text-slate-900 border-b-2 border-slate-200"
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={cn(
                          "p-2 rounded-xl mr-3",
                          isActive ? `bg-[${link.color || accentColor}]/10 text-[${link.color || accentColor}]` : "bg-slate-100 text-slate-400"
                        )} style={isActive && link.color ? { backgroundColor: `${link.color}20`, color: link.color } : {}}>
                          <link.icon className="w-5 h-5" />
                        </div>
                        {link.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
              <div className="p-6 border-t-2 border-slate-100">
                <NavLink to="/login" className="flex items-center px-4 py-3 rounded-2xl text-base font-bold text-slate-500 hover:text-[#f43f5e] hover:bg-[#f43f5e]/10 transition-all">
                  <div className="p-2 rounded-xl mr-3 bg-slate-100 text-slate-400">
                    <LogOut className="w-5 h-5" />
                  </div>
                  Logout
                </NavLink>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar setMobileMenuOpen={setMobileMenuOpen} userName={userName} role={role} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
