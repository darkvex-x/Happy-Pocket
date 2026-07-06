import React from 'react';
import { cn } from '../../utils/cn';

export default function Badge({ className, variant = 'default', children, ...props }) {
  const variants = {
    default: "bg-[#2A2A2A] text-white",
    primary: "bg-[#2563EB]/15 text-[#2563EB]",
    success: "bg-[#10B981]/15 text-[#10B981]",
    warning: "bg-[#F59E0B]/15 text-[#F59E0B]",
    danger: "bg-[#EF4444]/15 text-[#EF4444]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 focus:ring-offset-[#0A0A0A]",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
