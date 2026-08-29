'use client';

import {
  BarChart3,
  BookOpen,
  Check,
  History,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryUI } from '@/contexts/LibraryUIContext';
import type { ThemePalette } from '@/hooks/useLibrary';

export interface PaletteOption {
  id: ThemePalette;
  name: string;
  subtitle: string;
  lightBg: string;
  darkBg: string;
  accent: string;
}

export const PALETTES: PaletteOption[] = [
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

export function AppNavbar() {
  const pathname = usePathname();
  const { themeMode, themePalette, setThemePalette, setThemeMode } = useLibraryData();
  const { onAddEntry, setIsCommandPaletteOpen } = useLibraryUI();

  const activePalette = PALETTES.find((p) => p.id === themePalette) || PALETTES[0];

  const navTabs = [
    {
      href: '/',
      label: 'LIBRARY',
      icon: BookOpen,
      active: pathname === '/' || pathname.startsWith('/books'),
    },
    {
      href: '/analytics',
      label: 'ANALYTICS',
      icon: BarChart3,
      active: pathname.startsWith('/analytics'),
    },
    { href: '/journal', label: 'JOURNAL', icon: History, active: pathname.startsWith('/journal') },
    {
      href: '/settings',
      label: 'SETTINGS',
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  return (
    <header className="mb-6 flex flex-col gap-4 border-b-2 border-border/80 pb-4 md:flex-row md:items-center md:justify-between">
      {/* Brand / Logo */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-transform active:scale-95"
        >
          <div className="flex h-9 w-9 items-center justify-center border-2 border-border bg-accent-bg text-accent-text shadow-[2px_2px_0px_var(--border)] transition-transform group-hover:translate-x-[-1px] group-hover:translate-y-[-1px]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="block font-anton text-lg tracking-wider text-text sm:text-xl">
              PAPERBACK
            </span>
            <span className="block font-hanken text-[10px] font-black uppercase tracking-widest text-text-muted">
              Reader Ledger
            </span>
          </div>
        </Link>

        {/* Mobile Header Quick Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 shadow-[1.5px_1.5px_0px_var(--border)]"
            onClick={() => setIsCommandPaletteOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1 px-2.5 text-xs font-black uppercase shadow-[1.5px_1.5px_0px_var(--border)]"
            onClick={onAddEntry}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </Button>
        </div>
      </div>

      {/* Desktop 4-Tab Switcher Strip */}
      <nav className="hidden items-center gap-1.5 rounded-lg border-2 border-border/80 bg-surface/60 p-1.5 shadow-[2px_2px_0px_var(--border)] md:flex">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-black tracking-wider transition-all ${
                tab.active
                  ? 'border-1.5 border-border bg-accent-bg text-accent-text shadow-[2px_2px_0px_var(--border)]'
                  : 'text-text-muted hover:border-1.5 hover:border-border/40 hover:bg-surface hover:text-text'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Right Companion Actions */}
      <div className="hidden items-center gap-2 md:flex">
        {/* Global Search Cmd+K */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 px-3 text-xs text-text-muted shadow-[1.5px_1.5px_0px_var(--border)] hover:text-text"
          onClick={() => setIsCommandPaletteOpen(true)}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="ml-1 inline-flex items-center rounded border border-border/80 bg-surface-container px-1 py-0.5 text-[10px] font-semibold text-text-muted">
            ⌘K
          </kbd>
        </Button>

        {/* Quick Add Book */}
        <Button
          size="sm"
          className="h-9 gap-1.5 px-3 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_var(--border)] active:translate-x-[1px] active:translate-y-[1px]"
          onClick={onAddEntry}
        >
          <Plus className="h-4 w-4" />
          <span>Add Book</span>
        </Button>

        {/* Theme Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 px-2.5 shadow-[1.5px_1.5px_0px_var(--border)]"
              title="Theme Settings"
              aria-label="Theme Settings"
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-border shrink-0"
                style={{ backgroundColor: activePalette.accent }}
              />
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
                    className={`flex w-full items-center justify-between rounded-md border p-2 text-left transition-all ${
                      isSelected
                        ? 'border-accent-bg bg-accent-bg/10 shadow-xs'
                        : 'border-border/60 hover:border-border hover:bg-surface/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-4 w-4 rounded-full border border-border shrink-0 shadow-xs"
                        style={{ backgroundColor: palette.accent }}
                      />
                      <div>
                        <div className="font-semibold text-text text-xs">{palette.name}</div>
                        <div className="text-[10px] text-text-muted leading-tight">
                          {palette.subtitle}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-accent-bg shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
