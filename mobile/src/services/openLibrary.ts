export interface OpenLibrarySearchResult {
  title: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
}

export async function searchOpenLibraryCovers(query: string): Promise<string | null> {
  if (!query.trim()) return null;
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(`https://openlibrary.org/search.json?q=${encoded}&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      if (doc.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
      }
    }
    return null;
  } catch (err) {
    console.warn('OpenLibrary search error:', err);
    return null;
  }
}
