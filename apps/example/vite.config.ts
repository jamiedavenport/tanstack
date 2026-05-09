import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import contentCollections from "@content-collections/vite";
import fs from "node:fs";
import path from "node:path";

const blogSlugs = fs
  .readdirSync(path.resolve(import.meta.dirname, "content/blog"))
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => f.replace(/\.mdx$/, ""));

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    exclude: ["@resvg/resvg-js"],
  },
  ssr: {
    external: ["@resvg/resvg-js"],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//, /^@resvg\//] } }),
    tailwindcss(),
    contentCollections(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
      },
      pages: [
        { path: "/" },
        { path: "/blog" },
        ...blogSlugs.map((slug) => ({ path: `/blog/${slug}` })),
      ],
    }),
    viteReact(),
  ],
});

export default config;
