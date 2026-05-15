import React from 'react';
import { cn } from './Button';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "flex w-full rounded-2xl border-2 border-border bg-white px-4 py-3.5 text-base font-medium text-text-primary placeholder:text-text-muted shadow-sm",
        "focus:outline-none focus:border-[#14b8a6] focus:ring-4 focus:ring-[#14b8a6]/20 transition-all duration-200",
        className
      )}
      {...props}
    />
  );
}
