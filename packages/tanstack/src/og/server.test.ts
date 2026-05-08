import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("satori", () => ({
  default: vi.fn(async () => "<svg></svg>"),
}));

vi.mock("@resvg/resvg-js", () => {
  class FakeResvg {
    render() {
      return { asPng: () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]) };
    }
  }
  return { Resvg: FakeResvg };
});

import { defineOgTemplate, ignoreOg, type OgConfig, type OgTemplateModule } from "./index";
import { createOgHandler } from "./server";

const baseTemplate: OgTemplateModule = defineOgTemplate({
  width: 1200,
  height: 630,
  fonts: [],
  render: () => "test",
});

function makeRequest(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe("createOgHandler", () => {
  describe("URL routing", () => {
    it("returns 404 for non-/og paths", async () => {
      const handler = createOgHandler({ config: {} as OgConfig, template: baseTemplate });
      const res = await handler({ request: makeRequest("/foo") });
      expect(res.status).toBe(404);
    });

    it("returns 404 for unmatched /og paths", async () => {
      const config = { "/": () => ({ title: "x" }) } as unknown as OgConfig;
      const handler = createOgHandler({ config, template: baseTemplate });
      const res = await handler({ request: makeRequest("/og/missing.png") });
      expect(res.status).toBe(404);
    });

    it("matches / via /og/index.png", async () => {
      let invoked = false;
      const config = {
        "/": () => {
          invoked = true;
          return { title: "Home" };
        },
      } as unknown as OgConfig;
      const handler = createOgHandler({ config, template: baseTemplate });
      const res = await handler({ request: makeRequest("/og/index.png") });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/png");
      expect(invoked).toBe(true);
    });

    it("matches a trailing-slash key via /og/<segment>.png", async () => {
      let invoked = false;
      const config = {
        "/blog/": () => {
          invoked = true;
          return { title: "Blog" };
        },
      } as unknown as OgConfig;
      const handler = createOgHandler({ config, template: baseTemplate });
      const res = await handler({ request: makeRequest("/og/blog.png") });
      expect(res.status).toBe(200);
      expect(invoked).toBe(true);
    });

    it("extracts named params from splat segments", async () => {
      let receivedSlug = "";
      const config = {
        "/blog/$slug": ({ params }: { params: { slug: string } }) => {
          receivedSlug = params.slug;
          return { title: "Post" };
        },
      } as unknown as OgConfig;
      const handler = createOgHandler({ config, template: baseTemplate });
      const res = await handler({ request: makeRequest("/og/blog/hello-world.png") });
      expect(res.status).toBe(200);
      expect(receivedSlug).toBe("hello-world");
    });

    it("extracts catch-all splat into _splat", async () => {
      let receivedSplat = "";
      const config = {
        "/files/$": ({ params }: { params: { _splat: string } }) => {
          receivedSplat = params._splat;
          return { title: "File" };
        },
      } as unknown as OgConfig;
      const handler = createOgHandler({ config, template: baseTemplate });
      const res = await handler({ request: makeRequest("/og/files/a/b/c.png") });
      expect(res.status).toBe(200);
      expect(receivedSplat).toBe("a/b/c");
    });

    it("URL-decodes param values", async () => {
      let receivedSlug = "";
      const config = {
        "/blog/$slug": ({ params }: { params: { slug: string } }) => {
          receivedSlug = params.slug;
          return { title: "Post" };
        },
      } as unknown as OgConfig;
      const handler = createOgHandler({ config, template: baseTemplate });
      await handler({ request: makeRequest("/og/blog/hello%20world.png") });
      expect(receivedSlug).toBe("hello world");
    });
  });

  describe("ignoreOg", () => {
    it("returns 404 when entry returns ignoreOg", async () => {
      const config = {
        "/blog/$slug": () => ignoreOg,
      } as unknown as OgConfig;
      const handler = createOgHandler({ config, template: baseTemplate });
      const res = await handler({ request: makeRequest("/og/blog/missing.png") });
      expect(res.status).toBe(404);
    });
  });

  describe("fallback", () => {
    it("calls fallback for unmatched paths when provided", async () => {
      const fallback = vi.fn(async () => new Response("custom", { status: 418 }));
      const handler = createOgHandler({
        config: {} as OgConfig,
        template: baseTemplate,
        fallback,
      });
      const res = await handler({ request: makeRequest("/og/foo.png") });
      expect(res.status).toBe(418);
      expect(fallback).toHaveBeenCalledOnce();
    });
  });

  describe("response headers", () => {
    it("sets immutable cache + ETag headers on success", async () => {
      const config = {
        "/": () => ({ title: "x" }),
      } as unknown as OgConfig;
      const handler = createOgHandler({ config, template: baseTemplate });
      const res = await handler({ request: makeRequest("/og/index.png") });
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
      expect(res.headers.get("ETag")).toMatch(/^".+"$/);
    });
  });

  describe("caching", () => {
    let renderCount: number;
    let handler: ReturnType<typeof createOgHandler>;

    beforeEach(() => {
      renderCount = 0;
      const template: OgTemplateModule = defineOgTemplate({
        width: 1200,
        height: 630,
        fonts: [],
        render: () => {
          renderCount++;
          return "test";
        },
      });
      const config = {
        "/": () => ({ title: "Home" }),
      } as unknown as OgConfig;
      handler = createOgHandler({ config, template });
    });

    it("renders only once for repeated identical requests", async () => {
      await handler({ request: makeRequest("/og/index.png") });
      await handler({ request: makeRequest("/og/index.png") });
      await handler({ request: makeRequest("/og/index.png") });
      expect(renderCount).toBe(1);
    });
  });

  describe("template fonts as a function", () => {
    it("invokes the fonts resolver lazily", async () => {
      let fontsResolved = 0;
      const template: OgTemplateModule = defineOgTemplate({
        width: 1200,
        height: 630,
        fonts: () => {
          fontsResolved++;
          return [];
        },
        render: () => "x",
      });
      const config = {
        "/": () => ({ title: "x" }),
      } as unknown as OgConfig;
      const handler = createOgHandler({ config, template });

      expect(fontsResolved).toBe(0);
      await handler({ request: makeRequest("/og/index.png") });
      expect(fontsResolved).toBe(1);
    });
  });
});
