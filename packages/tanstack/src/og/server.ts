import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import {
  type OgConfig,
  type OgConfigEntry,
  type OgData,
  type OgTemplateModule,
  ignore,
} from "./index";

export type CreateOgHandlerOptions = {
  config: OgConfig;
  template: OgTemplateModule;
  fallback?: (ctx: { request: Request }) => Response | Promise<Response>;
};

export type OgHandler = (ctx: { request: Request }) => Promise<Response>;

const OG_PREFIX = "/og/";
const PNG_SUFFIX = ".png";

export function createOgHandler(options: CreateOgHandlerOptions): OgHandler {
  const { config, template, fallback } = options;
  const cache = new Map<string, Uint8Array>();
  const inflight = new Map<string, Promise<Uint8Array>>();

  const fallbackOr404 = async (request: Request): Promise<Response> => {
    if (fallback) return fallback({ request });
    return new Response(null, { status: 404 });
  };

  return async ({ request }) => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(OG_PREFIX)) {
      return fallbackOr404(request);
    }

    let routePart = url.pathname.slice(OG_PREFIX.length);
    if (routePart.endsWith(PNG_SUFFIX)) {
      routePart = routePart.slice(0, -PNG_SUFFIX.length);
    }

    const match = matchConfigKey(routePart, config);
    if (!match) return fallbackOr404(request);

    const entry = (config as Record<string, OgConfigEntry<Record<string, string>>>)[match.key];
    if (!entry) return fallbackOr404(request);

    let data: OgData | typeof ignore;
    try {
      data = await entry({ params: match.params, request });
    } catch (err) {
      console.error("[og] config entry threw", err);
      return new Response(null, { status: 500 });
    }
    if (data === ignore) return fallbackOr404(request);

    const cacheKey = simpleHash(JSON.stringify(data));

    let png = cache.get(cacheKey);
    if (!png) {
      let pending = inflight.get(cacheKey);
      if (!pending) {
        pending = renderPng(template, data, match.key, match.params, request);
        inflight.set(cacheKey, pending);
      }
      try {
        png = await pending;
        cache.set(cacheKey, png);
      } finally {
        inflight.delete(cacheKey);
      }
    }

    return new Response(png as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: `"${cacheKey}"`,
      },
    });
  };
}

async function renderPng(
  template: OgTemplateModule,
  data: OgData,
  routePath: string,
  params: Record<string, string>,
  request: Request,
): Promise<Uint8Array> {
  const node = await template.render({
    data,
    route: { path: routePath, fullPath: routePath, params },
    request,
  });

  type SatoriOptions = Parameters<typeof satori>[1];
  const fonts = typeof template.fonts === "function" ? await template.fonts() : template.fonts;
  const svg = await satori(node as Parameters<typeof satori>[0], {
    width: template.width,
    height: template.height,
    fonts: fonts as unknown as SatoriOptions["fonts"],
  });

  return new Uint8Array(new Resvg(svg).render().asPng());
}

type MatchResult = { key: string; params: Record<string, string> };

function matchConfigKey(routePart: string, config: OgConfig): MatchResult | null {
  const target = "/" + routePart;
  const keys = Object.keys(config);

  if (routePart === "" || routePart === "index") {
    if (keys.includes("/")) return { key: "/", params: {} };
  }

  if (keys.includes(target)) return { key: target, params: {} };
  const targetSlash = target.endsWith("/") ? target : target + "/";
  if (keys.includes(targetSlash)) return { key: targetSlash, params: {} };

  for (const key of keys) {
    if (!key.includes("$")) continue;
    const params = matchPath(key, target);
    if (params) return { key, params };
  }
  return null;
}

function matchPath(pattern: string, target: string): Record<string, string> | null {
  const patternSegs = pattern.split("/").filter(Boolean);
  const targetSegs = target.split("/").filter(Boolean);

  const splatIdx = patternSegs.findIndex((s) => s === "$");
  if (splatIdx !== -1) {
    if (targetSegs.length < splatIdx) return null;
    const matched: Record<string, string> = {};
    for (let i = 0; i < splatIdx; i++) {
      const p = patternSegs[i]!;
      const t = targetSegs[i]!;
      if (p.startsWith("$")) matched[p.slice(1)] = decodeURIComponent(t);
      else if (p !== t) return null;
    }
    matched._splat = targetSegs
      .slice(splatIdx)
      .map((s) => decodeURIComponent(s))
      .join("/");
    return matched;
  }

  if (patternSegs.length !== targetSegs.length) return null;
  const matched: Record<string, string> = {};
  for (let i = 0; i < patternSegs.length; i++) {
    const p = patternSegs[i]!;
    const t = targetSegs[i]!;
    if (p.startsWith("$")) matched[p.slice(1)] = decodeURIComponent(t);
    else if (p !== t) return null;
  }
  return matched;
}

function simpleHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const merged = (BigInt(h2 >>> 0) << 32n) | BigInt(h1 >>> 0);
  return merged.toString(36);
}
