import type { ReactNode } from "react";
import type { PluginProperty } from "../types/project";

/**
 * 无外部图标依赖的轻量图标组件。
 * 图标只用于视觉辅助，按钮本身负责无障碍名称，因此这里统一 aria-hidden。
 */
export function Icon({ name }: { name: "play" | "pause" | "upload" | "download" | "plus" | "trash" | "copy" | "chevron" | "panel" | "timeline" }) {
  const symbols = { play: "▶", pause: "Ⅱ", upload: "↥", download: "↧", plus: "+", trash: "×", copy: "⧉", chevron: "›", panel: "▰", timeline: "▤" };
  return <span className={`icon icon-${name}`} aria-hidden="true">{symbols[name]}</span>;
}

/** 属性检查器的语义分组容器。 */
export function InspectorGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="inspector-group"><h3>{title}</h3>{children}</section>;
}

/**
 * 根据插件属性 schema 生成通用表单控件。
 * 新增 select/color/number/text 类型的插件属性时，不需要在具体检查器中重复写表单。
 */
export function PropertyEditor({ property, value, onChange }: {
  property: PluginProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  // 下拉选项的值统一按字符串处理，与 JSON 中的枚举型配置保持一致。
  if (property.type === "select") {
    return (
      <label className="property-row">
        <span>{property.label}</span>
        <select value={String(value)} onChange={(event) => onChange(event.target.value)}>
          {property.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    );
  }
  if (property.type === "color") {
    return (
      <label className="property-row">
        <span>{property.label}</span>
        <span className="color-input">
          <input type="color" value={String(value)} onChange={(event) => onChange(event.target.value)} />
          <code>{String(value)}</code>
        </span>
      </label>
    );
  }
  return (
    <label className="property-row">
      <span>{property.label}</span>
      <input
        type={property.type}
        value={String(value)}
        min={property.min}
        max={property.max}
        step={property.step}
        // HTML input 输出始终是字符串；数值属性在边界处转换，调用方可直接存入项目文档。
        onChange={(event) => onChange(property.type === "number" ? Number(event.target.value) : event.target.value)}
      />
    </label>
  );
}
