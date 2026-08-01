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
        className="text-text-main"
        role="img"
        aria-label={summary}
      >
        {data.map((d, i) => {
          // Reserve fixed space at the top for the count label, separate
          // from the bar-height calculation — otherwise the tallest bar's
          // own label has nowhere to go and ends up above y=0, clipped
          // outside the SVG entirely (this was happening to whichever bar
          // was tallest, silently, since it's invisible rather than an
          // error).
          const topMargin = 10;
          const usableHeight = height - 16 - topMargin;
          const h = (d.value / max) * usableHeight;
          const x = i * barWidth;
          const barTop = height - 16 - h;
          return (
            <g key={d.label}>
              <rect
                x={x + barWidth * 0.15}
                y={barTop}
                width={barWidth * 0.7}
                height={h}
                fill="currentColor"
                rx={1}
              />
              {d.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={barTop - 3}
                  fontSize="5"
                  textAnchor="middle"
                  fill="currentColor"
                >
                  {d.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="text-[12px] text-text-muted flex" aria-hidden="true">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center">{d.label}</div>
        ))}
      </div>
    </div>
  );
}
