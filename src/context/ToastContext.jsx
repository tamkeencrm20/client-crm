import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: { ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-900', Icon: CheckCircle2, icon: 'text-emerald-600' },
  error: { ring: 'ring-rose-200', bg: 'bg-rose-50', text: 'text-rose-900', Icon: AlertCircle, icon: 'text-rose-600' },
  info: { ring: 'ring-brand-200', bg: 'bg-brand-50', text: 'text-brand-900', Icon: Info, icon: 'text-brand-600' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (message, type = 'info', ttl = 4000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:bottom-4 sm:end-4 sm:items-end">
        {toasts.map((t) => {
          const s = STYLES[t.type] ?? STYLES.info;
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-pop ring-1 animate-slide-in ${s.bg} ${s.ring} ${s.text}`}
            >
              <s.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.icon}`} />
              <p className="flex-1 text-sm font-medium leading-relaxed">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-0.5 opacity-60 transition hover:opacity-100"
                aria-label="close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
