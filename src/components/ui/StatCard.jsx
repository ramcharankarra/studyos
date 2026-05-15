import React from 'react';
import { Card } from './Card';
import { cn } from './Button';

export function StatCard({ title, value, icon: Icon, trend, trendValue, className, color = "teal" }) {
  
  const colorMap = {
    teal: "text-[#14b8a6] bg-[#14b8a6]/10",
    purple: "text-[#8b5cf6] bg-[#8b5cf6]/10",
    orange: "text-[#f97316] bg-[#f97316]/10",
    blue: "text-[#3b82f6] bg-[#3b82f6]/10",
  };

  return (
    <Card hover className={cn("flex flex-col p-6", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-text-secondary uppercase tracking-wide">{title}</p>
          <h4 className="text-3xl font-extrabold text-text-primary mt-2">{value}</h4>
        </div>
        {Icon && (
          <div className={cn("p-3 rounded-2xl", colorMap[color] || colorMap.teal)}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={cn("font-bold px-2.5 py-1 rounded-xl text-xs", trend === 'up' ? "bg-[#22c55e]/10 text-[#15803d]" : "bg-[#f43f5e]/10 text-[#be123c]")}>
            {trend === 'up' ? '+' : '-'}{trendValue}
          </span>
          <span className="text-text-muted ml-2 text-xs font-bold">vs last week</span>
        </div>
      )}
    </Card>
  );
}
