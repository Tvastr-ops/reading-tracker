'use client';

import { Bookmark, Tag } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import type { Book } from '@/lib/types';
import { parseShelves } from '@/lib/utils';

interface BookShelvesAndTagsCardProps {
  book: Book;
}

export default function BookShelvesAndTagsCard({ book }: BookShelvesAndTagsCardProps) {
  const shelves = parseShelves(book.shelf_names);
  const tagList = book.genre_tags
    ? book.genre_tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  if (shelves.length === 0 && tagList.length === 0) return null;

  return (
    <Card className="surface-t1 space-y-4 border-2 border-border p-4 shadow-[3px_3px_0px_var(--border)] sm:p-5">
      {/* Shelves Section */}
      {shelves.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-muted">
            <Bookmark className="h-3.5 w-3.5 text-primary" />
            <span>Assigned Shelves</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {shelves.map((shelf) => (
              <Link
                key={shelf}
                href={`/library?shelf=${encodeURIComponent(shelf)}`}
                className="rounded-md border-2 border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-black text-text shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:bg-primary/20 hover:text-primary active:translate-x-[0.5px] active:translate-y-[0.5px]"
              >
                ★ {shelf}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tags Section */}
      {tagList.length > 0 && (
        <div className={shelves.length > 0 ? 'border-t border-border/40 pt-3' : ''}>
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-muted">
            <Tag className="h-3.5 w-3.5" />
            <span>Genres & Subjects</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tagList.map((tag) => (
              <Link
                key={tag}
                href={`/library?search=${encodeURIComponent(tag)}`}
                className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-bold text-text shadow-[1.5px_1.5px_0px_var(--border)] transition-all hover:border-primary hover:text-primary active:translate-x-[0.5px] active:translate-y-[0.5px]"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
