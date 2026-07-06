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
      className={cn("sticky top-0 z-10 [&_tr]:border-b border-[#2A2A2A] bg-[#0A0A0A]", className)}
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
        "border-b border-[#2A2A2A] transition-colors duration-150 hover:bg-[#161616] data-[state=selected]:bg-[#1E1E1E]",
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
        "h-10 px-3 text-left align-middle font-semibold text-[#737373] tracking-wider text-[11px] uppercase select-none",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return (
    <td
      className={cn("px-3 py-2.5 align-middle text-white text-sm", className)}
      {...props}
    />
  );
}
