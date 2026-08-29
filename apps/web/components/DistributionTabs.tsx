'use client';

import { BookOpen, PieChart, Star, Tags } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Book } from '@/lib/types';

interface DistributionTabsProps {
  books: Book[];
}

export function DistributionTabs({ books }: DistributionTabsProps) {
  const [activeTab, setActiveTab] = useState<'formats' | 'genres' | 'ratings'>('formats');

  const { formatData, genreData, ratingData, avgRating } = useMemo(() => {
    // 1. FORMATS
    const formatCounts: Record<string, number> = {};
    for (const b of books) {
      const fmt = b.type || 'Novel';
      formatCounts[fmt] = (formatCounts[fmt] || 0) + 1;
    }
    const total = books.length || 1;
    const formatData = Object.entries(formatCounts)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // 2. GENRES
    const genreCounts: Record<string, number> = {};
    for (const b of books) {
      if (!b.genre_tags) continue;
      const tags = b.genre_tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      for (const t of tags) {
        genreCounts[t] = (genreCounts[t] || 0) + 1;
      }
    }
    const genreData = Object.entries(genreCounts)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3. RATINGS
    const rated = books.filter((b) => b.rating != null && b.rating > 0);
    const totalRated = rated.length || 1;
    const avgRating = rated.length
      ? (rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length).toFixed(2)
      : '—';

    const ratingData = [5, 4, 3, 2, 1].map((star) => {
      const count = books.filter((b) => {
        if (b.rating == null) return false;
        const r = Number(b.rating);
        if (star === 5) return r === 5;
        return r >= star && r < star + 1;
      }).length;
      return {
        star,
        count,
        pct: Math.round((count / totalRated) * 100),
      };
    });

    return {
      formatData,
      genreData,
      ratingData,
      avgRating,
    };
  }, [books]);

  return (
    <Card className="surface-t1 border-2 border-border p-4 sm:p-5 shadow-[3px_3px_0px_var(--border)]">
      {/* Header & Segmented Pill Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b-2 border-border/30 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-accent-color" />
            <h3 className="font-anton text-lg sm:text-xl tracking-wide text-text">
              LIBRARY DISTRIBUTION
            </h3>
          </div>
          <p className="font-hanken text-xs text-text-muted">
            Breakdown across publication formats, genres, and reader ratings.
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-1 border-2 border-border bg-surface p-1 shadow-[2px_2px_0px_var(--border)]">
          <button
            type="button"
            onClick={() => setActiveTab('formats')}
            className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold uppercase transition-all ${
              activeTab === 'formats'
                ? 'bg-accent-color text-accent-text border border-border shadow-[1px_1px_0px_var(--border)]'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>FORMATS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('genres')}
            className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold uppercase transition-all ${
              activeTab === 'genres'
                ? 'bg-accent-color text-accent-text border border-border shadow-[1px_1px_0px_var(--border)]'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Tags className="h-3.5 w-3.5" />
            <span>GENRES</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ratings')}
            className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-bold uppercase transition-all ${
              activeTab === 'ratings'
                ? 'bg-accent-color text-accent-text border border-border shadow-[1px_1px_0px_var(--border)]'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            <span>RATINGS</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'formats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formatData.map((f) => (
              <div
                key={f.name}
                className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-bold text-text uppercase">{f.name}</span>
                  <span className="text-text-muted font-semibold">
                    {f.count} {f.count === 1 ? 'title' : 'titles'} ({f.pct}%)
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full bg-border/40 border border-border/80 overflow-hidden">
                  <div
                    className="h-full bg-accent-color transition-all duration-500"
                    style={{ width: `${f.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'genres' && (
          <div className="space-y-3">
            {genreData.length === 0 ? (
              <p className="text-center py-6 font-mono text-xs text-text-muted">
                No genre tags assigned yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {genreData.map((g) => (
                  <div
                    key={g.name}
                    className="border-2 border-border bg-surface p-3 shadow-[2px_2px_0px_var(--border)]"
                  >
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-bold text-text uppercase">#{g.name}</span>
                      <span className="text-text-muted font-semibold">
                        {g.count} {g.count === 1 ? 'book' : 'books'} ({g.pct}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 w-full bg-border/40 border border-border/80 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, g.pct * 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ratings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
              <span className="font-mono text-xs font-bold text-text-muted">
                AVERAGE LIBRARY RATING
              </span>
              <span className="font-anton text-xl tracking-wide text-amber-500">
                ★ {avgRating} / 5.0
              </span>
            </div>

            <div className="space-y-2.5">
              {ratingData.map((r) => (
                <div key={r.star} className="flex items-center gap-3 font-mono text-xs">
                  <div className="w-16 flex items-center gap-1 font-bold text-text">
                    <span>{r.star}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  </div>
                  <div className="flex-1 h-3 bg-border/40 border border-border overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                  <div className="w-20 text-right text-text-muted font-semibold">
                    {r.count} ({r.pct}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
