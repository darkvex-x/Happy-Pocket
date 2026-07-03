import React from 'react';
import { cn } from '../../utils/cn';

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-auto rounded-xl border border-slate-800 bg-slate-900/20">
      <table className={cn("w-full caption-bottom text-sm text-slate-100", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn("[&_tr]:border-b border-slate-800 bg-slate-950/80", className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn("border-b border-slate-800/60 transition-colors hover:bg-slate-800/40 data-[state=selected]:bg-slate-800", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn("h-12 px-4 text-left align-middle font-semibold text-slate-200 [&:has([role=checkbox])]:pr-0 tracking-wider text-xs uppercase", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0 text-slate-300", className)}
      {...props}
    />
  );
}
