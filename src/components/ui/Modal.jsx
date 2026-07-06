import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Modal({ isOpen, onClose, title, children, className }) {
  
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Modal Box */}
      <div 
        className={cn("bg-[var(--card)] z-50 w-full max-w-lg rounded-xl border border-[var(--border)] shadow-xl overflow-hidden m-4 transform transition-all", className)}
        role="dialog"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 id="modal-title" className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button 
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded-lg"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
      </div>
    </div>
  );
}
