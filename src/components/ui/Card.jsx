import React from 'react';
import { cn } from './Button';
import { motion } from 'framer-motion';

export function Card({ className, children, hover = false, ...props }) {
  return (
    <motion.div
      className={cn(
        "glass-card p-6",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
