import assert from 'node:assert';
import test from 'node:test';
import JSZip from 'jszip';
import {
  buildAuthorMarkdown,
  buildBookMarkdown,
  buildBookshelfDashboard,
  buildCanvasJson,
  buildSeriesMarkdown,
  buildStatsDashboard,
  escapeYaml,
  generateObsidianVaultZip,
  safeFilename,
} from '../lib/obsidian-exporter';
import type { Book, ReadingLogEntry } from '../lib/types';

test('Obsidian Exporter (Web): safeFilename sanitizes filenames', () => {
  assert.strictEqual(safeFilename('Dune: Part One / Special?'), 'Dune- Part One - Special-');
  assert.strictEqual(safeFilename('Re:Zero <Volume 1>*'), 'Re-Zero -Volume 1--');
  assert.strictEqual(safeFilename('Trailing dots....'), 'Trailing dots');
  assert.strictEqual(safeFilename(''), 'Untitled');
});

test('Obsidian Exporter (Web): escapeYaml escapes quotes and special chars', () => {
  assert.strictEqual(escapeYaml('Simple Title'), '"Simple Title"');
  assert.strictEqual(escapeYaml('Title "with" quotes'), '"Title \\"with\\" quotes"');
  assert.strictEqual(escapeYaml(''), '""');
  assert.strictEqual(escapeYaml(null), '""');
});

test('Obsidian Exporter (Web): buildBookMarkdown formats frontmatter and callouts', () => {
  const sampleBook: Book = {
    id: 'b1',
    title: 'The Way of Kings',
    author: 'Brandon Sanderson',
    series_name: 'The Stormlight Archive',
    series_order: 1,
    status: 'Reading',
    rating: 5,
    progress: 680,
    total_units: 1007,
    unit_type: 'pages',
    type: 'Novel',
    is_ongoing: false,
    is_favorite: true,
    date_started: '2026-08-01',
    date_finished: null,
    cover_url: 'https://example.com/cover.jpg',
    description: 'Epic high fantasy novel.',
    notes: 'Incredible climactic sequence.',
    source_link: 'https://brandonsanderson.com\nhttps://goodreads.com/book/show/7235533',
    genre_tags: 'Fantasy, Epic, High Fantasy',
    deleted_at: null,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
    reading_pace: null,
  };

  const sampleLogs: ReadingLogEntry[] = [
    {
      id: 'l1',
      book_id: 'b1',
      from_progress: 630,
      to_progress: 680,
      logged_at: '2026-08-20T14:30:00Z',
      note: 'Tower battle chapter',
    },
  ];

  const md = buildBookMarkdown(sampleBook, sampleLogs);

  // Check YAML Frontmatter
  assert.match(md, /---/);
  assert.match(md, /title: "The Way of Kings"/);
  assert.match(md, /author: "\[\[Authors\/Brandon Sanderson\|Brandon Sanderson\]\]"/);
  assert.match(md, /series: "\[\[Series\/The Stormlight Archive\|The Stormlight Archive\]\]"/);
  assert.match(md, /series_order: 1/);
  assert.match(md, /status: "Reading"/);
  assert.match(md, /rating: 5/);
  assert.match(md, /progress: 680/);
  assert.match(md, /total: 1007/);
  assert.match(md, /cover: "https:\/\/example\.com\/cover\.jpg"/);
  assert.match(md, /- favorite/);
  assert.match(md, /sources:/);

  // Check Callouts
  assert.match(md, /> \[!abstract\] Synopsis/);
  assert.match(md, /> Epic high fantasy novel\./);
  assert.match(md, /> \[!quote\] Personal Review & Notes/);
  assert.match(md, /> Incredible climactic sequence\./);
  assert.match(md, /> \[!timeline\] Reading Log Timeline/);
  assert.match(md, /Tower battle chapter/);
  assert.match(md, /Read 50 pages \(Progress: 680\)/);
});

test('Obsidian Exporter (Web): buildAuthorMarkdown links books', () => {
  const books: Book[] = [
    {
      id: 'b1',
      title: 'Mistborn',
      author: 'Brandon Sanderson',
      status: 'Completed',
      rating: 5,
      progress: 540,
      total_units: 540,
      type: 'Novel',
      notes: null,
      source_link: null,
      cover_url: null,
      genre_tags: null,
      date_started: null,
      date_finished: null,
      deleted_at: null,
      created_at: '',
      updated_at: '',
      reading_pace: null,
    },
  ];

  const md = buildAuthorMarkdown('Brandon Sanderson', books);
  assert.match(md, /title: "Brandon Sanderson"/);
  assert.match(md, /type: author/);
  assert.match(md, /\[\[Books\/Mistborn\|Mistborn\]\]/);
});

test('Obsidian Exporter (Web): buildSeriesMarkdown orders volumes with checklist', () => {
  const books: Book[] = [
    {
      id: 'b2',
      title: 'Words of Radiance',
      author: 'Brandon Sanderson',
      series_name: 'The Stormlight Archive',
      series_order: 2,
      status: 'Plan to Read',
      rating: null,
      progress: 0,
      total_units: 1087,
      type: 'Novel',
      notes: null,
      source_link: null,
      cover_url: null,
      genre_tags: null,
      date_started: null,
      date_finished: null,
      deleted_at: null,
      created_at: '',
      updated_at: '',
      reading_pace: null,
    },
    {
      id: 'b1',
      title: 'The Way of Kings',
      author: 'Brandon Sanderson',
      series_name: 'The Stormlight Archive',
      series_order: 1,
      status: 'Completed',
      rating: 5,
      progress: 1007,
      total_units: 1007,
      type: 'Novel',
      notes: null,
      source_link: null,
      cover_url: null,
      genre_tags: null,
      date_started: null,
      date_finished: null,
      deleted_at: null,
      created_at: '',
      updated_at: '',
      reading_pace: null,
    },
  ];

  const md = buildSeriesMarkdown('The Stormlight Archive', books);
  assert.match(md, /title: "The Stormlight Archive"/);
  assert.match(md, /type: series/);
  // Volume 1 should appear before Volume 2
  const v1Index = md.indexOf('The Way of Kings');
  const v2Index = md.indexOf('Words of Radiance');
  assert.ok(v1Index < v2Index, 'Volume 1 should be ordered before Volume 2');
  assert.match(md, /- \[x\] #1 · \[\[Books\/The Way of Kings\|The Way of Kings\]\]/);
  assert.match(md, /- \[ \] #2 · \[\[Books\/Words of Radiance\|Words of Radiance\]\]/);
});

test('Obsidian Exporter (Web): generateObsidianVaultZip packages full vault', async () => {
  const books: Book[] = [
    {
      id: 'b1',
      title: 'Overlord, Vol. 1',
      author: 'Kugane Maruyama',
      series_name: 'Overlord',
      series_order: 1,
      status: 'Completed',
      rating: 4.8,
      progress: 14,
      total_units: 14,
      type: 'Light Novel',
      notes: 'Great start',
      source_link: 'https://mangabaka.org/series/1',
      cover_url: null,
      genre_tags: 'Isekai, Dark Fantasy',
      date_started: null,
      date_finished: null,
      deleted_at: null,
      created_at: '',
      updated_at: '',
      reading_pace: null,
    },
    {
      id: 'b2',
      title: 'Shadow Slave',
      author: 'Guiltythree',
      series_name: null,
      series_order: null,
      status: 'Reading',
      rating: 4.9,
      progress: 1500,
      total_units: null,
      type: 'Web Novel',
      notes: null,
      source_link: null,
      cover_url: null,
      genre_tags: null,
      date_started: null,
      date_finished: null,
      deleted_at: null,
      created_at: '',
      updated_at: '',
      reading_pace: null,
    },
  ];

  const zipBytes = await generateObsidianVaultZip(books);
  assert.ok(zipBytes.length > 0, 'Zip output should not be empty');

  // Inspect zip entries via JSZip
  const zip = await JSZip.loadAsync(zipBytes);
  const fileNames = Object.keys(zip.files);

  assert.ok(fileNames.includes('00 📚 Bookshelf.md'), 'Includes Bookshelf dashboard');
  assert.ok(fileNames.includes('01 📊 Reading Stats.md'), 'Includes Reading Stats dashboard');
  assert.ok(fileNames.includes('02 🌌 Reading Universe.canvas'), 'Includes Canvas graph');
  assert.ok(fileNames.includes('Books/Overlord, Vol. 1.md'), 'Includes Overlord note');
  assert.ok(fileNames.includes('Books/Shadow Slave.md'), 'Includes Shadow Slave note');
  assert.ok(
    fileNames.includes('Authors/Kugane Maruyama.md'),
    'Includes Kugane Maruyama author note',
  );
  assert.ok(fileNames.includes('Series/Overlord.md'), 'Includes Overlord series note');
  assert.ok(fileNames.includes('.obsidian/app.json'), 'Includes .obsidian app.json');
  assert.ok(
    fileNames.includes('.obsidian/core-plugins.json'),
    'Includes .obsidian core-plugins.json',
  );
  assert.ok(fileNames.includes('.obsidian/snippets/reading-vault.css'), 'Includes CSS snippet');
});

test('Obsidian Exporter (Web): dashboards and canvas generators produce valid content', () => {
  const books: Book[] = [
    {
      id: 'b1',
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'Reading',
      rating: 5,
      progress: 200,
      total_units: 600,
      type: 'Novel',
      notes: null,
      source_link: null,
      cover_url: null,
      genre_tags: null,
      date_started: null,
      date_finished: null,
      deleted_at: null,
      created_at: '',
      updated_at: '',
      reading_pace: null,
    },
  ];

  const bookshelf = buildBookshelfDashboard(books);
  assert.match(bookshelf, /# 📚 Library Bookshelf/);
  assert.match(bookshelf, /## 📖 Currently Reading \(1\)/);

  const stats = buildStatsDashboard(books, []);
  assert.match(stats, /# 📊 Reading Analytics & Insights/);
  assert.match(stats, /Total Tracked Works\*\*: 1/);

  const canvas = JSON.parse(buildCanvasJson(books));
  assert.ok(Array.isArray(canvas.nodes), 'Canvas nodes should be an array');
  assert.ok(Array.isArray(canvas.edges), 'Canvas edges should be an array');
});
