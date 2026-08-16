import type { CSSProperties, ReactNode } from "react";
import type {
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

/** 读取文本组件的动画时长；无效值回退到项目级默认值，并禁止出现负时长。 */
function resolveAnimationDuration(properties: Record<string, unknown>, fallback: number) {
  const configured = Number(properties.animationDuration);
  return Number.isFinite(configured) ? Math.max(0, configured) : Math.max(0, fallback);
}

/** 对来自 JSON 的未知值做白名单校验，避免生成不存在的 CSS 类名。 */
function resolvePresentationAnimation(value: unknown): PresentationAnimation {
  return value === "fade" || value === "slide-left" || value === "slide-right" ? value : "none";
}

/** 文本插件自己的交叉过渡容器，同时渲染旧文本退出层和新文本进入层。 */
function TextTransitionLayers({
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

/** 文本插件：负责标题、正文和数字字段的展示。 */
export const textPlugin: PluginDefinition = {
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
      <TextTransitionLayers
        animation={animation}
        current={renderTextContent(value, properties)}
        duration={duration}
        mode={mode}
        previous={renderTextContent(transition?.previousValue, properties)}
        transition={transition}
      />
    );
  },
};
