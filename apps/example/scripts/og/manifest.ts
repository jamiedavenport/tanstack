export type StaticEntry = {
  slug: string;
  outPath: string;
  eyebrow: string;
  title: string;
  description: string;
};

export const staticEntries: ReadonlyArray<StaticEntry> = [
  {
    slug: "home",
    outPath: "public/og/home.png",
    eyebrow: "",
    title: "Every enquiry handled. Every meeting booked. No staff required.",
    description: "AI-powered client intake for law firms and accountancy practices.",
  },
  {
    slug: "blog",
    outPath: "public/og/blog.png",
    eyebrow: "Blog",
    title: "Notes on client intake.",
    description:
      "What we've learned helping UK law firms and accountancy practices stop losing enquiries to slow response times.",
  },
];
