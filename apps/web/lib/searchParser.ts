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

  // 9. Page count / Units: pages>500, pages<=200, pages:500
  const pagesMatch = /^(?:pages|units)(?::|>=|<=|>|<|=)(.+)$/i.exec(token);
  if (pagesMatch) {
    const opAndVal = token.substring(token.search(/[:<>=]/));
    const cleanExpr = opAndVal.startsWith(':') ? opAndVal.substring(1) : opAndVal;
    const comp = parseNumericComparison(stripQuotes(cleanExpr));
    if (comp) {
      return {
        isNegative,
        predicate: (b) => comp(b.total_units || b.progress),
      };
    }
  }

  // 10. Boolean flags: is:fav, is:favorite, is:ongoing, is:reread, no:cover, has:cover, has:notes, no:notes
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
