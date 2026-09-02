'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { AppFooter } from '@/components/AppFooter';
import { AppNavbar } from '@/components/AppNavbar';
import { ImportNotification } from '@/components/ImportNotification';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { LibraryProvider } from '@/contexts/LibraryContext';

// Dynamic code-splitting for heavy modals (reduces initial hydration JS bundle)
const BookFormModal = dynamic(
  () => import('@/components/BookFormModal').then((m) => m.BookFormModal),
  { ssr: false },
);

const CommandPaletteModal = dynamic(
  () => import('@/components/CommandPaletteModal').then((m) => m.CommandPaletteModal),
  { ssr: false },
);

const ShortcutsModal = dynamic(
  () => import('@/components/ShortcutsModal').then((m) => m.ShortcutsModal),
  { ssr: false },
);

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
