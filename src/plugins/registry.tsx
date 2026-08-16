import type {
  DataItem,
  PluginDefinition,
  PluginPlaybackContext,
  PluginRenderMode,
  PluginTransitionContext,
} from "../types/project";
import { chartPlugin } from "./builtin/chart";
import { imagePlugin } from "./builtin/image";
import { progressPlugin } from "./builtin/progress";
import { textPlugin } from "./builtin/text";

/**
 * 内置插件注册表，也是插件系统的统一入口。
 * 每个插件的定义和渲染逻辑分别保存在 builtin 目录中，本文件只负责汇总和查找。
 */
export const PLUGIN_REGISTRY: Record<string, PluginDefinition> = {
  [textPlugin.type]: textPlugin,
  [imagePlugin.type]: imagePlugin,
  [chartPlugin.type]: chartPlugin,
  [progressPlugin.type]: progressPlugin,
};

/**
 * 编辑器与展示运行时共用的插件渲染入口。
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
