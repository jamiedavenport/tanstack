import { createHash } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

import { staticEntries } from "./manifest.ts";
import { pageCard, postCard } from "./template.tsx";

const ROOT = resolve(import.meta.dirname, "../..");
const POSTS_DIR = join(ROOT, "content/blog");
const SANS_DIR = join(ROOT, "node_modules/geist/dist/fonts/geist-sans");
const MONO_DIR = join(ROOT, "node_modules/geist/dist/fonts/geist-mono");

const fonts = [
  {
    name: "Geist",
    data: readFileSync(join(SANS_DIR, "Geist-Regular.ttf")),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Geist",
    data: readFileSync(join(SANS_DIR, "Geist-Medium.ttf")),
    weight: 500 as const,
    style: "normal" as const,
  },
  {
    name: "Geist",
    data: readFileSync(join(SANS_DIR, "Geist-Black.ttf")),
    weight: 900 as const,
    style: "normal" as const,
  },
  {
    name: "Geist Mono",
    data: readFileSync(join(MONO_DIR, "GeistMono-Regular.ttf")),
    weight: 400 as const,
    style: "normal" as const,
  },
];

type PostMeta = {
  slug: string;
  title: string;
  tag: string;
  author: string;
  date: string;
  readingTime: string;
};

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return { data, body: match[2] };
}

function readingTime(body: string): string {
  const prose = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[#>*_\-[\]()!]/g, " ");
  const words = prose.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

function loadPosts(): PostMeta[] {
  if (!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = readFileSync(join(POSTS_DIR, file), "utf8");
      const { data, body } = parseFrontmatter(raw);
      return {
        slug: file.replace(/\.mdx$/, ""),
        title: data.title ?? file,
        tag: (data.tag ?? "post").toUpperCase(),
        author: data.author ?? "Jamie Davenport",
        date: formatDate(data.date),
        readingTime: readingTime(body),
      };
    });
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

async function renderPng(node: React.ReactNode): Promise<Buffer> {
  const svg = await satori(node, { width: 1200, height: 630, fonts });
  return Buffer.from(new Resvg(svg).render().asPng());
}

function fingerprint(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

async function writeIfChanged(outPath: string, fp: string, render: () => Promise<Buffer>) {
  const abs = join(ROOT, outPath);
  const hashFile = `${abs}.hash`;
  if (existsSync(abs) && existsSync(hashFile) && readFileSync(hashFile, "utf8") === fp) {
    console.log(`  skip   ${outPath}`);
    return;
  }
  const png = await render();
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, png);
  writeFileSync(hashFile, fp);
  console.log(`  wrote  ${outPath}`);
}

async function main() {
  console.log("og: generating images");

  for (const entry of staticEntries) {
    const fp = fingerprint(entry);
    await writeIfChanged(entry.outPath, fp, () =>
      renderPng(
        pageCard({
          eyebrow: entry.eyebrow,
          title: entry.title,
          footer: entry.description,
        }),
      ),
    );
  }

  for (const post of loadPosts()) {
    const fp = fingerprint(post);
    const outPath = `public/og/blog/${post.slug}.png`;
    await writeIfChanged(outPath, fp, () => renderPng(postCard(post)));
  }

  console.log("og: done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
