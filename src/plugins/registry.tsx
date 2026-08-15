import type { CSSProperties, ReactNode } from "react";
import type {
  DataItem,
  PluginDefinition,
  PluginRenderMode,
  PluginTransitionContext,
} from "../types/project";

type PresentationAnimation = "none" | "fade" | "slide-left" | "slide-right";
type ChartBarStyle = CSSProperties & {
  "--chart-from-width"?: string;
  "--chart-to-width"?: string;
};

const PRESENTATION_ANIMATION_OPTIONS = [
  { label: "无动画", value: "none" },
  { label: "淡入淡出", value: "fade" },
  { label: "从左侧滑入", value: "slide-left" },
  { label: "从右侧滑入", value: "slide-right" },
];

function resolveAnimationDuration(properties: Record<string, unknown>, fallback: number) {
  const configured = Number(properties.animationDuration);
  return Number.isFinite(configured) ? Math.max(0, configured) : Math.max(0, fallback);
}

function resolvePresentationAnimation(value: unknown): PresentationAnimation {
  return value === "fade" || value === "slide-left" || value === "slide-right" ? value : "none";
}

function TransitionLayers({
  animation,
  current,
  duration,
  mode,
  previous,
  transition,
}: {
  animation: PresentationAnimation;
  current: ReactNode;
  duration: number;
  mode: PluginRenderMode;
  previous: ReactNode;
  transition?: PluginTransitionContext;
}) {
  if (mode !== "presentation" || !transition || animation === "none" || duration === 0) {
    return current;
  }

  const animationStyle = { animationDuration: `${duration}ms` };
  return (
    <div className="plugin-transition-stack" key={transition.key}>
      <div
        aria-hidden="true"
        className={`plugin-transition-layer plugin-transition-out plugin-transition-${animation}`}
        style={animationStyle}
      >
        {previous}
      </div>
      <div
        className={`plugin-transition-layer plugin-transition-in plugin-transition-${animation}`}
        style={animationStyle}
      >
        {current}
      </div>
    </div>
  );
}

function renderTextContent(value: unknown, properties: Record<string, unknown>) {
  return (
    <div
      className="plugin-text"
      style={{
        fontSize: Number(properties.fontSize),
        color: String(properties.color),
        fontWeight: Number(properties.weight),
        textAlign: properties.align as CSSProperties["textAlign"],
        letterSpacing: Number(properties.letterSpacing),
      }}
    >
      {value === undefined || value === null ? "未绑定文本" : String(value)}
    </div>
  );
}

function renderImageContent(value: unknown, item: DataItem, properties: Record<string, unknown>) {
  return (
    <div className="plugin-image" style={{ borderRadius: Number(properties.radius), backgroundColor: "#ced3ca" }}>
      {typeof value === "string" && value
        ? <img src={value} alt={String(item.title ?? "数据图片")} draggable={false} style={{ objectFit: properties.fit as CSSProperties["objectFit"] }} />
        : <span>图片路径无效</span>}
      <i style={{ background: `rgba(8, 18, 14, ${Number(properties.overlay) / 100})` }} />
      <b>#{String(item.id ?? "IMAGE").toUpperCase()}</b>
    </div>
  );
}

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

export const PLUGIN_REGISTRY: Record<string, PluginDefinition> = {
  "builtin.text": {
    type: "builtin.text",
    name: "文本",
    glyph: "T",
    description: "标题、正文与数字",
    acceptedTypes: ["string", "number"],
    defaultSize: { width: 520, height: 120 },
    defaultProperties: {
      fontSize: 42,
      color: "#17211d",
      weight: "600",
      align: "left",
      letterSpacing: 0,
      animation: "fade",
      animationDuration: 400,
    },
    propertySchema: [
      { key: "fontSize", label: "字号", type: "number", min: 10, max: 180, step: 1 },
      { key: "color", label: "文字颜色", type: "color" },
      { key: "weight", label: "字重", type: "select", options: [{ label: "常规", value: "400" }, { label: "中等", value: "500" }, { label: "粗体", value: "700" }] },
      { key: "align", label: "对齐", type: "select", options: [{ label: "左对齐", value: "left" }, { label: "居中", value: "center" }, { label: "右对齐", value: "right" }] },
      { key: "letterSpacing", label: "字间距", type: "number", min: -8, max: 24, step: 1 },
      { key: "animation", label: "展示动画", type: "select", options: PRESENTATION_ANIMATION_OPTIONS },
      { key: "animationDuration", label: "动画时长 / ms", type: "number", min: 0, max: 5000, step: 50 },
    ],
    render: ({ value, properties, mode, transition }) => {
      const duration = resolveAnimationDuration(properties, transition?.defaultDuration ?? 400);
      const animation = resolvePresentationAnimation(properties.animation);
      return (
        <TransitionLayers
          animation={animation}
          current={renderTextContent(value, properties)}
          duration={duration}
          mode={mode}
          previous={renderTextContent(transition?.previousValue, properties)}
          transition={transition}
        />
      );
    },
  },
  "builtin.image": {
    type: "builtin.image",
    name: "图片",
    glyph: "▧",
    description: "自适应图像容器",
    acceptedTypes: ["string"],
    defaultSize: { width: 600, height: 420 },
    defaultProperties: {
      fit: "cover",
      radius: 8,
      overlay: 10,
      animation: "fade",
      animationDuration: 400,
    },
    propertySchema: [
      { key: "fit", label: "填充方式", type: "select", options: [{ label: "裁切填满", value: "cover" }, { label: "完整显示", value: "contain" }] },
      { key: "radius", label: "圆角", type: "number", min: 0, max: 80, step: 1 },
      { key: "overlay", label: "暗化程度", type: "number", min: 0, max: 80, step: 1 },
      { key: "animation", label: "展示动画", type: "select", options: PRESENTATION_ANIMATION_OPTIONS },
      { key: "animationDuration", label: "动画时长 / ms", type: "number", min: 0, max: 5000, step: 50 },
    ],
    render: ({ value, item, properties, mode, transition }) => {
      const duration = resolveAnimationDuration(properties, transition?.defaultDuration ?? 400);
      const animation = resolvePresentationAnimation(properties.animation);
      return (
        <TransitionLayers
          animation={animation}
          current={renderImageContent(value, item, properties)}
          duration={duration}
          mode={mode}
          previous={renderImageContent(transition?.previousValue, transition?.previousItem ?? item, properties)}
          transition={transition}
        />
      );
    },
  },
  "builtin.chart": {
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
      const currentEntries = toChartEntries(value).slice(0, maxItems);
      const shouldAnimate = mode === "presentation"
        && Boolean(transition)
        && properties.animateValues !== "off"
        && resolveAnimationDuration(properties, transition?.defaultDuration ?? 400) > 0;
      const previousEntries = shouldAnimate
        ? toChartEntries(transition?.previousValue).slice(0, maxItems)
        : [];
      const currentValues = new Map(currentEntries);
      const previousValues = new Map(previousEntries);
      const labels = shouldAnimate
        ? [...currentEntries.map(([label]) => label), ...previousEntries.map(([label]) => label).filter((label) => !currentValues.has(label))].slice(0, maxItems)
        : currentEntries.map(([label]) => label);
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
  },
};

export function PluginRenderer({ pluginType, value, item, properties, mode = "editor", transition }: {
  pluginType: string;
  value: unknown;
  item: DataItem;
  properties: Record<string, unknown>;
  mode?: PluginRenderMode;
  transition?: PluginTransitionContext;
}) {
  const plugin = PLUGIN_REGISTRY[pluginType];
  if (!plugin) return <div className="plugin-missing">未知插件：{pluginType}</div>;
  return plugin.render({
    value,
    item,
    properties: { ...plugin.defaultProperties, ...properties },
    mode,
    transition,
  });
}
