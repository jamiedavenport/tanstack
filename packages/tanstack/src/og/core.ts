import type { ReactNode } from "react";
import {
  type OgConfig,
  type OgConfigEntry,
  type OgData,
  type OgTemplateFont,
  type OgTemplateModule,
  ignore,
} from "./index";
import { matchConfigKey } from "./match";

export type OgSvgRenderer = (ctx: {
  node: ReactNode;
  width: number;
  height: number;
  fonts: OgTemplateFont[];
}) => Promise<string>;

export type OgSvgToPng = (svg: string) => Uint8Array | Promise<Uint8Array>;

/**
 * Replacement for the default in-process `Map` PNG cache. Keys are content
 * hashes of the rendered `OgData`. Both methods may be sync or async, so the
 * cache can be backed by e.g. an LRU in Node or the Cache API on workers.
 */
export type OgCache = {
  get: (key: string) => Uint8Array | undefined | Promise<Uint8Array | undefined>;
  set: (key: string, png: Uint8Array) => void | Promise<void>;
};

export type CreateOgHandlerBaseOptions = {
  config: OgConfig;
  template: OgTemplateModule;
  fallback?: (ctx: { request: Request }) => Response | Promise<Response>;
  cache?: OgCache;
};

export type CreateOgHandlerCoreOptions = CreateOgHandlerBaseOptions & {
  renderSvg: OgSvgRenderer;
  svgToPng: OgSvgToPng;
};

export type OgHandler = (ctx: { request: Request }) => Promise<Response>;

const OG_PREFIX = "/og/";
const PNG_SUFFIX = ".png";

function createMapCache(): OgCache {
  const store = new Map<string, Uint8Array>();
  return {
    get: (key) => store.get(key),
    set: (key, png) => {
      store.set(key, png);
    },
  };
}

export function createOgHandlerCore(options: CreateOgHandlerCoreOptions): OgHandler {
  const { config, template, fallback, renderSvg, svgToPng } = options;
  const cache = options.cache ?? createMapCache();
  const inflight = new Map<string, Promise<Uint8Array>>();

  const fallbackOr404 = async (request: Request): Promise<Response> => {
    if (fallback) {
      return fallback({ request });
    }
    return new Response(null, { status: 404 });
  };

  const renderPng = async (
    data: OgData,
    routePath: string,
    params: Record<string, string>,
    request: Request,
  ): Promise<Uint8Array> => {
    const node = await template.render({
      data,
      route: { path: routePath, fullPath: routePath, params },
      request,
    });
    const fonts = typeof template.fonts === "function" ? await template.fonts() : template.fonts;
    const svg = await renderSvg({
      node,
      width: template.width,
      height: template.height,
      fonts,
    });
    return svgToPng(svg);
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
    if (!match) {
      return fallbackOr404(request);
    }

    const entry = (config as Record<string, OgConfigEntry<Record<string, string>>>)[match.key];
    if (!entry) {
      return fallbackOr404(request);
    }

    let data: OgData | typeof ignore;
    try {
      data = await entry({ params: match.params, request });
    } catch (err) {
      console.error("[og] config entry threw", err);
      return new Response(null, { status: 500 });
    }
    if (data === ignore) {
      return fallbackOr404(request);
    }

    const cacheKey = simpleHash(JSON.stringify(data));

    let png = await cache.get(cacheKey);
    if (!png) {
      let pending = inflight.get(cacheKey);
      if (!pending) {
        pending = renderPng(data, match.key, match.params, request);
        inflight.set(cacheKey, pending);
      }
      try {
        png = await pending;
        await cache.set(cacheKey, png);
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
