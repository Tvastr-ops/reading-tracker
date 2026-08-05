import type { Book, ProgressStructure, UnitType } from './types';

export function getDefaultUnitType(type: string): UnitType {
  switch (type) {
    case 'Web Novel':
    case 'Light Novel':
    case 'Fanfiction':
      return 'chapters';
    case 'Novel':
    case 'Novella':
    case 'Novelette':
    case 'Short Story':
    case 'Collection':
    case 'Anthology':
    case 'Essay':
    default:
      return 'pages';
  }
}

export function getDefaultStructure(_type: string): ProgressStructure {
  return 'single';
}

function toRoman(num: number): string {
  const lookup: Record<string, number> = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1,
  };
  let roman = '';
  let n = Math.floor(num);
  for (const i in lookup) {
    while (n >= lookup[i]) {
      roman += i;
      n -= lookup[i];
    }
  }
  return roman || String(num);
}

export function isCaughtUp(book: Book): boolean {
  if (!book.is_ongoing || book.latest_units == null || book.progress == null) {
    return false;
  }
  return book.progress >= book.latest_units;
}

export function calculateProgressPercentage(book: Book): number | null {
  const current = book.progress ?? 0;
  if (book.total_units && book.total_units > 0) {
    return Math.min(100, Math.round((current / book.total_units) * 100));
  }
  if (book.is_ongoing && book.latest_units && book.latest_units > 0) {
    return Math.min(100, Math.round((current / book.latest_units) * 100));
  }
  return null;
}

export function formatProgressText(book: Book): string {
  const unit = book.unit_type || 'pages';
  const structure = book.progress_structure || 'single';
  const current = book.progress ?? 0;
  const total = book.total_units;
  const parentProg = book.parent_progress;

  let baseText = '';

  if (structure === 'volume_chapter') {
    const volStr = parentProg != null ? `Vol. ${parentProg}` : '';
    const chStr = `Ch. ${current}`;
    if (volStr && current > 0) {
      baseText = `${volStr} • ${chStr}`;
    } else if (volStr) {
      baseText = volStr;
    } else {
      baseText = chStr;
    }
    if (total != null && total > 0) {
      baseText += ` / ${total}`;
    }
  } else if (structure === 'part_chapter') {
    const partStr = parentProg != null ? `Part ${toRoman(parentProg)}` : '';
    const chStr = `Ch. ${current}`;
    if (partStr && current > 0) {
      baseText = `${partStr} • ${chStr}`;
    } else if (partStr) {
      baseText = partStr;
    } else {
      baseText = chStr;
    }
    if (total != null && total > 0) {
      baseText += ` / ${total}`;
    }
  } else {
    // Single level
    if (unit === 'chapters') {
      baseText = total != null && total > 0 ? `Ch. ${current} / ${total}` : `Ch. ${current}`;
    } else if (unit === 'words') {
      const formattedCurrent = current.toLocaleString('en-US');
      baseText =
        total != null && total > 0
          ? `${formattedCurrent} / ${total.toLocaleString('en-US')} words`
          : `${formattedCurrent} words`;
    } else if (unit === 'percent') {
      baseText = `${current}%`;
    } else if (unit === 'units') {
      baseText = total != null && total > 0 ? `${current} / ${total} units` : `${current} units`;
    } else {
      // Default: pages
      baseText = total != null && total > 0 ? `${current} / ${total} pages` : `${current} pages`;
    }
  }

  // Ongoing annotations
  if (book.is_ongoing) {
    if (book.latest_units != null && book.latest_units > 0) {
      if (current >= book.latest_units) {
        baseText += ' • Caught Up';
      } else {
        const behind = book.latest_units - current;
        baseText += ` (${behind} behind)`;
      }
    } else {
      baseText += ' (Ongoing)';
    }
  }

  return baseText;
}
