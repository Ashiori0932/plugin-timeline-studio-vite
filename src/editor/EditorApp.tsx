import { useCallback, useEffect, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { getCompatibleBindings } from "../core/bindings";
import { normalizeImportedData, normalizeProject } from "../core/project";
import { PLUGIN_REGISTRY } from "../plugins/registry";
import type { ComponentInstance, ProjectDocument } from "../types/project";
import { ComponentPalette } from "./ComponentPalette";
import { EditorCanvas } from "./EditorCanvas";
import { PropertyInspector } from "./PropertyInspector";
import { TimelinePanel } from "./TimelinePanel";
import { TopBar } from "./TopBar";

type Props = {
  project: ProjectDocument;
  setProject: Dispatch<SetStateAction<ProjectDocument>>;
  onPresent: () => void;
};

/**
 * 编辑器模式的总协调组件。
 *
 * 这里负责持有“当前选中组件”和“当前预览数据对象”等界面状态，并把项目文档
 * 分发给顶部工具栏、组件面板、画布、属性面板和时间轴。具体渲染能力仍由插件提供，
 * 因此新增插件通常不需要修改本组件。
 */
export function EditorApp({ project, setProject, onPresent }: Props) {
  // selectedId/activeIndex/toast 仅描述编辑器界面，不写入可导出的 ProjectDocument。
  const [selectedId, setSelectedId] = useState<string | null>("hero-title");
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState("示例项目已就绪");
  // 数据被重新导入后，旧索引可能越界；取值时始终夹紧到最后一个有效对象。
  const activeItem = project.items[Math.min(activeIndex, project.items.length - 1)] ?? {};
  const selected = project.components.find((component) => component.id === selectedId) ?? null;

  // 统一使用函数式更新，避免事件处理器捕获过期的项目对象。
  const updateProject = useCallback((updater: (project: ProjectDocument) => ProjectDocument) => {
    setProject((current) => updater(current));
  }, [setProject]);

  const updateComponent = useCallback((id: string, updater: (component: ComponentInstance) => ComponentInstance) => {
    // 只替换目标组件，其余组件保持引用不变，便于 React 跳过无关渲染。
    setProject((current) => ({
      ...current,
      components: current.components.map((component) => component.id === id ? updater(component) : component),
    }));
  }, [setProject]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    setProject((current) => ({ ...current, components: current.components.filter((component) => component.id !== selectedId) }));
    setSelectedId(null);
    setToast("组件已删除");
  }, [selectedId, setProject]);

  useEffect(() => {
    // 键盘快捷键仅在画布上下文生效；编辑表单内容时不能拦截退格和方向键。
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || !selectedId) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
        return;
      }
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-project.canvas.gridSize, 0], ArrowRight: [project.canvas.gridSize, 0],
        ArrowUp: [0, -project.canvas.gridSize], ArrowDown: [0, project.canvas.gridSize],
      };
      if (moves[event.key]) {
        event.preventDefault();
        const [dx, dy] = moves[event.key];
        updateComponent(selectedId, (component) => ({
          ...component,
          // 键盘移动同样受画布边界约束，组件不能被移到可视区域之外。
          x: Math.max(0, Math.min(project.canvas.width - component.width, component.x + dx)),
          y: Math.max(0, Math.min(project.canvas.height - component.height, component.y + dy)),
        }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, project.canvas.gridSize, project.canvas.height, project.canvas.width, selectedId, updateComponent]);

  function addComponent(pluginType: string) {
    const plugin = PLUGIN_REGISTRY[pluginType];
    // 数据型插件默认绑定第一个兼容字段；纯运行时插件（如进度条）不需要数据绑定。
    const binding = plugin.acceptedTypes.length
      ? getCompatibleBindings(activeItem, plugin.acceptedTypes)[0]?.path ?? "title"
      : "";
    // 新组件采用循环错位摆放，避免连续添加时完全重叠而误以为添加失败。
    const offset = (project.components.length % 7) * project.canvas.gridSize * 2;
    const component: ComponentInstance = {
      id: `${pluginType}-${Date.now()}`,
      pluginType,
      binding,
      x: 80 + offset,
      y: 80 + offset,
      width: plugin.defaultSize.width,
      height: plugin.defaultSize.height,
      // 新组件放到最上层；空数组时 Math.max 的显式 0 保证结果有效。
      zIndex: Math.max(0, ...project.components.map((item) => item.zIndex)) + 1,
      // 复制默认属性，避免多个组件实例共享并意外修改插件注册表中的对象。
      properties: { ...plugin.defaultProperties },
    };
    setProject((current) => ({ ...current, components: [...current.components, component] }));
    setSelectedId(component.id);
    setToast(`已添加${plugin.name}`);
  }

  function duplicateSelected() {
    if (!selected) return;
    const copy: ComponentInstance = {
      ...selected,
      id: `${selected.pluginType}-${Date.now()}`,
      x: Math.min(project.canvas.width - selected.width, selected.x + project.canvas.gridSize * 2),
      y: Math.min(project.canvas.height - selected.height, selected.y + project.canvas.gridSize * 2),
      zIndex: Math.max(0, ...project.components.map((item) => item.zIndex)) + 1,
      // 当前属性值均为标量，浅拷贝即可隔离两个实例的后续编辑。
      properties: { ...selected.properties },
    };
    setProject((current) => ({ ...current, components: [...current.components, copy] }));
    setSelectedId(copy.id);
    setToast("已复制组件");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>, kind: "data" | "project") {
    const file = event.target.files?.[0];
    // 清空 input，用户再次选择同一个文件时浏览器仍会触发 change。
    event.target.value = "";
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (kind === "data") {
        // 仅导入数据时保留现有画布和组件布局。
        const items = normalizeImportedData(json);
        setProject((current) => ({ ...current, items }));
        setActiveIndex(0);
        setToast(`已导入 ${items.length} 个数据对象`);
      } else {
        // 项目导入会整体替换文档，并同步重置依赖旧文档的编辑器状态。
        const next = normalizeProject(json);
        setProject(next);
        setActiveIndex(0);
        setSelectedId(next.components[0]?.id ?? null);
        setToast("项目文件已载入");
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "文件导入失败");
    }
  }

  function exportProject() {
    // 使用临时 Object URL 在浏览器端完成下载，无需后端服务。
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name || "timeline-project"}.json`;
    anchor.click();
    // 下载触发后立即释放 URL，避免多次导出积累内存。
    URL.revokeObjectURL(url);
    setToast("项目文件已导出");
  }

  return (
    // 五个区域共享同一份项目文档，通过回调执行单向数据更新。
    <main className="studio-shell">
      <TopBar
        project={project}
        onRename={(name) => setProject((current) => ({ ...current, name }))}
        onImportData={(event) => importJson(event, "data")}
        onImportProject={(event) => importJson(event, "project")}
        onExport={exportProject}
        onPresent={onPresent}
      />
      <ComponentPalette project={project} selectedId={selectedId} onSelect={setSelectedId} onAdd={addComponent} />
      <EditorCanvas project={project} activeItem={activeItem} selectedId={selectedId} toast={toast} onSelect={setSelectedId} onUpdateComponent={updateComponent} />
      <PropertyInspector
        project={project}
        activeItem={activeItem}
        selected={selected}
        onUpdateProject={updateProject}
        onUpdateComponent={updateComponent}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
      />
      <TimelinePanel project={project} activeIndex={activeIndex} onSelect={setActiveIndex} />
    </main>
  );
}
