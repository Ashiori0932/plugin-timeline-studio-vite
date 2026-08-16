import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getValueByPath } from "../core/bindings";
import { PLUGIN_REGISTRY, PluginRenderer } from "../plugins/registry";
import type { DataItem, ProjectDocument } from "../types/project";
import { Icon } from "../editor/ui";

type ActiveTransition = {
  key: number;
  previousItem: DataItem;
};

/**
 * 全屏展示运行时。
 * 负责对象计时、播放/暂停、切换过渡、画布等比缩放，并为插件提供统一播放上下文。
 */
export function PresentationRuntime({ project, onExit }: { project: ProjectDocument; onExit: () => void }) {
  // progress 表示当前对象内的 0～1 进度；activeIndex 指向正在展示的数据对象。
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scale, setScale] = useState(1);
  const [transition, setTransition] = useState<ActiveTransition | null>(null);
  // ref 保存动画帧和定时器需要立即读取的最新值，避免等待 React 状态提交。
  const activeIndexRef = useRef(0);
  const progressRef = useRef(0);
  const transitionKeyRef = useRef(0);
  const transitionTimerRef = useRef<number | null>(null);
  const activeItem = project.items[activeIndex] ?? {};

  const timelineTiming = useMemo(() => {
    // 预先计算每个对象在总时间轴中的起点与长度，供全局进度条常数时间查询。
    let totalDuration = 0;
    const entries = project.items.map((item) => {
      const start = totalDuration;
      const duration = item.duration ?? project.timeline.defaultDuration;
      totalDuration += duration;
      return { start, duration };
    });
    return { entries, totalDuration };
  }, [project.items, project.timeline.defaultDuration]);

  const playback = useMemo(() => {
    const currentTiming = timelineTiming.entries[activeIndex];
    const timelineProgress = currentTiming && timelineTiming.totalDuration > 0
      ? (currentTiming.start + progress * currentTiming.duration) / timelineTiming.totalDuration
      : 0;

    return {
      itemProgress: progress,
      // 即使导入异常时长也不把非法进度传播给插件。
      timelineProgress: Math.max(0, Math.min(1, timelineProgress)),
    };
  }, [activeIndex, progress, timelineTiming]);

  const transitionWindow = useMemo(() => {
    // 过渡上下文必须至少保留到最慢的组件动画结束，否则旧对象会被提前卸载。
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

    // 同时支持上一项传入负数和下一项越过末尾，统一按循环索引规范化。
    const normalizedIndex = (nextIndex + itemCount) % itemCount;
    const previousIndex = activeIndexRef.current;
    progressRef.current = 0;
    setProgress(0);

    if (normalizedIndex === previousIndex) return;

    // 快速连续切换时取消旧清理任务，避免它误删新一轮过渡状态。
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }

    // 保存旧对象并递增 key，插件即可并行渲染旧值和当前值来完成交叉过渡。
    transitionKeyRef.current += 1;
    setTransition({
      key: transitionKeyRef.current,
      previousItem: project.items[previousIndex] ?? {},
    });
    activeIndexRef.current = normalizedIndex;
    setActiveIndex(normalizedIndex);

    if (transitionWindow === 0) {
      // 所有动画均禁用时不保留旧对象。
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
    // 展示画布按视口的较小缩放比完整容纳，Escape 是退出展示的全局快捷键。
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
    // 组件卸载时取消尚未完成的过渡清理定时器。
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || project.items.length === 0) return;
    let frame = 0;
    const duration = activeItem.duration ?? project.timeline.defaultDuration;
    // 暂停后恢复时从已有进度反推起始时间，而不是从 0 重新播放。
    const startedAt = performance.now() - progressRef.current * duration;

    const tick = (now: number) => {
      const ratio = (now - startedAt) / duration;
      if (ratio >= 1) {
        // 对象结束后依次前进；末尾根据 loop 决定回到开头还是停止在 100%。
        if (activeIndex < project.items.length - 1) changeActiveIndex(activeIndex + 1);
        else if (project.timeline.loop) changeActiveIndex(0);
        else {
          progressRef.current = 1;
          setProgress(1);
          setIsPlaying(false);
        }
        return;
      }
      // requestAnimationFrame 与屏幕刷新同步，ref 供下一帧/暂停恢复立即读取。
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
    // CSS 负责视觉缩放，组件仍使用项目中的逻辑坐标和尺寸。
    transform: `scale(${scale})`,
  }), [project.canvas, scale]);

  function showAdjacent(direction: number) {
    if (project.items.length === 0) return;
    changeActiveIndex(activeIndexRef.current + direction);
  }

  return (
    <main className="presentation-shell">
      <div className="presentation-canvas" style={canvasStyle}>
        {/* 与编辑器保持相同的层级排序和插件渲染入口。 */}
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
              playback={playback}
              properties={component.properties}
              mode="presentation"
              /* transition 存在时同时提供旧对象及旧绑定值，插件自行决定动画方式。 */
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
    </main>
  );
}
