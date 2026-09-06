'use client';

import { CheckCircle2, Layers } from 'lucide-react';
import Link from 'next/link';
import CoverImage from '@/components/CoverImage';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { type Book, STATUS_COLOR_VAR } from '@/lib/types';

interface BookSeriesContinuityCardProps {
  currentBook: Book;
  allBooks: Book[];
}

export default function BookSeriesContinuityCard({
  currentBook,
  allBooks,
}: BookSeriesContinuityCardProps) {
  if (!currentBook.series_name) return null;

  const seriesBooks = allBooks
    .filter(
      (b) => b.series_name?.trim().toLowerCase() === currentBook.series_name?.trim().toLowerCase(),
    )
    .sort((a, b) => (a.series_order ?? 999) - (b.series_order ?? 999));

  if (seriesBooks.length <= 1) return null;

  const completedCount = seriesBooks.filter((b) => b.status === 'Completed').length;

  return (
    <Card className="surface-t1 border-2 border-border p-5 shadow-[3px_3px_0px_var(--border)] sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="font-anton text-sm uppercase tracking-wider text-text">
            Series Franchise: {currentBook.series_name}
          </h3>
        </div>
        <Badge variant="outline" className="font-mono text-[11px] font-bold">
          {completedCount} / {seriesBooks.length} Completed
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {seriesBooks.map((b) => {
          const isCurrent = b.id === currentBook.id;
          return (
            <Link
              key={b.id}
              href={`/books/${b.id}`}
              className={`group flex flex-col overflow-hidden rounded-lg border-2 p-2 transition-all ${
                isCurrent
                  ? 'border-primary bg-primary/10 shadow-[2px_2px_0px_var(--primary)]'
                  : 'border-border bg-surface hover:border-primary/60 hover:shadow-[2px_2px_0px_var(--border)]'
              }`}
            >
              <div className="relative aspect-2/3 w-full overflow-hidden rounded bg-card-bg">
                <CoverImage
                  src={b.cover_url}
                  title={b.title}
                  alt={b.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {b.status === 'Completed' && (
                  <div className="absolute top-1 right-1 rounded-full bg-emerald-500 p-0.5 text-white shadow">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="mt-2 flex-1">
                <span className="font-mono text-[10px] font-black text-primary">
                  {b.series_order != null ? `Vol. ${b.series_order}` : 'Entry'}
                </span>
                <p className="line-clamp-1 font-bold text-xs text-text transition-colors group-hover:text-primary">
                  {b.title}
                </p>
                <span
                  className="mt-1 inline-block text-[9px] font-black uppercase"
                  style={{ color: STATUS_COLOR_VAR[b.status] || 'var(--text-muted)' }}
                >
                  {b.status}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
