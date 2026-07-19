'use client';

export function RatingDisplay({ rating, mode }: { rating: number | null; mode: 'stars' | 'decimal' }) {
  if (rating == null) return <span style={{ color: '#b7b5ae' }}>—</span>;
  if (mode === 'decimal') return <span>{rating.toFixed(1)} / 5</span>;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = rating - (i - 1);
    let char = '☆';
    let filled = false;
    if (diff >= 1) { char = '★'; filled = true; }
    else if (diff >= 0.5) { char = '⯨'; filled = true; }
    stars.push(
      <span key={i} className={filled ? 'filled' : ''}>{char}</span>
    );
  }
  return <span className="rating-stars">{stars}</span>;
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
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
    >
      {options.map((opt) => (
        <option key={opt ?? 'none'} value={opt ?? ''}>
          {opt == null ? 'Not rated' : mode === 'decimal' ? `${opt.toFixed(1)}` : `${opt.toFixed(1)} ★`}
        </option>
      ))}
    </select>
  );
}
