import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, toast.duration || 3000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

function ToastCard({ toast, onClose }) {
  const icons = {
    success: <CheckCircle2 className="text-[var(--success)] h-5 w-5" />,
    error: <AlertCircle className="text-[var(--danger)] h-5 w-5" />,
    info: <Info className="text-[var(--primary)] h-5 w-5" />
  };

return (
    <div className={cn(
      "pointer-events-auto flex w-full max-w-sm items-center space-x-3 rounded-lg bg-[var(--card)] p-4 shadow-lg ring-1 ring-[var(--border)] transform transition-all animate-in slide-in-from-right-5",
    )}>
{icons[toast.type || 'info']}
      <div className="flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)]">{toast.title}</p>
        {toast.message && <p className="text-sm text-[var(--muted)]">{toast.message}</p>}
      </div>
      <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--text-primary)]">
        <X size={16} />
      </button>
    </div>
  );
}
