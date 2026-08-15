import { useEffect, useMemo, useRef, useState } from "react";
import { getValueByPath } from "../core/bindings";
import { PluginRenderer } from "../plugins/registry";
import type { ProjectDocument } from "../types/project";
import { Icon } from "../editor/ui";

export function PresentationRuntime({ project, onExit }: { project: ProjectDocument; onExit: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scale, setScale] = useState(1);
  const progressRef = useRef(0);
  const activeItem = project.items[activeIndex] ?? {};

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

  useEffect(() => {
    if (!isPlaying || project.items.length === 0) return;
    let frame = 0;
    const duration = activeItem.duration ?? project.timeline.defaultDuration;
    const startedAt = performance.now() - progressRef.current * duration;

    const tick = (now: number) => {
      const ratio = (now - startedAt) / duration;
      if (ratio >= 1) {
        progressRef.current = 0;
        setProgress(0);
        if (activeIndex < project.items.length - 1) setActiveIndex(activeIndex + 1);
        else if (project.timeline.loop) setActiveIndex(0);
        else setIsPlaying(false);
        return;
      }
      progressRef.current = Math.max(0, ratio);
      setProgress(progressRef.current);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, activeItem.duration, isPlaying, project.items.length, project.timeline.defaultDuration, project.timeline.loop]);

  const canvasStyle = useMemo(() => ({
    width: project.canvas.width,
    height: project.canvas.height,
    backgroundColor: project.canvas.background,
    transform: `scale(${scale})`,
  }), [project.canvas, scale]);

  function showAdjacent(direction: number) {
    progressRef.current = 0;
    setProgress(0);
    setActiveIndex((current) => (current + direction + project.items.length) % project.items.length);
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
            <PluginRenderer pluginType={component.pluginType} value={getValueByPath(activeItem, component.binding)} item={activeItem} properties={component.properties} />
          </div>
        ))}
      </div>
      <button className="floating-exit" onClick={onExit}>退出展示 <span>Esc</span></button>
      <div className="presentation-controls">
        <button onClick={() => showAdjacent(-1)} aria-label="上一项">‹</button>
        <button className="primary-control" onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? "暂停" : "播放"}><Icon name={isPlaying ? "pause" : "play"} /></button>
        <button onClick={() => showAdjacent(1)} aria-label="下一项">›</button>
        <div className="presentation-counter"><strong>{String(activeIndex + 1).padStart(2, "0")}</strong><span>/ {String(project.items.length).padStart(2, "0")}</span></div>
      </div>
      <div className="global-progress"><span style={{ width: `${progress * 100}%` }} /></div>
    </main>
  );
}
