import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(({ className, type = 'text', error, helperText, ...props }, ref) => {
  return (
    <div className="w-full flex flex-col space-y-1.5">
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm text-white placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-[#EF4444]/60 focus:ring-[#EF4444]/20 focus:border-[#EF4444]",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="text-xs text-[#EF4444] font-medium">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-[#737373]">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
