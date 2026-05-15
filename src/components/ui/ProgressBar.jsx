import React from 'react';
import { cn } from './Button';

export function ProgressBar({ value = 0, max = 100, variant = 'teal', className }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const variants = {
    teal: 'bg-[#14b8a6]',
    purple: 'bg-[#8b5cf6]',
    orange: 'bg-[#f97316]',
    coral: 'bg-[#f43f5e]'
  };

  return (
    <div className={cn("w-full bg-slate-100 rounded-full h-3 overflow-hidden", className)}>
      <div 
        className={cn("h-full rounded-full transition-all duration-500 ease-out", variants[variant])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
