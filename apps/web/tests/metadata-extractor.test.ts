import assert from 'node:assert';
import { test } from 'node:test';
import {
  isPrivateOrReservedHost,
  normalizeIsbn,
  normalizeMangaBakaId,
  parseAO3,
  parseMangaBakaSeries,
  parseOpenLibraryBookJson,
  parseRoyalRoad,
  parseUniversalOpenGraph,
  validateTargetUrl,
} from '../lib/metadata-extractor';

test('SSRF Protection: isPrivateOrReservedHost blocks local and private IPs', () => {
  assert.strictEqual(isPrivateOrReservedHost('localhost'), true);
  assert.strictEqual(isPrivateOrReservedHost('127.0.0.1'), true);
  assert.strictEqual(isPrivateOrReservedHost('0.0.0.0'), true);
  assert.strictEqual(isPrivateOrReservedHost('::1'), true);
  assert.strictEqual(isPrivateOrReservedHost('app.local'), true);
  assert.strictEqual(isPrivateOrReservedHost('internal.service.localhost'), true);

  // Private IPv4 subnets
  assert.strictEqual(isPrivateOrReservedHost('10.0.0.1'), true);
  assert.strictEqual(isPrivateOrReservedHost('10.255.255.254'), true);
  assert.strictEqual(isPrivateOrReservedHost('172.16.0.1'), true);
  assert.strictEqual(isPrivateOrReservedHost('172.31.255.255'), true);
  assert.strictEqual(isPrivateOrReservedHost('192.168.1.1'), true);
  assert.strictEqual(isPrivateOrReservedHost('169.254.169.254'), true);

  // Valid public hostnames
  assert.strictEqual(isPrivateOrReservedHost('royalroad.com'), false);
  assert.strictEqual(isPrivateOrReservedHost('mangabaka.org'), false);
  assert.strictEqual(isPrivateOrReservedHost('openlibrary.org'), false);
  assert.strictEqual(isPrivateOrReservedHost('8.8.8.8'), false);
});

test('URL Validation: validateTargetUrl enforces HTTP/HTTPS and public domains', () => {
  assert.strictEqual(validateTargetUrl('').valid, false);
  assert.strictEqual(validateTargetUrl('file:///etc/passwd').valid, false);
  assert.strictEqual(validateTargetUrl('javascript:alert(1)').valid, false);
  assert.strictEqual(validateTargetUrl('http://127.0.0.1:3000/admin').valid, false);
  assert.strictEqual(validateTargetUrl('http://192.168.1.50/config').valid, false);

  const valid = validateTargetUrl('https://www.royalroad.com/fiction/21220/mother-of-learning');
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.url?.hostname, 'www.royalroad.com');
});

test('Metadata Parser: Royal Road HTML parser extracts clean metadata', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="Mother of Learning" />
        <meta property="books:author" content="nobody103" />
        <meta property="og:description" content="Zorian is a teenage mage of humble birth and slightly above-average skill..." />
        <meta property="og:image" content="https://www.royalroadcdn.com/public/covers-full/21220-mother-of-learning.jpg" />
      </head>
      <body>
        <h1 class="font-white fiction-title">Mother of Learning</h1>
        <h4 class="author"><a href="/profile/123">nobody103</a></h4>
        <span class="label font-red-sunglo bold">COMPLETED</span>
        <ul class="list-unstyled">
          <li class="bold uppercase">Total Chapters : 108</li>
        </ul>
        <a class="fiction-tag">Fantasy</a>
        <a class="fiction-tag">Time Loop</a>
        <a class="fiction-tag">Magic</a>
      </body>
    </html>
  `;

  const meta = parseRoyalRoad(
    sampleHtml,
    'https://www.royalroad.com/fiction/21220/mother-of-learning',
  );
  assert.strictEqual(meta.title, 'Mother of Learning');
  assert.strictEqual(meta.author, 'nobody103');
  assert.strictEqual(meta.total_units, 108);
  assert.strictEqual(meta.type, 'Web Novel');
  assert.strictEqual(meta.unit_type, 'chapters');
  assert.strictEqual(
    meta.cover_url,
    'https://www.royalroadcdn.com/public/covers-full/21220-mother-of-learning.jpg',
  );
  assert.strictEqual(meta.genre_tags, 'Fantasy, Time Loop, Magic');
  assert.strictEqual(meta.is_ongoing, false);
});

test('Metadata Parser: AO3 HTML parser extracts work details', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="A Wandering Soul" />
        <meta name="author" content="StarlightWriter" />
        <meta property="og:description" content="An exciting adventure across worlds." />
      </head>
      <body>
        <h2 class="title heading">A Wandering Soul</h2>
        <a rel="author" href="/users/123">StarlightWriter</a>
        <dd class="chapters">15/25</dd>
        <dd class="words">45,210</dd>
        <a class="tag">Fantasy Fandom</a>
        <a class="tag">Alternate Universe</a>
      </body>
    </html>
  `;

  const meta = parseAO3(sampleHtml, 'https://archiveofourown.org/works/123456');
  assert.strictEqual(meta.title, 'A Wandering Soul');
  assert.strictEqual(meta.author, 'StarlightWriter');
  assert.strictEqual(meta.total_units, 25);
  assert.strictEqual(meta.type, 'Fanfiction');
  assert.strictEqual(meta.unit_type, 'chapters');
  assert.strictEqual(meta.genre_tags, 'Fantasy Fandom, Alternate Universe');
  assert.strictEqual(meta.is_ongoing, true);
});

test('Metadata Parser: MangaBaka Series JSON parser handles Light Novels', () => {
  const sampleData = {
    id: 84589,
    canonical_url: 'https://mangabaka.org/novel/84589/Mushoku-Tensei-Jobless-Reincarnation',
    authors: ['Rifujin na Magonote'],
    artists: ['Sirotaka'],
    description: 'A 34-year-old shut-in is reborn in a fantasy world.',
    status: 'completed',
    type: 'novel',
    final_volume: 26,
    total_chapters: 334,
    titles: [
      { language: 'en', title: 'Mushoku Tensei: Jobless Reincarnation', is_primary: true },
      { language: 'ja', title: '無職転生', is_primary: true },
    ],
    cover: {
      x350: 'https://cdn.mangabaka.dev/imgproxy/x350/cover.jpg',
      raw: 'https://images.mangabaka.dev/cover_raw.jpg',
    },
  };

  const meta = parseMangaBakaSeries(
    sampleData,
    'https://mangabaka.org/novel/84589/Mushoku-Tensei-Jobless-Reincarnation',
  );
  assert.strictEqual(meta.title, 'Mushoku Tensei: Jobless Reincarnation');
  assert.strictEqual(meta.author, 'Rifujin na Magonote');
  assert.strictEqual(meta.type, 'Light Novel');
  assert.strictEqual(meta.unit_type, 'volumes');
  assert.strictEqual(meta.total_units, 26);
  assert.strictEqual(meta.parent_total, 26);
  assert.strictEqual(meta.progress_structure, 'volume_chapter');
  assert.strictEqual(meta.cover_url, 'https://cdn.mangabaka.dev/imgproxy/x350/cover.jpg');
  assert.strictEqual(meta.is_ongoing, false);
});

test('Metadata Parser: Universal OpenGraph fallback', () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>The Way of Kings by Brandon Sanderson - Goodreads</title>
        <meta property="og:title" content="The Way of Kings" />
        <meta name="author" content="Brandon Sanderson" />
        <meta property="og:description" content="Roshar is a world of stone and storms." />
        <meta property="og:image" content="https://images.goodreads.com/kings.jpg" />
        <meta property="og:site_name" content="Goodreads" />
      </head>
    </html>
  `;

  const meta = parseUniversalOpenGraph(
    sampleHtml,
    'https://www.goodreads.com/book/show/7235533-the-way-of-kings',
  );
  assert.strictEqual(meta.title, 'The Way of Kings');
  assert.strictEqual(meta.author, 'Brandon Sanderson');
  assert.strictEqual(meta.cover_url, 'https://images.goodreads.com/kings.jpg');
  assert.strictEqual(meta.site_name, 'Goodreads');
});

test('Metadata Parser: normalizeIsbn validates and standardizes ISBN-10 and ISBN-13', () => {
  assert.strictEqual(normalizeIsbn('0-8044-2957-X'), '080442957X');
  assert.strictEqual(normalizeIsbn('0140328726'), '0140328726');
  assert.strictEqual(normalizeIsbn('978-0-14-032872-1'), '9780140328721');
  assert.strictEqual(normalizeIsbn('9780140328721'), '9780140328721');
  assert.strictEqual(normalizeIsbn('isbn: 978-0-14-032872-1'), '9780140328721');
  assert.strictEqual(normalizeIsbn('ISBN-13: 9780140328721'), '9780140328721');
  assert.strictEqual(normalizeIsbn('invalid-123'), null);
  assert.strictEqual(normalizeIsbn(''), null);
});

test('Metadata Parser: normalizeMangaBakaId extracts series numeric ID', () => {
  assert.strictEqual(normalizeMangaBakaId('mb:84589'), '84589');
  assert.strictEqual(normalizeMangaBakaId('mangabaka:12345'), '12345');
  assert.strictEqual(normalizeMangaBakaId('mb84589'), '84589');
  assert.strictEqual(normalizeMangaBakaId('other:123'), null);
  assert.strictEqual(normalizeMangaBakaId(''), null);
});

test('Metadata Parser: parseOpenLibraryBookJson extracts book metadata accurately', () => {
  const sampleData = {
    title: 'Dune',
    subtitle: 'The Graphic Novel, Book 1',
    authors: [{ name: 'Frank Herbert' }, { name: 'Brian Herbert' }],
    number_of_pages: 176,
    cover: {
      large: 'https://covers.openlibrary.org/b/id/10523456-L.jpg',
    },
    subjects: [{ name: 'Science Fiction' }, { name: 'Graphic Novels' }],
    notes: 'A visual adaptation of the classic sci-fi novel.',
  };

  const meta = parseOpenLibraryBookJson(sampleData, '9781419731501');
  assert.strictEqual(meta.title, 'Dune: The Graphic Novel, Book 1');
  assert.strictEqual(meta.author, 'Frank Herbert, Brian Herbert');
  assert.strictEqual(meta.total_units, 176);
  assert.strictEqual(meta.unit_type, 'pages');
  assert.strictEqual(meta.type, 'Novel');
  assert.strictEqual(meta.cover_url, 'https://covers.openlibrary.org/b/id/10523456-L.jpg');
  assert.strictEqual(meta.genre_tags, 'Science Fiction, Graphic Novels');
  assert.strictEqual(meta.description, 'A visual adaptation of the classic sci-fi novel.');
  assert.strictEqual(meta.source_link, 'https://openlibrary.org/isbn/9781419731501');
  assert.strictEqual(meta.site_name, 'Open Library');
});
