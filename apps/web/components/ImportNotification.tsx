'use client';

import { Card } from '@/components/ui/card';
import { useLibraryData } from '@/contexts/LibraryDataContext';

export function ImportNotification() {
  const { importMsg } = useLibraryData();

  if (!importMsg) return null;

  return (
    <Card className="mb-4 border-accent-color/30 bg-accent-color/10 p-3 text-text text-xs">
      {importMsg}
    </Card>
  );
}
