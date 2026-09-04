import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

export interface EnrichmentResult {
  id: string;
  source: 'openlibrary' | 'googlebooks' | 'anilist';
  sourceLabel: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  total_units: number | null;
  unit_type: 'pages' | 'chapters' | 'volumes' | null;
  description: string | null;
  publisher: string | null;
  published_year: number | null;
  genre_tags: string | null;
  isbn: string | null;
  series_name: string | null;
  series_order: number | null;
  is_ongoing: boolean | null;
  external_link: string | null;
}

function stripHtml(html?: string | null): string | null {
  if (!html) return null;
  return html
    .replace(/<br\s*[/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function cleanIsbnString(val: string): string | null {
  const cleaned = val.replace(/[^0-9X]/gi, '');
  if (cleaned.length === 10 || cleaned.length === 13) {
    return cleaned;
  }
  return null;
}

async function queryOpenLibrary(
  query: string,
  isbnCandidate: string | null,
): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];
  try {
    const fetchPromises: Promise<any>[] = [];

    if (isbnCandidate) {
      fetchPromises.push(
        fetch(`https://openlibrary.org/isbn/${isbnCandidate}.json`, {
          headers: {
            'User-Agent':
              'PaperbackReadingTracker/2.8 (https://github.com/Tvastr-ops/reading-tracker)',
          },
          signal: AbortSignal.timeout(5000),
        })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      );
    }

    const searchUrl = isbnCandidate
      ? `https://openlibrary.org/search.json?isbn=${isbnCandidate}&limit=5`
      : `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6`;

    fetchPromises.push(
      fetch(searchUrl, {
        headers: {
          'User-Agent':
            'PaperbackReadingTracker/2.8 (https://github.com/Tvastr-ops/reading-tracker)',
        },
        signal: AbortSignal.timeout(5000),
      })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    );

    const [isbnDirect, searchData] = await Promise.all(fetchPromises);

    if (isbnDirect?.title) {
      const coverUrl = isbnDirect.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${isbnDirect.covers[0]}-L.jpg`
        : null;

      const desc =
        typeof isbnDirect.description === 'string'
          ? isbnDirect.description
          : isbnDirect.description?.value || null;

      results.push({
        id: `ol-isbn-${isbnDirect.key || isbnCandidate}`,
        source: 'openlibrary',
        sourceLabel: 'Open Library (ISBN Match)',
        title: isbnDirect.title,
        author: null,
        cover_url: coverUrl,
        total_units: isbnDirect.number_of_pages || null,
        unit_type: 'pages',
        description: stripHtml(desc),
        publisher: isbnDirect.publishers?.[0] || null,
        published_year: isbnDirect.publish_date
          ? parseInt(isbnDirect.publish_date.match(/\b\d{4}\b/)?.[0] || '', 10) || null
          : null,
        genre_tags: null,
        isbn: isbnCandidate,
        series_name: null,
        series_order: null,
        is_ongoing: false,
        external_link: `https://openlibrary.org${isbnDirect.key || ''}`,
      });
    }

    if (searchData?.docs && Array.isArray(searchData.docs)) {
      for (const doc of searchData.docs.slice(0, 5)) {
        if (!doc.title) continue;
        const coverUrl = doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : null;

        const isbn = doc.isbn?.[0] || null;
        const genres = Array.isArray(doc.subject) ? doc.subject.slice(0, 5).join(', ') : null;

        results.push({
          id: `ol-${doc.key || doc.cover_i || doc.title}`,
          source: 'openlibrary',
          sourceLabel: 'Open Library',
          title: doc.title,
          author: doc.author_name?.[0] || null,
          cover_url: coverUrl,
          total_units: doc.number_of_pages_median || doc.number_of_pages || null,
          unit_type: 'pages',
          description: null,
          publisher: doc.publisher?.[0] || null,
          published_year: doc.first_publish_year || null,
          genre_tags: genres,
          isbn: isbn,
          series_name: null,
          series_order: null,
          is_ongoing: false,
          external_link: doc.key ? `https://openlibrary.org${doc.key}` : null,
        });
      }
    }
  } catch (err) {
    console.error('OpenLibrary fetch error:', err);
  }
  return results;
}

async function queryGoogleBooks(query: string): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6&printType=books`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return results;

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) return results;

    for (const item of data.items) {
      const info = item.volumeInfo;
      if (!info?.title) continue;

      let coverUrl =
        info.imageLinks?.extraLarge ||
        info.imageLinks?.large ||
        info.imageLinks?.medium ||
        info.imageLinks?.thumbnail ||
        null;

      if (coverUrl) {
        coverUrl = coverUrl.replace(/^http:\/\//i, 'https://').replace(/&edge=curl/gi, '');
      }

      const isbns = info.industryIdentifiers || [];
      const isbn13 = isbns.find((id: any) => id.type === 'ISBN_13')?.identifier;
      const isbn10 = isbns.find((id: any) => id.type === 'ISBN_10')?.identifier;

      const publishedYear = info.publishedDate
        ? parseInt(info.publishedDate.substring(0, 4), 10) || null
        : null;

      const genres = Array.isArray(info.categories) ? info.categories.slice(0, 4).join(', ') : null;

      results.push({
        id: `gb-${item.id}`,
        source: 'googlebooks',
        sourceLabel: 'Google Books',
        title: info.title + (info.subtitle ? `: ${info.subtitle}` : ''),
        author: info.authors?.[0] || null,
        cover_url: coverUrl,
        total_units: info.pageCount || null,
        unit_type: 'pages',
        description: stripHtml(info.description),
        publisher: info.publisher || null,
        published_year: publishedYear,
        genre_tags: genres,
        isbn: isbn13 || isbn10 || null,
        series_name: null,
        series_order: null,
        is_ongoing: false,
        external_link: info.infoLink || info.previewLink || null,
      });
    }
  } catch (err) {
    console.error('Google Books fetch error:', err);
  }
  return results;
}

async function queryAniList(query: string): Promise<EnrichmentResult[]> {
  const results: EnrichmentResult[] = [];
  try {
    const graphqlQuery = `
      query ($search: String) {
        Page(page: 1, perPage: 5) {
          media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              extraLarge
              large
            }
            description(asHtml: false)
            format
            status
            chapters
            volumes
            genres
            averageScore
            startDate {
              year
            }
            siteUrl
          }
        }
      }
    `;

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { search: query },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return results;

    const data = await res.json();
    const mediaList = data.data?.Page?.media;
    if (!Array.isArray(mediaList)) return results;

    for (const media of mediaList) {
      const title = media.title?.english || media.title?.romaji || media.title?.native;
      if (!title) continue;

      const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || null;
      const isOngoing = media.status === 'RELEASING';
      const genres = Array.isArray(media.genres) ? media.genres.slice(0, 5).join(', ') : null;

      const unitType = media.format === 'NOVEL' ? 'volumes' : 'chapters';
      const totalUnits = unitType === 'volumes' ? media.volumes : media.chapters;

      results.push({
        id: `al-${media.id}`,
        source: 'anilist',
        sourceLabel: `AniList (${media.format || 'Manga'})`,
        title: title,
        author: null,
        cover_url: coverUrl,
        total_units: totalUnits || null,
        unit_type: unitType,
        description: stripHtml(media.description),
        publisher: null,
        published_year: media.startDate?.year || null,
        genre_tags: genres,
        isbn: null,
        series_name: media.format === 'NOVEL' ? title : null,
        series_order: null,
        is_ongoing: isOngoing,
        external_link: media.siteUrl || `https://anilist.co/manga/${media.id}`,
      });
    }
  } catch (err) {
    console.error('AniList fetch error:', err);
  }
  return results;
}

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const type = searchParams.get('type') || 'all';

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const isbnCandidate = cleanIsbnString(q);

  const fetchers: Promise<EnrichmentResult[]>[] = [];

  if (type === 'isbn' && isbnCandidate) {
    fetchers.push(queryOpenLibrary(q, isbnCandidate));
    fetchers.push(queryGoogleBooks(`isbn:${isbnCandidate}`));
  } else if (type === 'manga' || type === 'lightnovel') {
    fetchers.push(queryAniList(q));
    fetchers.push(queryGoogleBooks(q));
    fetchers.push(queryOpenLibrary(q, isbnCandidate));
  } else {
    // All sources concurrently
    fetchers.push(queryGoogleBooks(isbnCandidate ? `isbn:${isbnCandidate}` : q));
    fetchers.push(queryOpenLibrary(q, isbnCandidate));
    if (!isbnCandidate) {
      fetchers.push(queryAniList(q));
    }
  }

  const nestedResults = await Promise.all(fetchers);
  const flat = nestedResults.flat();

  // Deduplicate by normalized title & cover existence
  const seen = new Set<string>();
  const deduped: EnrichmentResult[] = [];

  for (const item of flat) {
    const key = `${item.title.toLowerCase().trim()}-${item.author?.toLowerCase().trim() || ''}-${item.source}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return NextResponse.json({ results: deduped });
});
