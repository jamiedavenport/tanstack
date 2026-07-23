import { describe, expect, it, vi } from "vitest";

const { initYoga, initWasm } = vi.hoisted(() => ({
  initYoga: vi.fn(async () => undefined),
  initWasm: vi.fn(async () => undefined),
}));

vi.mock("satori/standalone", () => ({
  default: vi.fn(async () => "<svg></svg>"),
  init: initYoga,
}));

vi.mock("@resvg/resvg-wasm", () => {
  class FakeResvg {
    render() {
      return { asPng: () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]) };
    }
  }
  return { Resvg: FakeResvg, initWasm };
});

import { defineOgTemplate, type OgConfig, type OgTemplateModule } from "./index";
import { createOgHandler } from "./edge";

const baseTemplate: OgTemplateModule = defineOgTemplate({
  width: 1200,
  height: 630,
  fonts: [],
  render: () => "test",
});

const wasm = {
  yoga: new ArrayBuffer(0),
  resvg: new ArrayBuffer(0),
};

function makeRequest(path: string): Request {
  return new Request(`http://localhost${path}`);
}

describe("createOgHandler (edge)", () => {
  it("does not initialize wasm until a matching request arrives", async () => {
    const handler = createOgHandler({ config: {} as OgConfig, template: baseTemplate, wasm });
    expect(initYoga).not.toHaveBeenCalled();
    expect(initWasm).not.toHaveBeenCalled();

    const res = await handler({ request: makeRequest("/foo") });
    expect(res.status).toBe(404);
    expect(initYoga).not.toHaveBeenCalled();
    expect(initWasm).not.toHaveBeenCalled();
  });

  it("renders a png and initializes wasm exactly once across requests", async () => {
    let renderCount = 0;
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
      "/blog/$slug": ({ params }: { params: { slug: string } }) => ({ title: params.slug }),
    } as unknown as OgConfig;
    const handler = createOgHandler({ config, template, wasm });

    const res = await handler({ request: makeRequest("/og/index.png") });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    );

    await handler({ request: makeRequest("/og/blog/hello.png") });
    expect(renderCount).toBe(2);
    expect(initYoga).toHaveBeenCalledTimes(1);
    expect(initWasm).toHaveBeenCalledTimes(1);
  });

  it("supports a custom cache", async () => {
    const store = new Map<string, Uint8Array>();
    const cache = {
      get: vi.fn(async (key: string) => store.get(key)),
      set: vi.fn(async (key: string, png: Uint8Array) => {
        store.set(key, png);
      }),
    };
    const config = { "/": () => ({ title: "Home" }) } as unknown as OgConfig;
    const handler = createOgHandler({ config, template: baseTemplate, wasm, cache });

    await handler({ request: makeRequest("/og/index.png") });
    await handler({ request: makeRequest("/og/index.png") });
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(cache.get).toHaveBeenCalledTimes(2);
  });
});
