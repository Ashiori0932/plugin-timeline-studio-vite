import type { ReactNode } from "react";

export type DataItem = Record<string, unknown> & {
  id?: string;
  duration?: number;
};

export type ComponentInstance = {
  id: string;
  pluginType: string;
  binding: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  properties: Record<string, unknown>;
};

export type ProjectDocument = {
  version: 1;
  name: string;
  canvas: {
    width: number;
    height: number;
    gridSize: number;
    background: string;
  };
  timeline: {
    defaultDuration: number;
    transitionDuration: number;
    loop: boolean;
  };
  items: DataItem[];
  components: ComponentInstance[];
};

export type ValueType = "string" | "number" | "boolean" | "array" | "object";

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

export type PluginTransitionContext = {
  key: number;
  previousValue: unknown;
  previousItem: DataItem;
  defaultDuration: number;
};

export type PluginRenderContext = {
  value: unknown;
  item: DataItem;
  properties: Record<string, unknown>;
  mode: PluginRenderMode;
  transition?: PluginTransitionContext;
};

export type PluginDefinition = {
  type: string;
  name: string;
  glyph: string;
  description: string;
  acceptedTypes: ValueType[];
  defaultSize: { width: number; height: number };
  defaultProperties: Record<string, unknown>;
  propertySchema: PluginProperty[];
  render: (context: PluginRenderContext) => ReactNode;
};
