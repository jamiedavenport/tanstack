import { describe, expect, it } from "vitest";
import {
  defineOgConfig,
  defineOgTemplate,
  fromHead,
  ignore,
  type OgConfig,
  type OgTemplateModule,
} from "./index";

describe("defineOgConfig", () => {
  it("returns the input as-is", () => {
    const config = {} as OgConfig;
    expect(defineOgConfig(config)).toBe(config);
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
