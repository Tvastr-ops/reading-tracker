import JSZip from 'jszip';
import { formatProgressText, getDefaultUnitType } from './progress';
import type { Book, ReadingLogEntry } from './types';

/**
 * Sanitizes a string into a safe file or directory name across all operating systems.
 */
export function safeFilename(name: string): string {
  let clean = name
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  while (clean.endsWith('.')) {
    clean = clean.slice(0, -1).trim();
  }
  return clean.length === 0 ? 'Untitled' : clean;
}

/**
 * Escapes a string safely for YAML frontmatter.
 */
export function escapeYaml(value?: string | null): string {
  if (!value || value.length === 0) return '""';
  return `"${value.replace(/"/g, '\\"')}"`;
}

/**
 * Builds individual Book Markdown note with YAML frontmatter, cover image, and callouts.
 */
export function buildBookMarkdown(book: Book, logs: ReadingLogEntry[]): string {
  const lines: string[] = [];

  // 1. YAML Frontmatter (Obsidian Properties)
  lines.push('---');
  lines.push(`title: ${escapeYaml(book.title)}`);

  if (book.author?.trim()) {
    const safeAuth = safeFilename(book.author.trim());
    lines.push(`author: "[[Authors/${safeAuth}|${safeAuth}]]"`);
  } else {
    lines.push('author: null');
  }

  if (book.series_name?.trim()) {
    const safeSer = safeFilename(book.series_name.trim());
    lines.push(`series: "[[Series/${safeSer}|${safeSer}]]"`);
    if (book.series_order != null) {
      lines.push(`series_order: ${book.series_order}`);
    }
  }

  lines.push(`status: ${escapeYaml(book.status)}`);
  lines.push(`rating: ${book.rating != null && book.rating > 0 ? book.rating : 'null'}`);
  lines.push(`progress: ${book.progress ?? 0}`);
  lines.push(`total: ${book.total_units != null ? book.total_units : 'null'}`);
  lines.push(`unit: ${escapeYaml(book.unit_type || getDefaultUnitType(book.type))}`);
  lines.push(`type: ${escapeYaml(book.type)}`);
  lines.push(`is_ongoing: ${Boolean(book.is_ongoing)}`);
  lines.push(`is_favorite: ${Boolean(book.is_favorite)}`);
  lines.push(`started: ${escapeYaml(book.date_started)}`);
  lines.push(`finished: ${escapeYaml(book.date_finished)}`);

  if (book.cover_url?.trim()) {
    lines.push(`cover: ${escapeYaml(book.cover_url.trim())}`);
  }

  // Tags
  lines.push('tags:');
  lines.push('  - reading');
  lines.push(`  - format/${safeFilename(book.type.toLowerCase()).replace(/\s+/g, '-')}`);
  lines.push(`  - status/${safeFilename(book.status.toLowerCase()).replace(/\s+/g, '-')}`);
  if (book.is_favorite) {
    lines.push('  - favorite');
  }

  if (book.genre_tags?.trim()) {
    for (const t of book.genre_tags.split(',')) {
      const cleanTag = safeFilename(t.toLowerCase()).replace(/\s+/g, '-');
      if (cleanTag) {
        lines.push(`  - genre/${cleanTag}`);
      }
    }
  }

  // Sources
  if (book.source_link?.trim()) {
    const rawLinks = book.source_link
      .split(/[\n,;]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLinks.length > 0) {
      lines.push('sources:');
      for (const link of rawLinks) {
        lines.push(`  - ${escapeYaml(link)}`);
      }
    }
  }

  lines.push('---');
  lines.push('');

  // 2. Note Header & Cover Embed
  lines.push(`# ${book.title}`);
  if (book.author?.trim()) {
    const safeAuth = safeFilename(book.author.trim());
    lines.push(`*By [[Authors/${safeAuth}|${book.author.trim()}]]*`);
  }
  lines.push('');

  if (book.cover_url?.trim()) {
    lines.push(`![Book Cover|200](${book.cover_url.trim()})`);
    lines.push('');
  }

  // 3. Quick Stats Metadata Table
  const displayProgress = formatProgressText(book);
  const ratingStr = book.rating != null && book.rating > 0 ? `${book.rating} ★` : 'Unrated';
  lines.push('| Status | Progress | Rating | Format |');
  lines.push('| :--- | :--- | :--- | :--- |');
  lines.push(`| **${book.status}** | \`${displayProgress}\` | \`${ratingStr}\` | ${book.type} |`);
  lines.push('');

  // 4. Callout: Synopsis
  if (book.description?.trim()) {
    lines.push('> [!abstract] Synopsis');
    for (const line of book.description.trim().split('\n')) {
      lines.push(`> ${line}`);
    }
    lines.push('');
  }

  // 5. Callout: Personal Review & Notes
  if (book.notes?.trim()) {
    lines.push('> [!quote] Personal Review & Notes');
    for (const line of book.notes.trim().split('\n')) {
      lines.push(`> ${line}`);
    }
    lines.push('');
  }

  // 6. Callout: Reading Log Timeline
  if (logs.length > 0) {
    lines.push('> [!timeline] Reading Log Timeline');
    const sorted = [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at));
    const unit = book.unit_type || getDefaultUnitType(book.type);

    for (const entry of sorted) {
      const date = entry.logged_at.length >= 10 ? entry.logged_at.slice(0, 10) : entry.logged_at;
      const inc =
        entry.from_progress != null ? entry.to_progress - entry.from_progress : entry.to_progress;
      const notesPart = entry.note?.trim() ? ` — *"${entry.note.trim()}"*` : '';
      lines.push(
        `> - **${date}**: Read ${inc} ${unit} (Progress: ${entry.to_progress})${notesPart}`,
      );
    }
    lines.push('');
  }

  // 7. External Links Section
  if (book.source_link?.trim()) {
    const rawLinks = book.source_link
      .split(/[\n,;]+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLinks.length > 0) {
      lines.push('### External Resources');
      for (const link of rawLinks) {
        lines.push(`- <${link}>`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Builds an Author Hub note linking all works by that author.
 */
export function buildAuthorMarkdown(author: string, authorBooks: Book[]): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push(`title: ${escapeYaml(author)}`);
  lines.push('type: author');
  lines.push(`books_count: ${authorBooks.length}`);
  lines.push('tags:');
  lines.push('  - author');
  lines.push('---');
  lines.push('');

  lines.push(`# ${author}`);
  lines.push(`Total cataloged works: **${authorBooks.length}**`);
  lines.push('');

  lines.push('### Works in Library');
  lines.push('| Title | Status | Rating | Progress | Format |');
  lines.push('| :--- | :--- | :--- | :--- | :--- |');

  for (const b of authorBooks) {
    const safeBook = safeFilename(b.title);
    const rate = b.rating != null && b.rating > 0 ? `${b.rating} ★` : '—';
    lines.push(
      `| [[Books/${safeBook}|${b.title}]] | ${b.status} | ${rate} | ${formatProgressText(b)} | ${b.type} |`,
    );
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Builds a Series Hub note with volume order checklist.
 */
export function buildSeriesMarkdown(seriesName: string, seriesBooks: Book[]): string {
  const lines: string[] = [];
  const sorted = [...seriesBooks].sort(
    (a, b) => (a.series_order ?? 9999) - (b.series_order ?? 9999),
  );

  lines.push('---');
  lines.push(`title: ${escapeYaml(seriesName)}`);
  lines.push('type: series');
  lines.push(`books_count: ${seriesBooks.length}`);
  lines.push('tags:');
  lines.push('  - series');
  lines.push('---');
  lines.push('');

  lines.push(`# ${seriesName}`);
  lines.push(`Total tracked volumes: **${seriesBooks.length}**`);
  lines.push('');

  lines.push('### Reading Checklist');
  for (const b of sorted) {
    const safeBook = safeFilename(b.title);
    const isDone = b.status === 'Completed';
    const orderStr = b.series_order != null ? `#${b.series_order} · ` : '';
    lines.push(
      `- [${isDone ? 'x' : ' '}] ${orderStr}[[Books/${safeBook}|${b.title}]] *(${b.status})*`,
    );
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Builds the 00 📚 Bookshelf.md dashboard.
 */
export function buildBookshelfDashboard(books: Book[]): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push('title: Bookshelf');
  lines.push('tags:');
  lines.push('  - dashboard');
  lines.push('---');
  lines.push('');

  lines.push('# 📚 Library Bookshelf');
  lines.push('');
  lines.push('> [!tip] Dataview Compatible');
  lines.push(
    '> If you have the Obsidian Dataview plugin enabled, you can run queries below. Standard Markdown tables are also pre-rendered below.',
  );
  lines.push('');

  const reading = books.filter((b) => b.status === 'Reading');
  const plan = books.filter((b) => b.status === 'Plan to Read');
  const completed = books.filter((b) => b.status === 'Completed');
  const onHoldOrDropped = books.filter((b) => b.status === 'On Hold' || b.status === 'Dropped');

  writeBookshelfSection(lines, '📖 Currently Reading', reading);
  writeBookshelfSection(lines, '🎯 Up Next (Plan to Read)', plan);
  writeBookshelfSection(lines, '🏆 Completed', completed);
  if (onHoldOrDropped.length > 0) {
    writeBookshelfSection(lines, '⏸️ On Hold & Dropped', onHoldOrDropped);
  }

  return lines.join('\n');
}

function writeBookshelfSection(lines: string[], heading: string, list: Book[]) {
  lines.push(`## ${heading} (${list.length})`);
  if (list.length === 0) {
    lines.push('*No books in this section.*');
    lines.push('');
    return;
  }

  lines.push('| Cover | Title | Author | Progress | Rating | Format |');
  lines.push('| :---: | :--- | :--- | :--- | :---: | :--- |');

  for (const b of list) {
    const safeBook = safeFilename(b.title);
    const coverCell = b.cover_url?.trim()
      ? `<img src="${b.cover_url.trim()}" width="42" style="border-radius:4px" />`
      : '📖';
    const authorCell = b.author?.trim()
      ? `[[Authors/${safeFilename(b.author.trim())}|${b.author.trim()}]]`
      : '—';
    const rate = b.rating != null && b.rating > 0 ? `${b.rating} ★` : '—';
    lines.push(
      `| ${coverCell} | [[Books/${safeBook}|${b.title}]] | ${authorCell} | \`${formatProgressText(b)}\` | ${rate} | ${b.type} |`,
    );
  }
  lines.push('');
}

/**
 * Builds the 01 📊 Reading Stats.md dashboard.
 */
export function buildStatsDashboard(books: Book[], allLogs: ReadingLogEntry[]): string {
  const lines: string[] = [];

  const total = books.length;
  const completed = books.filter((b) => b.status === 'Completed').length;
  const reading = books.filter((b) => b.status === 'Reading').length;
  const plan = books.filter((b) => b.status === 'Plan to Read').length;

  const typeCounts: Record<string, number> = {};
  for (const b of books) {
    typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1;
  }

  lines.push('---');
  lines.push('title: Reading Stats & Analytics');
  lines.push('tags:');
  lines.push('  - dashboard');
  lines.push('---');
  lines.push('');

  lines.push('# 📊 Reading Analytics & Insights');
  lines.push('');

  lines.push('### 📈 High-Level Metrics');
  lines.push(`- **Total Tracked Works**: ${total}`);
  lines.push(`- **Currently Reading**: ${reading}`);
  lines.push(`- **Completed Titles**: ${completed}`);
  lines.push(`- **Plan to Read Queue**: ${plan}`);
  lines.push(`- **Logged Reading Sessions**: ${allLogs.length}`);
  lines.push('');

  lines.push('### 📚 Catalog by Format');
  lines.push('| Format | Count | Share |');
  lines.push('| :--- | :---: | :---: |');
  for (const [type, count] of Object.entries(typeCounts)) {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
    lines.push(`| **${type}** | ${count} | ${pct}% |`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Builds the 02 🌌 Reading Universe.canvas visual node graph.
 */
export function buildCanvasJson(books: Book[]): string {
  const nodes: Array<Record<string, unknown>> = [];
  const edges: Array<Record<string, unknown>> = [];

  // Root Category Nodes
  const statusGroups = [
    { id: 'status_reading', text: '📖 Currently Reading', color: '4', x: 0, y: -250 },
    { id: 'status_completed', text: '🏆 Completed', color: '2', x: 500, y: -250 },
    { id: 'status_plan', text: '🎯 Plan to Read', color: '3', x: -500, y: -250 },
  ];

  for (const sg of statusGroups) {
    nodes.push({
      id: sg.id,
      type: 'text',
      text: `# ${sg.text}`,
      x: sg.x,
      y: sg.y,
      width: 280,
      height: 90,
      color: sg.color,
    });
  }

  // Linked books (up to 10 per status)
  const targetStatuses: Array<{ status: Book['status']; key: string; x: number }> = [
    { status: 'Reading', key: 'status_reading', x: 0 },
    { status: 'Completed', key: 'status_completed', x: 500 },
    { status: 'Plan to Read', key: 'status_plan', x: -500 },
  ];

  for (const group of targetStatuses) {
    const matching = books.filter((b) => b.status === group.status).slice(0, 10);
    let yOffset = -120;

    for (let i = 0; i < matching.length; i++) {
      const b = matching[i];
      const safeBook = safeFilename(b.title);
      const nodeId = `book_${b.id}`;

      nodes.push({
        id: nodeId,
        type: 'file',
        file: `Books/${safeBook}.md`,
        x: group.x + (i % 2 === 0 ? -120 : 120),
        y: yOffset,
        width: 220,
        height: 160,
      });

      edges.push({
        id: `edge_${group.key}_${nodeId}`,
        fromNode: group.key,
        fromSide: 'bottom',
        toNode: nodeId,
        toSide: 'top',
      });

      yOffset += 190;
    }
  }

  return JSON.stringify({ nodes, edges }, null, 2);
}

/**
 * Generates the full Obsidian Vault Zip file as a Uint8Array.
 */
export async function generateObsidianVaultZip(
  books: Book[],
  allLogs: ReadingLogEntry[] = [],
): Promise<Uint8Array> {
  const zip = new JSZip();

  // 1. Dashboards
  zip.file('00 📚 Bookshelf.md', buildBookshelfDashboard(books));
  zip.file('01 📊 Reading Stats.md', buildStatsDashboard(books, allLogs));
  zip.file('02 🌌 Reading Universe.canvas', buildCanvasJson(books));

  // 2. Individual Book Notes
  const logsByBookId = new Map<string, ReadingLogEntry[]>();
  for (const log of allLogs) {
    const existing = logsByBookId.get(log.book_id) || [];
    existing.push(log);
    logsByBookId.set(log.book_id, existing);
  }

  const usedBookNames = new Map<string, number>();
  for (const book of books) {
    let baseName = safeFilename(book.title);
    const count = usedBookNames.get(baseName) || 0;
    if (count > 0) {
      usedBookNames.set(baseName, count + 1);
      baseName = `${baseName} (${count + 1})`;
    } else {
      usedBookNames.set(baseName, 1);
    }

    const logs = logsByBookId.get(book.id) || [];
    zip.file(`Books/${baseName}.md`, buildBookMarkdown(book, logs));
  }

  // 3. Author Hubs
  const booksByAuthor = new Map<string, Book[]>();
  for (const b of books) {
    if (b.author?.trim()) {
      const auth = b.author.trim();
      const existing = booksByAuthor.get(auth) || [];
      existing.push(b);
      booksByAuthor.set(auth, existing);
    }
  }

  for (const [author, authorBooks] of booksByAuthor.entries()) {
    const safeAuth = safeFilename(author);
    zip.file(`Authors/${safeAuth}.md`, buildAuthorMarkdown(author, authorBooks));
  }

  // 4. Series Hubs
  const booksBySeries = new Map<string, Book[]>();
  for (const b of books) {
    if (b.series_name?.trim()) {
      const ser = b.series_name.trim();
      const existing = booksBySeries.get(ser) || [];
      existing.push(b);
      booksBySeries.set(ser, existing);
    }
  }

  for (const [seriesName, seriesBooks] of booksBySeries.entries()) {
    const safeSer = safeFilename(seriesName);
    zip.file(`Series/${safeSer}.md`, buildSeriesMarkdown(seriesName, seriesBooks));
  }

  // 5. Pre-configured .obsidian Settings
  zip.file(
    '.obsidian/app.json',
    JSON.stringify(
      {
        legacyEditor: false,
        livePreview: true,
        readableLineLength: true,
        showLineNumber: false,
        autoPairMarkdown: true,
        strictLineBreaks: false,
        spellcheck: false,
      },
      null,
      2,
    ),
  );

  zip.file(
    '.obsidian/core-plugins.json',
    JSON.stringify(
      [
        'file-explorer',
        'global-search',
        'switcher',
        'graph',
        'backlink',
        'canvas',
        'page-preview',
        'outline',
        'word-count',
        'properties',
      ],
      null,
      2,
    ),
  );

  zip.file(
    '.obsidian/snippets/reading-vault.css',
    `/* Reading Tracker Obsidian Vault Aesthetic */
.metadata-properties-heading {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
}

.callout[data-callout="timeline"] {
  --callout-color: 99, 102, 241;
  --callout-icon: lucide-history;
  border-left-width: 4px;
}

.callout[data-callout="abstract"] {
  --callout-color: 16, 185, 129;
}

.callout[data-callout="quote"] {
  --callout-color: 245, 158, 11;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  font-weight: 800;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.04em;
}
`,
  );

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
