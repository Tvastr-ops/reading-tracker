'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const router = useRouter();

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('theme', next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Login failed');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-[var(--space-4)]">
      <button
        type="button"
        className="btn icon-only fixed top-4 right-4"
        onClick={toggleTheme}
        title="Toggle dark mode"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <form className="card mx-auto w-full max-w-[320px] p-[var(--space-6)]" onSubmit={submit}>
        <h1 className="m-0 mb-1 font-bold font-serif text-[24px]">Reading Tracker</h1>
        <p className="m-0 mb-5 text-[13px] text-text-muted">Enter your password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-[var(--radius-sm)] border border-input-border bg-input-bg px-[var(--space-3)] py-[var(--space-2)] font-inherit text-text-main"
        />
        {error && <div className="mt-2 font-medium text-[13px] text-danger">{error}</div>}
        <button className="btn mt-3 w-full" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
