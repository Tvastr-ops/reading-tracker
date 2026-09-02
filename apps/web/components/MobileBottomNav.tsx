'use client';

import { BarChart3, BookOpen, History, Settings } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavTabItem {
  href: Route;
  label: string;
  icon: any;
  active: boolean;
}

export function MobileBottomNav() {
  const pathname = usePathname();

  const navTabs: NavTabItem[] = [
    {
      href: '/library' as Route,
      label: 'LIBRARY',
      icon: BookOpen,
      active: pathname === '/' || pathname.startsWith('/library') || pathname.startsWith('/books'),
    },

    {
      href: '/analytics' as Route,
      label: 'ANALYTICS',
      icon: BarChart3,
      active: pathname.startsWith('/analytics'),
    },
    {
      href: '/journal' as Route,
      label: 'JOURNAL',
      icon: History,
      active: pathname.startsWith('/journal'),
    },
    {
      href: '/settings' as Route,
      label: 'SETTINGS',
      icon: Settings,
      active: pathname.startsWith('/settings'),
    },
  ];

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 border-border/80 border-t-2 bg-bg/95 px-2 py-1.5 backdrop-blur-md md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center rounded py-1.5 transition-all active:scale-95 ${
                tab.active
                  ? 'border border-border bg-accent-bg text-accent-text shadow-[1.5px_1.5px_0px_var(--border)]'
                  : 'text-text-muted hover:bg-surface/50 hover:text-text'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="mt-1 font-black font-hanken text-[9px] tracking-wider">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
