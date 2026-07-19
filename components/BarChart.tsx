'use client';

export function BarChart({
  data,
  height = 120,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none">
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
                fill="#1c1c1c"
                rx={1}
              />
              {d.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={height - 18 - h}
                  fontSize="4"
                  textAnchor="middle"
                  fill="#6b6b6b"
                >
                  {d.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', fontSize: 10, color: '#8a8880' }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, textAlign: 'center' }}>{d.label}</div>
        ))}
      </div>
    </div>
  );
}
