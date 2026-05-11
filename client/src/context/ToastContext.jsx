import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = ++idCounter;
      const next = { id, type: 'info', duration: 3500, ...toast };
      setToasts((t) => [...t, next]);
      if (next.duration > 0) {
        setTimeout(() => remove(id), next.duration);
      }
      return id;
    },
    [remove]
  );

  const toast = {
    success: (message) => push({ type: 'success', message }),
    error: (message) => push({ type: 'error', message, duration: 5000 }),
    info: (message) => push({ type: 'info', message }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : t.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-white'
            }`}
            role="alert"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
