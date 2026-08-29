'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Download, Grid, Moon, Plus, Search, Table as TableIcon, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Book } from '@/lib/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddEntry: () => void;
  onToggleView: (view: 'grid' | 'table') => void;
  currentView: 'grid' | 'table';
  onFilterStatus?: (status: string | null) => void;
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
  onToggleTheme,
  onExport,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modKey, setModKey] = useState('Ctrl+K');

  useEffect(() => {
    if (typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)) {
      setModKey('⌘K');
    }
  }, []);

  // Reset search when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter books by title, author, or tags
  const filteredBooks = useMemo(() => {
    if (!query.trim()) return books.slice(0, 6);
    const q = query.toLowerCase().trim();
    return books
      .filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.genre_tags?.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [books, query]);

  // Built-in System Command Actions
  const systemActions = useMemo(() => {
    const actions = [
      {
        id: 'action-add',
        title: 'Add New Book Entry',
        subtitle: 'Record a new book or start a reading cycle',
        icon: <Plus className="h-4 w-4 text-emerald-500" />,
        run: () => {
          onAddEntry();
          onClose();
        },
      },
      {
        id: 'action-view',
        title: `Switch to ${currentView === 'grid' ? 'Table' : 'Grid'} View`,
        subtitle: `Toggle catalog layout to ${currentView === 'grid' ? 'dense tabular spreadsheet' : 'visual cover grid'}`,
        icon:
          currentView === 'grid' ? (
            <TableIcon className="h-4 w-4 text-sky-500" />
          ) : (
            <Grid className="h-4 w-4 text-amber-500" />
          ),
        run: () => {
          onToggleView(currentView === 'grid' ? 'table' : 'grid');
          onClose();
        },
      },
      {
        id: 'action-theme',
        title: 'Toggle Dark / Light Theme',
        subtitle: 'Switch between light paper and dark ink aesthetics',
        icon: <Moon className="h-4 w-4 text-purple-500" />,
        run: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        id: 'action-export',
        title: 'Export Library Backup (JSON)',
        subtitle: 'Download complete backup of library and reading history',
        icon: <Download className="h-4 w-4 text-accent-color" />,
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

  // Auto-scroll selected item into view inside palette list
  useEffect(() => {
    if (!isOpen) return;
    const el = document.getElementById(`cmd-item-${selectedIndex}`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, isOpen]);

  // Window-level keydown handler for ArrowDown, ArrowUp, Enter, and Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (totalItems > 0 ? (prev + 1) % totalItems : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0));
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
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isOpen, selectedIndex, totalItems, filteredBooks, systemActions, onSelectBook, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 backdrop-blur-md bg-black/60 transition-opacity">
        {/* Backdrop click to close */}
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-xl overflow-hidden border-2 border-border bg-card-bg shadow-[6px_6px_0px_var(--border)] z-10"
        >
          {/* Top Search Bar */}
          <div className="relative flex items-center border-b-2 border-border px-4 py-3.5 bg-surface/60">
            <Search className="h-4 w-4 shrink-0 text-accent-color mr-3" />
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent text-sm sm:text-base font-semibold text-text placeholder:text-text-muted/60 outline-none"
              placeholder="Search books, authors, genres, or actions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-text-muted hover:text-text hover:bg-surface border border-border/40 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold text-text-muted shadow-[1px_1px_0px_var(--border)]">
                {modKey}
              </kbd>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-[360px] overflow-y-auto p-2 space-y-3">
            {/* Book Results */}
            {filteredBooks.length > 0 && (
              <div>
                <div className="px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-text-muted uppercase">
                  BOOKS ({filteredBooks.length})
                </div>
                <div className="space-y-1 mt-0.5">
                  {filteredBooks.map((b, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={b.id}
                        id={`cmd-item-${idx}`}
                        onClick={() => {
                          onSelectBook(b);
                          onClose();
                        }}
                        onMouseMove={() => {
                          if (selectedIndex !== idx) setSelectedIndex(idx);
                        }}
                        className={`flex items-center gap-3 px-3 py-2 border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-border bg-accent-color text-accent-text shadow-[2px_2px_0px_var(--border)]'
                            : 'border-transparent hover:border-border hover:bg-surface/80 text-text'
                        }`}
                      >
                        {/* Cover Thumbnail */}
                        <div
                          className={`h-9 w-6 shrink-0 border overflow-hidden flex items-center justify-center ${
                            isSelected
                              ? 'border-accent-text/40 bg-black/20'
                              : 'border-border bg-surface'
                          }`}
                        >
                          {b.cover_url ? (
                            <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <BookOpen
                              className={`h-3.5 w-3.5 ${
                                isSelected ? 'text-accent-text' : 'text-text-muted opacity-50'
                              }`}
                            />
                          )}
                        </div>

                        {/* Title & Info */}
                        <div className="min-w-0 flex-1">
                          <h5 className="font-anton text-sm tracking-wide line-clamp-1">
                            {b.title}
                          </h5>
                          <p
                            className={`font-hanken text-[11px] line-clamp-1 ${
                              isSelected ? 'text-accent-text/80' : 'text-text-muted'
                            }`}
                          >
                            {b.author || 'Unknown Author'} {b.type ? `· ${b.type}` : ''}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] font-mono font-bold uppercase px-2 py-0.5 ${
                            isSelected
                              ? 'border-accent-text/40 bg-black/10 text-accent-text'
                              : 'border-border bg-surface text-text-muted'
                          }`}
                        >
                          {b.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick System Commands */}
            {systemActions.length > 0 && (
              <div>
                <div className="px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-text-muted uppercase">
                  ACTIONS
                </div>
                <div className="space-y-1 mt-0.5">
                  {systemActions.map((action, idx) => {
                    const itemIndex = filteredBooks.length + idx;
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <div
                        key={action.id}
                        id={`cmd-item-${itemIndex}`}
                        onClick={() => action.run()}
                        onMouseMove={() => {
                          if (selectedIndex !== itemIndex) setSelectedIndex(itemIndex);
                        }}
                        className={`flex items-center gap-3 px-3 py-2 border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-border bg-accent-color text-accent-text shadow-[2px_2px_0px_var(--border)]'
                            : 'border-transparent hover:border-border hover:bg-surface/80 text-text'
                        }`}
                      >
                        <div
                          className={`p-1.5 border shrink-0 ${
                            isSelected
                              ? 'border-accent-text/40 bg-black/10'
                              : 'border-border bg-surface'
                          }`}
                        >
                          {action.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="font-anton text-sm tracking-wide">{action.title}</h5>
                          <p
                            className={`font-hanken text-[11px] ${
                              isSelected ? 'text-accent-text/80' : 'text-text-muted'
                            }`}
                          >
                            {action.subtitle}
                          </p>
                        </div>
                        <span
                          className={`font-mono text-[10px] ${
                            isSelected ? 'text-accent-text/90 font-bold' : 'text-text-faint'
                          }`}
                        >
                          ↵ OPEN
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Results */}
            {totalItems === 0 && (
              <div className="py-8 text-center text-text-muted">
                <Search className="h-6 w-6 mx-auto mb-2 opacity-30 text-accent-color" />
                <p className="font-anton text-sm tracking-wide text-text">No matches found</p>
                <p className="font-hanken text-xs text-text-muted mt-0.5">
                  Try searching by different keywords or title
                </p>
              </div>
            )}
          </div>

          {/* Minimalist Bottom Footer */}
          <div className="flex items-center justify-between border-t-2 border-border px-3.5 py-2 bg-surface/50 font-mono text-[10px] text-text-muted font-bold">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="border border-border bg-card-bg px-1 py-0.5">↑↓</kbd>
                <span>NAVIGATE</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="border border-border bg-card-bg px-1 py-0.5">↵</kbd>
                <span>SELECT</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="border border-border bg-card-bg px-1 py-0.5">ESC</kbd>
                <span>CLOSE</span>
              </span>
            </div>
            <span className="hidden sm:inline">SPOTLIGHT</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
