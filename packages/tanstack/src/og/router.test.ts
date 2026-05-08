import { describe, expect, it } from "vitest";
import { ogMeta, type OgMetaEntry } from "./router";

function getProperty(meta: OgMetaEntry[], property: string): string | undefined {
  const entry = meta.find((m) => "property" in m && m.property === property);
  return entry?.content;
}

function getName(meta: OgMetaEntry[], name: string): string | undefined {
  const entry = meta.find((m) => "name" in m && m.name === name);
  return entry?.content;
}

describe("ogMeta", () => {
  describe("image URL", () => {
    it("maps / to /og/index.png", () => {
      const meta = ogMeta({ match: { fullPath: "/" } });
      expect(getProperty(meta, "og:image")).toBe("/og/index.png");
    });

    it("maps /blog/ to /og/blog.png", () => {
      const meta = ogMeta({ match: { fullPath: "/blog/" } });
      expect(getProperty(meta, "og:image")).toBe("/og/blog.png");
    });

    it("maps /blog (no trailing slash) to /og/blog.png", () => {
      const meta = ogMeta({ match: { fullPath: "/blog" } });
      expect(getProperty(meta, "og:image")).toBe("/og/blog.png");
    });

    it("substitutes named params", () => {
      const meta = ogMeta({
        match: { fullPath: "/blog/$slug" },
        params: { slug: "hello-world" },
      });
      expect(getProperty(meta, "og:image")).toBe("/og/blog/hello-world.png");
    });

    it("substitutes splat params", () => {
      const meta = ogMeta({
        match: { fullPath: "/files/$" },
        params: { _splat: "a/b/c" },
      });
      expect(getProperty(meta, "og:image")).toBe("/og/files/a/b/c.png");
    });

    it("URL-encodes named param values", () => {
      const meta = ogMeta({
        match: { fullPath: "/users/$name" },
        params: { name: "Jamie & Co" },
      });
      expect(getProperty(meta, "og:image")).toBe("/og/users/Jamie%20%26%20Co.png");
    });

    it("uses the deepest match when matches[] is provided without match", () => {
      const meta = ogMeta({
        matches: [
          { fullPath: "/" },
          { fullPath: "/blog/" },
          { fullPath: "/blog/$slug", params: { slug: "x" } },
        ],
      });
      expect(getProperty(meta, "og:image")).toBe("/og/blog/x.png");
    });

    it("prepends siteUrl to produce an absolute URL", () => {
      const meta = ogMeta({ match: { fullPath: "/" } }, { siteUrl: "https://example.com" });
      expect(getProperty(meta, "og:image")).toBe("https://example.com/og/index.png");
    });
  });

  describe("meta entries", () => {
    it("emits the canonical og + twitter set", () => {
      const meta = ogMeta({ match: { fullPath: "/" } });
      expect(getProperty(meta, "og:image")).toBeDefined();
      expect(getProperty(meta, "og:image:width")).toBe("1200");
      expect(getProperty(meta, "og:image:height")).toBe("630");
      expect(getName(meta, "twitter:card")).toBe("summary_large_image");
      expect(getName(meta, "twitter:image")).toBeDefined();
    });

    it("respects custom dimensions", () => {
      const meta = ogMeta({ match: { fullPath: "/" } }, { imageWidth: 800, imageHeight: 400 });
      expect(getProperty(meta, "og:image:width")).toBe("800");
      expect(getProperty(meta, "og:image:height")).toBe("400");
    });

    it("includes og:image:alt when siteName is provided", () => {
      const meta = ogMeta({ match: { fullPath: "/" } }, { siteName: "Auvia" });
      expect(getProperty(meta, "og:image:alt")).toBe("Auvia");
    });

    it("omits og:image:alt when siteName is not provided", () => {
      const meta = ogMeta({ match: { fullPath: "/" } });
      expect(getProperty(meta, "og:image:alt")).toBeUndefined();
    });

    it("includes twitter:site when twitterHandle is provided", () => {
      const meta = ogMeta({ match: { fullPath: "/" } }, { twitterHandle: "@auvia" });
      expect(getName(meta, "twitter:site")).toBe("@auvia");
    });
  });

  describe("fallbacks", () => {
    it("treats an empty ctx as the root route", () => {
      const meta = ogMeta({});
      expect(getProperty(meta, "og:image")).toBe("/og/index.png");
    });
  });
});
