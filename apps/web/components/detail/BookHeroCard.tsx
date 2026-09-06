'use client';

import { Layers } from 'lucide-react';
import Link from 'next/link';
import CoverImage from '@/components/CoverImage';
import ExternalLinksList from '@/components/ExternalLinksList';
import { InteractiveStarRating } from '@/components/RatingInput';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { type Book, STATUS_COLOR_VAR } from '@/lib/types';

interface BookHeroCardProps {
  book: Book;
  onRatingChange: (newRating: number | null) => void;
}

export default function BookHeroCard({ book, onRatingChange }: BookHeroCardProps) {
  return (
    <Card className="surface-t1 border-2 border-border p-5 shadow-[4px_4px_0px_var(--border)] sm:p-6">
      {/* 3D Tactile Cover Artwork with Book Spine */}
      <div className="relative mx-auto mb-5 aspect-2/3 max-w-[260px] overflow-hidden rounded-xl border-2 border-border bg-surface shadow-[4px_4px_0px_var(--border)] transition-transform duration-300 hover:scale-[1.02]">
        {/* Subtle Book Spine Lighting Gradient */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent sm:w-3" />

        <CoverImage
          src={book.cover_url}
          title={book.title}
          alt={book.title}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Title & Author */}
      <div className="text-center">
        <h1 className="font-anton text-2xl tracking-wide text-text sm:text-3xl">{book.title}</h1>
        {book.author && (
          <p className="mt-1.5 font-hanken text-sm font-bold text-text-muted">
            by{' '}
            <Link
              href={`/library?search=${encodeURIComponent(book.author)}`}
              className="transition-colors hover:text-primary hover:underline"
            >
              {book.author}
            </Link>
          </p>
        )}

        {/* Series Continuity Pill */}
        {book.series_name && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-text-muted shadow-[1.5px_1.5px_0px_var(--border)]">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <Link
              href={`/library?series=true&search=${encodeURIComponent(book.series_name)}`}
              className="hover:text-primary hover:underline"
            >
              {book.series_name} {book.series_order != null ? `#${book.series_order}` : ''}
            </Link>
          </div>
        )}
      </div>

      {/* Badges & Status Chips */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 border-t border-border/60 pt-4">
        <Badge variant="outline" className="text-xs font-black uppercase">
          {book.type}
        </Badge>
        <Badge
          variant="outline"
          className="text-xs font-black uppercase"
          style={{
            color: STATUS_COLOR_VAR[book.status] || 'var(--text)',
            borderColor: STATUS_COLOR_VAR[book.status] || 'var(--border)',
          }}
        >
          {book.status}
        </Badge>
        {book.is_ongoing && (
          <Badge variant="outline" className="border-amber-500 text-xs font-bold text-amber-500">
            Ongoing Serial
          </Badge>
        )}
        {(book.reread_count ?? 0) > 0 && (
          <Badge variant="secondary" className="text-xs font-bold">
            {book.reread_count}x Re-read
          </Badge>
        )}
      </div>

      {/* 1-Tap Star Rating */}
      <div className="mt-4 flex flex-col items-center gap-1.5 border-t border-border/60 pt-4">
        <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
          Your Rating
        </span>
        <InteractiveStarRating value={book.rating} onChange={onRatingChange} />
      </div>

      {/* External Links Hub */}
      {book.source_link && (
        <div className="mt-4 border-t border-border/60 pt-4">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-text-muted">
            External Links & Resources
          </span>
          <ExternalLinksList sourceLink={book.source_link} />
        </div>
      )}
    </Card>
  );
}
