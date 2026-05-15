import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Menu, X, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b-2 border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#14b8a6] flex items-center justify-center transform rotate-3 shadow-[0_4px_0_0_#0f766e]">
              <BrainCircuit className="w-6 h-6 text-white -rotate-3" />
            </div>
            <Link to="/" className="text-2xl font-extrabold tracking-tight text-slate-800 flex items-center ml-2">
              Study<span className="text-[#14b8a6]">OS</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="#features" className="text-base font-bold text-slate-600 hover:text-[#14b8a6] transition-colors">Features</Link>
            <Link to="#workflows" className="text-base font-bold text-slate-600 hover:text-[#14b8a6] transition-colors">Workflows</Link>
            <Link to="#testimonials" className="text-base font-bold text-slate-600 hover:text-[#14b8a6] transition-colors">Testimonials</Link>
            
            <div className="flex items-center space-x-4 pl-4 border-l-2 border-slate-200">
              <Link to="/login">
                <Button variant="ghost" className="px-4 py-2 font-bold text-slate-600">Login</Button>
              </Link>
              <Link to="/signup">
                <Button variant="primary" className="px-5 py-2">Get Started</Button>
              </Link>
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-slate-900 p-2"
            >
              {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t-2 border-slate-100 shadow-lg"
          >
            <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col">
              <Link to="#features" className="block px-3 py-3 text-lg font-bold text-slate-600 hover:text-[#14b8a6] hover:bg-slate-50 rounded-xl" onClick={() => setIsOpen(false)}>Features</Link>
              <Link to="#workflows" className="block px-3 py-3 text-lg font-bold text-slate-600 hover:text-[#14b8a6] hover:bg-slate-50 rounded-xl" onClick={() => setIsOpen(false)}>Workflows</Link>
              <Link to="#testimonials" className="block px-3 py-3 text-lg font-bold text-slate-600 hover:text-[#14b8a6] hover:bg-slate-50 rounded-xl" onClick={() => setIsOpen(false)}>Testimonials</Link>
              
              <div className="pt-4 flex flex-col space-y-4 border-t-2 border-slate-100">
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full justify-center">Login</Button>
                </Link>
                <Link to="/signup" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" className="w-full justify-center">Get Started</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
