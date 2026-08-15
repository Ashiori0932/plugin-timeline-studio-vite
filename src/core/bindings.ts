import type { DataItem, ValueType } from "../types/project";

function valueTypeOf(value: unknown): ValueType | "null" {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as ValueType;
}

export function getValueByPath(item: DataItem, path: string): unknown {
  if (path === "$item") return item;
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, item);
}

export function getCompatibleBindings(item: DataItem, acceptedTypes: ValueType[]) {
  const result: Array<{ path: string; type: ValueType }> = [];

  const visit = (value: unknown, path: string, depth: number) => {
    const valueType = valueTypeOf(value);
    if (valueType !== "null" && acceptedTypes.includes(valueType)) {
      result.push({ path, type: valueType });
    }
    if (value && typeof value === "object" && !Array.isArray(value) && depth < 4) {
      Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
        visit(child, path ? `${path}.${key}` : key, depth + 1);
      });
    }
  };

  Object.entries(item).forEach(([key, value]) => visit(value, key, 0));
  return result;
}
