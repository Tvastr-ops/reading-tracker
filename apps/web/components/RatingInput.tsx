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
  return <div className="inline-flex items-center gap-0.5">{stars}</div>;
}

export function InteractiveStarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange: (val: number | null) => void;
  disabled?: boolean;
}) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const displayRating = hoverVal ?? value ?? 0;

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((starIdx) => {
        const isFilled = displayRating >= starIdx;
        const isHalf = displayRating >= starIdx - 0.5 && displayRating < starIdx;

        return (
          <motion.button
            key={starIdx}
            type="button"
            disabled={disabled}
            whileHover={{ scale: 1.25, rotate: 6 }}
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 450, damping: 20 }}
            onMouseEnter={() => setHoverVal(starIdx)}
            onMouseLeave={() => setHoverVal(null)}
            onClick={() => onChange(value === starIdx ? null : starIdx)}
            aria-label={`Rate ${starIdx} stars`}
            className="p-0.5 focus:outline-hidden disabled:opacity-50"
          >
            {isFilled ? (
              <Star className="h-5 w-5 fill-amber-400 text-amber-400 drop-shadow-xs" />
            ) : isHalf ? (
              <div className="relative flex h-5 w-5 items-center">
                <Star className="h-5 w-5 text-amber-400/30" />
                <div className="absolute top-0 left-0 h-5 w-[50%] overflow-hidden">
                  <Star className="h-5 w-5 max-w-none fill-amber-400 text-amber-400" />
                </div>
              </div>
            ) : (
              <Star className="h-5 w-5 text-amber-400/30 transition-colors hover:text-amber-400/70" />
            )}
          </motion.button>
        );
      })}
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
                {mode === 'stars' && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
