import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
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
 * 默认只保留画布内的展开悬浮按钮；展开后显示稳定的完整浮层，由收起按钮关闭。
 */
export function TimelinePanel({ project, activeIndex, onSelect, onPanelFocus }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 每个数据对象可覆盖默认时长，未设置时使用项目时间轴的统一值。
  const total = useMemo(() => project.items.reduce((sum, item) => sum + (item.duration ?? project.timeline.defaultDuration), 0), [project.items, project.timeline.defaultDuration]);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    event.stopPropagation();
    onPanelFocus();
  }

  if (!isExpanded) {
    return (
      <button className="timeline-float-button" type="button" onPointerDown={handlePointerDown} onClick={() => setIsExpanded(true)} aria-label="展开完整时间轴">
        <Icon name="timeline" />
      </button>
    );
  }

  return (
    <section className="timeline-panel is-expanded" onPointerDown={handlePointerDown} aria-label="完整数据时间轴">
      <button className="timeline-collapse-button" type="button" onClick={() => setIsExpanded(false)} aria-label="收起完整时间轴">
        <Icon name="chevron" />
      </button>
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
    </section>
  );
}
