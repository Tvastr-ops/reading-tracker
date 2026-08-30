'use client';

import { BookOpen } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const OPTIMIZED_HOSTNAMES = new Set([
  'covers.openlibrary.org',
  'm.media-amazon.com',
  'images-na.ssl-images-amazon.com',
  'i.gr-assets.com',
  'cdn.thestorygraph.com',
  'assets.thestorygraph.com',
  'cdn.novelupdates.com',
  'www.novelupdates.com',
]);

export function isOptimizedDomain(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return OPTIMIZED_HOSTNAMES.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function sanitizeCoverUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  let clean = url.trim();
  if (clean.startsWith('http://')) {
    clean = `https://${clean.slice(7)}`;
  }
  return clean;
}

export default function CoverImage({
  src,
  alt,
  title,
  fill,
  width,
  height,
  className,
  fallbackClassName,
  priority,
  sizes,
}: {
  src?: string | null;
  alt?: string;
  title: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  fallbackClassName?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [error, setError] = useState(false);
  const cleanUrl = sanitizeCoverUrl(src);
  const isOptimized = isOptimizedDomain(cleanUrl);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!cleanUrl || error) {
    return (
      <div
        className={
          fallbackClassName ||
          'flex h-full w-full flex-col items-center justify-center bg-surface/80 p-2 text-center text-text-muted'
        }
      >
        <BookOpen className="mb-1 h-6 w-6 opacity-40" />
        <span className="line-clamp-2 font-medium text-[10px] leading-tight">{title}</span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={cleanUrl}
        alt={alt || title}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={!isOptimized}
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
        className={className}
      />
    );
  }

  return (
    <Image
      src={cleanUrl}
      alt={alt || title}
      width={width || 56}
      height={height || 84}
      priority={priority}
      unoptimized={!isOptimized}
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
      className={className}
    />
  );
}
