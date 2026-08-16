import type { ReactNode } from "react";

/** 时间轴中的一个业务对象。除系统字段外可携带任意 JSON 兼容字段。 */
export type DataItem = Record<string, unknown> & {
  /** 可选业务标识，主要用于图片角标、调试和展示。 */
  id?: string;
  /** 当前对象的展示时长，单位为毫秒；缺省时使用时间轴默认值。 */
  duration?: number;
};

/**
 * 画布上的插件实例。
 * 插件定义描述“组件类型”，ComponentInstance 保存用户创建后的布局和实例配置。
 */
export type ComponentInstance = {
  /** 实例唯一标识，同时作为 React key。 */
  id: string;
  /** PLUGIN_REGISTRY 中的插件类型键。 */
  pluginType: string;
  /** JSON 字段路径；不读取业务数据的运行时插件使用空字符串。 */
  binding: string;
  /** 以下四项均为逻辑画布坐标，不随浏览器缩放而改变。 */
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  /** 插件私有属性，实际含义由对应 PluginDefinition 解释。 */
  properties: Record<string, unknown>;
};

/** 可导入、导出、自动保存并交给展示运行时消费的完整项目文档。 */
export type ProjectDocument = {
  /** 文档结构版本；破坏性格式变更必须提升版本并提供迁移逻辑。 */
  version: 1;
  name: string;
  canvas: {
    width: number;
    height: number;
    gridSize: number;
    background: string;
  };
  timeline: {
    /** DataItem 未设置 duration 时采用的展示时长，单位为毫秒。 */
    defaultDuration: number;
    /** 数据对象切换时的项目级默认过渡时长，单位为毫秒。 */
    transitionDuration: number;
    /** 最后一个对象结束后是否回到第一个对象。 */
    loop: boolean;
  };
  items: DataItem[];
  components: ComponentInstance[];
};

export type ValueType = "string" | "number" | "boolean" | "array" | "object";

/** 属性检查器可以根据该声明自动生成表单控件。 */
export type PluginProperty = {
  key: string;
  label: string;
  type: "text" | "number" | "color" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string }>;
};

export type PluginRenderMode = "editor" | "presentation";

/** 数据对象切换期间传给插件的新旧值上下文。 */
export type PluginTransitionContext = {
  /** 每次切换递增，用于强制 CSS 动画节点重新挂载并重新播放。 */
  key: number;
  previousValue: unknown;
  previousItem: DataItem;
  defaultDuration: number;
};

/** 展示运行时计算出的两种标准化播放进度，取值范围均为 0～1。 */
export type PluginPlaybackContext = {
  itemProgress: number;
  timelineProgress: number;
};

/** 插件 render 函数可读取的全部输入；插件应把它视为只读数据。 */
export type PluginRenderContext = {
  value: unknown;
  item: DataItem;
  properties: Record<string, unknown>;
  mode: PluginRenderMode;
  playback?: PluginPlaybackContext;
  transition?: PluginTransitionContext;
};

/**
 * 插件注册契约。
 * 元数据用于组件库，尺寸用于创建和缩放，属性声明用于检查器，render 负责最终视觉输出。
 */
export type PluginDefinition = {
  type: string;
  name: string;
  glyph: string;
  description: string;
  /** 可绑定的 JSON 值类型；空数组表示该插件只读取运行时上下文。 */
  acceptedTypes: ValueType[];
  defaultSize: { width: number; height: number };
  /** 可选的实例最小尺寸；未设置时使用编辑器统一限制。 */
  minimumSize?: { width: number; height: number };
  defaultProperties: Record<string, unknown>;
  propertySchema: PluginProperty[];
  render: (context: PluginRenderContext) => ReactNode;
};
