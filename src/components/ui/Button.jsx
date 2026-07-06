import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Button = forwardRef(({ className, variant = 'primary', size = 'default', isLoading, children, ...props }, ref) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 rounded-xl border border-blue-500/30",
    secondary: "bg-[#1E293B] text-slate-200 hover:bg-[#273549] border border-[#334155] shadow-sm active:scale-[0.98] transition-all duration-200 rounded-xl",
    outline: "border border-[#334155] bg-transparent hover:bg-[#1E293B] text-slate-300 hover:text-white active:scale-[0.98] transition-all duration-200 rounded-xl",
    ghost: "bg-transparent hover:bg-[#1E293B] text-slate-400 hover:text-slate-200 active:scale-[0.98] transition-all duration-200 rounded-xl",
    danger: "bg-red-600/90 hover:bg-red-500 text-white font-semibold shadow-sm active:scale-[0.98] transition-all duration-200 rounded-xl border border-red-500/20",
    success: "bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold shadow-sm active:scale-[0.98] transition-all duration-200 rounded-xl border border-emerald-500/20",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    default: "h-9 px-4 text-sm",
    lg: "h-10 px-6 text-sm",
    icon: "h-9 w-9 flex items-center justify-center p-0",
  };

  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1220] disabled:opacity-40 disabled:pointer-events-none",
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
