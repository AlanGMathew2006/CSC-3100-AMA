import { ringArcs, ringLegendText, type RingSegment } from "@csc-3100-ama/shared";

const SIZE = 104; // .nutrition-chart is 104x104
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// The calorie ring: the gray chart face with one arc per macro (protein, carbs, fat) around its
// edge starting at 12 o'clock, the number, caption and detail in the middle, and the legend beside it.
export function NutritionRing({
  value,
  label,
  detail,
  segments,
}: {
  value: string;
  label: string;
  detail: string;
  segments: RingSegment[];
}) {
  const arcs = ringArcs(segments, RADIUS, STROKE);
  return (
    <>
      <div className="nutrition-chart" aria-label="Nutrition summary">
        <svg className="nutrition-ring" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              className={`ring-segment ring-segment--${arc.key}`}
              data-segment={arc.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE}`}
              strokeDashoffset={arc.offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              style={{ stroke: `var(--macro-${arc.key})` }}
            />
          ))}
        </svg>
        <div className="chart-center">
          <strong>{value}</strong>
          <span>{label}</span>
          <small>{detail}</small>
        </div>
      </div>
      <div className="legend-list">
        {segments.map((segment) => (
          <div className="legend-item" key={segment.key}>
            <span className={`legend-dot legend-dot--${segment.key}`} />
            {ringLegendText(segment)}
          </div>
        ))}
      </div>
    </>
  );
}
