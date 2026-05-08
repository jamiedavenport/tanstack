import type { ReactNode } from "react";
import type { FileRoutesByPath } from "@tanstack/react-router";

export interface OgData {
  title: string;
  description?: string;
  type?: "website" | "article";
  image?: string;
  author?: string;
  date?: string;
  tag?: string;
}

export type OgConfigContext<TParams> = {
  params: TParams;
  request: Request;
};

export const ignoreOg: unique symbol = Symbol("@jxdltd/tanstack/og/ignore");
export type IgnoreOg = typeof ignoreOg;

export type OgConfigEntry<TParams = Record<string, string>> = (
  ctx: OgConfigContext<TParams>,
) => OgData | IgnoreOg | Promise<OgData | IgnoreOg>;

type ParamName<S> = S extends `$${infer Name}` ? (Name extends "" ? "_splat" : Name) : never;

type ParamNames<P extends string> = P extends `${infer Head}/${infer Rest}`
  ? ParamName<Head> | ParamNames<Rest>
  : ParamName<P>;

export type RouteParams<P extends string> = [ParamNames<P>] extends [never]
  ? Record<string, never>
  : { [K in ParamNames<P>]: string };

export type OgConfig = {
  [P in keyof FileRoutesByPath]: OgConfigEntry<RouteParams<P & string>>;
};

export function defineOgConfig(config: OgConfig): OgConfig {
  return config;
}

export type OgFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type OgTemplateFont = {
  name: string;
  data: ArrayBuffer | Uint8Array;
  weight?: OgFontWeight;
  style?: "normal" | "italic";
};

export type OgTemplateRouteInfo = {
  path: string;
  fullPath: string;
  params: Record<string, string>;
};

export type OgTemplateContext = {
  data: OgData;
  route: OgTemplateRouteInfo;
  request: Request;
};

export type OgTemplateModule = {
  width: number;
  height: number;
  fonts: OgTemplateFont[];
  render: (ctx: OgTemplateContext) => ReactNode | Promise<ReactNode>;
};

export function defineOgTemplate(spec: OgTemplateModule): OgTemplateModule {
  return spec;
}

export function fromHead(): OgConfigEntry {
  return () => ({
    title: "TODO: derive from head()",
    description: "TODO: derive from head()",
  });
}
