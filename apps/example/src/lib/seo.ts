export const SITE_URL = "https://auvia.io";
export const SITE_NAME = "auvia";

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  publishedTime?: string;
};

export function pageMeta({
  title,
  description,
  path,
  type = "website",
  publishedTime,
}: PageMetaInput) {
  const url = `${SITE_URL}${path}`;

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },

    { property: "og:type", content: type },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },

    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];

  if (type === "article" && publishedTime) {
    meta.push({ property: "article:published_time", content: publishedTime });
  }

  return {
    meta,
    links: [{ rel: "canonical", href: url }],
  };
}
