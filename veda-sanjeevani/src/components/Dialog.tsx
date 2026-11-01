import { useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
export function Dialog({ open, onClose, title, children, className = '' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open, onClose);
  if (!open) return null;
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={ref} className={`dialog ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><button className="icon-btn dialog-close" onClick={onClose} aria-label={`Close ${title}`}><X size={21} /></button>{children}</div></div>;
}
