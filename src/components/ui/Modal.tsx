import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { Button, IconButton } from './Button';
import { cn } from '../../utils/cn';

function useFocusTrap(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    const first = focusables().find((n) => n.dataset.autofocus !== undefined) ?? focusables()[0];
    setTimeout(() => first?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const a = f[0], b = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
        else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

export function Modal({ open, onClose, title, children, footer, size = 'md', description }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; description?: ReactNode;
}) {
  const ref = useFocusTrap(open, onClose);
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
          <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : undefined}
            className={cn('relative w-full panel bg-surface shadow-2xl flex flex-col max-h-[92vh] rounded-b-none sm:rounded-lg', w)}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
              <div>
                <h2 className="text-[15px] font-semibold">{title}</h2>
                {description && <p className="text-xs text-mute mt-1">{description}</p>}
              </div>
              <IconButton label="Close dialog" onClick={onClose}><X className="h-4 w-4" /></IconButton>
            </div>
            <div className="px-5 py-4 overflow-y-auto scroll-thin">{children}</div>
            {footer && <div className="px-5 py-3 border-t border-line flex flex-wrap justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({ open, onCancel, onConfirm, title, body, confirmLabel = 'Confirm', tone = 'primary', loading, children }: {
  open: boolean; onCancel: () => void; onConfirm: () => void; title: string; body?: ReactNode; confirmLabel?: string; tone?: 'primary' | 'danger'; loading?: boolean; children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <AlertTriangle className={cn('h-5 w-5 shrink-0 mt-0.5', tone === 'danger' ? 'text-red' : 'text-amber')} aria-hidden />
        <div className="text-sm text-mute space-y-3 min-w-0 flex-1">
          {body && <div>{body}</div>}
          {children}
        </div>
      </div>
    </Modal>
  );
}

export function Drawer({ open, onClose, title, children, footer, subtitle }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; subtitle?: ReactNode }) {
  const ref = useFocusTrap(open, onClose);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[900]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
          <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
          <motion.aside
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Details'}
            className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-surface border-l border-line flex flex-col"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-line">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold truncate">{title}</h2>
                {subtitle && <div className="text-xs text-mute mt-1">{subtitle}</div>}
              </div>
              <IconButton label="Close panel" onClick={onClose}><X className="h-4 w-4" /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto scroll-thin px-5 py-4">{children}</div>
            {footer && <div className="px-5 py-3 border-t border-line flex flex-wrap gap-2 justify-end">{footer}</div>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
