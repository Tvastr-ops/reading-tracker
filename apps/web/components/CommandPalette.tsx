'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Grid,
  Moon,
  Plus,
  Search,
  Sun,
  Table as TableIcon,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Book } from '@/lib/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddEntry: () => void;
  onToggleView: (view: 'grid' | 'table') => void;
  currentView: 'grid' | 'table';
  onFilterStatus: (status: string | null) => void;
  onToggleTheme: () => void;
  onExport: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  books,
  onSelectBook,
  onAddEntry,
  onToggleView,
  currentView,
  onFilterStatus,
  onToggleTheme,
  onExport,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global hotkey listener: Ctrl+K, Cmd+K, or "/" when not typing in an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'k' || e.key === 'K') &&
        (e.metaKey || e.ctrlKey)
      ) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset search when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter books by title, author, or tags
  const filteredBooks = useMemo(() => {
    if (!query.trim()) return books.slice(0, 5);
    const q = query.toLowerCase().trim();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.genre_tags && b.genre_tags.toLowerCase().includes(q)),
    );
  }, [books, query]);

  // Built-in System Command Actions
  const systemActions = useMemo(() => {
    const actions = [
      {
        id: 'action-add',
        title: 'Add New Book Entry',
        subtitle: 'Create a new reading log entry',
        icon: <Plus className="h-4 w-4 text-emerald-400" />,
        run: () => {
          onAddEntry();
          onClose();
        },
      },
      {
        id: 'action-view',
        title: `Switch to ${currentView === 'grid' ? 'Table' : 'Grid'} View`,
        subtitle: 'Change display layout',
        icon:
          currentView === 'grid' ? (
            <TableIcon className="h-4 w-4 text-sky-400" />
          ) : (
            <Grid className="h-4 w-4 text-amber-400" />
          ),
        run: () => {
          onToggleView(currentView === 'grid' ? 'table' : 'grid');
          onClose();
        },
      },
      {
        id: 'action-theme',
        title: 'Toggle Dark / Light Theme',
        subtitle: 'Switch application color mode',
        icon: <Moon className="h-4 w-4 text-purple-400" />,
        run: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        id: 'action-export',
        title: 'Export Library Backup (JSON)',
        subtitle: 'Download backup of all reading logs',
        icon: <Download className="h-4 w-4 text-amber-400" />,
        run: () => {
          onExport();
          onClose();
        },
      },
    ];

    if (!query.trim()) return actions;
    const q = query.toLowerCase().trim();
    return actions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q),
    );
  }, [query, currentView, onAddEntry, onToggleView, onToggleTheme, onExport, onClose]);

  // Combine items for keyboard selection
  const totalItems = filteredBooks.length + systemActions.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < filteredBooks.length) {
        const book = filteredBooks[selectedIndex];
        if (book) {
          onSelectBook(book);
          onClose();
        }
      } else {
        const actionIdx = selectedIndex - filteredBooks.length;
        const action = systemActions[actionIdx];
        if (action) action.run();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 backdrop-blur-md bg-black/60 transition-opacity">
        {/* Backdrop click to close */}
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card-bg shadow-[0_24px_64px_rgba(0,0,0,0.6)] z-10"
        >
          {/* Top Search Header */}
          <div className="relative flex items-center border-b border-border px-4 py-3 bg-surface/50">
            <Search className="h-5 w-5 shrink-0 text-text-muted mr-3" />
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent text-sm sm:text-base text-text placeholder:text-text-faint outline-none font-medium"
              placeholder="Search books, author, tags, or type a command... (Press Esc to exit)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-text-muted hover:text-text rounded-full hover:bg-surface transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="ml-2 hidden sm:inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-muted shadow-2xs">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-3">
            {/* Book Results */}
            {filteredBooks.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-text-muted uppercase">
                  Books ({filteredBooks.length})
                </div>
                <div className="space-y-1 mt-1">
                  {filteredBooks.map((b, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          onSelectBook(b);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-accent-color/15 border border-accent-color/40 text-text'
                            : 'hover:bg-surface/80 text-text'
                        }`}
                      >
                        {/* Cover Thumbnail */}
                        <div className="h-9 w-6 shrink-0 rounded overflow-hidden border border-border bg-surface flex items-center justify-center">
                          {b.cover_url ? (
                            <img
                              src={b.cover_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <BookOpen className="h-3.5 w-3.5 text-text-muted opacity-50" />
                          )}
                        </div>

                        {/* Title & Info */}
                        <div className="min-w-0 flex-1">
                          <h5 className="font-semibold text-xs sm:text-sm line-clamp-1 leading-snug">
                            {b.title}
                          </h5>
                          <p className="text-[11px] text-text-muted line-clamp-1">
                            {b.author || 'Unknown Author'} {b.type ? `· ${b.type}` : ''}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-surface text-text-muted">
                          {b.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick System Commands */}
            {systemActions.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-text-muted uppercase">
                  Quick Actions
                </div>
                <div className="space-y-1 mt-1">
                  {systemActions.map((action, idx) => {
                    const itemIndex = filteredBooks.length + idx;
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <div
                        key={action.id}
                        onClick={() => action.run()}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-accent-color/15 border border-accent-color/40 text-text'
                            : 'hover:bg-surface/80 text-text'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-surface border border-border shrink-0">
                          {action.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-semibold text-xs sm:text-sm leading-snug">
                            {action.title}
                          </h5>
                          <p className="text-[11px] text-text-muted">{action.subtitle}</p>
                        </div>
                        <span className="text-[10px] font-mono text-text-faint opacity-60">
                          ↵ Select
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Results */}
            {totalItems === 0 && (
              <div className="py-10 text-center text-text-muted">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No matching books or commands found</p>
              </div>
            )}
          </div>

          {/* Footer Shortcuts Hint */}
          <div className="border-t border-border bg-surface/50 px-4 py-2 flex items-center justify-between text-[11px] text-text-muted">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>{' '}
                Navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px]">
                  ↵
                </kbd>{' '}
                Select
              </span>
            </div>
            <span className="text-text-faint font-medium">Desktop Power Search</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
