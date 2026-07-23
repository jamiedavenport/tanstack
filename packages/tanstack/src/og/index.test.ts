import { describe, expect, expectTypeOf, it } from "vitest";
import {
  defineOgConfig,
  defineOgTemplate,
  fromHead,
  ignore,
  type OgConfig,
  type OgConfigEntry,
  type OgConfigFor,
  type OgTemplateModule,
  type RouteParams,
} from "./index";

describe("defineOgConfig", () => {
  it("returns the input as-is", () => {
    const config = {} as OgConfig;
    expect(defineOgConfig(config)).toBe(config);
  });
});

describe("OgConfigFor", () => {
  it("keys entries by resolved fullPath, not route ID", () => {
    type Routes = {
      "/_layout": { id: "/_layout"; path: ""; fullPath: "" };
      "/_layout/about": { id: "/_layout/about"; path: "/about"; fullPath: "/about" };
      "/blog/$slug": { id: "/blog/$slug"; path: "/blog/$slug"; fullPath: "/blog/$slug" };
    };
    expectTypeOf<OgConfigFor<Routes>>().toEqualTypeOf<{
      "/about"?: OgConfigEntry<Record<string, never>>;
      "/blog/$slug"?: OgConfigEntry<{ slug: string }>;
    }>();
    expectTypeOf<RouteParams<"/blog/$slug">>().toEqualTypeOf<{ slug: string }>();
  });
});

describe("defineOgTemplate", () => {
  it("returns the input as-is", () => {
    const template: OgTemplateModule = {
      width: 1200,
      height: 630,
      fonts: [],
      render: () => null,
    };
    expect(defineOgTemplate(template)).toBe(template);
  });
});

describe("ignore", () => {
  it("is a symbol with the package-namespaced description", () => {
    expect(typeof ignore).toBe("symbol");
    expect(ignore.toString()).toContain("@jxdltd/tanstack/og/ignore");
  });

  it("is referentially stable across imports", () => {
    expect(ignore).toBe(ignore);
  });
});

describe("fromHead", () => {
  it("returns an entry that resolves to OgData with title and description", async () => {
    const entry = fromHead();
    const result = await entry({
      params: {},
      request: new Request("http://example.com"),
    });
    expect(result).toMatchObject({
      title: expect.any(String),
      description: expect.any(String),
    });
  });
});
