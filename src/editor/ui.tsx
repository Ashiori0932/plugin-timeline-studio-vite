import type { ReactNode } from "react";
import type { PluginProperty } from "../types/project";

export function Icon({ name }: { name: "play" | "pause" | "upload" | "download" | "plus" | "trash" | "copy" | "chevron" }) {
  const symbols = { play: "▶", pause: "Ⅱ", upload: "↥", download: "↧", plus: "+", trash: "×", copy: "⧉", chevron: "›" };
  return <span className={`icon icon-${name}`} aria-hidden="true">{symbols[name]}</span>;
}

export function InspectorGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="inspector-group"><h3>{title}</h3>{children}</section>;
}

export function PropertyEditor({ property, value, onChange }: {
  property: PluginProperty;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
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
        onChange={(event) => onChange(property.type === "number" ? Number(event.target.value) : event.target.value)}
      />
    </label>
  );
}
