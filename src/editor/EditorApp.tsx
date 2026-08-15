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

export function EditorApp({ project, setProject, onPresent }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>("hero-title");
  const [activeIndex, setActiveIndex] = useState(0);
  const [toast, setToast] = useState("示例项目已就绪");
  const activeItem = project.items[Math.min(activeIndex, project.items.length - 1)] ?? {};
  const selected = project.components.find((component) => component.id === selectedId) ?? null;

  const updateProject = useCallback((updater: (project: ProjectDocument) => ProjectDocument) => {
    setProject((current) => updater(current));
  }, [setProject]);

  const updateComponent = useCallback((id: string, updater: (component: ComponentInstance) => ComponentInstance) => {
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
    const binding = plugin.acceptedTypes.length
      ? getCompatibleBindings(activeItem, plugin.acceptedTypes)[0]?.path ?? "title"
      : "";
    const offset = (project.components.length % 7) * project.canvas.gridSize * 2;
    const component: ComponentInstance = {
      id: `${pluginType}-${Date.now()}`,
      pluginType,
      binding,
      x: 80 + offset,
      y: 80 + offset,
      width: plugin.defaultSize.width,
      height: plugin.defaultSize.height,
      zIndex: Math.max(0, ...project.components.map((item) => item.zIndex)) + 1,
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
      properties: { ...selected.properties },
    };
    setProject((current) => ({ ...current, components: [...current.components, copy] }));
    setSelectedId(copy.id);
    setToast("已复制组件");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>, kind: "data" | "project") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (kind === "data") {
        const items = normalizeImportedData(json);
        setProject((current) => ({ ...current, items }));
        setActiveIndex(0);
        setToast(`已导入 ${items.length} 个数据对象`);
      } else {
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
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name || "timeline-project"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("项目文件已导出");
  }

  return (
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
