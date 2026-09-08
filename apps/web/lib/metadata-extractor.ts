import type { UnitType } from '@/lib/types';

export interface ExtractedBookMetadata {
  title?: string;
  author?: string;
  description?: string;
  cover_url?: string;
  source_link: string;
  type?: string;
  unit_type?: UnitType;
  total_units?: number | null;
  latest_units?: number | null;
  parent_total?: number | null;
  progress_structure?: 'single' | 'volume_chapter';
  is_ongoing?: boolean;
  genre_tags?: string;
  site_name?: string;
}

/**
 * SSRF Safeguard: Check if a hostname or IP is loopback, private, or reserved.
 */
export function isPrivateOrReservedHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();

  // Basic hostnames
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === 'local' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return true;
  }

  // IPv4 Private Ranges
  // 10.0.0.0 - 10.255.255.255
  // 172.16.0.0 - 172.31.255.255
  // 192.168.0.0 - 192.168.255.255
  // 169.254.0.0 - 169.254.255.255 (Link-local)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Regex);
  if (match) {
    const [, aStr, bStr] = match;
    const a = parseInt(aStr, 10);
    const b = parseInt(bStr, 10);

    if (a === 127 || a === 0) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
}

/**
 * Validates that a string is a clean, public HTTP/HTTPS URL.
 */
export function validateTargetUrl(rawUrl: string): { valid: boolean; url?: URL; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = rawUrl.trim();
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  let parsed: URL;
  try {
    parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are permitted' };
  }

  if (isPrivateOrReservedHost(parsed.hostname)) {
    return { valid: false, error: 'Access to private or local network hosts is prohibited' };
  }

  return { valid: true, url: parsed };
}

/**
 * Clean plain-text strings from HTML entities and excessive whitespace.
 */
function cleanText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract meta tag contents from raw HTML text without executing any scripts.
 */
export function extractMetaTag(html: string, nameOrProperty: string): string | null {
  const escaped = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // <meta property="..." content="..."> or <meta name="..." content="..."> or <meta content="..." property="...">
  const p1 = new RegExp(
    `<meta[^>]*(?:property|name|itemprop)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    'i',
  );
  const m1 = html.match(p1);
  if (m1?.[1]) return cleanText(m1[1]);

  const p2 = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${escaped}["']`,
    'i',
  );
  const m2 = html.match(p2);
  if (m2?.[1]) return cleanText(m2[1]);

  return null;
}

/**
 * Parses MangaBaka API series object into structured ExtractedBookMetadata.
 */
export function parseMangaBakaSeries(data: any, originalUrl: string): ExtractedBookMetadata {
  // Title: English title or primary title
  const titles = Array.isArray(data.titles) ? data.titles : [];
  const enTitle = titles.find((t: any) => t.language === 'en')?.title;
  const jaLatnTitle = titles.find((t: any) => t.language === 'ja-Latn')?.title;
  const primaryTitle = titles.find((t: any) => t.is_primary)?.title;
  const title = cleanText(
    enTitle ||
      jaLatnTitle ||
      primaryTitle ||
      data.canonical_url?.split('/').pop()?.replace(/-/g, ' '),
  );

  const authors = Array.isArray(data.authors) ? data.authors.join(', ') : data.authors || '';
  const description = cleanText(data.description);
  const coverUrl = data.cover?.x350 || data.cover?.raw || data.cover?.x250 || '';

  const finalVolume =
    typeof data.final_volume === 'number' && data.final_volume > 0 ? data.final_volume : null;
  const totalChapters =
    typeof data.total_chapters === 'number' && data.total_chapters > 0 ? data.total_chapters : null;

  const isOngoing = data.status === 'releasing' || data.status === 'hiatus';
  const type = data.type === 'novel' ? 'Light Novel' : 'Novel';

  // If both volumes and chapters exist, structure as volume_chapter
  const progressStructure = finalVolume && totalChapters ? 'volume_chapter' : 'single';

  return {
    title,
    author: authors,
    description,
    cover_url: coverUrl,
    source_link: originalUrl,
    type,
    unit_type: finalVolume ? 'volumes' : 'chapters',
    total_units: finalVolume || totalChapters || null,
    latest_units: finalVolume || totalChapters || null,
    parent_total: finalVolume,
    progress_structure: progressStructure,
    is_ongoing: isOngoing,
    site_name: 'MangaBaka',
  };
}

/**
 * Specialized parser for Royal Road fiction pages.
 */
export function parseRoyalRoad(html: string, sourceUrl: string): ExtractedBookMetadata {
  const title =
    extractMetaTag(html, 'og:title') ||
    html
      .match(/<h1[^>]*class="[^"]*fiction-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      ?.replace(/<[^>]*>/g, '')
      .trim() ||
    '';

  const author =
    extractMetaTag(html, 'books:author') ||
    html
      .match(/<h4[^>]*class="[^"]*author[^"]*"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)?.[1]
      ?.trim() ||
    '';

  const description =
    extractMetaTag(html, 'og:description') ||
    html
      .match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1]
      ?.replace(/<[^>]*>/g, '')
      .trim() ||
    '';

  const coverUrl =
    extractMetaTag(html, 'og:image') ||
    html.match(/<img[^>]*class="[^"]*cover-art[^"]*"[^>]*src="([^"]*)"/i)?.[1] ||
    '';

  // Extract chapters count from stats
  // e.g. "Total Chapters : 108" or table rows
  let totalChapters: number | null = null;
  const chaptersMatch =
    html.match(
      /(?:Chapters|Total Chapters)[\s\S]*?<li[^>]*class="bold[^"]*"[^>]*>([\d,]+)<\/li>/i,
    ) ||
    html.match(/Total Chapters\s*:\s*([\d,]+)/i) ||
    html.match(/<span[^>]*class="label[^"]*"[^>]*>([\d,]+)\s*Chapters?<\/span>/i);

  if (chaptersMatch?.[1]) {
    const parsed = parseInt(chaptersMatch[1].replace(/,/g, ''), 10);
    if (!Number.isNaN(parsed) && parsed > 0) totalChapters = parsed;
  }

  // Tags
  const tags: string[] = [];
  const tagMatches = html.matchAll(/<a[^>]*class="[^"]*fiction-tag[^"]*"[^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of tagMatches) {
    const t = cleanText(match[1]);
    if (t && !tags.includes(t)) tags.push(t);
  }

  const isOngoing =
    !html.includes('COMPLETED') && (html.includes('ONGOING') || html.includes('HIATUS'));

  return {
    title: cleanText(title),
    author: cleanText(author),
    description: cleanText(description),
    cover_url: coverUrl,
    source_link: sourceUrl,
    type: 'Web Novel',
    unit_type: 'chapters',
    total_units: totalChapters,
    latest_units: totalChapters,
    is_ongoing: isOngoing,
    genre_tags: tags.join(', '),
    site_name: 'Royal Road',
  };
}

/**
 * Specialized parser for Archive of Our Own (AO3) work pages.
 */
export function parseAO3(html: string, sourceUrl: string): ExtractedBookMetadata {
  const title =
    extractMetaTag(html, 'og:title') ||
    html
      .match(/<h2[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i)?.[1]
      ?.replace(/<[^>]*>/g, '')
      .trim() ||
    '';

  const author =
    html.match(/<a[^>]*rel="author"[^>]*>([\s\S]*?)<\/a>/i)?.[1]?.trim() ||
    extractMetaTag(html, 'author') ||
    '';

  const description =
    extractMetaTag(html, 'og:description') ||
    html
      .match(/<blockquote[^>]*class="[^"]*userstuff[^"]*"[^>]*>([\s\S]*?)<\/blockquote>/i)?.[1]
      ?.replace(/<[^>]*>/g, '')
      .trim() ||
    '';

  // Chapters: e.g. <dd class="chapters">12/35</dd> or 12/?
  let chapters: number | null = null;
  let isOngoing = false;
  const chapMatch = html.match(/<dd[^>]*class="chapters"[^>]*>\s*(\d+)\s*\/\s*(\d+|\?)\s*<\/dd>/i);
  if (chapMatch) {
    const current = parseInt(chapMatch[1], 10);
    const totalStr = chapMatch[2];
    if (totalStr === '?') {
      chapters = current;
      isOngoing = true;
    } else {
      const tot = parseInt(totalStr, 10);
      chapters = !Number.isNaN(tot) ? tot : current;
      isOngoing = current < tot;
    }
  }

  // Fandoms / Freeform tags
  const tags: string[] = [];
  const fandomMatches = html.matchAll(/<a[^>]*class="tag"[^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of fandomMatches) {
    const t = cleanText(match[1]);
    if (t && !tags.includes(t) && tags.length < 8) tags.push(t);
  }

  return {
    title: cleanText(title),
    author: cleanText(author),
    description: cleanText(description),
    source_link: sourceUrl,
    type: 'Fanfiction',
    unit_type: 'chapters',
    total_units: chapters,
    latest_units: chapters,
    is_ongoing: isOngoing,
    genre_tags: tags.join(', '),
    site_name: 'Archive of Our Own',
  };
}

/**
 * Universal OpenGraph and HTML meta-tag parser for any website.
 */
export function parseUniversalOpenGraph(html: string, sourceUrl: string): ExtractedBookMetadata {
  let title =
    extractMetaTag(html, 'og:title') ||
    extractMetaTag(html, 'twitter:title') ||
    extractMetaTag(html, 'title') ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
    '';

  // Clean title suffix like " | Royal Road" or " - Goodreads"
  title = title
    .replace(/\s*[-|–—]\s*(?:Goodreads|Amazon|Royal Road|Novel Updates|Syosetu|MangaBaka).*$/i, '')
    .trim();

  const author =
    extractMetaTag(html, 'author') ||
    extractMetaTag(html, 'book:author') ||
    extractMetaTag(html, 'books:author') ||
    extractMetaTag(html, 'citation_author') ||
    extractMetaTag(html, 'twitter:creator') ||
    '';

  const description =
    extractMetaTag(html, 'og:description') ||
    extractMetaTag(html, 'twitter:description') ||
    extractMetaTag(html, 'description') ||
    '';

  const coverUrl =
    extractMetaTag(html, 'og:image') ||
    extractMetaTag(html, 'twitter:image') ||
    extractMetaTag(html, 'image') ||
    '';

  const siteName =
    extractMetaTag(html, 'og:site_name') || new URL(sourceUrl).hostname.replace(/^www\./, '');

  return {
    title: cleanText(title),
    author: cleanText(author),
    description: cleanText(description),
    cover_url: coverUrl,
    source_link: sourceUrl,
    type: 'Novel',
    unit_type: 'pages',
    site_name: cleanText(siteName),
  };
}

/**
 * Main orchestrator: fetches target URL securely and delegates to appropriate parser.
 */
export async function extractMetadataFromUrl(rawUrl: string): Promise<ExtractedBookMetadata> {
  const validated = validateTargetUrl(rawUrl);
  if (!validated.valid || !validated.url) {
    throw new Error(validated.error || 'Invalid URL');
  }

  const url = validated.url;
  const hostname = url.hostname.toLowerCase();

  // 1. MangaBaka Series Direct URL or API
  if (hostname.includes('mangabaka.org')) {
    const matchId = url.pathname.match(/\/(?:novel|manga|series)\/(\d+)/);
    if (matchId?.[1]) {
      const seriesId = matchId[1];
      const mbRes = await fetch(`https://api.mangabaka.org/v2/series/${seriesId}`, {
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'reading-tracker-personal-app',
          Accept: 'application/json',
        },
      });
      if (mbRes.ok) {
        const mbJson = await mbRes.json();
        if (mbJson?.data) {
          return parseMangaBakaSeries(mbJson.data, url.toString());
        }
      }
    }
  }

  // 2. Fetch HTML with realistic headers and 5s timeout
  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(5000),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page (HTTP ${response.status})`);
  }

  // Limit HTML payload size to 1.5MB to prevent memory exhaustion
  const rawHtml = await response.text();
  const html = rawHtml.slice(0, 1500000);

  // 3. Domain-specific dispatching
  if (hostname.includes('royalroad.com')) {
    return parseRoyalRoad(html, url.toString());
  }

  if (hostname.includes('archiveofourown.org')) {
    return parseAO3(html, url.toString());
  }

  // 4. Universal OpenGraph fallback
  const result = parseUniversalOpenGraph(html, url.toString());

  // 5. If title was found and it looks like a Light Novel / Manga on other sites, we can optionally query MangaBaka search
  if (result.title && !result.cover_url && !result.total_units) {
    try {
      const mbSearch = await fetch(
        `https://api.mangabaka.org/v2/series/search?q=${encodeURIComponent(result.title)}`,
        {
          signal: AbortSignal.timeout(3000),
          headers: { 'User-Agent': 'reading-tracker-personal-app' },
        },
      );
      if (mbSearch.ok) {
        const mbData = await mbSearch.json();
        if (Array.isArray(mbData?.data) && mbData.data.length > 0) {
          const first = mbData.data[0];
          const mbExtracted = parseMangaBakaSeries(first, url.toString());
          return {
            ...result,
            cover_url: result.cover_url || mbExtracted.cover_url,
            total_units: result.total_units || mbExtracted.total_units,
            latest_units: result.latest_units || mbExtracted.latest_units,
            type: mbExtracted.type || result.type,
            author: result.author || mbExtracted.author,
          };
        }
      }
    } catch {
      // Ignore background enhancement errors and return base result
    }
  }

  return result;
}
