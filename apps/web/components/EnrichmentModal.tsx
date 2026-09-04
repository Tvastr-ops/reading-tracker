'use client';
import { Loader2, Search, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { EnrichmentResult } from '@/app/api/enrich/route';
import CoverImage from '@/components/CoverImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface EnrichmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onApply: (
    enrichedData: Partial<{
      title: string;
      author: string | null;
      cover_url: string | null;
      total_units: number | null;
      unit_type: any;
      notes: string | null;
      genre_tags: string | null;
      is_ongoing: boolean | null;
      source_link: string | null;
    }>,
  ) => void;
}

export default function EnrichmentModal({
  open,
  onOpenChange,
  initialQuery = '',
  onApply,
}: EnrichmentModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<'all' | 'isbn' | 'manga'>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<EnrichmentResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<EnrichmentResult | null>(null);

  // Field selection toggles
  const [fields, setFields] = useState({
    cover: true,
    titleAuthor: true,
    units: true,
    description: true,
    tags: true,
    link: true,
  });

  useEffect(() => {
    if (open) {
      if (initialQuery && initialQuery !== query) {
        setQuery(initialQuery);
        handleSearch(initialQuery, searchType);
      } else if (query && results.length === 0) {
        handleSearch(query, searchType);
      }
    }
  }, [open, initialQuery]);

  const handleSearch = async (searchQuery: string, type: 'all' | 'isbn' | 'manga') => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setSelectedResult(null);
    try {
      const res = await fetch(`/api/enrich?q=${encodeURIComponent(q)}&type=${type}`);
      if (!res.ok) throw new Error('Failed to fetch metadata');
      const data = await res.json();
      setResults(data.results || []);
      if (data.results && data.results.length > 0) {
        setSelectedResult(data.results[0]);
      } else {
        toast.info('No metadata matches found for this query.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error searching metadata');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!selectedResult) return;

    const partial: any = {};
    if (fields.cover && selectedResult.cover_url) {
      partial.cover_url = selectedResult.cover_url;
    }
    if (fields.titleAuthor) {
      if (selectedResult.title) partial.title = selectedResult.title;
      if (selectedResult.author) partial.author = selectedResult.author;
    }
    if (fields.units) {
      if (selectedResult.total_units != null) partial.total_units = selectedResult.total_units;
      if (selectedResult.unit_type) partial.unit_type = selectedResult.unit_type;
      if (selectedResult.is_ongoing != null) partial.is_ongoing = selectedResult.is_ongoing;
    }
    if (fields.description && selectedResult.description) {
      partial.notes = selectedResult.description;
    }
    if (fields.tags && selectedResult.genre_tags) {
      partial.genre_tags = selectedResult.genre_tags;
    }
    if (fields.link && selectedResult.external_link) {
      partial.source_link = selectedResult.external_link;
    }

    onApply(partial);
    toast.success('Metadata applied successfully!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-2 border-border bg-background p-4 shadow-[4px_4px_0px_var(--border)] sm:p-6">
        <DialogHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 font-anton text-lg tracking-wide text-text sm:text-xl">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>1-CLICK METADATA AUTO-ENRICH</span>
            </DialogTitle>
          </div>
          <p className="text-xs text-text-muted">
            Search Open Library, Google Books, and AniList to instantly populate high-res artwork,
            synopsis, and tags.
          </p>
        </DialogHeader>

        {/* Search Input & Source Switcher */}
        <div className="mt-4 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query, searchType);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Title, Author, or ISBN..."
                className="pl-9 font-medium text-xs shadow-[1.5px_1.5px_0px_var(--border)] sm:text-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="gap-1.5 font-anton text-xs tracking-wider shadow-[2px_2px_0px_var(--border)]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>SEARCH</span>
            </Button>
          </form>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-text-muted">Source Scope:</span>
            {(
              [
                { id: 'all', label: 'All Sources' },
                { id: 'isbn', label: 'Exact ISBN' },
                { id: 'manga', label: 'Light Novels & Manga' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSearchType(t.id);
                  if (query.trim()) handleSearch(query, t.id);
                }}
                className={`rounded border px-2 py-0.5 text-[11px] font-bold transition-all ${
                  searchType === t.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-text-muted hover:border-text-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        <div className="mt-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-xs font-bold text-text-muted">
                Aggregating book metadata across public libraries...
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Left Column: Result Candidates (5 cols) */}
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1 md:col-span-5">
                <span className="text-[10px] font-black uppercase text-text-muted">
                  Found {results.length} Matches:
                </span>
                {results.map((res) => {
                  const isSelected = selectedResult?.id === res.id;
                  return (
                    <div
                      key={res.id}
                      onClick={() => setSelectedResult(res)}
                      className={`flex cursor-pointer gap-2.5 rounded-lg border-2 p-2.5 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-[2px_2px_0px_var(--primary)]'
                          : 'border-border bg-surface hover:border-text-muted'
                      }`}
                    >
                      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded border border-border bg-background">
                        <CoverImage
                          src={res.cover_url}
                          title={res.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="px-1 py-0 text-[9px] font-black">
                            {res.sourceLabel}
                          </Badge>
                        </div>
                        <h4 className="mt-1 line-clamp-1 font-bold text-xs text-text">
                          {res.title}
                        </h4>
                        {res.author && (
                          <p className="line-clamp-1 text-[11px] text-text-muted">
                            by {res.author}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-text-muted">
                          {res.total_units && (
                            <span>
                              {res.total_units} {res.unit_type || 'units'}
                            </span>
                          )}
                          {res.published_year && <span>• {res.published_year}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Selected Result Preview & Selective Merge Checklist (7 cols) */}
              <div className="md:col-span-7">
                {selectedResult ? (
                  <Card className="surface-t1 border-2 border-border p-4 shadow-[2px_2px_0px_var(--border)]">
                    <div className="flex gap-3">
                      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md border-2 border-border bg-surface shadow-[1.5px_1.5px_0px_var(--border)]">
                        <CoverImage
                          src={selectedResult.cover_url}
                          title={selectedResult.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-anton text-base text-text">
                          {selectedResult.title}
                        </h3>
                        {selectedResult.author && (
                          <p className="font-bold text-xs text-text-muted">
                            by {selectedResult.author}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedResult.publisher && (
                            <Badge variant="outline" className="text-[10px]">
                              {selectedResult.publisher}
                            </Badge>
                          )}
                          {selectedResult.published_year && (
                            <Badge variant="outline" className="text-[10px]">
                              {selectedResult.published_year}
                            </Badge>
                          )}
                          {selectedResult.total_units && (
                            <Badge
                              variant="outline"
                              className="border-primary/50 text-[10px] text-primary"
                            >
                              {selectedResult.total_units} {selectedResult.unit_type || 'units'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Synopsis Preview */}
                    {selectedResult.description && (
                      <div className="mt-3 border-t border-border/60 pt-2.5">
                        <span className="block text-[10px] font-black uppercase text-text-muted">
                          Editorial Synopsis
                        </span>
                        <p className="mt-1 line-clamp-3 font-sans text-xs leading-relaxed text-text">
                          {selectedResult.description}
                        </p>
                      </div>
                    )}

                    {/* Tags Preview */}
                    {selectedResult.genre_tags && (
                      <div className="mt-2.5 border-t border-border/60 pt-2">
                        <span className="block text-[10px] font-black uppercase text-text-muted">
                          Genre Tags
                        </span>
                        <p className="mt-1 line-clamp-1 text-[11px] font-bold text-text-muted">
                          {selectedResult.genre_tags}
                        </p>
                      </div>
                    )}

                    {/* Selective Merge Checklist */}
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-text-muted">
                        Select Fields to Apply:
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={fields.cover}
                            onCheckedChange={(c) => setFields((f) => ({ ...f, cover: !!c }))}
                          />
                          <span className="font-semibold">Cover Artwork</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={fields.titleAuthor}
                            onCheckedChange={(c) => setFields((f) => ({ ...f, titleAuthor: !!c }))}
                          />
                          <span className="font-semibold">Title & Author</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={fields.units}
                            onCheckedChange={(c) => setFields((f) => ({ ...f, units: !!c }))}
                          />
                          <span className="font-semibold">Length / Units</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={fields.description}
                            onCheckedChange={(c) => setFields((f) => ({ ...f, description: !!c }))}
                          />
                          <span className="font-semibold">Synopsis / Notes</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={fields.tags}
                            onCheckedChange={(c) => setFields((f) => ({ ...f, tags: !!c }))}
                          />
                          <span className="font-semibold">Genre Tags</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <Checkbox
                            checked={fields.link}
                            onCheckedChange={(c) => setFields((f) => ({ ...f, link: !!c }))}
                          />
                          <span className="font-semibold">Source Link</span>
                        </label>
                      </div>
                    </div>

                    {/* Apply Button */}
                    <Button
                      onClick={handleApply}
                      className="mt-4 w-full gap-1.5 font-anton text-xs tracking-wider shadow-[2px_2px_0px_var(--border)] active:translate-x-[0.5px] active:translate-y-[0.5px]"
                    >
                      <Sparkles className="h-4 w-4 text-amber-300" />
                      <span>APPLY SELECTED METADATA</span>
                    </Button>
                  </Card>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-border p-8 text-center text-xs text-text-muted">
                    Select a result from the list to preview details.
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="py-8 text-center text-xs text-text-muted">
              No results found. Try searching by ISBN or alternative title.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
