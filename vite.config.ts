import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages 部署在仓库子路径下，静态资源地址必须包含仓库名。
  base: "/plugin-timeline-studio-vite/",
  plugins: [react()],
  server: {
    // 允许局域网、容器或远程开发环境访问 Vite 开发服务器。
    host: "0.0.0.0",
  },
});
