import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vite.dev/config/
export default defineConfig({
  base: "/PersonalBlog/",
  plugins: [vue(), vueDevTools()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("markdown-it") || id.includes("highlight.js")) {
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
});
