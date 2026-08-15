import type { ProjectDocument } from "../types/project";

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 0 : 1)}s`;
}

export function TimelinePanel({ project, activeIndex, onSelect }: { project: ProjectDocument; activeIndex: number; onSelect: (index: number) => void }) {
  const total = project.items.reduce((sum, item) => sum + (item.duration ?? project.timeline.defaultDuration), 0);
  return (
    <section className="timeline-panel">
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
    </section>
  );
}
