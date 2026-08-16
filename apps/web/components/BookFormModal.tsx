'use client';

import dynamic from 'next/dynamic';
import { useLibraryData } from '@/contexts/LibraryDataContext';
import { useLibraryFiltersContext } from '@/contexts/LibraryFiltersContext';
import { useLibraryUI } from '@/contexts/LibraryUIContext';

const BookForm = dynamic(() => import('@/components/BookForm'), { ssr: false });

export function BookFormModal() {
  const { books, saveBook } = useLibraryData();
  const { ratingMode } = useLibraryFiltersContext();
  const { editing, setEditing, inspectedBook, setInspectedBook } = useLibraryUI();

  // undefined = modal closed; null = new entry; Book = editing existing
  if (editing === undefined) return null;

  return (
    <BookForm
      initial={editing}
      ratingMode={ratingMode}
      existingBooks={books}
      onCancel={() => setEditing(undefined)}
      onSave={async (data) => {
        const saved = await saveBook(data, (data as any).id || (editing as any)?.id);
        setEditing(undefined);
        if (inspectedBook?.id === saved?.id) {
          setInspectedBook(saved ?? null);
        }
      }}
    />
  );
}
