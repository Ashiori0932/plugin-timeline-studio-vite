import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getValueByPath } from "../core/bindings";
import { PLUGIN_REGISTRY, PluginRenderer } from "../plugins/registry";
import type { ComponentInstance, DataItem, ProjectDocument } from "../types/project";

type ResizeHandle = "nw" | "ne" | "sw" | "se";
type DragState = {
  id: string;
  kind: "move" | "resize";
  handle?: ResizeHandle;
  startX: number;
  startY: number;
  origin: Pick<ComponentInstance, "x" | "y" | "width" | "height">;
};

type Props = {
  project: ProjectDocument;
  activeItem: DataItem;
  selectedId: string | null;
  toast: string;
  onSelect: (id: string | null) => void;
  onUpdateComponent: (id: string, updater: (component: ComponentInstance) => ComponentInstance) => void;
};

function snap(value: number, grid: number, disabled = false) {
  return disabled ? Math.round(value) : Math.round(value / grid) * grid;
}

export function EditorCanvas({ project, activeItem, selectedId, toast, onSelect, onUpdateComponent }: Props) {
  const [scale, setScale] = useState(0.6);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateScale = () => {
      const bounds = stage.getBoundingClientRect();
      const next = Math.min((bounds.width - 72) / project.canvas.width, (bounds.height - 72) / project.canvas.height, 1);
      setScale(Math.max(0.15, next));
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    updateScale();
    return () => observer.disconnect();
  }, [project.canvas.height, project.canvas.width]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = (event.clientX - drag.startX) / scale;
      const dy = (event.clientY - drag.startY) / scale;
      const grid = project.canvas.gridSize;

      onUpdateComponent(drag.id, (component) => {
        if (drag.kind === "move") {
          const x = snap(drag.origin.x + dx, grid, event.altKey);
          const y = snap(drag.origin.y + dy, grid, event.altKey);
          return {
            ...component,
            x: Math.max(0, Math.min(project.canvas.width - component.width, x)),
            y: Math.max(0, Math.min(project.canvas.height - component.height, y)),
          };
        }

        let { x, y, width, height } = drag.origin;
        if (drag.handle?.includes("e")) width = Math.max(80, snap(drag.origin.width + dx, grid, event.altKey));
        if (drag.handle?.includes("s")) height = Math.max(56, snap(drag.origin.height + dy, grid, event.altKey));
        if (drag.handle?.includes("w")) {
          const nextX = snap(drag.origin.x + dx, grid, event.altKey);
          width = Math.max(80, drag.origin.width + drag.origin.x - nextX);
          x = drag.origin.x + drag.origin.width - width;
        }
        if (drag.handle?.includes("n")) {
          const nextY = snap(drag.origin.y + dy, grid, event.altKey);
          height = Math.max(56, drag.origin.height + drag.origin.y - nextY);
          y = drag.origin.y + drag.origin.height - height;
        }
        width = Math.min(width, project.canvas.width - x);
        height = Math.min(height, project.canvas.height - y);
        return { ...component, x: Math.max(0, x), y: Math.max(0, y), width, height };
      });
    };

    const onUp = () => { dragRef.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onUpdateComponent, project.canvas.gridSize, project.canvas.height, project.canvas.width, scale]);

  const canvasStyle = useMemo(() => ({
    width: project.canvas.width,
    height: project.canvas.height,
    backgroundColor: project.canvas.background,
    backgroundImage: "linear-gradient(rgba(30,34,34,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(30,34,34,.055) 1px, transparent 1px)",
    backgroundSize: `${project.canvas.gridSize}px ${project.canvas.gridSize}px`,
  }), [project.canvas]);

  function startDrag(event: ReactPointerEvent, component: ComponentInstance, kind: DragState["kind"], handle?: ResizeHandle) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    onSelect(component.id);
    dragRef.current = {
      id: component.id,
      kind,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      origin: { x: component.x, y: component.y, width: component.width, height: component.height },
    };
  }

  return (
    <section className="workspace" ref={stageRef} onPointerDown={() => onSelect(null)}>
      <div className="workspace-meta"><span>{project.canvas.width} × {project.canvas.height}</span><span>{Math.round(scale * 100)}%</span></div>
      <div className="scaled-canvas-frame" style={{ width: project.canvas.width * scale, height: project.canvas.height * scale }}>
        <div className="editor-canvas" style={{ ...canvasStyle, transform: `scale(${scale})` }} onPointerDown={(event) => event.stopPropagation()}>
          {project.components.slice().sort((a, b) => a.zIndex - b.zIndex).map((component) => {
            const value = getValueByPath(activeItem, component.binding);
            const isSelected = component.id === selectedId;
            return (
              <div
                className={`canvas-component ${isSelected ? "is-selected" : ""}`}
                key={component.id}
                style={{ left: component.x, top: component.y, width: component.width, height: component.height, zIndex: component.zIndex }}
                onPointerDown={(event) => startDrag(event, component, "move")}
              >
                <PluginRenderer pluginType={component.pluginType} value={value} item={activeItem} properties={component.properties} />
                {isSelected && <>
                  <div className="selection-label">{PLUGIN_REGISTRY[component.pluginType]?.name}</div>
                  {(["nw", "ne", "sw", "se"] as ResizeHandle[]).map((handle) => (
                    <button
                      aria-label={`从 ${handle} 调整尺寸`}
                      className={`resize-handle handle-${handle}`}
                      key={handle}
                      onPointerDown={(event) => startDrag(event, component, "resize", handle)}
                    />
                  ))}
                </>}
              </div>
            );
          })}
          <div className="canvas-safe-label">安全区域</div>
        </div>
      </div>
      <div className="toast" key={toast}>{toast}</div>
    </section>
  );
}
