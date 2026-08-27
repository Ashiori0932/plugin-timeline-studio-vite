import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { getValueByPath } from "../core/bindings";
import { PLUGIN_REGISTRY, PluginRenderer } from "../plugins/registry";
import type { ComponentInstance, DataItem, ProjectDocument } from "../types/project";
import { TimelinePanel } from "./TimelinePanel";

type ResizeHandle = "nw" | "ne" | "sw" | "se";

/** 一次拖拽开始时的快照；后续位移始终相对该快照计算，避免累计舍入误差。 */
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
  isZoomFocused: boolean;
  onZoomFocusChange: (focused: boolean) => void;
  onSelect: (id: string | null) => void;
  onUpdateComponent: (id: string, updater: (component: ComponentInstance) => ComponentInstance) => void;
  activeIndex: number;
  onTimelineSelect: (index: number) => void;
  onTimelineFocus: () => void;
};

/** 将逻辑坐标吸附到网格；按住 Alt 时只取整像素，实现精细调整。 */
function snap(value: number, grid: number, disabled = false) {
  return disabled ? Math.round(value) : Math.round(value / grid) * grid;
}

export function EditorCanvas({ project, activeItem, selectedId, toast, isZoomFocused, onZoomFocusChange, onSelect, onUpdateComponent, activeIndex, onTimelineSelect, onTimelineFocus }: Props) {
  const [scale, setScale] = useState(0.6);
  // stageRef 用于测量可用空间；dragRef 保存高频指针状态而不触发 React 重渲染。
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const updateScale = () => {
      const bounds = stage.getBoundingClientRect();
      // 画布保持项目中的逻辑尺寸，只缩放显示；四周各预留 36px 操作空间。
      const next = Math.min((bounds.width - 72) / project.canvas.width, (bounds.height - 72) / project.canvas.height, 1);
      // 初始自适应后仍允许用户通过滚轮在 25%～400% 范围内缩放。
      setScale(Math.max(0.25, Math.min(4, next)));
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    updateScale();
    return () => observer.disconnect();
  }, [project.canvas.height, project.canvas.width]);

  useEffect(() => {
    // 监听 window 可保证指针离开组件或画布后，当前拖拽仍能连续完成。
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      // PointerEvent 提供的是屏幕像素，需要除以显示缩放换算成项目逻辑坐标。
      const dx = (event.clientX - drag.startX) / scale;
      const dy = (event.clientY - drag.startY) / scale;
      const grid = project.canvas.gridSize;

      onUpdateComponent(drag.id, (component) => {
        if (drag.kind === "move") {
          const x = snap(drag.origin.x + dx, grid, event.altKey);
          const y = snap(drag.origin.y + dy, grid, event.altKey);
          return {
            ...component,
            // 先吸附网格，再夹紧到画布边界。
            x: Math.max(0, Math.min(project.canvas.width - component.width, x)),
            y: Math.max(0, Math.min(project.canvas.height - component.height, y)),
          };
        }

        // 每种插件可以声明自己的最小可用尺寸；未知插件使用安全兜底值。
        const minimumSize = PLUGIN_REGISTRY[component.pluginType]?.minimumSize ?? { width: 80, height: 56 };
        let { x, y, width, height } = drag.origin;
        // 东/南手柄只改变尺寸；西/北手柄还需反向移动起点，使对侧边缘保持固定。
        if (drag.handle?.includes("e")) width = Math.max(minimumSize.width, snap(drag.origin.width + dx, grid, event.altKey));
        if (drag.handle?.includes("s")) height = Math.max(minimumSize.height, snap(drag.origin.height + dy, grid, event.altKey));
        if (drag.handle?.includes("w")) {
          const nextX = snap(drag.origin.x + dx, grid, event.altKey);
          width = Math.max(minimumSize.width, drag.origin.width + drag.origin.x - nextX);
          x = drag.origin.x + drag.origin.width - width;
        }
        if (drag.handle?.includes("n")) {
          const nextY = snap(drag.origin.y + dy, grid, event.altKey);
          height = Math.max(minimumSize.height, drag.origin.height + drag.origin.y - nextY);
          y = drag.origin.y + drag.origin.height - height;
        }
        // 最后裁剪右侧和底部，确保缩放后的组件仍完全位于画布内。
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
    // 两层线性渐变绘制逻辑网格，网格会跟随整个画布一起缩放。
    backgroundImage: "linear-gradient(rgba(30,34,34,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(30,34,34,.055) 1px, transparent 1px)",
    backgroundSize: `${project.canvas.gridSize}px ${project.canvas.gridSize}px`,
  }), [project.canvas]);

  function startDrag(event: ReactPointerEvent, component: ComponentInstance, kind: DragState["kind"], handle?: ResizeHandle) {
    // 仅响应鼠标主键/触控主指针；阻止事件冒泡，避免画布同时取消选中。
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    onZoomFocusChange(true);
    onSelect(component.id);
    dragRef.current = {
      id: component.id,
      kind,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      // 保存开始时几何信息，整个拖拽过程中不使用不断变化的 component 值作基准。
      origin: { x: component.x, y: component.y, width: component.width, height: component.height },
    };
  }


  function handleWorkspacePointerDown() {
    onZoomFocusChange(true);
    onSelect(null);
  }

  function handleWheel(event: ReactWheelEvent<HTMLElement>) {
    if (!isZoomFocused) return;
    event.preventDefault();
    const zoomStep = event.deltaY > 0 ? -0.08 : 0.08;
    setScale((current) => Math.max(0.25, Math.min(4, current + zoomStep)));
  }

  return (
    <section className={`workspace ${isZoomFocused ? "is-zoom-focused" : ""}`} ref={stageRef} onPointerDown={handleWorkspacePointerDown} onWheel={handleWheel}>
      <div className="workspace-meta"><span>{project.canvas.width} × {project.canvas.height}</span><span>{Math.round(scale * 100)}%</span></div>
      <div className="scaled-canvas-frame" style={{ width: project.canvas.width * scale, height: project.canvas.height * scale }}>
        <div className="editor-canvas" style={{ ...canvasStyle, transform: `scale(${scale})` }} onPointerDown={(event) => event.stopPropagation()}>
          {/* 复制后按层级升序绘制，zIndex 较大的组件自然覆盖在后绘制组件之上。 */}
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
                {/* 编辑器与展示模式共用 PluginRenderer，避免两套渲染结果不一致。 */}
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
      <TimelinePanel project={project} activeIndex={activeIndex} onSelect={onTimelineSelect} onPanelFocus={onTimelineFocus} />
      <div className="toast" key={toast}>{toast}</div>
    </section>
  );
}
