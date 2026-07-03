import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Button = forwardRef(({ className, variant = 'primary', size = 'default', isLoading, children, ...props }, ref) => {
  const variants = {
    primary: "bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-[0.98] transition-all duration-300 hover:scale-[1.02] rounded-xl",
    secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700/90 border border-slate-700/50 shadow-md active:scale-[0.98] transition-all duration-300 rounded-xl",
    outline: "border border-slate-700 bg-transparent hover:bg-slate-800/60 text-slate-200 shadow-sm active:scale-[0.98] transition-all duration-300 rounded-xl",
    ghost: "bg-transparent hover:bg-slate-800/40 text-slate-300 active:scale-[0.98] transition-all duration-300 rounded-xl",
    danger: "bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-semibold shadow-lg shadow-red-500/10 active:scale-[0.98] transition-all duration-300 rounded-xl"
  };
  
  const sizes = {
    sm: "h-8 px-3 text-xs",
    default: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-8 text-base",
    icon: "h-10 w-10 flex items-center justify-center p-0"
  };

  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
