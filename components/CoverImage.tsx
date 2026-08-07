'use client';

import { BookOpen } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export function sanitizeCoverUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
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
        <span className="line-clamp-2 text-[10px] font-medium leading-tight">{title}</span>
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
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
      className={className}
    />
  );
}
