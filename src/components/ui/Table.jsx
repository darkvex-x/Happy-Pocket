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
      className={cn("sticky top-0 z-10 [&_tr]:border-b border-[#334155]/60 bg-[#111827]", className)}
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
        "border-b border-[#334155]/40 transition-colors duration-150 hover:bg-[#1E293B]/60 data-[state=selected]:bg-[#1E293B]",
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
        "h-10 px-4 text-left align-middle font-semibold text-[#64748B] tracking-wider text-[11px] uppercase select-none",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={cn("px-4 py-3 align-middle text-slate-300 text-sm", className)}
      {...props}
    />
  );
}
