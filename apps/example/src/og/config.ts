import { defineOgConfig, ignore } from "@jxdltd/tanstack/og";
import { allPosts } from "content-collections";

export default defineOgConfig({
  "/": () => ({
    title: "Every enquiry handled. Every meeting booked. No staff required.",
    description: "AI-powered client intake for law firms and accountancy practices.",
    type: "website",
  }),

  "/blog/": () => ({
    title: "Notes on client intake.",
    description:
      "What we've learned helping UK law firms and accountancy practices stop losing enquiries to slow response times.",
    type: "website",
    tag: "Blog",
  }),

  "/blog/$slug": ({ params }) => {
    const post = allPosts.find((p) => p.slug === params.slug);
    if (!post) return ignore;
    return {
      title: post.title,
      description: post.excerpt,
      type: "article",
      author: post.author ?? "Auvia",
      date: post.date,
      tag: post.tag,
    };
  },

  "/og/$": () => ignore,
});
