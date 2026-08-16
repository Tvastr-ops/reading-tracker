'use client';

import CommandPalette from '@/components/CommandPalette';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryFiltersContext } from '@/contexts/LibraryFiltersContext';
import { useLibraryUI } from '@/contexts/LibraryUIContext';

export function CommandPaletteModal() {
  const { books, toggleTheme } = useLibraryData();
  const { viewMode, toggleViewMode, setStatusFilter } = useLibraryFiltersContext();
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setInspectedBook,
    setEditing,
    onAddEntry,
  } = useLibraryUI();

  return (
    <CommandPalette
      isOpen={isCommandPaletteOpen}
      onClose={() => setIsCommandPaletteOpen(false)}
      books={books}
      onSelectBook={(b) => {
        setInspectedBook(b);
        setEditing(b);
      }}
      onAddEntry={onAddEntry}
      onToggleView={toggleViewMode}
      currentView={viewMode}
      onFilterStatus={(s) => setStatusFilter(s || 'All')}
      onToggleTheme={toggleTheme}
      onExport={() => {
        window.location.href = '/api/export';
      }}
    />
  );
}
