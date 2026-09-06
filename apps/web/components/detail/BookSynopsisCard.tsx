'use client';

import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';

interface BookSynopsisCardProps {
  synopsis?: string | null;
}

export default function BookSynopsisCard({ synopsis }: BookSynopsisCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!synopsis?.trim()) return null;

  return (
    <Card className="surface-t1 border-2 border-border p-5 shadow-[3px_3px_0px_var(--border)] sm:p-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <h3 className="font-anton text-sm uppercase tracking-wider text-text">
          Synopsis & Plot Summary
        </h3>
      </div>
      <div className="mt-3">
        <p
          className={`whitespace-pre-wrap font-sans text-xs leading-relaxed text-text sm:text-sm ${
            !expanded ? 'line-clamp-5' : ''
          }`}
        >
          {synopsis}
        </p>
        {synopsis.length > 280 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2.5 inline-flex items-center gap-1 font-bold text-xs text-primary hover:underline"
          >
            <span>{expanded ? 'Show Less' : 'Read Full Synopsis'}</span>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </Card>
  );
}
