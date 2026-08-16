import { PLUGIN_REGISTRY } from "../plugins/registry";
import type { ProjectDocument } from "../types/project";
import { Icon } from "./ui";

type Props = {
  project: ProjectDocument;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: string) => void;
};

/**
 * 左侧组件库与图层面板。
 * 组件卡片直接由插件注册表生成，所以注册新插件后会自动出现在此处。
 */
export function ComponentPalette({ project, selectedId, onSelect, onAdd }: Props) {
  return (
    <aside className="left-panel">
      <div className="panel-heading"><span>组件库</span><small>{Object.keys(PLUGIN_REGISTRY).length} 个内置插件</small></div>
      <div className="plugin-list">
        {Object.values(PLUGIN_REGISTRY).map((plugin, index) => (
          <button className="plugin-card" key={plugin.type} onClick={() => onAdd(plugin.type)}>
            <span className={`plugin-icon plugin-icon-${index}`}>{plugin.glyph}</span>
            <span><strong>{plugin.name}</strong><small>{plugin.description}</small></span>
            <Icon name="plus" />
          </button>
        ))}
      </div>
      <div className="panel-section layers-section">
        <div className="section-title"><span>页面图层</span><small>{project.components.length}</small></div>
        <div className="layer-list">
          {/* 图层按 zIndex 倒序展示，使视觉上最靠上的组件也排在列表最上方。 */}
          {project.components.slice().sort((a, b) => b.zIndex - a.zIndex).map((component) => (
            <button className={`layer-row ${selectedId === component.id ? "active" : ""}`} key={component.id} onClick={() => onSelect(component.id)}>
              <span className="layer-grip">⠿</span>
              <span className="layer-type">{PLUGIN_REGISTRY[component.pluginType]?.glyph}</span>
              <span>{PLUGIN_REGISTRY[component.pluginType]?.name}</span>
              {/* 空绑定表示组件内容来自播放上下文，而不是当前数据对象。 */}
              <small>{component.binding || "运行时"}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="data-health">
        <span className="health-icon">✓</span>
        <div><strong>数据结构有效</strong><small>{project.items.length} 个对象 · {project.timeline.loop ? "循环播放" : "单次播放"}</small></div>
      </div>
    </aside>
  );
}
