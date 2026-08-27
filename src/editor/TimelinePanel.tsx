import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ProjectDocument } from "../types/project";
import { Icon } from "./ui";

/** 将毫秒转换成适合时间轴卡片展示的紧凑秒数。 */
function formatTime(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
}

type Props = {
  project: ProjectDocument;
  activeIndex: number;
  onSelect: (index: number) => void;
  onPanelFocus: () => void;
};

/**
 * 编辑模式的对象时间轴。
 * 默认是画布内悬浮三键组件；展开时同一组件变成完整时间轴，鼠标移出后延迟收起。
 */
export function TimelinePanel({ project, activeIndex, onSelect, onPanelFocus }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);
  // 每个数据对象可覆盖默认时长，未设置时使用项目时间轴的统一值。
  const total = useMemo(() => project.items.reduce((sum, item) => sum + (item.duration ?? project.timeline.defaultDuration), 0), [project.items, project.timeline.defaultDuration]);

  useEffect(() => () => clearCollapseTimer(), []);

  function showAdjacent(direction: number) {
    if (project.items.length === 0) return;
    onSelect((activeIndex + direction + project.items.length) % project.items.length);
  }

  function clearCollapseTimer() {
    if (collapseTimerRef.current === null) return;
    window.clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = null;
  }

  function scheduleCollapse() {
    if (!isExpanded) return;
    clearCollapseTimer();
    collapseTimerRef.current = window.setTimeout(() => {
      setIsExpanded(false);
      collapseTimerRef.current = null;
    }, 200);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation();
    onPanelFocus();
  }

  return (
    <section
      className={`timeline-panel ${isExpanded ? "is-expanded" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerEnter={clearCollapseTimer}
      onPointerLeave={scheduleCollapse}
    >
      <div className="timeline-compact-controls">
        <button onClick={() => showAdjacent(-1)} aria-label="上一个对象">‹</button>
        <button className="primary-control" onClick={() => setIsExpanded((value) => !value)} aria-label={isExpanded ? "收起完整时间轴" : "展开完整时间轴"}>
          <Icon name="timeline" />
        </button>
        <button onClick={() => showAdjacent(1)} aria-label="下一个对象">›</button>
      </div>
      <div className="timeline-expanded-content" aria-hidden={!isExpanded}>
        <div className="timeline-items">
          {project.items.map((item, index) => {
            const duration = item.duration ?? project.timeline.defaultDuration;
            return (
              <button className={`timeline-card ${activeIndex === index ? "active" : ""}`} key={item.id ?? index} onClick={() => onSelect(index)}>
                <span className="timeline-number">{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{String(item.title ?? item.id ?? `对象 ${index + 1}`)}</strong><small>{formatTime(duration)} · {Object.keys(item).length} 个字段</small></span>
              </button>
            );
          })}
        </div>
        <div className="timeline-summary"><span>总时长</span><strong>{formatTime(total)}</strong></div>
      </div>
    </section>
  );
}
