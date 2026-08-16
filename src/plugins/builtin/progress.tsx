import type {
  PluginDefinition,
  PluginPlaybackContext,
  PluginRenderMode,
} from "../../types/project";

/**
 * 进度条数值解析：编辑模式固定为 50% 方便预览，展示模式根据属性选择
 * 当前对象进度或整条时间轴进度，并统一夹紧到 0～1。
 */
function resolveProgress(mode: PluginRenderMode, playback: PluginPlaybackContext | undefined, progressMode: unknown) {
  if (mode === "editor") return 0.5;
  const value = progressMode === "timeline" ? playback?.timelineProgress : playback?.itemProgress;
  return Math.max(0, Math.min(1, Number(value) || 0));
}

/** 进度条插件：显示当前对象或整个时间轴的播放进度。 */
export const progressPlugin = {
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
} satisfies PluginDefinition;
