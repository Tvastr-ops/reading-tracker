'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen flex items-center justify-center p-[var(--space-4)]">
      <button
        className="btn icon-only fixed top-4 right-4"
        onClick={toggleTheme}
        title="Toggle dark mode"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <form className="card w-full max-w-[320px] p-[var(--space-6)] mx-auto" onSubmit={submit}>
        <h1 className="text-[24px] font-bold font-serif m-0 mb-1">Reading Tracker</h1>
        <p className="text-text-muted text-[13px] m-0 mb-5">Enter your password to continue.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full py-[var(--space-2)] px-[var(--space-3)] border border-input-border rounded-[var(--radius-sm)] bg-input-bg text-text-main font-inherit"
        />
        {error && <div className="text-[13px] text-danger mt-2 font-medium">{error}</div>}
        <button className="btn mt-3 w-full" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}