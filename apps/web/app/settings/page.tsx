'use client';

import {
  Check,
  ChevronLeft,
  Download,
  FileSpreadsheet,
  FileText,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { PALETTES } from '@/components/AppNavbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLibraryData } from '@/contexts/LibraryDataContext';

export default function SettingsPage() {
  const {
    themePalette,
    themeMode,
    paperTexture,
    setThemePalette,
    setThemeMode,
    togglePaperTexture,
    handleImportFile,
    importing,
    logout,
    books,
  } = useLibraryData();

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Settings Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-text-muted transition-colors hover:text-text md:hidden"
              aria-label="Back to Library"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-anton text-2xl tracking-wider text-text sm:text-3xl">
              SETTINGS & PREFERENCES
            </h1>
          </div>
          <p className="font-hanken text-xs text-text-muted sm:text-sm">
            Customize palettes, tactile textures, export backups, and manage your library data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back to Library</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. Appearance & Theme Palettes */}
      <Card className="surface-t1 border-2 border-border p-4 shadow-[3px_3px_0px_var(--border)] sm:p-6">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-primary" />
            <CardTitle className="font-anton text-lg uppercase tracking-wider text-text">
              Theme & Aesthetic Palettes
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-text-muted">
            Choose your preferred colorway and light/dark mode.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-0">
          {/* Light / Dark Switcher */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-text-muted">
              Color Mode
            </label>
            <div className="grid grid-cols-2 gap-3 sm:w-80">
              <Button
                variant={themeMode === 'light' ? 'default' : 'outline'}
                size="sm"
                className="h-10 justify-center gap-2 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
                onClick={() => setThemeMode('light')}
              >
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Light Paper</span>
                {themeMode === 'light' && <Check className="ml-1 h-3.5 w-3.5" />}
              </Button>
              <Button
                variant={themeMode === 'dark' ? 'default' : 'outline'}
                size="sm"
                className="h-10 justify-center gap-2 text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)]"
                onClick={() => setThemeMode('dark')}
              >
                <Moon className="h-4 w-4 text-amber-400" />
                <span>Dark Ink</span>
                {themeMode === 'dark' && <Check className="ml-1 h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Aesthetic Palette Grid */}
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-text-muted">
              Aesthetic Colorways
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PALETTES.map((p) => {
                const isSelected = themePalette === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setThemePalette(p.id)}
                    className={`flex items-start gap-3 rounded-lg border-2 p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-accent-bg bg-accent-bg/10 shadow-[2.5px_2.5px_0px_var(--border)]'
                        : 'border-border bg-card-bg/60 hover:border-border-soft hover:bg-surface/50'
                    }`}
                  >
                    <span
                      className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-border shadow-xs"
                      style={{ backgroundColor: p.accent }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-anton text-sm tracking-wide text-text">{p.name}</span>
                        {isSelected && (
                          <Badge
                            variant="outline"
                            className="border-border text-[10px] font-black uppercase"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted">{p.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paper Texture Canvas Toggle */}
          <div className="flex flex-col gap-2 rounded-lg border-2 border-border/80 bg-surface/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-text-muted" />
                <span className="font-hanken text-xs font-black uppercase tracking-wider text-text">
                  Tactile Paper Texture
                </span>
              </div>
              <p className="mt-0.5 text-xs text-text-muted">
                Applies a subtle physical paper grain overlay across all backgrounds.
              </p>
            </div>
            <Button
              variant={paperTexture ? 'default' : 'outline'}
              size="sm"
              className="h-8 gap-1.5 self-start text-xs font-bold shadow-[1.5px_1.5px_0px_var(--border)] sm:self-auto"
              onClick={togglePaperTexture}
            >
              {paperTexture ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Data Management & Backups */}
      <Card className="surface-t1 border-2 border-border p-4 shadow-[3px_3px_0px_var(--border)] sm:p-6">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <CardTitle className="font-anton text-lg uppercase tracking-wider text-text">
              Data Management & Backup
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-text-muted">
            Export your entire library or import from backups and external readers.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 p-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Export JSON */}
            <a href="/api/export" download className="block">
              <Button
                variant="outline"
                className="h-auto w-full flex-col items-start gap-1 p-3.5 text-left shadow-[2px_2px_0px_var(--border)]"
              >
                <div className="flex items-center gap-2 font-black text-xs uppercase text-text">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Export JSON</span>
                </div>
                <p className="text-[11px] text-text-muted font-normal">
                  Full library & reading logs backup.
                </p>
              </Button>
            </a>

            {/* Export CSV */}
            <a href="/api/export?format=csv" download className="block">
              <Button
                variant="outline"
                className="h-auto w-full flex-col items-start gap-1 p-3.5 text-left shadow-[2px_2px_0px_var(--border)]"
              >
                <div className="flex items-center gap-2 font-black text-xs uppercase text-text">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span>Export CSV</span>
                </div>
                <p className="text-[11px] text-text-muted font-normal">
                  Spreadsheet compatible format.
                </p>
              </Button>
            </a>

            {/* Import CSV / JSON */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button
                variant="outline"
                className="h-auto w-full flex-col items-start gap-1 p-3.5 text-left shadow-[2px_2px_0px_var(--border)]"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex items-center gap-2 font-black text-xs uppercase text-text">
                  <Upload className="h-4 w-4 text-primary" />
                  <span>{importing ? 'Importing…' : 'Import File'}</span>
                </div>
                <p className="text-[11px] text-text-muted font-normal">
                  Goodreads, StoryGraph, or JSON.
                </p>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Account & Session */}
      <Card className="surface-t1 border-2 border-border p-4 shadow-[3px_3px_0px_var(--border)] sm:p-6">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-danger" />
            <CardTitle className="font-anton text-lg uppercase tracking-wider text-text">
              Account & Session
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-text-muted">
            Manage your session and access credentials.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-0">
          <div>
            <span className="font-hanken text-xs font-bold text-text">
              Current Library: {books.length} titles
            </span>
            <p className="text-xs text-text-muted">Secure single-user session active.</p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="h-9 gap-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_var(--border)]"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
