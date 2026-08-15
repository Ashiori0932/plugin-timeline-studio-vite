import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/plugin-timeline-studio-vite/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
  },
});
