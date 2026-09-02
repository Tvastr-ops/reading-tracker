'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppFooter } from '@/components/AppFooter';
import { AppNavbar } from '@/components/AppNavbar';
import { BookFormModal } from '@/components/BookFormModal';
import { CommandPaletteModal } from '@/components/CommandPaletteModal';
import { ImportNotification } from '@/components/ImportNotification';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ShortcutsModal } from '@/components/ShortcutsModal';
import { LibraryProvider } from '@/contexts/LibraryContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const handler = () => {};
    document.body.addEventListener('touchstart', handler, { passive: true });
    return () => document.body.removeEventListener('touchstart', handler);
  }, []);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <LibraryProvider>
      <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 pb-24 sm:px-6 md:pb-12 lg:px-8 xl:px-10 2xl:max-w-screen-2xl">
        <link rel="dns-prefetch" href="https://covers.openlibrary.org" />
        <AppNavbar />
        <ImportNotification />
        {children}
        <AppFooter />
        <BookFormModal />
        <CommandPaletteModal />
        <ShortcutsModal />
        <MobileBottomNav />
      </div>
    </LibraryProvider>
  );
}
