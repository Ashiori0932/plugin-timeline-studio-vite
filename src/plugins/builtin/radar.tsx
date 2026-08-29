import type { PluginDefinition } from "../../types/project";

type RadarEntry = [string, number];

function toRadarEntries(value: unknown): RadarEntry[] {
  if (typeof value === "number") return [["数值", value]];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (typeof item === "number") return [[`项目 ${index + 1}`, item] as RadarEntry];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const number = Object.values(record).find((entry) => typeof entry === "number");
        return typeof number === "number"
          ? [[String(record.label ?? record.name ?? `项目 ${index + 1}`), number] as RadarEntry]
          : [];
      }
      return [];
    });
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is RadarEntry => typeof entry[1] === "number",
    );
  }
  return [];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function resolveAnimationDuration(properties: Record<string, unknown>, fallback: number) {
  const configured = Number(properties.animationDuration);
  return Number.isFinite(configured) ? Math.max(0, configured) : Math.max(0, fallback);
}

function formatRadarValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getPoint(index: number, total: number, ratio: number, radius: number) {
  const angle = -Math.PI / 2 + index / total * Math.PI * 2;
  return {
    x: 50 + Math.cos(angle) * radius * ratio,
    y: 50 + Math.sin(angle) * radius * ratio,
  };
}

function toPoints(entries: RadarEntry[], minimum: number, maximum: number, radius: number) {
  const range = Math.max(1, maximum - minimum);
  return entries.map(([, value], index) => {
    const ratio = clamp((value - minimum) / range, 0, 1);
    const point = getPoint(index, entries.length, ratio, radius);
    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }).join(" ");
}

function alignEntries(currentEntries: RadarEntry[], previousEntries: RadarEntry[]) {
  const currentByLabel = new Map(currentEntries);
  const previousByLabel = new Map(previousEntries);
  return currentEntries.map(([label, value]) => [label, previousByLabel.get(label) ?? value] as RadarEntry)
    .concat(previousEntries.filter(([label]) => !currentByLabel.has(label)).map(([label]) => [label, 0] as RadarEntry))
    .slice(0, currentEntries.length);
}

/** 雷达图插件：把对象、数组或数字字段转换为 4～8 维雷达图。 */
export const radarPlugin = {
  type: "builtin.radar",
  name: "雷达图",
  glyph: "◇",
  description: "4-8 维指标对比",
  acceptedTypes: ["object", "array", "number"],
  defaultSize: { width: 420, height: 420 },
  minimumSize: { width: 220, height: 220 },
  aspectRatio: 1,
  defaultProperties: {
    dimensions: 4,
    minValue: 0,
    maxValue: 100,
    accent: "#b9ccff",
    fillColor: "#7f9eff",
    gridColor: "#91a0aa",
    labelColor: "#ffffff",
    showValues: "on",
    animationDuration: 700,
  },
  propertySchema: [
    { key: "dimensions", label: "显示维度", type: "number", min: 4, max: 8, step: 1 },
    { key: "minValue", label: "最小值", type: "number", min: -10000, max: 10000, step: 1 },
    { key: "maxValue", label: "最大值", type: "number", min: -10000, max: 10000, step: 1 },
    { key: "accent", label: "描边颜色", type: "color" },
    { key: "fillColor", label: "填充颜色", type: "color" },
    { key: "gridColor", label: "网格颜色", type: "color" },
    { key: "labelColor", label: "标签颜色", type: "color" },
    { key: "showValues", label: "显示数值", type: "select", options: [{ label: "显示", value: "on" }, { label: "隐藏", value: "off" }] },
    { key: "animationDuration", label: "动画时长 / ms", type: "number", min: 0, max: 5000, step: 50 },
  ],
  render: ({ value, properties, mode, transition }) => {
    const dimensions = clamp(Math.round(resolveNumber(properties.dimensions, 4)), 4, 8);
    const currentEntries = toRadarEntries(value).slice(0, dimensions);
    const minimum = resolveNumber(properties.minValue, 0);
    const configuredMax = resolveNumber(properties.maxValue, 100);
    const maximum = configuredMax > minimum ? configuredMax : minimum + 1;
    const radius = 27;
    const labelRadius = 43;
    const gridLevels = [0.25, 0.5, 0.75, 1];
    const duration = resolveAnimationDuration(properties, transition?.defaultDuration ?? 400);
    const shouldAnimate = mode === "presentation" && Boolean(transition) && duration > 0;
    const previousEntries = shouldAnimate
      ? alignEntries(currentEntries, toRadarEntries(transition?.previousValue).slice(0, dimensions))
      : currentEntries;
    const currentPoints = toPoints(currentEntries, minimum, maximum, radius);
    const previousPoints = toPoints(previousEntries, minimum, maximum, radius);

    if (!currentEntries.length) return <div className="chart-empty">没有可绘制的数值</div>;

    return (
      <div className="plugin-radar" style={{ color: String(properties.labelColor) }}>
        <svg viewBox="0 0 100 100" role="img" aria-label="雷达图">
          <g className="radar-grid" stroke={String(properties.gridColor)}>
            {gridLevels.map((level) => (
              <polygon key={level} points={currentEntries.map((_, index) => {
                const point = getPoint(index, currentEntries.length, level, radius);
                return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
              }).join(" ")} />
            ))}
            {currentEntries.map((_, index) => {
              const point = getPoint(index, currentEntries.length, 1, radius);
              return <line key={index} x1="50" y1="50" x2={point.x} y2={point.y} />;
            })}
          </g>
          <polygon className="radar-fill" points={currentPoints} fill={String(properties.fillColor)} stroke={String(properties.accent)}>
            {shouldAnimate && <animate attributeName="points" from={previousPoints} to={currentPoints} dur={`${duration}ms`} fill="freeze" />}
          </polygon>
          {currentEntries.map(([label, number], index) => {
            const point = getPoint(index, currentEntries.length, 1, labelRadius);
            return (
              <text className="radar-label" fill={String(properties.labelColor)} key={`${label}-${index}`} x={point.x} y={point.y} textAnchor="middle" dominantBaseline="middle">
                <tspan x={point.x} dy="-0.35em">{label}</tspan>
                {properties.showValues !== "off" && <tspan className="radar-label-value" x={point.x} dy="1.35em">{formatRadarValue(number)}</tspan>}
              </text>
            );
          })}
        </svg>
      </div>
    );
  },
} satisfies PluginDefinition;
