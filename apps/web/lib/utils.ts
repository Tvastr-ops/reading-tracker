import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses 'YYYY-MM-DD' as a local Date instead of UTC midnight, preventing day-shifting
 * when formatting or retrieving year/month in negative UTC timezones.
 */
export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (match) {
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10) - 1;
    const day = Number.parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatShortDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    const d = parseLocalDate(dateStr);
    if (!d || Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function calculateReadingDuration(
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined,
): string | null {
  if (!startDateStr) return null;
  const start = parseLocalDate(startDateStr);
  const end = endDateStr ? parseLocalDate(endDateStr) : new Date();
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const diffTime = Math.max(0, end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '1d';
  return `${diffDays}d`;
}

export function getLocalDateString(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const GENRE_SYNONYM_MAP: Record<string, string> = {
  'science fiction': 'Sci-Fi',
  scifi: 'Sci-Fi',
  'sci fi': 'Sci-Fi',
  sf: 'Sci-Fi',
  progression: 'Progression Fantasy',
  'progression fantasy': 'Progression Fantasy',
  'lit-rpg': 'LitRPG',
  'lit rpg': 'LitRPG',
  litrpg: 'LitRPG',
  gamelit: 'GameLit',
  'non fiction': 'Non-Fiction',
  'non-fiction': 'Non-Fiction',
  nonfiction: 'Non-Fiction',
  'slice-of-life': 'Slice of Life',
  'slice of life': 'Slice of Life',
  sol: 'Slice of Life',
  'historical fiction': 'Historical',
  historical: 'Historical',
  'young adult': 'YA',
  ya: 'YA',
  'post-apocalyptic': 'Post-Apocalyptic',
  'post apocalyptic': 'Post-Apocalyptic',
  'post apocalypse': 'Post-Apocalyptic',
  apocalypse: 'Post-Apocalyptic',
  apocalyptic: 'Post-Apocalyptic',
  xianxia: 'Cultivation',
  xuanhuan: 'Cultivation',
  cultivation: 'Cultivation',
  wuxia: 'Martial Arts',
  'martial arts': 'Martial Arts',
  'urban fantasy': 'Urban Fantasy',
  'contemporary fantasy': 'Urban Fantasy',
  grimdark: 'Grimdark',
  'dark fantasy': 'Dark Fantasy',
  cyberpunk: 'Cyberpunk',
  steampunk: 'Steampunk',
  biography: 'Biography & Memoir',
  autobiography: 'Biography & Memoir',
  memoir: 'Biography & Memoir',
  'self help': 'Self-Help',
  'self-help': 'Self-Help',
  psychology: 'Psychology',
  philosophy: 'Philosophy',
  classics: 'Classics',
  classic: 'Classics',
};

export function normalizeGenreTag(rawTag: string): string {
  const trimmed = rawTag.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (GENRE_SYNONYM_MAP[lower]) {
    return GENRE_SYNONYM_MAP[lower];
  }
  return trimmed
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.substring(1).toLowerCase() : ''))
    .join(' ');
}
