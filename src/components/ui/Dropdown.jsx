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
            "appearance-none flex h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 pr-9 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[#EF4444]/60 focus:ring-red-500/20",
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
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#737373]">
          <ChevronDown size={14} />
        </div>
      </div>
      {error && (
        <p className="text-xs text-[#EF4444] font-medium">{error}</p>
      )}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';
export default Dropdown;