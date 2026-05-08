import { defineOgConfig, ignoreOg } from "@jxdltd/tanstack/og";

export default defineOgConfig({
  "/": () => ({
    title: "Auvia",
    description: "AI-powered client intake for law firms and accountancy practices.",
    type: "website",
  }),

  "/blog/": () => ({
    title: "Notes on client intake.",
    description:
      "What we've learned helping UK law firms and accountancy practices stop losing enquiries to slow response times.",
    type: "website",
  }),

  "/blog/$slug": () => ignoreOg,

  "/og/$": () => ignoreOg,
});
