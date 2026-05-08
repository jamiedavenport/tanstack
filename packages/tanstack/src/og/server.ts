import type { OgConfig, OgTemplateModule } from "./index";

export type CreateOgHandlerOptions = {
  config: OgConfig;
  template: OgTemplateModule;
  fallback?: (ctx: { request: Request }) => Response | Promise<Response>;
};

export type OgHandler = (ctx: { request: Request }) => Promise<Response>;

export function createOgHandler(_options: CreateOgHandlerOptions): OgHandler {
  return async ({ request: _request }) => {
    return new Response("TODO: render OG image (mock)", {
      status: 501,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  };
}
