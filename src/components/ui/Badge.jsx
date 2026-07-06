import React from 'react';
import { cn } from '../../utils/cn';

export default function Badge({ className, variant = 'default', children, ...props }) {
  const variants = {
    default: "bg-[var(--border)] text-[var(--text-primary)]",
    primary: "bg-[var(--primary)]/15 text-[var(--primary)]",
    success: "bg-[var(--success)]/15 text-[var(--success)]",
    warning: "bg-[var(--warning)]/15 text-[var(--warning)]",
    danger: "bg-[var(--danger)]/15 text-[var(--danger)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background-secondary)]",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
