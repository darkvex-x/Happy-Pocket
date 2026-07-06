import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

const Dropdown = forwardRef(({ className, options = [], error, ...props }, ref) => {
  return (
    <div className="w-full flex flex-col space-y-1.5 relative">
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "appearance-none flex h-9 w-full rounded-xl border border-[#334155] bg-[#111827] px-3 py-2 pr-9 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500/60 focus:ring-red-500/20",
            className
          )}
          {...props}
        >
          {options.map((opt, i) => (
            <option key={i} value={typeof opt === 'string' ? opt : opt.value}>
              {typeof opt === 'string' ? opt : opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#64748B]">
          <ChevronDown size={14} />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      )}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';
export default Dropdown;
