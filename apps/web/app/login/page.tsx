'use client';

import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Moon,
  Sun,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const router = useRouter();

  useEffect(() => {
    const savedMode =
      localStorage.getItem('theme_mode') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setThemeMode(savedMode === 'dark' ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    document.documentElement.setAttribute('data-mode', next);
    localStorage.setItem('theme_mode', next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/library');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Incorrect password. Please try again.');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(50);
          } catch {}
        }
      }
    } catch {
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 selection:bg-accent-color selection:text-white sm:p-6">
      {/* Top Right Quick Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="h-9 w-9 border-2 border-border p-0 shadow-[2px_2px_0px_var(--border)] transition-transform hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px]"
          title="Toggle light/dark mode"
          aria-label="Toggle light/dark mode"
        >
          {themeMode === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-text-muted" />
          )}
        </Button>
      </div>

      {/* Main Login Container */}
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center border-2 border-border bg-accent-bg text-accent-text shadow-[3px_3px_0px_var(--border)]">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="mt-3 font-anton text-2xl tracking-wider text-text sm:text-3xl">
            PAPERBACK
          </h1>
          <p className="mt-0.5 font-hanken text-[11px] font-black uppercase tracking-widest text-text-muted">
            Reader Ledger
          </p>
        </div>

        {/* Card Form */}
        <div className="surface-t1 rounded-xl border-2 border-border bg-card-bg p-5 shadow-[4px_4px_0px_var(--border)] sm:p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block font-bold text-xs uppercase tracking-wider text-text-muted"
              >
                Password
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                  <KeyRound className="h-4 w-4" />
                </div>

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  required
                  autoFocus
                  autoComplete="current-password"
                  className="h-10 w-full border-2 border-border bg-surface pr-10 pl-9 font-sans text-sm text-text placeholder:text-text-muted/60 shadow-[1.5px_1.5px_0px_var(--border)] transition-all focus:border-border focus:bg-card-bg focus:shadow-[2.5px_2.5px_0px_var(--border)] focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Feedback Banner */}
            {error && (
              <div className="flex items-center gap-2 rounded border-2 border-rose-500/80 bg-rose-500/10 p-2.5 text-xs font-bold text-rose-600 shadow-[1.5px_1.5px_0px_var(--border)] dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={loading || !password.trim()}
              className="h-10 w-full border-2 border-border bg-accent-bg font-black text-xs uppercase tracking-wider text-accent-text shadow-[2.5px_2.5px_0px_var(--border)] transition-all hover:bg-accent-bg/90 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_var(--border)] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
