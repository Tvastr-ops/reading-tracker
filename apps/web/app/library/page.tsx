'use client';

import { BulkActionBar } from '@/components/BulkActionBar';
import { LibraryToolbar } from '@/components/LibraryToolbar';
import { LibraryView } from '@/components/LibraryView';
import { UpNextBanner } from '@/components/UpNextBanner';
import { Card } from '@/components/ui/card';

export default function LibraryPage() {
  return (
    <div className="space-y-4">
      <UpNextBanner />
      <Card className="surface-t1 p-2.5 sm:p-5">
        <LibraryToolbar />
        <LibraryView />
      </Card>
      <BulkActionBar />
    </div>
  );
}
