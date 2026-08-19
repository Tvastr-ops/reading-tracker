'use client';

import {
  Check,
  Download,
  Grid,
  LogOut,
  Moon,
  Sun,
  Upload,
} from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import type { ThemeMode, ThemePalette } from '@/hooks/useLibrary';

interface PaletteOption {
  id: ThemePalette;
  name: string;
  subtitle: string;
  lightBg: string;
  darkBg: string;
  accent: string;
}

const PALETTES: PaletteOption[] = [
  {
    id: 'classic',
    name: 'Classic Editorial',
    subtitle: 'Warm parchment, Newsreader serif & gentle curves',
    lightBg: '#f1ebdd',
    darkBg: '#120e0a',
    accent: '#24201a',
  },
  {
    id: 'paperback',
    name: 'Classic Paperback',
    subtitle: 'Neo-Brutalist cream, Anton headlines & Crimson Red',
    lightBg: '#fcfaed',
    darkBg: '#12130f',
    accent: '#bb0114',
  },
  {
    id: 'matcha',
    name: 'Matcha & Washi',
    subtitle: 'Japanese washi paper & ceremonial matcha jade',
    lightBg: '#f7f6ee',
    darkBg: '#111813',
    accent: '#2d6a4f',
  },
  {
    id: 'nordic',
    name: 'Nordic Night',
    subtitle: 'Arctic glacier paper, midnight slate & fjord cyan',
    lightBg: '#f0f9ff',
    darkBg: '#0c121e',
    accent: '#0284c7',
  },
];

export function LibraryNavbar() {
  const {
    themeMode,
    themePalette,
    paperTexture,
    setThemePalette,
    setThemeMode,
    togglePaperTexture,
    handleImportFile,
    importing,
    logout,
  } = useLibraryData();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePalette = PALETTES.find((p) => p.id === themePalette) || PALETTES[0];

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
              title="Theme settings & palettes"
              aria-label="Theme settings & palettes"
            >
              <span
                className="h-3 w-3 rounded-full border border-border shrink-0"
                style={{ backgroundColor: activePalette.accent }}
              />
              <span className="hidden font-medium sm:inline">{activePalette.name}</span>
              {themeMode === 'dark' ? (
                <Moon className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 p-2">
            <DropdownMenuLabel className="font-semibold text-text-muted text-[10px] tracking-wider uppercase">
              Color Mode
            </DropdownMenuLabel>
            <div className="grid grid-cols-2 gap-1.5 p-1">
              <Button
                variant={themeMode === 'light' ? 'default' : 'outline'}
                size="sm"
                className="h-8 justify-start gap-1.5 text-xs font-normal"
                onClick={() => setThemeMode('light')}
              >
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <span>Light</span>
                {themeMode === 'light' && <Check className="ml-auto h-3.5 w-3.5" />}
              </Button>
              <Button
                variant={themeMode === 'dark' ? 'default' : 'outline'}
                size="sm"
                className="h-8 justify-start gap-1.5 text-xs font-normal"
                onClick={() => setThemeMode('dark')}
              >
                <Moon className="h-3.5 w-3.5 text-amber-400" />
                <span>Dark</span>
                {themeMode === 'dark' && <Check className="ml-auto h-3.5 w-3.5" />}
              </Button>
            </div>

            <DropdownMenuSeparator className="my-1.5" />

            <DropdownMenuLabel className="font-semibold text-text-muted text-[10px] tracking-wider uppercase">
              Aesthetic Palettes
            </DropdownMenuLabel>

            <div className="space-y-1 p-0.5">
              {PALETTES.map((palette) => {
                const isSelected = themePalette === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => setThemePalette(palette.id)}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-surface font-medium text-text ring-1 ring-border'
                        : 'text-text-muted hover:bg-surface/50 hover:text-text'
                    }`}
                  >
                    <div className="flex shrink-0 items-center -space-x-1">
                      <span
                        className="h-4 w-4 rounded-full border border-border shadow-xs"
                        style={{
                          backgroundColor:
                            themeMode === 'dark' ? palette.darkBg : palette.lightBg,
                        }}
                      />
                      <span
                        className="h-4 w-4 rounded-full border border-border shadow-xs"
                        style={{ backgroundColor: palette.accent }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs leading-none">
                        <span className="font-medium text-text">{palette.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-accent-color shrink-0" />}
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] text-text-muted leading-tight">
                        {palette.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <DropdownMenuSeparator className="my-1.5" />

            <DropdownMenuItem
              className="cursor-pointer justify-between text-xs py-1.5"
              onClick={togglePaperTexture}
            >
              <div className="flex items-center gap-2">
                <Grid className="h-3.5 w-3.5 text-text-muted" />
                <span>Ambient Paper Grid</span>
              </div>
              <span
                className={`font-semibold text-[10px] px-1.5 py-0.5 rounded ${
                  paperTexture
                    ? 'bg-accent-color text-accent-text'
                    : 'bg-surface text-text-muted'
                }`}
              >
                {paperTexture ? 'ON' : 'OFF'}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
