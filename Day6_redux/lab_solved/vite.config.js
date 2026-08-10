import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5183,
    strictPort: true,
  },
  preview: {
    port: 4183,
    strictPort: true,
  },
});
