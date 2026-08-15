import { useEffect, useState } from "react";
import { createDefaultProject, normalizeProject } from "./core/project";
import { EditorApp } from "./editor/EditorApp";
import { PresentationRuntime } from "./runtime/PresentationRuntime";
import type { ProjectDocument } from "./types/project";

const STORAGE_KEY = "timeline-studio-vite-project-v1";

function loadInitialProject(): ProjectDocument {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeProject(JSON.parse(saved)) : createDefaultProject();
  } catch {
    return createDefaultProject();
  }
}

export default function App() {
  const [project, setProject] = useState<ProjectDocument>(loadInitialProject);
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  if (presenting) return <PresentationRuntime project={project} onExit={() => setPresenting(false)} />;
  return <EditorApp project={project} setProject={setProject} onPresent={() => setPresenting(true)} />;
}
