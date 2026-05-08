import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/og/index.ts", "src/og/server.ts", "src/og/router.ts"],
    dts: true,
    format: ["esm"],
    sourcemap: true,
  },
});
