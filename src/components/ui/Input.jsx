import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(({ className, type = 'text', error, helperText, ...props }, ref) => {
  return (
    <div className="w-full flex flex-col space-y-1.5">
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all disabled:cursor-not-allowed disabled:opacity-50 shadow-inner",
          error && "border-red-500 focus:ring-red-500/20 focus:border-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 font-medium">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
