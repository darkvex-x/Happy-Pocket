import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const TextArea = forwardRef(({ className, error, ...props }, ref) => {
  return (
    <div className="w-full flex flex-col space-y-1.5">
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all disabled:cursor-not-allowed disabled:opacity-50 resize-y",
          error && "border-[var(--danger)]/60 focus:ring-[var(--danger)]/20 focus:border-[var(--danger)]",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <p className="text-sm text-[var(--danger)] font-medium">
          {error}
        </p>
      )}
    </div>
  );
});

TextArea.displayName = 'TextArea';
export default TextArea;
