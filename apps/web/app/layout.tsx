import './globals.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google';
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
// a flash of the wrong theme on load. Reads a plain localStorage value —
// nothing sensitive, nothing that touches the auth/session system.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var theme = saved === 'dark' || saved === 'light'
      ? saved
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${newsreader.variable} ${jakarta.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-bg font-sans text-text antialiased">
        <main>{children}</main>
        <Toaster position="bottom-right" richColors closeButton />
        <SpeedInsights />
      </body>
    </html>
  );
}
