import React from 'react';
import { cn } from '../../utils/cn';

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return (
    <thead
      className={cn("sticky top-0 z-10 [&_tr]:border-b border-[var(--border)] bg-[var(--background-secondary)]", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border)] transition-colors duration-150 hover:bg-[var(--card-secondary)] data-[state=selected]:bg-[var(--border-hover)]",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        "h-10 px-3 text-left align-middle font-semibold text-[var(--muted)] tracking-wider text-[11px] uppercase select-none",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={cn("px-3 py-2.5 align-middle text-[var(--text-primary)] text-sm", className)}
      {...props}
    />
  );
}
