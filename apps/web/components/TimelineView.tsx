'use client';

import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Flame,
  History,
  MessageSquare,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import type { Book, ReadingLogEntry } from '@/lib/types';
import { parseLocalDate } from '@/lib/utils';

interface DayBookGroup {
  bookId: string;
  book?: Book;
  totalDelta: number;
  earliestFrom: number | null;
  latestTo: number;
  sessions: ReadingLogEntry[];
}

interface DayTimelineGroup {
  dateKey: string;
  displayDate: string;
  totalUnitsRead: number;
  bookGroups: DayBookGroup[];
}

export function TimelineView() {
  const { books } = useLibraryData();
  const [logs, setLogs] = useState<ReadingLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/logs?limit=2000');
        if (!res.ok) throw new Error('Failed to fetch reading logs');
        const data = await res.json();
        setLogs(data.entries || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load timeline');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const bookMap = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of books) {
      map.set(b.id, b);
    }
    return map;
  }, [books]);

  const timelineGroups = useMemo(() => {
    if (!logs.length) return [];

    const dayMap = new Map<string, ReadingLogEntry[]>();

    logs.forEach((log) => {
      const dateKey = log.logged_at ? log.logged_at.split('T')[0] : 'Unknown';
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, []);
      }
      dayMap.get(dateKey)!.push(log);
    });

    const groups: DayTimelineGroup[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    dayMap.forEach((dayLogs, dateKey) => {
      let displayDate = dateKey;
      if (dateKey === todayStr) {
        displayDate = 'Today';
      } else if (dateKey === yesterdayStr) {
        displayDate = 'Yesterday';
      } else {
        const d = parseLocalDate(dateKey);
        if (d) {
          displayDate = d.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        }
      }

      // Group logs by bookId
      const bookGroupsMap = new Map<string, ReadingLogEntry[]>();
      dayLogs.forEach((l) => {
        if (!bookGroupsMap.has(l.book_id)) {
          bookGroupsMap.set(l.book_id, []);
        }
        bookGroupsMap.get(l.book_id)!.push(l);
      });

      let dayTotalUnits = 0;
      const bookGroups: DayBookGroup[] = [];

      bookGroupsMap.forEach((bLogs, bId) => {
        // sort sessions ascending
        bLogs.sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());

        let deltaSum = 0;
        bLogs.forEach((s) => {
          const d = (s.to_progress ?? 0) - (s.from_progress ?? 0);
          if (d > 0) deltaSum += d;
        });

        dayTotalUnits += deltaSum;
        const b = bookMap.get(bId);

        bookGroups.push({
          bookId: bId,
          book: b,
          totalDelta: deltaSum,
          earliestFrom: bLogs[0].from_progress,
          latestTo: bLogs[bLogs.length - 1].to_progress,
          sessions: bLogs,
        });
      });

      groups.push({
        dateKey,
        displayDate,
        totalUnitsRead: dayTotalUnits,
        bookGroups,
      });
    });

    // Sort groups descending by date
    groups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    return groups;
  }, [logs, bookMap]);

  const toggleExpand = (groupKey: string) => {
    setExpandedBooks((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  if (loading) {
    return (
      <div className="space-y-4 py-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-surface/60" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center text-sm text-danger">
        <p>{error}</p>
      </Card>
    );
  }

  if (!timelineGroups.length) {
    return (
      <Card className="p-12 text-center">
        <History className="mx-auto mb-3 h-10 w-10 text-text-muted opacity-40" />
        <h3 className="font-anton text-lg text-text">NO READING SESSIONS LOGGED</h3>
        <p className="mt-1 text-xs text-text-muted">
          Your reading progress updates and session notes will appear here in chronological order.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {timelineGroups.map((group) => (
        <div key={group.dateKey} className="space-y-3">
          {/* Day Header Banner */}
          <div className="flex items-center justify-between border-b-2 border-border/80 pb-1.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-muted" />
              <span className="font-anton text-base uppercase tracking-wider text-text sm:text-lg">
                {group.displayDate}
              </span>
              <span className="text-[11px] font-semibold text-text-muted">({group.dateKey})</span>
            </div>
            {group.totalUnitsRead > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-border font-mono text-xs font-bold shadow-[1px_1px_0px_var(--border)]"
              >
                <Flame className="h-3 w-3 text-primary" />
                <span>+{group.totalUnitsRead} units</span>
              </Badge>
            )}
          </div>

          {/* Book Milestones for the Day */}
          <div className="grid gap-3">
            {group.bookGroups.map((bg) => {
              const b = bg.book;
              const cardKey = `${group.dateKey}-${bg.bookId}`;
              const isExpanded = expandedBooks[cardKey] ?? false;
              const unitType = b?.unit_type || 'pages';

              return (
                <Card
                  key={bg.bookId}
                  className="surface-t1 border-2 border-border p-3 shadow-[2px_2px_0px_var(--border)] sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left Book Info */}
                    <div className="flex items-start gap-3">
                      {/* Cover Thumbnail */}
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded border border-border bg-surface shadow-xs">
                        {b?.cover_url ? (
                          <img
                            src={b.cover_url}
                            alt={b.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-text-muted">
                            <BookOpen className="h-5 w-5 opacity-40" />
                          </div>
                        )}
                      </div>

                      {/* Title & Author */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-hanken text-sm font-extrabold text-text sm:text-base">
                            {b?.title || 'Unknown Title'}
                          </span>
                          {b && (
                            <Link
                              href={`/books/${b.id}` as Route}
                              className="text-text-muted transition-colors hover:text-text"
                              title="Open Book Page"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                        {b?.author && (
                          <p className="text-xs font-semibold text-text-muted">{b.author}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {b?.type && (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {b.type}
                            </Badge>
                          )}
                          <span className="text-xs font-bold text-primary">
                            +{bg.totalDelta} {unitType}
                          </span>
                          <span className="text-xs text-text-muted font-mono">
                            ({bg.earliestFrom ?? 0} → {bg.latestTo})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Session Details Button */}
                    {bg.sessions.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-end text-xs font-bold text-text-muted hover:text-text sm:self-center"
                        onClick={() => toggleExpand(cardKey)}
                      >
                        <span>
                          {bg.sessions.length} {bg.sessions.length === 1 ? 'log' : 'logs'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="ml-1 h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="ml-1 h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Expanded Sub-Sessions List */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                      {bg.sessions.map((s, sIdx) => {
                        const timeStr = s.logged_at
                          ? new Date(s.logged_at).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '';
                        const sDelta = (s.to_progress ?? 0) - (s.from_progress ?? 0);

                        return (
                          <div
                            key={s.id || sIdx}
                            className="flex flex-col gap-1 rounded border border-border/40 bg-surface/40 p-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 text-text-muted" />
                              <span className="font-mono text-text-muted">{timeStr}</span>
                              <span className="font-bold text-text">
                                {s.from_progress ?? 0} → {s.to_progress}
                              </span>
                              {sDelta > 0 && (
                                <span className="font-bold text-primary">
                                  (+{sDelta} {unitType})
                                </span>
                              )}
                            </div>
                            {s.note && (
                              <div className="flex items-center gap-1.5 text-text-muted italic">
                                <MessageSquare className="h-3 w-3 shrink-0" />
                                <span className="line-clamp-1">{s.note}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
