'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function RatingDisplay({
  rating,
  mode,
}: {
  rating: number | null;
  mode: 'stars' | 'decimal';
}) {
  if (rating == null) return <span className="text-text-muted/60">—</span>;
  if (mode === 'decimal')
    return <span className="font-medium text-text">{rating.toFixed(1)} / 5</span>;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = rating - (i - 1);
    if (diff >= 1) {
      stars.push(<Star key={i} className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />);
    } else if (diff >= 0.5) {
      stars.push(
        <div key={i} className="relative flex h-4 w-4 shrink-0 items-center">
          <Star className="h-4 w-4 shrink-0 text-amber-400/30" />
          <div className="absolute top-0 left-0 h-4 w-[50%] overflow-hidden">
            <Star className="h-4 w-4 max-w-none shrink-0 fill-amber-400 text-amber-400" />
          </div>
        </div>,
      );
    } else {
      stars.push(<Star key={i} className="h-4 w-4 shrink-0 text-amber-400/30" />);
    }
  }
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className="inline-flex items-center gap-0.5 cursor-default"
    >
      {stars}
    </motion.div>
  );
}

export function InteractiveStarRating({
  value,
  onChange,
  disabled = false,
  showStepper = true,
}: {
  value: number | null;
  onChange: (val: number | null) => void;
  disabled?: boolean;
  showStepper?: boolean;
}) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const displayRating = hoverVal ?? value ?? 0;

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>, starIdx: number) => {
    if (disabled) return;
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    setHoverVal(isLeftHalf ? starIdx - 0.5 : starIdx);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, starIdx: number) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    const targetVal = isLeftHalf ? starIdx - 0.5 : starIdx;
    onChange(value === targetVal ? null : targetVal);
  };

  const stepBy = (delta: number) => {
    if (disabled) return;
    const curr = value ?? 0;
    const next = Math.min(5, Math.max(0.5, Math.round((curr + delta) * 2) / 2));
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="inline-flex items-center gap-1 sm:gap-1.5"
        onMouseLeave={() => setHoverVal(null)}
      >
        {[1, 2, 3, 4, 5].map((starIdx) => {
          const isFilled = displayRating >= starIdx;
          const isHalf = displayRating >= starIdx - 0.5 && displayRating < starIdx;

          return (
            <motion.button
              key={starIdx}
              type="button"
              disabled={disabled}
              whileHover={{ scale: 1.2, rotate: 4 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              onPointerMove={(e) => handlePointerMove(e, starIdx)}
              onClick={(e) => handleClick(e, starIdx)}
              aria-label={`Rate ${starIdx} stars`}
              className="relative cursor-pointer touch-manipulation p-1 focus:outline-hidden disabled:opacity-50 sm:p-0.5"
            >
              {isFilled ? (
                <Star className="h-7 w-7 fill-amber-400 text-amber-400 drop-shadow-xs sm:h-5 sm:w-5" />
              ) : isHalf ? (
                <div className="relative flex h-7 w-7 items-center sm:h-5 sm:w-5">
                  <Star className="h-7 w-7 text-amber-400/30 sm:h-5 sm:w-5" />
                  <div className="absolute top-0 left-0 h-7 w-[50%] overflow-hidden sm:h-5">
                    <Star className="h-7 w-7 max-w-none fill-amber-400 text-amber-400 sm:h-5 sm:w-5" />
                  </div>
                </div>
              ) : (
                <Star className="h-7 w-7 text-amber-400/30 transition-colors hover:text-amber-400/70 sm:h-5 sm:w-5" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Mobile-Friendly Stepper Buttons (-½ / +½) */}
      {showStepper && (
        <div className="flex items-center gap-1.5">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={disabled || (value ?? 0) <= 0.5}
            onClick={() => stepBy(-0.5)}
            className="flex h-8 items-center justify-center rounded-lg border border-border bg-surface/80 px-2.5 font-semibold text-text-muted text-xs shadow-2xs hover:bg-surface disabled:opacity-40"
            title="Decrease rating by 0.5"
          >
            -½
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={disabled || (value ?? 0) >= 5}
            onClick={() => stepBy(0.5)}
            className="flex h-8 items-center justify-center rounded-lg border border-border bg-surface/80 px-2.5 font-semibold text-text-muted text-xs shadow-2xs hover:bg-surface disabled:opacity-40"
            title="Increase rating by 0.5"
          >
            +½
          </motion.button>
          {value != null && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              disabled={disabled}
              onClick={() => onChange(null)}
              className="flex h-8 items-center justify-center rounded-lg px-2 font-medium text-rose-500 text-xs hover:bg-rose-500/10 dark:text-rose-400"
            >
              Clear
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

export function RatingSelect({
  value,
  onChange,
  mode,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  mode: 'stars' | 'decimal';
}) {
  if (mode === 'stars') {
    return (
      <div className="flex items-center gap-3 py-1">
        <InteractiveStarRating value={value} onChange={onChange} />
        <span className="font-semibold text-text-muted text-xs">
          {value != null ? `${value.toFixed(1)} / 5` : 'Not rated'}
        </span>
      </div>
    );
  }

  const options: (number | null)[] = [null];
  for (let v = 0.5; v <= 5; v += 0.5) options.push(Math.round(v * 10) / 10);

  return (
    <Select
      value={value == null ? 'none' : value.toString()}
      onValueChange={(val) => onChange(val === 'none' ? null : parseFloat(val))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select rating" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Not rated</SelectItem>
        {options
          .filter((opt): opt is number => opt !== null)
          .map((opt) => (
            <SelectItem key={opt} value={opt.toString()}>
              <div className="flex items-center gap-2">
                <span>{opt.toFixed(1)}</span>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
