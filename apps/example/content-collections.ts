import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import shikiRehype from "@shikijs/rehype";
import type { ThemeRegistrationRaw } from "shiki/core";
import { z } from "zod";

import monoTheme from "./src/lib/shiki-mono-theme.json" with { type: "json" };
import { parseChromeMeta, shikiChromeTransformer } from "./src/lib/rehype-codeblock-chrome";

const posts = defineCollection({
  name: "posts",
  directory: "content/blog",
  include: "*.mdx",
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.string(),
    tag: z.string().optional(),
    author: z.string().optional(),
  }),
  transform: async (doc, ctx) => {
    const body = await compileMDX(ctx, doc, {
      rehypePlugins: [
        [
          shikiRehype,
          {
            theme: monoTheme as unknown as ThemeRegistrationRaw,
            langs: ["ts", "tsx", "json", "bash"],
            parseMetaString: (metaString: string) => parseChromeMeta(metaString),
            transformers: [shikiChromeTransformer],
          },
        ],
      ],
    });
    const slug = doc._meta.fileName.replace(/\.mdx$/, "");
    const readingTime = computeReadingTime(doc.content);
    return { ...doc, slug, body, readingTime };
  },
});

export default defineConfig({ content: [posts] });

function computeReadingTime(content: string): string {
  const prose = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[#>*_\-[\]()!]/g, " ");
  const words = prose.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min`;
}
