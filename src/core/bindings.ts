import type { DataItem, ValueType } from "../types/project";

/** 把 JavaScript 运行时类型收敛为插件系统使用的有限类型集合。 */
function valueTypeOf(value: unknown): ValueType | "null" {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as ValueType;
}

/**
 * 按点分隔路径读取数据，例如 `metrics.完成度`。
 * `$item` 是保留路径，用于需要整个对象的插件；中途任一级缺失时安全返回 undefined。
 */
export function getValueByPath(item: DataItem, path: string): unknown {
  if (path === "$item") return item;
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, item);
}

/**
 * 扫描当前数据对象，返回类型与插件 acceptedTypes 兼容的字段路径。
 *
 * 普通对象最多递归四层，防止异常深层数据造成属性面板卡顿；数组作为整体候选项，
 * 当前版本不继续生成 `items.0.name` 这类依赖具体数组下标的路径。
 */
export function getCompatibleBindings(item: DataItem, acceptedTypes: ValueType[]) {
  const result: Array<{ path: string; type: ValueType }> = [];

  // 深度优先遍历能保持候选字段顺序与原始 JSON 的书写顺序大体一致。
  const visit = (value: unknown, path: string, depth: number) => {
    const valueType = valueTypeOf(value);
    if (valueType !== "null" && acceptedTypes.includes(valueType)) {
      result.push({ path, type: valueType });
    }
    // 数组不递归，对象则继续展开；null 已被前面的 truthy 判断排除。
    if (value && typeof value === "object" && !Array.isArray(value) && depth < 4) {
      Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
        visit(child, path ? `${path}.${key}` : key, depth + 1);
      });
    }
  };

  Object.entries(item).forEach(([key, value]) => visit(value, key, 0));
  return result;
}
