import assert from 'node:assert';
import { test } from 'node:test';
import {
  calculateProgressPercentage,
  formatProgressText,
  getDefaultUnitType,
  getStatusAwareProgressText,
  isCaughtUp,
  normalizeStatusTransition,
} from '../lib/progress';
import type { Book } from '../lib/types';

// Helper to construct mock book objects
function createBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'test-id',
    title: 'Test Book',
    type: 'Novel',
    unit_type: 'pages',
    progress_structure: 'single',
    parent_progress: null,
    parent_total: null,
    latest_units: null,
    is_ongoing: false,
    author: 'Test Author',
    status: 'Plan to Read',
    rating: null,
    progress: 0,
    total_units: 500,
    genre_tags: null,
    source_link: null,
    cover_url: null,
    date_started: null,
    date_finished: null,
    reading_pace: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

test('getDefaultUnitType defaults correctly by publication type', () => {
  assert.strictEqual(getDefaultUnitType('Novel'), 'pages');
  assert.strictEqual(getDefaultUnitType('Light Novel'), 'chapters');
  assert.strictEqual(getDefaultUnitType('Web Novel'), 'chapters');
  assert.strictEqual(getDefaultUnitType('Fanfiction'), 'chapters');
  assert.strictEqual(getDefaultUnitType('Essay'), 'pages');
});

test('Single Level (Pages) - Planned & In Progress', () => {
  const planned = createBook({ progress: 0, total_units: 500, status: 'Plan to Read' });
  assert.strictEqual(formatProgressText(planned), '0 / 500 pages');
  assert.strictEqual(calculateProgressPercentage(planned), 0);

  const reading = createBook({ progress: 245, total_units: 500, status: 'Reading' });
  assert.strictEqual(formatProgressText(reading), '245 / 500 pages');
  assert.strictEqual(calculateProgressPercentage(reading), 49);
});

test('Single Level (Chapters) - In Progress', () => {
  const book = createBook({
    unit_type: 'chapters',
    progress: 42,
    total_units: 120,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(book), 'Ch. 42 / 120');
  assert.strictEqual(calculateProgressPercentage(book), 35);
});

test('Single Level (Words) - Formatted Numbers', () => {
  const book = createBook({
    unit_type: 'words',
    progress: 50000,
    total_units: 120000,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(book), '50,000 / 120,000 words');
  assert.strictEqual(calculateProgressPercentage(book), 42);
});

test('Light Novel (Volumes + Volume -> Chapter) - Planned State (User Bug Case)', () => {
  const book = createBook({
    type: 'Light Novel',
    unit_type: 'volumes',
    progress_structure: 'volume_chapter',
    progress: 0,
    parent_progress: null,
    parent_total: 17,
    total_units: 17,
    status: 'Plan to Read',
  });
  // Must render Vol. 0 / 17, NOT Ch. 0 / 17!
  assert.strictEqual(formatProgressText(book), 'Vol. 0 / 17');
  assert.strictEqual(calculateProgressPercentage(book), 0);
});

test('Light Novel (Volumes + Volume -> Chapter) - Active Reading State', () => {
  const book = createBook({
    type: 'Light Novel',
    unit_type: 'volumes',
    progress_structure: 'volume_chapter',
    progress: 3,
    parent_progress: 3,
    parent_total: 17,
    total_units: 17,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(book), 'Vol. 3 / 17');
  assert.strictEqual(calculateProgressPercentage(book), 18);
});

test('Light Novel (Chapters + Volume -> Chapter) - Multi-Tier Progress (Continuous)', () => {
  const book = createBook({
    type: 'Light Novel',
    unit_type: 'chapters',
    progress_structure: 'volume_chapter',
    parent_progress: 3,
    parent_total: 5,
    progress: 18,
    total_units: 80,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(book), 'Vol. 3 • Ch. 18 / 80');
  assert.strictEqual(calculateProgressPercentage(book), 23);
});

test('Light Novel (Chapters + Volume -> Chapter) - Multi-Tier Progress (Per-Volume Reset)', () => {
  const book = createBook({
    type: 'Light Novel',
    unit_type: 'chapters',
    progress_structure: 'volume_chapter',
    parent_progress: 3,
    parent_total: 12,
    progress: 2,
    total_units: null,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(book), 'Vol. 3 / 12 • Ch. 2');
  assert.strictEqual(calculateProgressPercentage(book), 25);
});

test('Web Novel (Pages + Volume -> Chapter) - Multi-Tier Progress', () => {
  const book = createBook({
    type: 'Web Novel',
    unit_type: 'pages',
    progress_structure: 'volume_chapter',
    parent_progress: 3,
    parent_total: 5,
    progress: 450,
    total_units: 1200,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(book), 'Vol. 3 • 450 pages / 1200');
  assert.strictEqual(calculateProgressPercentage(book), 38);
});

test('Ongoing Serialization - Behind & Caught Up', () => {
  const behind = createBook({
    unit_type: 'chapters',
    progress: 210,
    latest_units: 250,
    total_units: null,
    is_ongoing: true,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(behind), 'Ch. 210 (40 behind)');
  assert.strictEqual(calculateProgressPercentage(behind), 84);
  assert.strictEqual(isCaughtUp(behind), false);

  const caughtUp = createBook({
    unit_type: 'chapters',
    progress: 250,
    latest_units: 250,
    total_units: null,
    is_ongoing: true,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(caughtUp), 'Ch. 250 • Caught Up');
  assert.strictEqual(calculateProgressPercentage(caughtUp), 100);
  assert.strictEqual(isCaughtUp(caughtUp), true);
});

test('Ongoing Serialization - Unknown Total Units', () => {
  const book = createBook({
    unit_type: 'chapters',
    progress: 182,
    latest_units: null,
    total_units: null,
    is_ongoing: true,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(book), 'Ch. 182 (Ongoing)');
  assert.strictEqual(calculateProgressPercentage(book), null);
  assert.strictEqual(isCaughtUp(book), false);
});

test('Part -> Chapter with Volumes Unit Type', () => {
  const book = createBook({
    type: 'Collection',
    unit_type: 'volumes',
    progress_structure: 'part_chapter',
    parent_progress: 2,
    parent_total: 4,
    progress: 3,
    total_units: 10,
    status: 'Reading',
  });
  assert.strictEqual(formatProgressText(book), 'Part II • Vol. 3 / 10');
  assert.strictEqual(calculateProgressPercentage(book), 30);
});

test('normalizeStatusTransition handles Reading transition with date_started', () => {
  const book = createBook({ status: 'Plan to Read', date_started: null });
  const patch = normalizeStatusTransition(book, 'Reading', '2026-08-15');
  assert.strictEqual(patch.status, 'Reading');
  assert.strictEqual(patch.date_started, '2026-08-15');
});

test('normalizeStatusTransition handles Completed transition auto-filling progress and clearing ongoing', () => {
  const fixedBook = createBook({
    status: 'Reading',
    total_units: 155,
    progress: 37,
    is_ongoing: true,
    progress_structure: 'volume_chapter',
    parent_total: 18,
    parent_progress: 5,
  });
  const patch = normalizeStatusTransition(fixedBook, 'Completed', '2026-08-15');
  assert.strictEqual(patch.status, 'Completed');
  assert.strictEqual(patch.is_ongoing, false);
  assert.strictEqual(patch.progress, 155);
  assert.strictEqual(patch.parent_progress, 18);
  assert.strictEqual(patch.date_finished, '2026-08-15');
  assert.strictEqual(patch.date_started, '2026-08-15');
});

test('normalizeStatusTransition handles Completed for ongoing work with latest_units', () => {
  const ongoingBook = createBook({
    status: 'Reading',
    total_units: null,
    latest_units: 201,
    progress: 50,
    is_ongoing: true,
  });
  const patch = normalizeStatusTransition(ongoingBook, 'Completed', '2026-08-15');
  assert.strictEqual(patch.status, 'Completed');
  assert.strictEqual(patch.is_ongoing, false);
  assert.strictEqual(patch.total_units, 201);
  assert.strictEqual(patch.progress, 201);
});

test('getStatusAwareProgressText presents clean summary for planned works', () => {
  const plannedSingle = createBook({
    status: 'Plan to Read',
    progress: 0,
    total_units: 350,
    unit_type: 'pages',
  });
  assert.strictEqual(getStatusAwareProgressText(plannedSingle), '350 pages');

  const plannedHierarchical = createBook({
    status: 'Plan to Read',
    progress: 0,
    total_units: 155,
    unit_type: 'chapters',
    progress_structure: 'volume_chapter',
    parent_total: 18,
  });
  assert.strictEqual(getStatusAwareProgressText(plannedHierarchical), '155 chapters • 18 vols');
});
