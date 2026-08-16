'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLibraryUI } from '@/contexts/LibraryUIContext';

export function UpNextBanner() {
  const { upNext, pickUpNext, startReadingUpNext, setUpNext } = useLibraryUI();

  return (
    <AnimatePresence>
      {upNext && (
        <motion.div
          key="up-next-banner"
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Card className="surface-t2 relative mb-6 flex flex-col items-center gap-4 overflow-hidden border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-accent-color/5 to-transparent p-4 sm:flex-row">
            {upNext.cover_url ? (
              <img
                src={upNext.cover_url}
                alt=""
                className="h-14 w-10 shrink-0 rounded border border-border object-cover shadow-xs"
              />
            ) : (
              <div className="h-14 w-10 shrink-0 rounded border border-border bg-surface" />
            )}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center gap-1.5 sm:justify-start">
                <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
                <span className="font-bold text-amber-600 text-xs uppercase tracking-wider dark:text-amber-400">
                  Up Next Picked!
                </span>
              </div>
              <h4 className="line-clamp-1 font-bold text-sm text-text">{upNext.title}</h4>
              {upNext.author && <p className="text-text-muted text-xs">{upNext.author}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={pickUpNext}>
                Pick another
              </Button>
              <Button
                size="sm"
                onClick={startReadingUpNext}
                className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
              >
                Start reading
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setUpNext(null)}
                aria-label="Dismiss Up Next banner"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UpNextBanner;
