import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";

// 应用只创建一个 React 根节点。StrictMode 会在开发环境额外检查副作用，
// 有助于尽早发现未正确清理的定时器、事件监听器和可变状态。
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
