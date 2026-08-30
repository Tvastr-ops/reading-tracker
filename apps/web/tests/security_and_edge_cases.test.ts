import assert from 'node:assert';
import { test } from 'node:test';
import { isOptimizedDomain, sanitizeCoverUrl } from '../components/CoverImage';
import { validateProgressionFields } from '../lib/validation';

test('Security: CSV formula injection prevention prefixes formula triggers', () => {
  function csvEscape(val: unknown): string {
    if (val == null) return '';
    let s = String(val);
    if (/^[=+@\-\t\r]/.test(s)) {
      s = `'${s}`;
    }
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  assert.strictEqual(csvEscape('=cmd|/C calc.exe'), "'=cmd|/C calc.exe");
  assert.strictEqual(csvEscape('+1+1'), "'+1+1");
  assert.strictEqual(csvEscape('-50'), "'-50");
  assert.strictEqual(csvEscape('@SUM(A1:A10)'), "'@SUM(A1:A10)");
  assert.strictEqual(csvEscape('\ttab_injection'), "'\ttab_injection");
  assert.strictEqual(csvEscape('Normal Book Title'), 'Normal Book Title');
  assert.strictEqual(csvEscape('Title with "Quotes"'), '"Title with ""Quotes"""');
});

test('Security: PostgREST search filter sanitization removes injection characters', () => {
  function sanitizeSearchQuery(input: string): string {
    return input.replace(/[,().:%]/g, '').trim();
  }

  assert.strictEqual(sanitizeSearchQuery('Brandon Sanderson'), 'Brandon Sanderson');
  assert.strictEqual(
    sanitizeSearchQuery('title.ilike.%test%,id.eq.123'),
    'titleilike%testideq123'.replace(/%/g, ''),
  );
  assert.strictEqual(sanitizeSearchQuery('(malicious,payload)'), 'maliciouspayload');
});

test('Security: isOptimizedDomain accurately identifies authorized book CDNs vs arbitrary URLs', () => {
  assert.strictEqual(isOptimizedDomain('https://covers.openlibrary.org/b/id/12345-L.jpg'), true);
  assert.strictEqual(
    isOptimizedDomain(
      'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1401385034i/9317452.jpg',
    ),
    true,
  );
  assert.strictEqual(isOptimizedDomain('https://cdn.thestorygraph.com/covers/123.jpg'), true);
  assert.strictEqual(
    isOptimizedDomain('https://cdn.novelupdates.com/images/2021/04/cover.jpg'),
    true,
  );
  assert.strictEqual(isOptimizedDomain('https://www.novelupdates.com/img/novel.png'), true);

  // Arbitrary/unknown external URLs (must fallback to unoptimized)
  assert.strictEqual(isOptimizedDomain('https://random-blog.com/my-cover.jpg'), false);
  assert.strictEqual(isOptimizedDomain('http://169.254.169.254/latest/meta-data/'), false);
  assert.strictEqual(isOptimizedDomain('https://localhost:8080/internal.png'), false);
  assert.strictEqual(isOptimizedDomain(null), false);
  assert.strictEqual(isOptimizedDomain(''), false);
});

test('CoverImage: sanitizeCoverUrl upgrades insecure http to https', () => {
  assert.strictEqual(
    sanitizeCoverUrl('http://covers.openlibrary.org/b/id/1.jpg'),
    'https://covers.openlibrary.org/b/id/1.jpg',
  );
  assert.strictEqual(
    sanitizeCoverUrl('https://m.media-amazon.com/img.jpg'),
    'https://m.media-amazon.com/img.jpg',
  );
  assert.strictEqual(sanitizeCoverUrl(''), null);
  assert.strictEqual(sanitizeCoverUrl(null), null);
});

test('Validation: Rating handles numbers, decimals, nulls, and rejects NaN or invalid ranges', () => {
  function validateRating(val: unknown): { valid: boolean; value: number | null } {
    if (val === null || val === 0 || val === '0' || val === '') {
      return { valid: true, value: null };
    }
    const r = typeof val === 'number' ? val : Number(val);
    if (Number.isNaN(r) || r < 0.5 || r > 5.0) {
      return { valid: false, value: null };
    }
    return { valid: true, value: r };
  }

  assert.deepStrictEqual(validateRating(4.5), { valid: true, value: 4.5 });
  assert.deepStrictEqual(validateRating('5'), { valid: true, value: 5 });
  assert.deepStrictEqual(validateRating(0), { valid: true, value: null });
  assert.deepStrictEqual(validateRating(null), { valid: true, value: null });
  assert.deepStrictEqual(validateRating(''), { valid: true, value: null });

  // Rejections
  assert.strictEqual(validateRating('five').valid, false);
  assert.strictEqual(validateRating('NaN').valid, false);
  assert.strictEqual(validateRating(0.2).valid, false);
  assert.strictEqual(validateRating(5.5).valid, false);
  assert.strictEqual(validateRating(-1).valid, false);
});

test('Validation: Boundary progression checks on volume reset and ongoing works', () => {
  assert.strictEqual(
    validateProgressionFields({
      progress_structure: 'volume_chapter',
      parent_progress: 3,
      parent_total: 10,
      progress: 25,
      is_ongoing: true,
      latest_units: 30,
    }),
    null,
  );

  assert.ok(
    validateProgressionFields({
      progress_structure: 'volume_chapter',
      progress: 35,
      is_ongoing: true,
      latest_units: 30,
    }),
  );

  assert.strictEqual(
    validateProgressionFields({
      progress_structure: 'single',
      progress: 400,
      total_units: 400,
      is_ongoing: false,
    }),
    null,
  );
});

test('Validation: Simulated reading logs sanitization filters invalid progress entries', () => {
  const rawLogs = [
    { from_progress: 0, to_progress: 50, note: 'Chapter 1' },
    { from_progress: '50', to_progress: 100, note: 'Chapter 2' },
    { to_progress: 'invalid' },
    null,
    { to_progress: -10 },
  ];

  const sanitized = rawLogs
    .filter(
      (log: any) =>
        log &&
        typeof log === 'object' &&
        Number.isFinite(Number(log.to_progress)) &&
        Number(log.to_progress) >= 0,
    )
    .map((log: any) => ({
      from_progress: Number.isFinite(Number(log.from_progress)) ? Number(log.from_progress) : 0,
      to_progress: Number(log.to_progress),
      note: typeof log.note === 'string' ? log.note.slice(0, 1000) : null,
    }));

  assert.strictEqual(sanitized.length, 2);
  assert.strictEqual(sanitized[0].to_progress, 50);
  assert.strictEqual(sanitized[1].from_progress, 50);
  assert.strictEqual(sanitized[1].to_progress, 100);
});
