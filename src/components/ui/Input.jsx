import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(({ className, type = 'text', error, helperText, ...props }, ref) => {
  return (
    <div className="w-full flex flex-col space-y-1.5">
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-xl border border-[#334155] bg-[#111827] px-3 py-2 text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500/60 focus:ring-red-500/20 focus:border-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-[#64748B]">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
