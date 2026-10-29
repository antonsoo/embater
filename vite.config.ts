import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/embater/",
  build: {
    rollupOptions: {
      input: {
        orders: resolve(import.meta.dirname, "index.html"),
        plans: resolve(import.meta.dirname, "plans.html"),
        world: resolve(import.meta.dirname, "world.html"),
        drill: resolve(import.meta.dirname, "drill.html"),
      },
    },
  },
});
