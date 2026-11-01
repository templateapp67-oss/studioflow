import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Check, CircleAlert, Info, X } from 'lucide-react';
import { ToastContext, type ToastItem, type ToastKind } from '../hooks/adminToastContext';
export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random(); setItems((current) => [...current, { id, kind, message }].slice(-4));
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 5500);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return <ToastContext.Provider value={value}>{children}<div className="admin-toast-region" aria-live="polite" aria-relevant="additions text">{items.map((item) => <div className={`admin-toast toast-${item.kind}`} role={item.kind === 'error' ? 'alert' : 'status'} key={item.id}>{item.kind === 'success' ? <Check size={18} /> : item.kind === 'error' ? <CircleAlert size={18} /> : <Info size={18} />}<span>{item.message}</span><button onClick={() => setItems((current) => current.filter((toast) => toast.id !== item.id))} aria-label="Dismiss notification"><X size={16} /></button></div>)}</div></ToastContext.Provider>;
}
