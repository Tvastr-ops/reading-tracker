'use client';

import { useEffect } from 'react';

export interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className="toast">
      <span>{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          className="toast-action"
          onClick={() => { toast.onAction?.(); onDismiss(); }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button className="toast-close" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
