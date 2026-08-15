import type { CSSProperties } from "react";
import type { PluginDefinition } from "../types/project";

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
    defaultProperties: { fontSize: 42, color: "#17211d", weight: "600", align: "left", letterSpacing: 0 },
    propertySchema: [
      { key: "fontSize", label: "字号", type: "number", min: 10, max: 180, step: 1 },
      { key: "color", label: "文字颜色", type: "color" },
      { key: "weight", label: "字重", type: "select", options: [{ label: "常规", value: "400" }, { label: "中等", value: "500" }, { label: "粗体", value: "700" }] },
      { key: "align", label: "对齐", type: "select", options: [{ label: "左对齐", value: "left" }, { label: "居中", value: "center" }, { label: "右对齐", value: "right" }] },
      { key: "letterSpacing", label: "字间距", type: "number", min: -8, max: 24, step: 1 },
    ],
    render: ({ value, properties }) => (
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
    ),
  },
  "builtin.image": {
    type: "builtin.image",
    name: "图片",
    glyph: "▧",
    description: "自适应图像容器",
    acceptedTypes: ["string"],
    defaultSize: { width: 600, height: 420 },
    defaultProperties: { fit: "cover", radius: 8, overlay: 10 },
    propertySchema: [
      { key: "fit", label: "填充方式", type: "select", options: [{ label: "裁切填满", value: "cover" }, { label: "完整显示", value: "contain" }] },
      { key: "radius", label: "圆角", type: "number", min: 0, max: 80, step: 1 },
      { key: "overlay", label: "暗化程度", type: "number", min: 0, max: 80, step: 1 },
    ],
    render: ({ value, item, properties }) => (
      <div className="plugin-image" style={{ borderRadius: Number(properties.radius), backgroundColor: "#ced3ca" }}>
        {typeof value === "string" && value
          ? <img src={value} alt={String(item.title ?? "数据图片")} draggable={false} style={{ objectFit: properties.fit as CSSProperties["objectFit"] }} />
          : <span>图片路径无效</span>}
        <i style={{ background: `rgba(8, 18, 14, ${Number(properties.overlay) / 100})` }} />
        <b>#{String(item.id ?? "IMAGE").toUpperCase()}</b>
      </div>
    ),
  },
  "builtin.chart": {
    type: "builtin.chart",
    name: "条形图",
    glyph: "▥",
    description: "对象或数组数据",
    acceptedTypes: ["object", "array", "number"],
    defaultSize: { width: 620, height: 240 },
    defaultProperties: { accent: "#ee6b4d", labelColor: "#33413a", barColor: "#d9ded5", maxItems: 5 },
    propertySchema: [
      { key: "accent", label: "强调颜色", type: "color" },
      { key: "barColor", label: "轨道颜色", type: "color" },
      { key: "labelColor", label: "标签颜色", type: "color" },
      { key: "maxItems", label: "最大条目数", type: "number", min: 1, max: 12, step: 1 },
    ],
    render: ({ value, properties }) => {
      const entries = toChartEntries(value).slice(0, Number(properties.maxItems));
      const max = Math.max(1, ...entries.map(([, number]) => number));
      return (
        <div className="plugin-chart">
          {entries.length ? entries.map(([label, number], index) => (
            <div className="chart-row" key={`${label}-${index}`}>
              <span style={{ color: String(properties.labelColor) }}>{label}</span>
              <div style={{ backgroundColor: String(properties.barColor) }}>
                <i style={{ width: `${number / max * 100}%`, backgroundColor: index === 0 ? String(properties.accent) : String(properties.labelColor) }} />
              </div>
              <strong style={{ color: String(properties.labelColor) }}>{number}</strong>
            </div>
          )) : <div className="chart-empty">没有可绘制的数值</div>}
        </div>
      );
    },
  },
};

export function PluginRenderer({ pluginType, value, item, properties }: {
  pluginType: string;
  value: unknown;
  item: Record<string, unknown>;
  properties: Record<string, unknown>;
}) {
  const plugin = PLUGIN_REGISTRY[pluginType];
  if (!plugin) return <div className="plugin-missing">未知插件：{pluginType}</div>;
  return plugin.render({ value, item, properties });
}
