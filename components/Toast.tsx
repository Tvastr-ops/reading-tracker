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
    <div className="fixed bottom-[var(--space-5)] left-1/2 -translate-x-1/2 bg-accent-bg text-accent-text py-[var(--space-3)] pr-[var(--space-3)] pl-[var(--space-4)] rounded-[var(--radius-md)] flex items-center gap-[var(--space-3)] text-[13px] shadow-[var(--shadow-modal)] z-[100] animate-[toastIn_var(--duration-base)_ease_both] max-w-[calc(100vw-32px)]">
      <span>{toast.message}</span>
      {toast.actionLabel && toast.onAction && (
        <button
          className="bg-transparent border border-accent-text text-accent-text rounded-[var(--radius-sm)] py-[var(--space-1)] px-[var(--space-3)] text-[12px] font-semibold cursor-pointer whitespace-nowrap"
          onClick={() => { toast.onAction?.(); onDismiss(); }}
        >
          {toast.actionLabel}
        </button>
      )}
      <button className="bg-transparent border-none text-accent-text opacity-70 cursor-pointer text-[16px] leading-none py-0 px-[var(--space-1)]" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}
