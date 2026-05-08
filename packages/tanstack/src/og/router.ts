export type OgMetaOptions = {
  siteName?: string;
  siteUrl?: string;
  twitterHandle?: string;
  imageWidth?: number;
  imageHeight?: number;
};

export type OgMetaEntry = { property: string; content: string } | { name: string; content: string };

type RouteMatchLike = {
  fullPath?: string;
  routeId?: string;
  pathname?: string;
  params?: Record<string, string>;
};

type HeadCtxLike = {
  match?: RouteMatchLike;
  matches?: RouteMatchLike[];
  params?: Record<string, string>;
};

export function ogMeta(ctx: HeadCtxLike, options: OgMetaOptions = {}): OgMetaEntry[] {
  const match = ctx.match ?? ctx.matches?.[ctx.matches.length - 1];
  const fullPath = match?.fullPath ?? "/";
  const params = ctx.params ?? match?.params ?? {};

  const imagePath = buildImagePath(fullPath, params);
  const imageUrl = options.siteUrl ? new URL(imagePath, options.siteUrl).toString() : imagePath;

  const width = options.imageWidth ?? 1200;
  const height = options.imageHeight ?? 630;

  const meta: OgMetaEntry[] = [
    { property: "og:image", content: imageUrl },
    { property: "og:image:width", content: String(width) },
    { property: "og:image:height", content: String(height) },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: imageUrl },
  ];
  if (options.siteName) {
    meta.push({ property: "og:image:alt", content: options.siteName });
  }
  if (options.twitterHandle) {
    meta.push({ name: "twitter:site", content: options.twitterHandle });
  }
  return meta;
}

function buildImagePath(fullPath: string, params: Record<string, string>): string {
  let resolved = fullPath;
  for (const [key, value] of Object.entries(params)) {
    if (key === "_splat") continue;
    resolved = resolved.replace(`$${key}`, encodeURIComponent(value));
  }
  if (params._splat) {
    resolved = resolved.replace(/\$$/, encodeURI(params._splat));
  }
  resolved = resolved.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!resolved) resolved = "index";
  return `/og/${resolved}.png`;
}
