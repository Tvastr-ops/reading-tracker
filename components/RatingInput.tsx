'use client';

export function RatingDisplay({ rating, mode }: { rating: number | null; mode: 'stars' | 'decimal' }) {
  if (rating == null) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  if (mode === 'decimal') return <span>{rating.toFixed(1)} / 5</span>;

  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = rating - (i - 1);
    if (diff >= 1) {
      // Full star.
      stars.push(<span key={i} className="filled">★</span>);
    } else if (diff >= 0.5) {
      // Half star: rendered as a filled ★ clipped to 50% width, layered over
      // an empty ☆ underneath. Some devices/fonts don't include a half-star
      // glyph at all and render it as a "tofu" placeholder box, so this
      // avoids depending on one — only ★/☆ are used, which are universally
      // supported.
      stars.push(
        <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
          <span>☆</span>
          <span
            className="filled"
            style={{ position: 'absolute', left: 0, top: 0, width: '50%', overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            ★
          </span>
        </span>
      );
    } else {
      stars.push(<span key={i}>☆</span>);
    }
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
