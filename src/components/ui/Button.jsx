import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Button = forwardRef(({ className, variant = 'primary', size = 'default', isLoading, children, ...props }, ref) => {
  const variants = {
    primary: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-150 rounded-lg",
    secondary: "bg-[#161616] text-white hover:bg-[#1E1E1E] border border-[#2A2A2A] shadow-sm active:scale-[0.98] transition-all duration-150 rounded-lg",
    outline: "border border-[#2A2A2A] bg-transparent hover:bg-[#161616] text-[#A3A3A3] hover:text-white active:scale-[0.98] transition-all duration-150 rounded-lg",
    ghost: "bg-transparent hover:bg-[#161616] text-[#737373] hover:text-white active:scale-[0.98] transition-all duration-150 rounded-lg",
    danger: "bg-[#EF4444] hover:bg-[#DC2626] text-white font-semibold shadow-sm active:scale-[0.98] transition-all duration-150 rounded-lg",
    success: "bg-[#10B981] hover:bg-[#059669] text-white font-semibold shadow-sm active:scale-[0.98] transition-all duration-150 rounded-lg",
  };

  const sizes = {
    sm: "h-7 px-2.5 text-xs",
    default: "h-9 px-3 text-sm",
    lg: "h-10 px-4 text-sm",
    icon: "h-9 w-9 flex items-center justify-center p-0",
  };

  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
