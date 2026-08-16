import { useEffect, useState } from "react";
import { createDefaultProject, normalizeProject } from "./core/project";
import { EditorApp } from "./editor/EditorApp";
import { PresentationRuntime } from "./runtime/PresentationRuntime";
import type { ProjectDocument } from "./types/project";

// 当前版本使用单一存储槽保存项目。键名带版本号，便于未来迁移数据格式时并存。
const STORAGE_KEY = "timeline-studio-vite-project-v1";

/**
 * 读取浏览器中最近一次保存的项目。
 *
 * 本地数据属于不可信输入，因此仍要经过 normalizeProject 校验；解析、校验或读取
 * 任一环节失败时回退到示例项目，避免损坏的缓存阻止应用启动。
 */
function loadInitialProject(): ProjectDocument {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeProject(JSON.parse(saved)) : createDefaultProject();
  } catch {
    return createDefaultProject();
  }
}

export default function App() {
  // project 是编辑器与展示运行时共享的唯一项目状态。
  const [project, setProject] = useState<ProjectDocument>(loadInitialProject);
  // 展示模式直接替换编辑器页面，而不是在编辑器之上叠加，防止误编辑组件。
  const [presenting, setPresenting] = useState(false);

  // 任何不可变项目更新都会触发自动保存，刷新页面后可继续编辑。
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  // 两种模式消费同一份 ProjectDocument，切换模式不会复制或重置项目数据。
  if (presenting) return <PresentationRuntime project={project} onExit={() => setPresenting(false)} />;
  return <EditorApp project={project} setProject={setProject} onPresent={() => setPresenting(true)} />;
}
