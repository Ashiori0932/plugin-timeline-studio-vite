import type { CSSProperties } from "react";
import type { PluginDefinition } from "../../types/project";

/** 条形图通过 CSS 自定义属性把起止宽度传给关键帧动画。 */
type ChartBarStyle = CSSProperties & {
  "--chart-from-width"?: string;
  "--chart-to-width"?: string;
};

/** 读取条形图动画时长；无效值回退到项目级默认值，并禁止出现负时长。 */
function resolveAnimationDuration(properties: Record<string, unknown>, fallback: number) {
  const configured = Number(properties.animationDuration);
  return Number.isFinite(configured) ? Math.max(0, configured) : Math.max(0, fallback);
}

/**
 * 将插件允许的多种输入形态规范化为“标签-数值”列表：
 * - 单个数字成为一条记录；
 * - 数字数组按序号命名；对象数组读取首个数值字段及 label/name；
 * - 普通对象保留所有数值字段。
 */
function toChartEntries(value: unknown): Array<[string, number]> {
  if (typeof value === "number") return [["数值", value]];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (typeof item === "number") return [[`项目 ${index + 1}`, item] as [string, number]];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const number = Object.values(record).find((entry) => typeof entry === "number");
        return typeof number === "number"
          ? [[String(record.label ?? record.name ?? `项目 ${index + 1}`), number] as [string, number]]
          : [];
      }
      return [];
    });
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, number] => typeof entry[1] === "number",
    );
  }
  return [];
}

/** 条形图插件：把数字、数组或对象字段转换为横向条形图。 */
export const chartPlugin = {
  type: "builtin.chart",
  name: "条形图",
  glyph: "▥",
  description: "对象或数组数据",
  acceptedTypes: ["object", "array", "number"],
  defaultSize: { width: 620, height: 240 },
  defaultProperties: {
    accent: "#ee6b4d",
    labelColor: "#33413a",
    barColor: "#d9ded5",
    maxItems: 5,
    animateValues: "on",
    animationDuration: 600,
  },
  propertySchema: [
    { key: "accent", label: "强调颜色", type: "color" },
    { key: "barColor", label: "轨道颜色", type: "color" },
    { key: "labelColor", label: "标签颜色", type: "color" },
    { key: "maxItems", label: "最大条目数", type: "number", min: 1, max: 12, step: 1 },
    { key: "animateValues", label: "数值动画", type: "select", options: [{ label: "开启", value: "on" }, { label: "关闭", value: "off" }] },
    { key: "animationDuration", label: "动画时长 / ms", type: "number", min: 0, max: 5000, step: 50 },
  ],
  render: ({ value, properties, mode, transition }) => {
    const maxItems = Math.max(1, Number(properties.maxItems));
    // 先规范化再截断，保证画布中最多出现 schema 允许的条目数。
    const currentEntries = toChartEntries(value).slice(0, maxItems);
    // 数值插值只在展示模式的对象切换窗口内启用，编辑预览保持静态。
    const shouldAnimate = mode === "presentation"
      && Boolean(transition)
      && properties.animateValues !== "off"
      && resolveAnimationDuration(properties, transition?.defaultDuration ?? 400) > 0;
    const previousEntries = shouldAnimate
      ? toChartEntries(transition?.previousValue).slice(0, maxItems)
      : [];
    // 通过标签对齐前后两组数据；新标签从 0 出现，消失的标签向 0 收缩。
    const currentValues = new Map(currentEntries);
    const previousValues = new Map(previousEntries);
    const labels = shouldAnimate
      ? [...currentEntries.map(([label]) => label), ...previousEntries.map(([label]) => label).filter((label) => !currentValues.has(label))].slice(0, maxItems)
      : currentEntries.map(([label]) => label);
    // 前后状态分别归一化，确保各自最大值占满轨道；负值按 0 处理。
    const currentMax = Math.max(1, ...currentEntries.map(([, number]) => Math.max(0, number)));
    const previousMax = Math.max(1, ...previousEntries.map(([, number]) => Math.max(0, number)));
    const duration = resolveAnimationDuration(properties, transition?.defaultDuration ?? 400);

    return (
      <div className="plugin-chart">
        {labels.length ? labels.map((label, index) => {
          const previousNumber = previousValues.get(label) ?? 0;
          const currentNumber = currentValues.get(label) ?? 0;
          const fromWidth = Math.max(0, previousNumber) / previousMax * 100;
          const toWidth = Math.max(0, currentNumber) / currentMax * 100;
          const barStyle: ChartBarStyle = {
            width: `${toWidth}%`,
            backgroundColor: index === 0 ? String(properties.accent) : String(properties.labelColor),
          };

          if (shouldAnimate) {
            // CSS 关键帧读取两个自定义属性，实现从旧值宽度到新值宽度的过渡。
            barStyle["--chart-from-width"] = `${fromWidth}%`;
            barStyle["--chart-to-width"] = `${toWidth}%`;
            barStyle.animationDuration = `${duration}ms`;
          }

          return (
            <div className="chart-row" key={`${label}-${index}`}>
              <span style={{ color: String(properties.labelColor) }}>{label}</span>
              <div style={{ backgroundColor: String(properties.barColor) }}>
                <i
                  className={shouldAnimate ? "is-value-animating" : undefined}
                  /* 每次切换都更新 key，使同标签连续切换时也能重新触发 CSS 动画。 */
                  key={`${label}-${transition?.key ?? 0}`}
                  style={barStyle}
                />
              </div>
              <strong style={{ color: String(properties.labelColor) }}>{currentNumber}</strong>
            </div>
          );
        }) : <div className="chart-empty">没有可绘制的数值</div>}
      </div>
    );
  },
} satisfies PluginDefinition;
