import { Resvg, initWasm } from "@resvg/resvg-wasm";
import satori, { init as initYoga } from "satori/standalone";
import { type CreateOgHandlerBaseOptions, createOgHandlerCore } from "./core";
import type { OgHandler } from "./core";

/**
 * Wasm binaries required by the edge renderer. Each accepts a
 * `WebAssembly.Module`, raw bytes, a `Response`, or a promise of any of those.
 * Typically `import yoga from "satori/yoga.wasm"` and
 * `import resvg from "@resvg/resvg-wasm/index_bg.wasm"`.
 */
export type OgEdgeWasm = {
  yoga: Parameters<typeof initYoga>[0];
  resvg: Parameters<typeof initWasm>[0];
};

export type CreateOgHandlerOptions = CreateOgHandlerBaseOptions & {
  wasm: OgEdgeWasm;
};

export type { OgCache, OgHandler } from "./core";

type SatoriParams = Parameters<typeof satori>;

// Both satori and resvg-wasm initialize global wasm state exactly once per
// isolate, so the init promise is module-level: the first handler's wasm wins.
let wasmReady: Promise<void> | undefined;

function ensureWasm(wasm: OgEdgeWasm): Promise<void> {
  if (!wasmReady) {
    wasmReady = Promise.all([initYoga(wasm.yoga), initWasm(wasm.resvg)]).then(
      () => undefined,
      (err) => {
        wasmReady = undefined;
        throw err;
      },
    );
  }
  return wasmReady;
}

/**
 * Wasm-only variant of `createOgHandler` for Cloudflare Workers, Vercel Edge,
 * Deno Deploy, and similar runtimes. Same behavior as
 * `@jxdltd/tanstack/og/server`, but renders with `satori/standalone` and
 * `@resvg/resvg-wasm`, initialized lazily on the first matching request.
 */
export function createOgHandler(options: CreateOgHandlerOptions): OgHandler {
  const { wasm, ...rest } = options;
  return createOgHandlerCore({
    ...rest,
    renderSvg: async ({ node, width, height, fonts }) => {
      await ensureWasm(wasm);
      return satori(node as SatoriParams[0], {
        width,
        height,
        fonts: fonts as unknown as SatoriParams[1]["fonts"],
      });
    },
    svgToPng: async (svg) => {
      await ensureWasm(wasm);
      return new Uint8Array(new Resvg(svg).render().asPng());
    },
  });
}
