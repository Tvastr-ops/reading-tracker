'use client';

import { ArrowUp, Keyboard } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';

export function AppFooter() {
  const setIsShortcutsOpen = useUIStore((s) => s.setIsShortcutsOpen);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-16 border-t border-border/40 pt-6 pb-6 text-xs text-text-muted">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        {/* Left: Brand & Colophon */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <span className="font-serif font-bold tracking-tight text-text">Paperback</span>
          <span className="inline-flex items-center rounded border border-border/60 bg-surface/50 px-1.5 py-0.5 font-mono font-semibold text-[10px] text-text-muted">
            v2.7.0
          </span>
          <span className="hidden text-border sm:inline">•</span>
          <span className="text-text-muted/80">Personal Reading Archive</span>
        </div>

        {/* Right: Actions & Links */}
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/Tvastr-ops/reading-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-text"
          >
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>GitHub</span>
            <span className="text-[10px] opacity-70">↗</span>
          </a>

          <span className="h-3 w-[1px] bg-border/40" />

          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-text"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span>Shortcuts</span>
          </button>

          <span className="h-3 w-[1px] bg-border/40" />

          <button
            type="button"
            onClick={scrollToTop}
            className="flex cursor-pointer items-center gap-1 transition-colors hover:text-text"
            aria-label="Scroll back to top"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>Top</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
