import React from 'react';

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
}

interface MultiLineChartProps {
  title?: string;
  xLabels: (string | number)[];
  series: LineSeries[];
  height?: number;
  yMax?: number;
  unit?: string;
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  title,
  xLabels,
  series,
  height = 220,
  yMax,
  unit = '',
}) => {
  const width = 640;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allValues = series.flatMap((s) => s.values);
  const computedMax = yMax ?? Math.max(10, ...allValues, 1);
  const count = Math.max(1, xLabels.length);

  const toX = (idx: number) =>
    count <= 1 ? padLeft + plotW / 2 : padLeft + (idx / (count - 1)) * plotW;
  const toY = (val: number) =>
    padTop + plotH - (Math.max(0, Math.min(computedMax, val)) / computedMax) * plotH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * computedMax));

  return (
    <div className="w-full">
      {title && (
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[#E7E9D8]">{title}</h4>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#C8B995]">
            {series.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {allValues.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-[#263B30] bg-[#101B17] text-xs text-[#8AA78C]">
          Деректер жиналуда — симуляцияны іске қосыңыз.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible"
          role="img"
          aria-label={title ?? 'Деректер графигі'}
        >
          {yTicks.map((tickVal, idx) => {
            const y = toY(tickVal);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#263B30"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#8AA78C] text-[10px] font-mono"
                >
                  {tickVal}
                  {unit}
                </text>
              </g>
            );
          })}

          {series.map((s) => {
            if (s.values.length === 0) return null;
            const points = s.values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
            const lastIdx = s.values.length - 1;
            return (
              <g key={s.id}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={points}
                />
                <circle
                  cx={toX(lastIdx)}
                  cy={toY(s.values[lastIdx])}
                  r={3.5}
                  fill={s.color}
                />
              </g>
            );
          })}

          {/* X-axis labels (first, middle, last) */}
          {xLabels.length > 0 &&
            [0, Math.floor((xLabels.length - 1) / 2), xLabels.length - 1]
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .map((idx) => (
                <text
                  key={idx}
                  x={toX(idx)}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-[#8AA78C] text-[10px] font-mono"
                >
                  {xLabels[idx]}
                </text>
              ))}
        </svg>
      )}
    </div>
  );
};

interface ComparisonBarItem {
  label: string;
  valueA: number;
  valueB: number;
}

interface ComparisonBarChartProps {
  items: ComparisonBarItem[];
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
}

export const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
  items,
  labelA,
  labelB,
  colorA = '#8AA78C',
  colorB = '#D5AE64',
}) => {
  const maxVal = Math.max(
    1,
    ...items.flatMap((it) => [it.valueA, it.valueB])
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-5 text-xs text-[#C8B995]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colorA }} />
          {labelA}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colorB }} />
          {labelB}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const pctA = Math.min(100, (item.valueA / maxVal) * 100);
          const pctB = Math.min(100, (item.valueB / maxVal) * 100);
          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#E7E9D8] font-medium">{item.label}</span>
                <span className="font-mono tabular-nums text-[#C8B995]">
                  {item.valueA} vs {item.valueB}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-2 w-full rounded bg-[#101B17] overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${pctA}%`, backgroundColor: colorA }}
                  />
                </div>
                <div className="h-2 w-full rounded bg-[#101B17] overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${pctB}%`, backgroundColor: colorB }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
