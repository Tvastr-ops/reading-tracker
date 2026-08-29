import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Anton, Hanken_Grotesk, Newsreader, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-anton',
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken',
  display: 'swap',
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://reading-tracker.vercel.app';

export const metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Reading Tracker — Literature & Book Progress Log',
    template: '%s | Reading Tracker',
  },
  description:
    'A minimal, password-protected tracker for web novels, light novels, books, fanfiction, and essays with live progress metrics and reading logs.',
  keywords: [
    'reading tracker',
    'book log',
    'web novel tracker',
    'light novel tracker',
    'reading list',
    'literature log',
  ],
  authors: [{ name: 'Reading Tracker' }],
  creator: 'Reading Tracker',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: appUrl,
    siteName: 'Reading Tracker',
    title: 'Reading Tracker — Literature & Book Progress Log',
    description:
      'A minimal, password-protected tracker for web novels, light novels, books, fanfiction, and essays.',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Reading Tracker App Icon',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Reading Tracker — Literature & Book Progress Log',
    description:
      'A minimal, password-protected tracker for web novels, light novels, books, and fanfiction.',
    images: ['/icon-512.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'Reading Tracker',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1ebdd' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1712' },
  ],
};

// Runs before paint (no framework, so no hydration mismatch risk) to avoid
// a flash of the wrong theme on load. Reads plain localStorage values.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var savedTheme = localStorage.getItem('theme_palette') || 'classic';
    var savedMode = localStorage.getItem('theme_mode') || localStorage.getItem('theme');
    var mode = (savedMode === 'dark' || savedMode === 'light')
      ? savedMode
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var pattern = localStorage.getItem('theme_pattern') !== 'false';

    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.setAttribute('data-mode', mode);
    if (pattern) {
      document.documentElement.setAttribute('data-pattern', 'true');
    } else {
      document.documentElement.removeAttribute('data-pattern');
    }
  } catch (e) {}
})();
`;

import { AppShell } from '@/components/AppShell';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${newsreader.variable} ${jakarta.variable} ${anton.variable} ${hanken.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-bg font-sans text-text antialiased transition-colors duration-200">
        <AppShell>
          <main>{children}</main>
        </AppShell>
        <Toaster position="bottom-right" richColors closeButton />
        <SpeedInsights />
      </body>
    </html>
  );
}
