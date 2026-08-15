import { useRef, type ChangeEvent } from "react";
import type { ProjectDocument } from "../types/project";
import { Icon } from "./ui";

type Props = {
  project: ProjectDocument;
  onRename: (name: string) => void;
  onImportData: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportProject: (event: ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onPresent: () => void;
};

export function TopBar({ project, onRename, onImportData, onImportProject, onExport, onPresent }: Props) {
  const dataInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><span /><span /><span /></div>
        <div><strong>序场</strong><small>TIMELINE STUDIO</small></div>
      </div>
      <div className="project-title">
        <span className="status-dot" />
        <input aria-label="项目名称" value={project.name} onChange={(event) => onRename(event.target.value)} />
        <span className="saved-label">已自动保存</span>
      </div>
      <div className="top-actions">
        <button className="button subtle" onClick={() => dataInputRef.current?.click()}><Icon name="upload" /> 导入数据</button>
        <button className="button subtle" onClick={() => projectInputRef.current?.click()}>打开项目</button>
        <button className="button subtle" onClick={onExport}><Icon name="download" /> 导出</button>
        <button className="button present-button" onClick={onPresent}><Icon name="play" /> 开始展示</button>
        <input ref={dataInputRef} hidden type="file" accept="application/json,.json" onChange={onImportData} />
        <input ref={projectInputRef} hidden type="file" accept="application/json,.json" onChange={onImportProject} />
      </div>
    </header>
  );
}
