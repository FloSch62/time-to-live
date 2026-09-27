import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "./",
  server: { strictPort: true },
  build: { target: "es2022", assetsInlineLimit: 0, chunkSizeWarningLimit: 4000 },
});
