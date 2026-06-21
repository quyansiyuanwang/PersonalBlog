import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("src/components/FuiMusicWidget.vue")) {
            return "music-widget";
          }

          if (id.includes("src/components/CustomCursor.vue")) {
            return "cursor";
          }

          if (id.includes("src/lib/startup.ts")) {
            return "startup";
          }

          if (id.includes("src/layouts/BlogLayout.vue") || id.includes("src/style-blog.css")) {
            return "shell";
          }

          if (id.includes("markdown-it") || id.includes("highlight.js") || id.includes("mermaid")) {
            return "markdown";
          }

          if (id.includes("element-plus")) {
            return "ui";
          }

          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
  plugins: [vue(), vueDevTools()],
});
