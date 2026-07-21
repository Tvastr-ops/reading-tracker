'use client';

export function BarChart({
  title,
  data,
  height = 120,
}: {
  title: string;
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  // Screen readers get nothing from raw SVG shapes — role="img" plus a
  // generated summary of the actual values gives an equivalent experience
  // instead of the chart being silently skipped.
  const summary = `${title}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`;

  return (
    <div>
      {/* currentColor picks up the CSS `color` set below, so bars/labels
          automatically follow light/dark theme without hardcoded hex. */}
      <svg
        viewBox={`0 0 100 ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        style={{ color: 'var(--text)' }}
        role="img"
        aria-label={summary}
      >
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 16);
          const x = i * barWidth;
          return (
            <g key={d.label}>
              <rect
                x={x + barWidth * 0.15}
                y={height - 16 - h}
                width={barWidth * 0.7}
                height={h}
                fill="currentColor"
                rx={1}
              />
              {d.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height - 18 - h}
                  fontSize="5"
                  textAnchor="middle"
                  fill="var(--text)"
                >
                  {d.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="label" style={{ display: 'flex' }} aria-hidden="true">
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, textAlign: 'center' }}>{d.label}</div>
        ))}
      </div>
    </div>
  );
}
