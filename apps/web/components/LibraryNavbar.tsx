'use client';

import { Download, LogOut, Moon, Sun, Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useLibraryData } from '@/contexts/LibraryDataContext';

export function LibraryNavbar() {
  const { theme, toggleTheme, handleImportFile, importing, logout } = useLibraryData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-bold font-serif text-2xl text-text tracking-tight sm:text-3xl">
          Reading Tracker
        </h1>
        <p className="mt-1 line-clamp-1 text-text-muted text-xs sm:line-clamp-none sm:text-sm">
          Web novels, light novels, literature, essays, short stories, and fanfiction.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-border/60 border-t pt-3 sm:w-auto sm:border-0 sm:pt-0">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          title="Toggle dark mode"
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </Button>

        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            <span>{importing ? '...' : 'Import'}</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            asChild
            className="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
          >
            <a href="/api/export">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              <span>Export</span>
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-text-muted hover:text-text sm:h-9 sm:w-9"
            onClick={logout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export default LibraryNavbar;
