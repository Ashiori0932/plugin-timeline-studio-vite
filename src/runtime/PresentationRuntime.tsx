import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getValueByPath } from "../core/bindings";
import { PLUGIN_REGISTRY, PluginRenderer } from "../plugins/registry";
import type { DataItem, ProjectDocument } from "../types/project";
import { Icon } from "../editor/ui";

type ActiveTransition = {
  key: number;
  previousItem: DataItem;
};

export function PresentationRuntime({ project, onExit }: { project: ProjectDocument; onExit: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scale, setScale] = useState(1);
  const [transition, setTransition] = useState<ActiveTransition | null>(null);
  const activeIndexRef = useRef(0);
  const progressRef = useRef(0);
  const transitionKeyRef = useRef(0);
  const transitionTimerRef = useRef<number | null>(null);
  const activeItem = project.items[activeIndex] ?? {};

  const transitionWindow = useMemo(() => {
    const durations = project.components.map((component) => {
      const plugin = PLUGIN_REGISTRY[component.pluginType];
      const properties = { ...plugin?.defaultProperties, ...component.properties };
      const configured = Number(properties.animationDuration);
      return Number.isFinite(configured) ? Math.max(0, configured) : project.timeline.transitionDuration;
    });
    return Math.max(0, project.timeline.transitionDuration, ...durations);
  }, [project.components, project.timeline.transitionDuration]);

  const changeActiveIndex = useCallback((nextIndex: number) => {
    const itemCount = project.items.length;
    if (itemCount === 0) return;

    const normalizedIndex = (nextIndex + itemCount) % itemCount;
    const previousIndex = activeIndexRef.current;
    progressRef.current = 0;
    setProgress(0);

    if (normalizedIndex === previousIndex) return;

    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    transitionKeyRef.current += 1;
    setTransition({
      key: transitionKeyRef.current,
      previousItem: project.items[previousIndex] ?? {},
    });
    activeIndexRef.current = normalizedIndex;
    setActiveIndex(normalizedIndex);

    if (transitionWindow === 0) {
      setTransition(null);
      transitionTimerRef.current = null;
      return;
    }

    transitionTimerRef.current = window.setTimeout(() => {
      setTransition(null);
      transitionTimerRef.current = null;
    }, transitionWindow);
  }, [project.items, transitionWindow]);

  useEffect(() => {
    const updateScale = () => setScale(Math.min(window.innerWidth / project.canvas.width, window.innerHeight / project.canvas.height));
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onExit(); };
    window.addEventListener("resize", updateScale);
    window.addEventListener("keydown", onKeyDown);
    updateScale();
    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onExit, project.canvas.height, project.canvas.width]);

  useEffect(() => () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || project.items.length === 0) return;
    let frame = 0;
    const duration = activeItem.duration ?? project.timeline.defaultDuration;
    const startedAt = performance.now() - progressRef.current * duration;

    const tick = (now: number) => {
      const ratio = (now - startedAt) / duration;
      if (ratio >= 1) {
        if (activeIndex < project.items.length - 1) changeActiveIndex(activeIndex + 1);
        else if (project.timeline.loop) changeActiveIndex(0);
        else {
          progressRef.current = 1;
          setProgress(1);
          setIsPlaying(false);
        }
        return;
      }
      progressRef.current = Math.max(0, ratio);
      setProgress(progressRef.current);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    activeIndex,
    activeItem.duration,
    changeActiveIndex,
    isPlaying,
    project.items.length,
    project.timeline.defaultDuration,
    project.timeline.loop,
  ]);

  const canvasStyle = useMemo(() => ({
    width: project.canvas.width,
    height: project.canvas.height,
    backgroundColor: project.canvas.background,
    transform: `scale(${scale})`,
  }), [project.canvas, scale]);

  function showAdjacent(direction: number) {
    if (project.items.length === 0) return;
    changeActiveIndex(activeIndexRef.current + direction);
  }

  return (
    <main className="presentation-shell">
      <div className="presentation-canvas" style={canvasStyle}>
        {project.components.slice().sort((a, b) => a.zIndex - b.zIndex).map((component) => (
          <div
            className="canvas-component"
            key={component.id}
            style={{ left: component.x, top: component.y, width: component.width, height: component.height, zIndex: component.zIndex }}
          >
            <PluginRenderer
              pluginType={component.pluginType}
              value={getValueByPath(activeItem, component.binding)}
              item={activeItem}
              properties={component.properties}
              mode="presentation"
              transition={transition ? {
                key: transition.key,
                previousValue: getValueByPath(transition.previousItem, component.binding),
                previousItem: transition.previousItem,
                defaultDuration: project.timeline.transitionDuration,
              } : undefined}
            />
          </div>
        ))}
      </div>
      <button className="floating-exit" onClick={onExit}>退出展示 <span>Esc</span></button>
      <div className="presentation-controls">
        <button onClick={() => showAdjacent(-1)} aria-label="上一项">‹</button>
        <button className="primary-control" onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? "暂停" : "播放"}><Icon name={isPlaying ? "pause" : "play"} /></button>
        <button onClick={() => showAdjacent(1)} aria-label="下一项">›</button>
        <div className="presentation-counter"><strong>{String(project.items.length ? activeIndex + 1 : 0).padStart(2, "0")}</strong><span>/ {String(project.items.length).padStart(2, "0")}</span></div>
      </div>
      <div className="global-progress"><span style={{ width: `${progress * 100}%` }} /></div>
    </main>
  );
}
