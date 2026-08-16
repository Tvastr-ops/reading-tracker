'use client';

import { BookFormModal } from '@/components/BookFormModal';
import { BulkActionBar } from '@/components/BulkActionBar';
import { CommandPaletteModal } from '@/components/CommandPaletteModal';
import { ImportNotification } from '@/components/ImportNotification';
import { LibraryNavbar } from '@/components/LibraryNavbar';
import { LibraryStats } from '@/components/LibraryStats';
import { LibraryToolbar } from '@/components/LibraryToolbar';
import { LibraryView } from '@/components/LibraryView';
import { UpNextBanner } from '@/components/UpNextBanner';
import { Card } from '@/components/ui/card';
import { LibraryProvider } from '@/contexts/LibraryContext';

export default function HomePage() {
  return (
    <LibraryProvider>
      <div className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-screen-2xl">
        <link rel="dns-prefetch" href="https://covers.openlibrary.org" />
        <LibraryNavbar />
        <ImportNotification />
        <LibraryStats />
        <UpNextBanner />
        <Card className="surface-t1 p-2.5 sm:p-5">
          <LibraryToolbar />
          <LibraryView />
        </Card>
        <BulkActionBar />
        <BookFormModal />
        <CommandPaletteModal />
      </div>
    </LibraryProvider>
  );
}
