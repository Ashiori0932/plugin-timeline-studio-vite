import { getCompatibleBindings, getValueByPath } from "../core/bindings";
import { PLUGIN_REGISTRY } from "../plugins/registry";
import type { ComponentInstance, DataItem, ProjectDocument } from "../types/project";
import { Icon, InspectorGroup, PropertyEditor } from "./ui";

type Props = {
  project: ProjectDocument;
  activeItem: DataItem;
  selected: ComponentInstance | null;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onPanelFocus: () => void;
  onUpdateProject: (updater: (project: ProjectDocument) => ProjectDocument) => void;
  onUpdateComponent: (id: string, updater: (component: ComponentInstance) => ComponentInstance) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

/**
 * 右侧属性检查器。
 * 选中组件时显示其数据绑定、几何信息及插件声明的属性；未选中时编辑画布和时间轴。
 */
export function PropertyInspector({ project, activeItem, selected, isCollapsed, onToggleCollapsed, onPanelFocus, onUpdateProject, onUpdateComponent, onDuplicate, onDelete }: Props) {
  // 导入的旧项目可能引用已移除的插件，因此查找结果允许为空并回退到画布属性。
  const plugin = selected ? PLUGIN_REGISTRY[selected.pluginType] : null;

  return (
    <aside className={`right-panel collapsible-panel ${isCollapsed ? "is-collapsed" : ""}`} onPointerDown={onPanelFocus}>
      <button className="panel-tab panel-tab-right" type="button" onClick={onToggleCollapsed} aria-label={isCollapsed ? "展开右侧面板" : "收起右侧面板"}>
        <Icon name={isCollapsed ? "arrowLeft" : "arrowRight"} />
      </button>
      <div className="panel-heading inspector-heading">
        <span>{selected ? "组件属性" : "画布属性"}</span>
        {selected && <small>#{selected.id.slice(-5)}</small>}
      </div>
      {selected && plugin ? (
        <div className="inspector-content">
          <div className="inspector-hero">
            <span className="large-plugin-glyph">{plugin.glyph}</span>
            <div><strong>{plugin.name}</strong><small>{plugin.type}</small></div>
            <button onClick={onDuplicate} aria-label="复制组件"><Icon name="copy" /></button>
            <button onClick={onDelete} aria-label="删除组件"><Icon name="trash" /></button>
          </div>
          {/* acceptedTypes 为空的运行时插件不显示无意义的数据绑定控件。 */}
          {plugin.acceptedTypes.length > 0 && (
            <InspectorGroup title="数据绑定">
              <label className="field-label">内容字段</label>
              <div className="select-wrap">
                <select value={selected.binding} onChange={(event) => onUpdateComponent(selected.id, (component) => ({ ...component, binding: event.target.value }))}>
                  {/* 可选字段只根据当前数据对象生成，并由插件声明的数据类型过滤。 */}
                  {getCompatibleBindings(activeItem, plugin.acceptedTypes).map((binding) => (
                    <option key={binding.path} value={binding.path}>{binding.path} · {binding.type}</option>
                  ))}
                </select>
                <Icon name="chevron" />
              </div>
              <div className="binding-preview"><span>当前值</span><strong>{String(getValueByPath(activeItem, selected.binding) ?? "未定义").slice(0, 42)}</strong></div>
            </InspectorGroup>
          )}
          <InspectorGroup title="位置与尺寸">
            <div className="property-grid">
              {(["x", "y", "width", "height"] as const).map((key) => (
                <label key={key}>
                  <span>{key === "width" ? "W" : key === "height" ? "H" : key.toUpperCase()}</span>
                  <input type="number" value={Math.round(selected[key])} onChange={(event) => onUpdateComponent(selected.id, (component) => ({ ...component, [key]: Number(event.target.value) }))} />
                </label>
              ))}
            </div>
          </InspectorGroup>
          <InspectorGroup title="组件样式">
            {/* 属性表单完全由插件 schema 驱动，核心编辑器无需了解每种插件的专有字段。 */}
            {plugin.propertySchema.map((property) => (
              <PropertyEditor
                key={property.key}
                property={property}
                // 旧项目缺少新属性时回退到插件默认值，以保持向后兼容。
                value={selected.properties[property.key] ?? plugin.defaultProperties[property.key]}
                // 复制 properties 后只覆盖当前键，保持不可变更新语义。
                onChange={(value) => onUpdateComponent(selected.id, (component) => ({ ...component, properties: { ...component.properties, [property.key]: value } }))}
              />
            ))}
          </InspectorGroup>
        </div>
      ) : (
        // 没有有效组件选中时，属性面板切换为项目级设置。
        <div className="inspector-content">
          <InspectorGroup title="画布">
            <PropertyEditor property={{ key: "background", label: "背景颜色", type: "color" }} value={project.canvas.background} onChange={(value) => onUpdateProject((current) => ({ ...current, canvas: { ...current.canvas, background: String(value) } }))} />
            <PropertyEditor property={{ key: "grid", label: "网格尺寸", type: "number", min: 2, max: 64, step: 2 }} value={project.canvas.gridSize} onChange={(value) => onUpdateProject((current) => ({ ...current, canvas: { ...current.canvas, gridSize: Number(value) } }))} />
          </InspectorGroup>
          <InspectorGroup title="时间轴">
            <PropertyEditor property={{ key: "duration", label: "默认时长 / ms", type: "number", min: 500, max: 60000, step: 500 }} value={project.timeline.defaultDuration} onChange={(value) => onUpdateProject((current) => ({ ...current, timeline: { ...current.timeline, defaultDuration: Number(value) } }))} />
            <label className="toggle-row">
              <span><strong>循环播放</strong><small>最后一项结束后回到开头</small></span>
              <input type="checkbox" checked={project.timeline.loop} onChange={(event) => onUpdateProject((current) => ({ ...current, timeline: { ...current.timeline, loop: event.target.checked } }))} />
            </label>
          </InspectorGroup>
        </div>
      )}
    </aside>
  );
}
