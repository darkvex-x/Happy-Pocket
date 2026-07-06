import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const TextArea = forwardRef(({ className, error, ...props }, ref) => {
  return (
    <div className="w-full flex flex-col space-y-1.5">
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-[#2A2A2A] bg-[#161616] px-3 py-2 text-sm text-white placeholder:text-[#525252] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all disabled:cursor-not-allowed disabled:opacity-50 resize-y",
          error && "border-[#EF4444]/60 focus:ring-[#EF4444]/20 focus:border-[#EF4444]",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="text-sm text-[#EF4444] font-medium">
          {error}
        </p>
      )}
    </div>
  );
});

TextArea.displayName = 'TextArea';
export default TextArea;
