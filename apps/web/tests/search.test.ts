import assert from 'node:assert';
import { describe, it } from 'node:test';
import { compileSearchQuery } from '../lib/searchParser';
import type { Book } from '../lib/types';

function createMockBook(overrides: Partial<Book>): Book {
  return {
    id: 'b1',
    title: 'The Way of Kings',
    author: 'Brandon Sanderson',
    series_name: 'The Stormlight Archive',
    genre_tags: 'Epic Fantasy, Magic, High Fantasy',
    shelf_names: '["Favorites", "Epic Series"]',
    type: 'Novel',
    status: 'Reading',
    rating: 4.8,
    total_units: 1000,
    progress: 450,
    is_favorite: true,
    is_ongoing: false,
    reread_count: 0,
    cover_url: 'https://covers.openlibrary.org/b/id/123-L.jpg',
    notes: 'Incredible worldbuilding',
    unit_type: 'pages',
    progress_structure: 'single',
    parent_total: null,
    parent_progress: null,
    source_link: null,
    reading_pace: null,
    date_started: null,
    date_finished: null,
    series_order: null,
    deleted_at: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
    ...overrides,
  };
}

describe('Boolean & Structured Search Query Engine', () => {
  const book1 = createMockBook({
    id: '1',
    title: 'The Way of Kings',
    author: 'Brandon Sanderson',
    series_name: 'The Stormlight Archive',
    genre_tags: 'Epic Fantasy, High Fantasy',
    shelf_names: '["Favorites", "Top Tier"]',
    type: 'Novel',
    status: 'Reading',
    rating: 4.9,
    is_favorite: true,
  });

  const book2 = createMockBook({
    id: '2',
    title: 'Dune',
    author: 'Frank Herbert',
    series_name: 'Dune Chronicles',
    genre_tags: 'Sci-Fi, Space Opera',
    shelf_names: '["Sci-Fi Classics"]',
    type: 'Novel',
    status: 'Completed',
    rating: 4.5,
    is_favorite: false,
  });

  const book3 = createMockBook({
    id: '3',
    title: 'Solo Leveling',
    author: 'Chugong',
    series_name: null,
    genre_tags: 'Action, Fantasy, System',
    shelf_names: '["Manhwa"]',
    type: 'Manhwa',
    status: 'Completed',
    rating: 4.0,
    is_favorite: true,
    is_ongoing: false,
  });

  const books = [book1, book2, book3];

  it('handles empty or whitespace search queries', () => {
    const match = compileSearchQuery('');
    assert.strictEqual(books.filter(match).length, 3);

    const matchSpaces = compileSearchQuery('   ');
    assert.strictEqual(books.filter(matchSpaces).length, 3);
  });

  it('performs universal free-text substring matching', () => {
    const match = compileSearchQuery('herbert');
    assert.deepStrictEqual(
      books.filter(match).map((b) => b.id),
      ['2'],
    );

    const matchSeries = compileSearchQuery('Stormlight');
    assert.deepStrictEqual(
      books.filter(matchSeries).map((b) => b.id),
      ['1'],
    );
  });

  it('supports multi-token AND matching', () => {
    const match = compileSearchQuery('brandon kings');
    assert.deepStrictEqual(
      books.filter(match).map((b) => b.id),
      ['1'],
    );

    const matchNoHit = compileSearchQuery('brandon dune');
    assert.deepStrictEqual(
      books.filter(matchNoHit).map((b) => b.id),
      [],
    );
  });

  it('supports exact phrase matching with quotes', () => {
    const match = compileSearchQuery('"The Way of Kings"');
    assert.deepStrictEqual(
      books.filter(match).map((b) => b.id),
      ['1'],
    );

    const matchNoHit = compileSearchQuery('"Kings Way"');
    assert.deepStrictEqual(
      books.filter(matchNoHit).map((b) => b.id),
      [],
    );
  });

  it('supports boolean OR and pipe | operator', () => {
    const match = compileSearchQuery('Dune | Kings');
    assert.deepStrictEqual(
      books.filter(match).map((b) => b.id),
      ['1', '2'],
    );

    const matchOr = compileSearchQuery('Dune OR "Solo Leveling"');
    assert.deepStrictEqual(
      books.filter(matchOr).map((b) => b.id),
      ['2', '3'],
    );
  });

  it('is resilient to in-progress typing with trailing pipes', () => {
    const matchTrailing = compileSearchQuery('Dune | ');
    assert.deepStrictEqual(
      books.filter(matchTrailing).map((b) => b.id),
      ['2'],
    );

    const matchOnlyPipe = compileSearchQuery('|');
    assert.strictEqual(books.filter(matchOnlyPipe).length, 3);
  });

  it('supports negation (- or !)', () => {
    const match = compileSearchQuery('Fantasy -Herbert');
    // book1 has Fantasy, book3 has Fantasy
    assert.deepStrictEqual(
      books.filter(match).map((b) => b.id),
      ['1', '3'],
    );

    const matchTagNegation = compileSearchQuery('-tag:sci-fi');
    assert.deepStrictEqual(
      books.filter(matchTagNegation).map((b) => b.id),
      ['1', '3'],
    );
  });

  it('supports structured field qualifiers (author:, series:, tag:, shelf:, type:, status:)', () => {
    const matchAuthor = compileSearchQuery('author:Herbert');
    assert.deepStrictEqual(
      books.filter(matchAuthor).map((b) => b.id),
      ['2'],
    );

    const matchSeries = compileSearchQuery('series:Dune');
    assert.deepStrictEqual(
      books.filter(matchSeries).map((b) => b.id),
      ['2'],
    );

    const matchTag = compileSearchQuery('#Epic');
    assert.deepStrictEqual(
      books.filter(matchTag).map((b) => b.id),
      ['1'],
    );

    const matchShelf = compileSearchQuery('shelf:Favorites');
    assert.deepStrictEqual(
      books.filter(matchShelf).map((b) => b.id),
      ['1'],
    );

    const matchType = compileSearchQuery('type:manhwa');
    assert.deepStrictEqual(
      books.filter(matchType).map((b) => b.id),
      ['3'],
    );

    const matchStatus = compileSearchQuery('status:reading');
    assert.deepStrictEqual(
      books.filter(matchStatus).map((b) => b.id),
      ['1'],
    );
  });

  it('supports rating comparison expressions (rating>=4.8, stars:5)', () => {
    const matchHighRating = compileSearchQuery('rating>=4.8');
    assert.deepStrictEqual(
      books.filter(matchHighRating).map((b) => b.id),
      ['1'],
    );

    const matchPlus = compileSearchQuery('rating:4.5+');
    assert.deepStrictEqual(
      books.filter(matchPlus).map((b) => b.id),
      ['1', '2'],
    );
  });

  it('supports boolean flags (is:fav, no:cover)', () => {
    const matchFav = compileSearchQuery('is:fav');
    assert.deepStrictEqual(
      books.filter(matchFav).map((b) => b.id),
      ['1', '3'],
    );

    const noCoverBook = createMockBook({ id: '4', title: 'Draft Book', cover_url: null });
    const allWithDraft = [...books, noCoverBook];

    const matchNoCover = compileSearchQuery('no:cover');
    assert.deepStrictEqual(
      allWithDraft.filter(matchNoCover).map((b) => b.id),
      ['4'],
    );
  });

  it('supports smart unit-aware and progress comparison operators', () => {
    // book1: 1000 pages, progress 450 (pages)
    const book2Completed = createMockBook({
      id: '2',
      title: 'Dune',
      total_units: 500,
      progress: 500,
      status: 'Completed',
    });
    const book3WithChapters = createMockBook({
      id: '3',
      title: 'Solo Leveling',
      unit_type: 'chapters',
      total_units: 179,
      progress: 179,
      type: 'Manhwa',
    });
    const sample = [book1, book2Completed, book3WithChapters];

    // pages>400 should ONLY match book1 (1000 pages) and book2 (500 pages), NOT book3 (179 chapters)
    const matchPages = compileSearchQuery('pages>400');
    assert.deepStrictEqual(
      sample.filter(matchPages).map((b) => b.id),
      ['1', '2'],
    );

    // ch>100 should ONLY match book3 (179 chapters)
    const matchChapters = compileSearchQuery('ch>100');
    assert.deepStrictEqual(
      sample.filter(matchChapters).map((b) => b.id),
      ['3'],
    );

    // units>150 matches any book with >150 total units regardless of unit_type
    const matchUniversal = compileSearchQuery('units>150');
    assert.deepStrictEqual(
      sample.filter(matchUniversal).map((b) => b.id),
      ['1', '2', '3'],
    );

    // progress>=450 checks current read progress
    const matchProgress = compileSearchQuery('progress>=450');
    assert.deepStrictEqual(
      sample.filter(matchProgress).map((b) => b.id),
      ['1', '2'],
    );

    // percent=100% or progress:100% matches completed works
    const matchPercent = compileSearchQuery('percent=100%');
    assert.deepStrictEqual(
      sample.filter(matchPercent).map((b) => b.id),
      ['2', '3'],
    );

    // unread>0 matches works with remaining units
    const matchUnread = compileSearchQuery('unread>0');
    assert.deepStrictEqual(
      sample.filter(matchUnread).map((b) => b.id),
      ['1'],
    );

    // unit:chapters filters by active unit type
    const matchUnitFilter = compileSearchQuery('unit:chapters');
    assert.deepStrictEqual(
      sample.filter(matchUnitFilter).map((b) => b.id),
      ['3'],
    );
  });
});
