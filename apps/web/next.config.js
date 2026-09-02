/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400, // 31 days (max edge caching for immutable book covers)
    deviceSizes: [640, 1080],
    imageSizes: [48, 64, 96, 128, 256, 384],
    qualities: [75],
    remotePatterns: [
      // Open Library
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
      // Goodreads / Amazon CDNs
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'i.gr-assets.com',
      },
      // The StoryGraph
      {
        protocol: 'https',
        hostname: 'cdn.thestorygraph.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.thestorygraph.com',
      },
      // NovelUpdates
      {
        protocol: 'https',
        hostname: 'cdn.novelupdates.com',
      },
      {
        protocol: 'https',
        hostname: 'www.novelupdates.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
