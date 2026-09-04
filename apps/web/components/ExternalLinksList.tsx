'use client';

import {
  BookOpen,
  Compass,
  ExternalLink,
  Globe,
  Library,
  LineChart,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import type React from 'react';

export interface ParsedExternalLink {
  url: string;
  label: string;
  domain: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}

export function parseExternalLinks(raw?: string | null): ParsedExternalLink[] {
  if (!raw?.trim()) return [];

  // Split by newlines or commas
  const lines = raw
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const parsed: ParsedExternalLink[] = [];

  for (const item of lines) {
    let url = item;
    let customLabel: string | null = null;

    // Check markdown link format: [Label](url)
    const mdMatch = item.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdMatch) {
      customLabel = mdMatch[1];
      url = mdMatch[2];
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ')) {
        url = `https://${url}`;
      } else {
        continue; // not a valid URL candidate
      }
    }

    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');

      let label = customLabel || hostname;
      let icon = Globe;
      let colorClass = 'hover:border-primary hover:text-primary';

      if (hostname.includes('wikipedia.org')) {
        label = customLabel || 'Wikipedia';
        icon = BookOpen;
        colorClass = 'hover:border-neutral-400 hover:text-neutral-200';
      } else if (hostname.includes('fandom.com')) {
        label = customLabel || 'Fandom Wiki';
        icon = BookOpen;
        colorClass = 'hover:border-amber-400 hover:text-amber-400';
      } else if (hostname.includes('anilist.co')) {
        label = customLabel || 'AniList';
        icon = LineChart;
        colorClass = 'hover:border-sky-400 hover:text-sky-400';
      } else if (hostname.includes('myanimelist.net')) {
        label = customLabel || 'MyAnimeList';
        icon = LineChart;
        colorClass = 'hover:border-blue-400 hover:text-blue-400';
      } else if (hostname.includes('goodreads.com')) {
        label = customLabel || 'Goodreads';
        icon = Library;
        colorClass = 'hover:border-amber-500 hover:text-amber-500';
      } else if (hostname.includes('thestorygraph.com')) {
        label = customLabel || 'StoryGraph';
        icon = Library;
        colorClass = 'hover:border-teal-400 hover:text-teal-400';
      } else if (hostname.includes('hardcover.app')) {
        label = customLabel || 'Hardcover';
        icon = Library;
        colorClass = 'hover:border-emerald-400 hover:text-emerald-400';
      } else if (hostname.includes('royalroad.com')) {
        label = customLabel || 'Royal Road';
        icon = Zap;
        colorClass = 'hover:border-yellow-400 hover:text-yellow-400';
      } else if (hostname.includes('novelupdates.com')) {
        label = customLabel || 'NovelUpdates';
        icon = Zap;
        colorClass = 'hover:border-orange-400 hover:text-orange-400';
      } else if (hostname.includes('syosetu.com') || hostname.includes('kakuyomu.jp')) {
        label = customLabel || 'Web Serial Raw';
        icon = Zap;
        colorClass = 'hover:border-pink-400 hover:text-pink-400';
      } else if (hostname.includes('mangadex.org')) {
        label = customLabel || 'MangaDex';
        icon = BookOpen;
        colorClass = 'hover:border-orange-500 hover:text-orange-500';
      } else if (hostname.includes('amazon.') || hostname.includes('amzn.')) {
        label = customLabel || 'Amazon';
        icon = ShoppingBag;
        colorClass = 'hover:border-amber-400 hover:text-amber-400';
      } else if (hostname.includes('bookwalker.jp')) {
        label = customLabel || 'BookWalker';
        icon = ShoppingBag;
        colorClass = 'hover:border-red-400 hover:text-red-400';
      } else if (hostname.includes('openlibrary.org')) {
        label = customLabel || 'Open Library';
        icon = Library;
        colorClass = 'hover:border-blue-400 hover:text-blue-400';
      } else if (hostname.includes('books.google.')) {
        label = customLabel || 'Google Books';
        icon = Compass;
        colorClass = 'hover:border-blue-500 hover:text-blue-500';
      }

      parsed.push({
        url,
        label,
        domain: hostname,
        icon,
        colorClass,
      });
    } catch {
      // ignore malformed URLs
    }
  }

  return parsed;
}

export default function ExternalLinksList({
  sourceLink,
  className = '',
}: {
  sourceLink?: string | null;
  className?: string;
}) {
  const links = parseExternalLinks(sourceLink);

  if (links.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {links.map((link) => {
        const IconComponent = link.icon;
        return (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group inline-flex items-center gap-1.5 rounded-lg border-2 border-border bg-surface px-3 py-1.5 text-xs font-bold text-text shadow-[2px_2px_0px_var(--border)] transition-all duration-150 hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${link.colorClass}`}
          >
            <IconComponent className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
            <span>{link.label}</span>
            <ExternalLink className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" />
          </a>
        );
      })}
    </div>
  );
}
