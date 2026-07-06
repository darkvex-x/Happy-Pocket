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
            "appearance-none flex h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 pr-9 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[var(--danger)]/60 focus:ring-red-500/20",
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
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--muted)]">
          <ChevronDown size={14} />
        </div>
      </div>
      {error && (
        <p className="text-xs text-[var(--danger)] font-medium">{error}</p>
      )}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';
export default Dropdown;