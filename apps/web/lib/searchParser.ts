import type { Book } from './types';

export function parseShelves(shelfNames?: string | null): string[] {
  if (!shelfNames) return [];
  try {
    const parsed = JSON.parse(shelfNames);
    if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    // fallback comma separated
  }
  return shelfNames
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

type FilterPredicate = (book: Book) => boolean;

interface SearchClause {
  positiveFilters: FilterPredicate[];
  negativeFilters: FilterPredicate[];
}

/**
 * Tokenizes a single clause string respecting quoted strings like "The Final Empire" or author:"Brandon Sanderson"
 */
function tokenizeClause(clauseStr: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < clauseStr.length; i++) {
    const char = clauseStr[i];

    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ' ' && !inQuotes) {
      if (current.trim().length > 0) {
        tokens.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.trim().length > 0) {
    tokens.push(current.trim());
  }

  return tokens;
}

/**
 * Strips surrounding quotes from a string value
 */
function stripQuotes(val: string): string {
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1);
  }
  return val;
}

/**
 * Parses numeric comparison like ">=4", ">3.5", "<=2", "=5", "4+", "5"
 */
function parseNumericComparison(expr: string): ((n: number | null | undefined) => boolean) | null {
  const clean = expr.trim();
  if (!clean) return null;

  if (clean.startsWith('>=')) {
    const val = Number.parseFloat(clean.substring(2));
    return Number.isFinite(val) ? (n) => n != null && n >= val : null;
  }
  if (clean.startsWith('>')) {
    const val = Number.parseFloat(clean.substring(1));
    return Number.isFinite(val) ? (n) => n != null && n > val : null;
  }
  if (clean.startsWith('<=')) {
    const val = Number.parseFloat(clean.substring(2));
    return Number.isFinite(val) ? (n) => n != null && n <= val : null;
  }
  if (clean.startsWith('<')) {
    const val = Number.parseFloat(clean.substring(1));
    return Number.isFinite(val) ? (n) => n != null && n < val : null;
  }
  if (clean.endsWith('+')) {
    const val = Number.parseFloat(clean.slice(0, -1));
    return Number.isFinite(val) ? (n) => n != null && n >= val : null;
  }
  if (clean.startsWith('=')) {
    const val = Number.parseFloat(clean.substring(1));
    return Number.isFinite(val) ? (n) => n != null && n === val : null;
  }

  const val = Number.parseFloat(clean);
  return Number.isFinite(val) ? (n) => n != null && n >= val : null;
}

function buildTokenPredicate(
  rawToken: string,
): { isNegative: boolean; predicate: FilterPredicate } | null {
  let token = rawToken.trim();
  if (!token) return null;

  let isNegative = false;
  if (token.startsWith('-') || token.startsWith('!')) {
    isNegative = true;
    token = token.substring(1).trim();
    if (!token) return null;
  }

  const lower = token.toLowerCase();

  // 1. Tag qualifier: #tag or tag:xyz
  if (token.startsWith('#') && token.length > 1) {
    const tag = stripQuotes(token.substring(1)).toLowerCase();
    return {
      isNegative,
      predicate: (b) => Boolean(b.genre_tags?.toLowerCase().includes(tag)),
    };
  }
  if (lower.startsWith('tag:')) {
    const tag = stripQuotes(token.substring(4)).toLowerCase();
    return {
      isNegative,
      predicate: (b) => Boolean(b.genre_tags?.toLowerCase().includes(tag)),
    };
  }

  // 2. Author qualifier: author:xyz or by:xyz or a:xyz
  if (lower.startsWith('author:') || lower.startsWith('by:')) {
    const author = stripQuotes(token.substring(token.indexOf(':') + 1)).toLowerCase();
    return {
      isNegative,
      predicate: (b) => Boolean(b.author?.toLowerCase().includes(author)),
    };
  }

  // 3. Title qualifier: title:xyz or t:xyz
  if (lower.startsWith('title:')) {
    const title = stripQuotes(token.substring(6)).toLowerCase();
    return {
      isNegative,
      predicate: (b) => Boolean(b.title.toLowerCase().includes(title)),
    };
  }

  // 4. Series qualifier: series:xyz or s:xyz
  if (lower.startsWith('series:')) {
    const series = stripQuotes(token.substring(7)).toLowerCase();
    return {
      isNegative,
      predicate: (b) => Boolean(b.series_name?.toLowerCase().includes(series)),
    };
  }

  // 5. Shelf qualifier: shelf:xyz
  if (lower.startsWith('shelf:')) {
    const shelf = stripQuotes(token.substring(6)).toLowerCase();
    return {
      isNegative,
      predicate: (b) => parseShelves(b.shelf_names).some((s) => s.toLowerCase().includes(shelf)),
    };
  }

  // 6. Type / Format qualifier: type:manga, type:novel, format:xyz
  if (lower.startsWith('type:') || lower.startsWith('format:')) {
    const type = stripQuotes(token.substring(token.indexOf(':') + 1)).toLowerCase();
    return {
      isNegative,
      predicate: (b) => Boolean(b.type?.toLowerCase().includes(type)),
    };
  }

  // 7. Status qualifier: status:reading, status:completed, status:"plan to read"
  if (lower.startsWith('status:')) {
    const status = stripQuotes(token.substring(7)).toLowerCase();
    return {
      isNegative,
      predicate: (b) => Boolean(b.status.toLowerCase().includes(status)),
    };
  }

  // 8. Rating / Stars: rating:4+, rating>=4.5, rating>4, rating=5, stars:5, stars>=4
  const ratingMatch = /^(?:rating|stars)(?::|>=|<=|>|<|=)(.+)$/i.exec(token);
  if (ratingMatch) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const cleanExpr = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const comp = parseNumericComparison(stripQuotes(cleanExpr));
    if (comp) {
      return {
        isNegative,
        predicate: (b) => comp(b.rating),
      };
    }
  }

  // 9. Unit Type filter: unit:pages, unit:chapters, unit:volumes, unit:words
  if (lower.startsWith('unit:') || lower.startsWith('unit_type:')) {
    const unit = stripQuotes(token.substring(token.indexOf(':') + 1)).toLowerCase();
    return {
      isNegative,
      predicate: (b) => {
        const u = b.unit_type?.toLowerCase() || 'pages';
        return u.includes(unit);
      },
    };
  }

  // 10. Smart Unit-Specific & Length Operators
  // 10a. Pages (Strict): pages>400, pages<=200, p>300
  const pagesMatch = /^(?:pages|page|p)(?::|>=|<=|>|<|=)(.+)$/i.exec(token);
  if (pagesMatch) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const cleanExpr = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const comp = parseNumericComparison(stripQuotes(cleanExpr));
    if (comp) {
      return {
        isNegative,
        predicate: (b) => {
          const isPages = !b.unit_type || b.unit_type.toLowerCase() === 'pages';
          return isPages && comp(b.total_units ?? b.progress);
        },
      };
    }
  }

  // 10b. Chapters (Strict): chapters>100, chapter>=50, ch>20
  const chaptersMatch = /^(?:chapters|chapter|ch)(?::|>=|<=|>|<|=)(.+)$/i.exec(token);
  if (chaptersMatch) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const cleanExpr = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const comp = parseNumericComparison(stripQuotes(cleanExpr));
    if (comp) {
      return {
        isNegative,
        predicate: (b) => {
          const isChapters =
            b.unit_type?.toLowerCase() === 'chapters' ||
            b.type?.toLowerCase().includes('manga') ||
            b.type?.toLowerCase().includes('web novel') ||
            b.type?.toLowerCase().includes('manhwa');
          return isChapters && comp(b.total_units ?? b.progress);
        },
      };
    }
  }

  // 10c. Volumes (Strict): volumes>=10, volume>5, vol>3, vols>5
  const volumesMatch = /^(?:volumes|volume|vols|vol)(?::|>=|<=|>|<|=)(.+)$/i.exec(token);
  if (volumesMatch) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const cleanExpr = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const comp = parseNumericComparison(stripQuotes(cleanExpr));
    if (comp) {
      return {
        isNegative,
        predicate: (b) => {
          const isVolumeTier =
            b.unit_type?.toLowerCase() === 'volumes' ||
            b.progress_structure === 'volume_chapter' ||
            b.parent_total != null;
          const volCount = b.parent_total ?? b.parent_progress ?? b.total_units ?? b.progress;
          return isVolumeTier && comp(volCount);
        },
      };
    }
  }

  // 10d. Words (Strict): words>50000, word>=10000, w>100000
  const wordsMatch = /^(?:words|word|w)(?::|>=|<=|>|<|=)(.+)$/i.exec(token);
  if (wordsMatch) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const cleanExpr = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const comp = parseNumericComparison(stripQuotes(cleanExpr));
    if (comp) {
      return {
        isNegative,
        predicate: (b) => {
          const isWords = b.unit_type?.toLowerCase() === 'words';
          return isWords && comp(b.total_units ?? b.progress);
        },
      };
    }
  }

  // 10e. Universal Length/Units (Any Format): units>50, length>300, total>500, size>100
  const universalUnitsMatch = /^(?:units|unit|length|total|size)(?::|>=|<=|>|<|=)(.+)$/i.exec(
    token,
  );
  if (universalUnitsMatch) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const cleanExpr = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const comp = parseNumericComparison(stripQuotes(cleanExpr));
    if (comp) {
      return {
        isNegative,
        predicate: (b) => comp(b.total_units ?? b.progress),
      };
    }
  }

  // 10f. Current Read Progress: progress>50, read>=100, progress<=20
  const progressMatch = /^(?:progress|read)(?::|>=|<=|>|<|=)(.+)$/i.exec(token);
  if (progressMatch && !token.includes('%')) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const cleanExpr = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const comp = parseNumericComparison(stripQuotes(cleanExpr));
    if (comp) {
      return {
        isNegative,
        predicate: (b) => comp(b.progress),
      };
    }
  }

  // 10g. Percentage Completion: percent>=50, pct>=50, progress:100%
  const percentMatch = /^(?:percent|pct|progress)(?::|>=|<=|>|<|=)(.+)$/i.exec(token);
  if (
    percentMatch &&
    (token.includes('%') || lower.startsWith('percent') || lower.startsWith('pct'))
  ) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const rawVal = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const cleanExpr = stripQuotes(rawVal).replace('%', '').trim();
    const comp = parseNumericComparison(cleanExpr);
    if (comp) {
      return {
        isNegative,
        predicate: (b) => {
          const total = b.total_units || 0;
          const current = b.progress || 0;
          const pct = total > 0 ? (current / total) * 100 : current > 0 ? 100 : 0;
          return comp(pct);
        },
      };
    }
  }

  // 10h. Unread / Remaining Left: unread>0, left>10, unread>=5, left<=0
  const unreadMatch = /^(?:unread|left|remaining)(?::|>=|<=|>|<|=)(.+)$/i.exec(token);
  if (unreadMatch) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const cleanExpr = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const comp = parseNumericComparison(stripQuotes(cleanExpr));
    if (comp) {
      return {
        isNegative,
        predicate: (b) => {
          const total = b.latest_units || b.total_units || 0;
          const unread = Math.max(0, total - (b.progress || 0));
          return comp(unread);
        },
      };
    }
  }

  // 11. Boolean flags: is:fav, is:favorite, is:ongoing, is:reread, no:cover, has:cover, has:notes, no:notes
  if (lower === 'is:fav' || lower === 'is:favorite') {
    return { isNegative, predicate: (b) => Boolean(b.is_favorite) };
  }
  if (lower === 'is:ongoing') {
    return { isNegative, predicate: (b) => Boolean(b.is_ongoing) };
  }
  if (lower === 'is:reread') {
    return { isNegative, predicate: (b) => Boolean(b.reread_count && b.reread_count > 0) };
  }
  if (lower === 'no:cover') {
    return { isNegative, predicate: (b) => !b.cover_url || b.cover_url.trim() === '' };
  }
  if (lower === 'has:cover') {
    return {
      isNegative,
      predicate: (b) => Boolean(b.cover_url && b.cover_url.trim() !== ''),
    };
  }
  if (lower === 'has:notes') {
    return { isNegative, predicate: (b) => Boolean(b.notes && b.notes.trim() !== '') };
  }
  if (lower === 'no:notes') {
    return { isNegative, predicate: (b) => !b.notes || b.notes.trim() === '' };
  }

  // 11. Free-text keyword / phrase (universal match)
  const cleanKeyword = stripQuotes(token).toLowerCase();
  if (!cleanKeyword) return null;

  return {
    isNegative,
    predicate: (b) => {
      const shelves = parseShelves(b.shelf_names);
      return (
        b.title.toLowerCase().includes(cleanKeyword) ||
        (b.author?.toLowerCase().includes(cleanKeyword) ?? false) ||
        (b.series_name?.toLowerCase().includes(cleanKeyword) ?? false) ||
        (b.genre_tags?.toLowerCase().includes(cleanKeyword) ?? false) ||
        shelves.some((s) => s.toLowerCase().includes(cleanKeyword)) ||
        (b.type?.toLowerCase().includes(cleanKeyword) ?? false)
      );
    },
  };
}

/**
 * Compiles a raw query string into a high-performance filtering predicate.
 * Supports:
 * - Union: "OR" or "|"
 * - Intersection: whitespace (AND)
 * - Negation: "-" or "!"
 * - Exact phrases: "..."
 * - Structured qualifiers: author:, title:, series:, tag: / #, shelf:, type:, status:, rating:, is:fav, etc.
 */
export function compileSearchQuery(rawQuery: string): (book: Book) => boolean {
  const raw = rawQuery.trim();
  if (!raw) return () => true;

  // Split by OR or |
  const rawClauses = raw
    .split(/\s+(?:OR|or|\|)\s+|\s*\|\s*/)
    .map((c) => c.trim())
    .filter(Boolean);

  // If user typed only a trailing pipe or empty input, match everything
  if (rawClauses.length === 0) return () => true;

  const clauses: SearchClause[] = [];

  for (const rc of rawClauses) {
    const tokens = tokenizeClause(rc);
    const positive: FilterPredicate[] = [];
    const negative: FilterPredicate[] = [];

    for (const t of tokens) {
      const parsed = buildTokenPredicate(t);
      if (!parsed) continue;

      if (parsed.isNegative) {
        negative.push(parsed.predicate);
      } else {
        positive.push(parsed.predicate);
      }
    }

    if (positive.length > 0 || negative.length > 0) {
      clauses.push({
        positiveFilters: positive,
        negativeFilters: negative,
      });
    }
  }

  if (clauses.length === 0) return () => true;

  return (book: Book): boolean => {
    // Book matches if it satisfies ANY clause (OR)
    return clauses.some((clause) => {
      // Must NOT match any negative filters
      for (const neg of clause.negativeFilters) {
        if (neg(book)) return false;
      }
      // Must match ALL positive filters in this clause (AND)
      for (const pos of clause.positiveFilters) {
        if (!pos(book)) return false;
      }
      return true;
    });
  };
}
