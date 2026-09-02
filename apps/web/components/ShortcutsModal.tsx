'use client';

import { Keyboard } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUIStore } from '@/stores/useUIStore';

export function ShortcutsModal() {
  const isOpen = useUIStore((s) => s.isShortcutsOpen);
  const setIsOpen = useUIStore((s) => s.setIsShortcutsOpen);
  const [modKey, setModKey] = useState('Ctrl');

  useEffect(() => {
    if (typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)) {
      setModKey('⌘');
    }
  }, []);

  const shortcuts = [
    {
      category: 'Global',
      items: [
        { keys: [`${modKey}`, 'K'], description: 'Open command palette' },
        { keys: ['/'], description: 'Focus search bar' },
        { keys: ['?'], description: 'Toggle shortcuts cheat sheet' },
        { keys: ['Esc'], description: 'Clear selection / close dialog' },
      ],
    },
    {
      category: 'Navigation & Browsing',
      items: [
        { keys: ['↑ ↓ ← →'], description: 'Navigate library grid' },
        { keys: ['H', 'J', 'K', 'L'], description: 'Vim spatial navigation' },
        { keys: ['Enter'], description: 'Inspect focused book' },
      ],
    },
    {
      category: 'Book Actions',
      items: [
        { keys: ['N'], description: 'Add new book entry' },
        { keys: ['E'], description: 'Edit selected book' },
        { keys: ['F'], description: 'Toggle favorite (❤️)' },
        { keys: ['X', 'Space'], description: 'Toggle multi-selection' },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md border-2 border-border bg-card-bg p-5 shadow-[4px_4px_0px_var(--border)] sm:rounded-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 font-serif text-lg font-bold text-text">
            <Keyboard className="h-5 w-5 text-accent-text" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs text-text-muted">
            Navigate and manage your library with rapid tactile keystrokes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {shortcuts.map((group) => (
            <div key={group.category} className="space-y-2">
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-muted">
                {group.category}
              </h4>
              <div className="divide-y divide-border/20 rounded border border-border bg-bg/50 px-3">
                {group.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between py-2 text-xs"
                  >
                    <span className="text-text">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-surface px-1.5 font-mono text-[11px] font-semibold text-text shadow-[1px_1px_0px_var(--border)]"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
