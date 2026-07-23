import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { type CreateOgHandlerBaseOptions, createOgHandlerCore } from "./core";
import type { OgHandler } from "./core";

export type CreateOgHandlerOptions = CreateOgHandlerBaseOptions;
export type { OgCache, OgHandler } from "./core";

type SatoriParams = Parameters<typeof satori>;

export function createOgHandler(options: CreateOgHandlerOptions): OgHandler {
  return createOgHandlerCore({
    ...options,
    renderSvg: ({ node, width, height, fonts }) =>
      satori(node as SatoriParams[0], {
        width,
        height,
        fonts: fonts as unknown as SatoriParams[1]["fonts"],
      }),
    svgToPng: (svg) => new Uint8Array(new Resvg(svg).render().asPng()),
  });
}
