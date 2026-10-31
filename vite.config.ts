import { defineConfig } from "vite";
import { offlineBuild } from "./scripts/offline-build";

export default defineConfig(async () => {
  const offline = await offlineBuild("embater", [
    "index.html",
    "plans.html",
    "compare.html",
    "doorways.html",
    "world.html",
    "drill.html",
  ]);
  return {
    base: "/embater/",
    define: { __OFFLINE_EDITION__: JSON.stringify(offline.edition) },
    plugins: [offline.plugin],
    build: {
      rollupOptions: {
        input: [
          "index.html",
          "plans.html",
          "compare.html",
          "doorways.html",
          "world.html",
          "drill.html",
        ],
      },
    },
  };
});
