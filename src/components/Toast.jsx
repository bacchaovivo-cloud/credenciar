import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 🔔 ZENITH TOAST SYSTEM (Bento Box UI)
 * Premium notification & confirmation system
 */

const ToastContext = createContext(null);

const ICONS = {
  success: 'bi-check-lg',
  error: 'bi-x-lg',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-lg',
};

const COLORS = {
  success: { border: 'border-emerald-500/30', text: 'text-emerald-400', icon: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  error: { border: 'border-red-500/30', text: 'text-red-400', icon: 'bg-red-500/10 text-red-500 border-red-500/20' },
  warning: { border: 'border-amber-500/30', text: 'text-amber-400', icon: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  info: { border: 'border-blue-500/30', text: 'text-blue-400', icon: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex items-start gap-3 p-3 bg-[#1a2333] border ${color.border} rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] max-w-sm w-full cursor-pointer group`}
      onClick={() => onDismiss(toast.id)}
    >
      <div className={`w-8 h-8 rounded border flex items-center justify-center text-sm flex-shrink-0 ${color.icon}`}>
        <i className={`bi ${ICONS[toast.type] || ICONS.info}`}></i>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[11px] font-bold text-white leading-snug truncate uppercase tracking-wide">{toast.message}</p>
        {toast.description && (
          <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest truncate">{toast.description}</p>
        )}
      </div>
      <div className="text-slate-500 group-hover:text-white transition-colors text-[10px] p-1 flex-shrink-0">
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
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0f1522]/90 backdrop-blur-sm"
    >
      <div className="absolute inset-0" onClick={() => onResolve(false)} />
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative bg-[#1a2333] rounded-xl shadow-2xl border border-[#2a374a] p-6 max-w-sm w-full"
      >
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl mx-auto mb-5 border ${color.icon}`}>
          <i className={`bi ${confirm.danger ? 'bi-exclamation-triangle-fill' : 'bi-question-lg'}`}></i>
        </div>

        {confirm.title && (
          <h3 className="text-sm font-bold text-white text-center mb-2 uppercase tracking-widest">
            {confirm.title}
          </h3>
        )}

        <p className="text-[11px] text-slate-400 text-center leading-relaxed mb-6 font-bold uppercase tracking-wider">
          {confirm.message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => onResolve(false)}
            className="flex-1 py-2.5 px-4 rounded-lg border border-[#2a374a] bg-[#0f1522] text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-[#2a374a] hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onResolve(true)}
            className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${confirm.danger ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {confirm.danger && <i className="bi bi-trash3-fill text-xs"></i>}
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
  });

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
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2 pointer-events-none">
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
 * * Usage:
 * const { toast, confirm } = useToast();
 * toast.success('Salvo!');
 * toast.error('Falha ao conectar');
 * const ok = await confirm('Deseja excluir?', { danger: true, confirmText: 'Excluir' });
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}