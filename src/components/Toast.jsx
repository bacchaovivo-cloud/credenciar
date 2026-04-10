import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🔔 ZENITH TOAST SYSTEM: Premium notification & confirmation system
 * Replaces all native alert() and window.confirm() with a polished UI.
 */

const ToastContext = createContext(null);

const ICONS = {
  success: 'bi-check-circle-fill',
  error: 'bi-x-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

const COLORS = {
  success: { bg: 'bg-emerald-500', ring: 'ring-emerald-500/20', text: 'text-emerald-500', glow: 'shadow-emerald-500/20' },
  error: { bg: 'bg-red-500', ring: 'ring-red-500/20', text: 'text-red-500', glow: 'shadow-red-500/20' },
  warning: { bg: 'bg-amber-500', ring: 'ring-amber-500/20', text: 'text-amber-500', glow: 'shadow-amber-500/20' },
  info: { bg: 'bg-sky-500', ring: 'ring-sky-500/20', text: 'text-sky-500', glow: 'shadow-sky-500/20' },
};

// ─── Toast Item ───────────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const color = COLORS[toast.type] || COLORS.info;

  useEffect(() => {
    if (toast.duration !== Infinity) {
      const timer = setTimeout(() => onDismiss(toast.id), toast.duration || 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.8 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`flex items-center gap-4 px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl ${color.glow} ring-1 ${color.ring} max-w-md w-full cursor-pointer group`}
      onClick={() => onDismiss(toast.id)}
    >
      <div className={`w-10 h-10 ${color.bg} rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0 shadow-md`}>
        <i className={`bi ${ICONS[toast.type] || ICONS.info}`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 dark:text-white leading-snug truncate">{toast.message}</p>
        {toast.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{toast.description}</p>
        )}
      </div>
      <div className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition text-xs flex-shrink-0">
        <i className="bi bi-x-lg"></i>
      </div>
    </motion.div>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────
function ConfirmDialog({ confirm, onResolve }) {
  const color = confirm.danger ? COLORS.error : COLORS.info;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onResolve(false)} />
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-8 max-w-md w-full"
      >
        <div className={`w-16 h-16 ${color.bg} rounded-2xl flex items-center justify-center text-white text-3xl mx-auto mb-6 shadow-lg ${color.glow}`}>
          <i className={`bi ${confirm.danger ? 'bi-exclamation-triangle-fill' : 'bi-question-circle-fill'}`}></i>
        </div>

        {confirm.title && (
          <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2 uppercase tracking-tight">
            {confirm.title}
          </h3>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-300 text-center leading-relaxed mb-8 font-medium">
          {confirm.message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => onResolve(false)}
            className="flex-1 py-3.5 px-6 rounded-2xl border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm uppercase tracking-wide hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={() => onResolve(true)}
            className={`flex-1 py-3.5 px-6 rounded-2xl ${confirm.danger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'} text-white font-bold text-sm uppercase tracking-wide shadow-lg transition-all active:scale-95`}
          >
            {confirm.confirmText || 'Confirmar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Provider ──────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const resolveRef = useRef(null);
  const idCounter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, options = {}) => {
    const id = ++idCounter.current;
    const newToast = {
      id,
      message,
      type: options.type || 'info',
      description: options.description || null,
      duration: options.duration || 4000,
    };
    setToasts(prev => [...prev.slice(-4), newToast]); // max 5 simultaneous
    return id;
  }, []);

  // Convenience methods
  toast.success = (msg, opts) => toast(msg, { ...opts, type: 'success' });
  toast.error = (msg, opts) => toast(msg, { ...opts, type: 'error' });
  toast.warning = (msg, opts) => toast(msg, { ...opts, type: 'warning' });
  toast.info = (msg, opts) => toast(msg, { ...opts, type: 'info' });

  const showConfirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirm({
        message,
        title: options.title || null,
        danger: options.danger || false,
        confirmText: options.confirmText || 'Confirmar',
      });
    });
  }, []);

  const handleResolve = useCallback((value) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    setConfirm(null);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, confirm: showConfirm, dismiss }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm overlay */}
      <AnimatePresence>
        {confirm && <ConfirmDialog confirm={confirm} onResolve={handleResolve} />}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

/**
 * Hook to use the toast & confirm system.
 * 
 * Usage:
 *   const { toast, confirm } = useToast();
 *   toast.success('Salvo!');
 *   toast.error('Falha ao conectar');
 *   const ok = await confirm('Deseja excluir?', { danger: true, confirmText: 'Excluir' });
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
