import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, MessageCircle, Code, Briefcase } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t-2 border-slate-200 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#14b8a6] flex items-center justify-center shadow-sm">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold text-slate-800">Study<span className="text-[#14b8a6]">OS</span></span>
            </div>
            <p className="text-base font-medium text-slate-500 leading-relaxed">
              Making education fun, colorful, and productive for everyone.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-[#3b82f6] hover:text-white transition-colors"><MessageCircle className="w-5 h-5" /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-[#f97316] hover:text-white transition-colors"><Code className="w-5 h-5" /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-[#8b5cf6] hover:text-white transition-colors"><Briefcase className="w-5 h-5" /></a>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase mb-6">Product</h3>
            <ul className="space-y-4">
              <li><Link to="#" className="text-base font-bold text-slate-500 hover:text-[#14b8a6] transition-colors">Features</Link></li>
              <li><Link to="#" className="text-base font-bold text-slate-500 hover:text-[#f97316] transition-colors">Integrations</Link></li>
              <li><Link to="#" className="text-base font-bold text-slate-500 hover:text-[#8b5cf6] transition-colors">Pricing</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase mb-6">Company</h3>
            <ul className="space-y-4">
              <li><Link to="#" className="text-base font-bold text-slate-500 hover:text-[#14b8a6] transition-colors">About</Link></li>
              <li><Link to="#" className="text-base font-bold text-slate-500 hover:text-[#14b8a6] transition-colors">Blog</Link></li>
              <li><Link to="#" className="text-base font-bold text-slate-500 hover:text-[#14b8a6] transition-colors">Careers</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 tracking-wider uppercase mb-6">Legal</h3>
            <ul className="space-y-4">
              <li><Link to="#" className="text-base font-bold text-slate-500 hover:text-[#14b8a6] transition-colors">Privacy Policy</Link></li>
              <li><Link to="#" className="text-base font-bold text-slate-500 hover:text-[#14b8a6] transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t-2 border-slate-100 text-center">
          <p className="text-sm font-bold text-slate-400">
            &copy; {new Date().getFullYear()} StudyOS. Built with fun.
          </p>
        </div>
      </div>
    </footer>
  );
}
