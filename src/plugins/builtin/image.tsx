import type { CSSProperties, ReactNode } from "react";
import type {
  DataItem,
  PluginDefinition,
  PluginRenderMode,
  PluginTransitionContext,
} from "../../types/project";

type PresentationAnimation = "none" | "fade" | "slide-left" | "slide-right";

const PRESENTATION_ANIMATION_OPTIONS = [
  { label: "无动画", value: "none" },
  { label: "淡入淡出", value: "fade" },
  { label: "从左侧滑入", value: "slide-left" },
  { label: "从右侧滑入", value: "slide-right" },
];

/** 读取图片组件的动画时长；无效值回退到项目级默认值，并禁止出现负时长。 */
function resolveAnimationDuration(properties: Record<string, unknown>, fallback: number) {
  const configured = Number(properties.animationDuration);
  return Number.isFinite(configured) ? Math.max(0, configured) : Math.max(0, fallback);
}

/** 对来自 JSON 的未知值做白名单校验，避免生成不存在的 CSS 类名。 */
function resolvePresentationAnimation(value: unknown): PresentationAnimation {
  return value === "fade" || value === "slide-left" || value === "slide-right" ? value : "none";
}

/** 图片插件自己的交叉过渡容器，同时渲染旧图片退出层和新图片进入层。 */
function ImageTransitionLayers({
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

/** 图片插件：负责按绑定路径展示数据对象中的图片。 */
export const imagePlugin = {
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
      <ImageTransitionLayers
        animation={animation}
        current={renderImageContent(value, item, properties)}
        duration={duration}
        mode={mode}
        previous={renderImageContent(transition?.previousValue, transition?.previousItem ?? item, properties)}
        transition={transition}
      />
    );
  },
} satisfies PluginDefinition;
