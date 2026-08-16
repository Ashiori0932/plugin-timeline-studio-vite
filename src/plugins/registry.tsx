import type { CSSProperties, ReactNode } from "react";
import type {
  DataItem,
  PluginDefinition,
  PluginPlaybackContext,
  PluginRenderMode,
  PluginTransitionContext,
} from "../types/project";

type PresentationAnimation = "none" | "fade" | "slide-left" | "slide-right";

/** 条形图通过 CSS 自定义属性把起止宽度传给关键帧动画。 */
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

/** 读取组件级动画时长；无效值回退到项目级默认值，并禁止出现负时长。 */
function resolveAnimationDuration(properties: Record<string, unknown>, fallback: number) {
  const configured = Number(properties.animationDuration);
  return Number.isFinite(configured) ? Math.max(0, configured) : Math.max(0, fallback);
}

/** 对来自 JSON 的未知值做白名单校验，避免生成不存在的 CSS 类名。 */
function resolvePresentationAnimation(value: unknown): PresentationAnimation {
  return value === "fade" || value === "slide-left" || value === "slide-right" ? value : "none";
}

/**
 * 进度条数值解析：编辑模式固定为 50% 方便预览，展示模式根据属性选择
 * 当前对象进度或整条时间轴进度，并统一夹紧到 0～1。
 */
function resolveProgress(mode: PluginRenderMode, playback: PluginPlaybackContext | undefined, progressMode: unknown) {
  if (mode === "editor") return 0.5;
  const value = progressMode === "timeline" ? playback?.timelineProgress : playback?.itemProgress;
  return Math.max(0, Math.min(1, Number(value) || 0));
}

/**
 * 文本和图片共用的交叉过渡容器。
 * 切换时旧内容与新内容同时占据同一位置，分别执行退出和进入动画；transition.key
 * 用于强制 React 为每次对象切换创建新的动画节点。
 */
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
  // 编辑模式、禁用动画或零时长时只渲染当前层，避免无意义的叠层结构。
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

/** 纯文本内容渲染，过渡容器会分别用当前值和旧值调用它。 */
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

/** 图片内容渲染，同时处理无效路径、暗色遮罩和数据对象标识。 */
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

/**
 * 内置插件注册表，也是插件系统的单一事实来源。
 * 编辑器组件库、属性表单、数据绑定筛选和最终渲染都读取这里的声明。
 */
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
      // 组件级时长优先；缺失时使用展示运行时传入的项目级过渡时长。
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
  },
  "builtin.progress": {
    type: "builtin.progress",
    name: "进度条",
    glyph: "▰",
    description: "对象或时间轴播放进度",
    // 进度来自播放上下文而非 DataItem，因此不声明数据绑定类型。
    acceptedTypes: [],
    defaultSize: { width: 520, height: 24 },
    minimumSize: { width: 8, height: 8 },
    defaultProperties: {
      progressMode: "item",
      foreground: "#d6f15a",
      track: "#33413a",
      radius: 12,
      direction: "horizontal",
    },
    propertySchema: [
      { key: "progressMode", label: "进度模式", type: "select", options: [{ label: "当前对象", value: "item" }, { label: "整个时间轴", value: "timeline" }] },
      { key: "foreground", label: "前景颜色", type: "color" },
      { key: "track", label: "轨道颜色", type: "color" },
      { key: "radius", label: "圆角", type: "number", min: 0, max: 200, step: 1 },
      { key: "direction", label: "方向", type: "select", options: [{ label: "横向", value: "horizontal" }, { label: "纵向", value: "vertical" }] },
    ],
    render: ({ mode, playback, properties }) => {
      const direction = properties.direction === "vertical" ? "vertical" : "horizontal";
      const progress = resolveProgress(mode, playback, properties.progressMode);
      const radius = Math.max(0, Number(properties.radius) || 0);
      // 使用 transform 而不是修改 width/height，减少播放时的布局计算。
      const fillTransform = direction === "vertical" ? `scaleY(${progress})` : `scaleX(${progress})`;

      return (
        <div
          aria-label={`${properties.progressMode === "timeline" ? "时间轴" : "当前对象"}进度 ${Math.round(progress * 100)}%`}
          className={`plugin-progress plugin-progress-${direction}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          style={{ backgroundColor: String(properties.track), borderRadius: radius }}
        >
          <span style={{ backgroundColor: String(properties.foreground), borderRadius: radius, transform: fillTransform }} />
        </div>
      );
    },
  },
};

/**
 * 编辑器与展示运行时共用的插件入口。
 * 它负责未知插件兜底，并把默认属性与实例属性合并后交给插件自身渲染。
 */
export function PluginRenderer({ pluginType, value, item, properties, mode = "editor", playback, transition }: {
  pluginType: string;
  value: unknown;
  item: DataItem;
  properties: Record<string, unknown>;
  mode?: PluginRenderMode;
  playback?: PluginPlaybackContext;
  transition?: PluginTransitionContext;
}) {
  const plugin = PLUGIN_REGISTRY[pluginType];
  if (!plugin) return <div className="plugin-missing">未知插件：{pluginType}</div>;
  return plugin.render({
    value,
    item,
    // 默认值在前，项目实例值在后；旧项目因此可自动获得新增加的属性。
    properties: { ...plugin.defaultProperties, ...properties },
    mode,
    playback,
    transition,
  });
}
