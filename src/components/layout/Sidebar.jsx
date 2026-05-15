import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BrainCircuit, LogOut } from 'lucide-react';
import { cn } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ links, role }) {
  const accentColor = role === 'teacher' ? '#8b5cf6' : '#14b8a6';
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-72 bg-white border-r-2 border-slate-200 h-screen sticky top-0">
      <div className="flex items-center h-20 px-6 border-b-2 border-slate-100">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center transform -rotate-3 shadow-sm mr-3" style={{ backgroundColor: accentColor }}>
          <BrainCircuit className="w-6 h-6 text-white rotate-3" />
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-slate-800">
          Study<span style={{ color: accentColor }}>OS</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              cn(
                "flex items-center px-4 py-3 rounded-2xl text-base font-bold transition-all group",
                isActive 
                  ? "bg-slate-100 text-slate-900 border-b-2 border-slate-200"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-2 rounded-xl mr-3 transition-colors",
                  isActive ? `bg-[${link.color || accentColor}]/10 text-[${link.color || accentColor}]` : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
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
        <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 rounded-2xl text-base font-bold text-slate-500 hover:text-[#f43f5e] hover:bg-[#f43f5e]/10 transition-all cursor-pointer border-none bg-transparent">
          <div className="p-2 rounded-xl mr-3 bg-slate-100 text-slate-400">
            <LogOut className="w-5 h-5" />
          </div>
          Logout
        </button>
      </div>
    </aside>
  );
}
