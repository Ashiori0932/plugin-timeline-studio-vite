import { useMemo, useState } from "react";
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
 * 默认只显示三键简化控制，完整时间轴以覆盖层展开，不再持续压缩画布高度。
 */
export function TimelinePanel({ project, activeIndex, onSelect, onPanelFocus }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 每个数据对象可覆盖默认时长，未设置时使用项目时间轴的统一值。
  const total = useMemo(() => project.items.reduce((sum, item) => sum + (item.duration ?? project.timeline.defaultDuration), 0), [project.items, project.timeline.defaultDuration]);

  function showAdjacent(direction: number) {
    if (project.items.length === 0) return;
    onSelect((activeIndex + direction + project.items.length) % project.items.length);
  }

  return (
    <section className="timeline-panel" onPointerDown={onPanelFocus}>
      <div className="timeline-compact-controls">
        <button onClick={() => showAdjacent(-1)} aria-label="上一个对象">‹</button>
        <button className="primary-control" onClick={() => setIsExpanded((value) => !value)} aria-label={isExpanded ? "收起完整时间轴" : "展开完整时间轴"}>
          <Icon name="timeline" />
        </button>
        <button onClick={() => showAdjacent(1)} aria-label="下一个对象">›</button>
      </div>
      {isExpanded && (
        <div className="timeline-full" aria-label="完整数据时间轴">
          <div className="timeline-labels"><span>数据时间轴</span><small>编辑模式 · 时间已暂停</small></div>
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
      )}
    </section>
  );
}
