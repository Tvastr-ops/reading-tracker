'use client';

import { BookOpen, Edit3, MoreVertical, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import type { Book } from '@/lib/types';
import { RatingDisplay } from './RatingInput';

export default function BookGrid({
  books,
  ratingMode,
  hasAnyBooks = true,
  onEdit,
  onDelete,
}: {
  books: Book[];
  ratingMode: 'stars' | 'decimal';
  hasAnyBooks?: boolean;
  onEdit: (b: Book) => void;
  onDelete: (b: Book) => void;
}) {
  if (books.length === 0) {
    const message = !hasAnyBooks
      ? 'Nothing on the shelf yet — add your first book to get started.'
      : 'No entries match your filters.';
    return (
      <div className="my-6 flex flex-col items-center justify-center rounded-2xl border border-border border-dashed bg-card-bg/40 p-12 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-text-muted/50" />
        <p className="text-sm text-text-muted">{message}</p>
      </div>
    );
  }

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case 'Reading':
        return 'reading';
      case 'Completed':
        return 'completed';
      case 'Plan to Read':
        return 'plan';
      case 'On Hold':
        return 'hold';
      case 'Dropped':
        return 'dropped';
      default:
        return 'secondary';
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {books.map((b) => {
        const pct = b.total_units
          ? Math.min(100, Math.round(((b.progress || 0) / b.total_units) * 100))
          : null;

        return (
          <Card
            key={b.id}
            className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/70 bg-card-bg shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-accent-color/60 hover:shadow-xl"
            onClick={() => onEdit(b)}
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface">
              {b.cover_url ? (
                <>
                  <img
                    src={b.cover_url}
                    alt={b.title}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-surface/80 p-2 text-center text-text-muted">
                  <BookOpen className="mb-1 h-8 w-8 opacity-40" />
                  <span className="line-clamp-2 text-[10px]">{b.title}</span>
                </div>
              )}

              {/* Status Badge Overlay */}
              <div className="absolute top-2 left-2 z-10 max-w-[calc(100%-2.6rem)]">
                <Badge
                  variant={getStatusBadgeVariant(b.status)}
                  className="max-w-full truncate px-2 py-0.5 font-medium text-[10px] shadow-xs backdrop-blur-md"
                >
                  {b.status}
                </Badge>
              </div>

              {/* Dropdown Action Menu */}
              <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full border border-white/20 bg-black/40 text-white shadow-md backdrop-blur-md transition-all hover:bg-black/65 group-hover:scale-105"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(b)}>
                      <Edit3 className="mr-2 h-4 w-4 text-accent-color" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(b)}
                      className="text-rose-600 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <CardContent className="flex flex-1 flex-col justify-between gap-2 p-3 sm:p-3.5">
              <div>
                <h4 className="line-clamp-2 font-bold text-text text-xs leading-snug tracking-tight transition-colors group-hover:text-accent-color">
                  {b.title}
                </h4>
                {b.author && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-text-muted">{b.author}</p>
                )}
              </div>

              <div className="mt-auto space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <RatingDisplay rating={b.rating} mode={ratingMode} />
                  {pct != null && (
                    <span className="font-semibold text-[10px] text-text-muted">{pct}%</span>
                  )}
                </div>

                {pct != null && <Progress value={pct} className="h-1.5" />}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
