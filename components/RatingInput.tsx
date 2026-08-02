'use client';

import { Star } from 'lucide-react';
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
      stars.push(<Star key={i} className="inline-block h-4 w-4 fill-amber-400 text-amber-400" />);
    } else if (diff >= 0.5) {
      stars.push(
        <div key={i} className="relative inline-block h-4 w-4">
          <Star className="inline-block h-4 w-4 text-amber-400/30" />
          <div className="absolute inset-0 w-1/2 overflow-hidden">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </div>
        </div>,
      );
    } else {
      stars.push(<Star key={i} className="inline-block h-4 w-4 text-amber-400/30" />);
    }
  }
  return <div className="inline-flex items-center gap-0.5">{stars}</div>;
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
