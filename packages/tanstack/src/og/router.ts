export type OgMetaOptions = {
  siteName?: string;
  siteUrl?: string;
  twitterHandle?: string;
};

export type OgMetaEntry = { property: string; content: string } | { name: string; content: string };

export function ogMeta(_ctx: unknown, options?: OgMetaOptions): OgMetaEntry[] {
  const siteName = options?.siteName ?? "";
  const siteUrl = options?.siteUrl ?? "";
  const imageUrl = `${siteUrl}/og/index.png?v=mock`;

  const meta: OgMetaEntry[] = [
    { property: "og:type", content: "website" },
    { property: "og:title", content: "TODO" },
    { property: "og:description", content: "TODO" },
    { property: "og:image", content: imageUrl },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "TODO" },
    { name: "twitter:description", content: "TODO" },
    { name: "twitter:image", content: imageUrl },
  ];
  if (siteName) meta.push({ property: "og:site_name", content: siteName });
  if (siteUrl) meta.push({ property: "og:url", content: siteUrl });
  if (options?.twitterHandle) {
    meta.push({ name: "twitter:site", content: options.twitterHandle });
  }
  return meta;
}
