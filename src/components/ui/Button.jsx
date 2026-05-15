import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Button({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}) {
  const baseStyles = "relative inline-flex items-center justify-center px-6 py-3 font-bold text-base rounded-2xl transition-all duration-100 overflow-hidden outline-none interactive-btn";
  
  const variants = {
    primary: "bg-[#14b8a6] text-white border-b-4 border-[#0f766e] hover:bg-[#0d9488] active:border-b-0 active:mt-1",
    secondary: "bg-[#f97316] text-white border-b-4 border-[#c2410c] hover:bg-[#ea580c] active:border-b-0 active:mt-1",
    purple: "bg-[#8b5cf6] text-white border-b-4 border-[#6d28d9] hover:bg-[#7c3aed] active:border-b-0 active:mt-1",
    outline: "border-2 border-border bg-white text-text-primary hover:bg-gray-50 shadow-[0_4px_0_0_#e2e8f0] active:shadow-none active:translate-y-1",
    ghost: "text-text-secondary hover:text-text-primary hover:bg-gray-100 active:translate-y-1",
  };

  return (
    <button 
      className={cn(baseStyles, variants[variant], className)} 
      {...props}
    >
      {children}
    </button>
  );
}
