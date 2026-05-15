import React from 'react';
import { cn } from './Button';

export function Badge({ children, variant = 'primary', className }) {
  const variants = {
    primary: 'bg-[#14b8a6]/10 text-[#0f766e]',
    purple: 'bg-[#8b5cf6]/10 text-[#6d28d9]',
    danger: 'bg-[#f43f5e]/10 text-[#be123c]',
    success: 'bg-[#22c55e]/10 text-[#15803d]',
    warning: 'bg-[#f59e0b]/10 text-[#b45309]',
    outline: 'bg-white text-gray-600 border-2 border-gray-200'
  };

  return (
    <span className={cn('px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide', variants[variant], className)}>
      {children}
    </span>
  );
}
