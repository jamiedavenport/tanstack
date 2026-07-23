import type { OgConfig } from "./index";

export type MatchResult = { key: string; params: Record<string, string> };

export function matchConfigKey(routePart: string, config: OgConfig): MatchResult | null {
  const target = "/" + routePart;
  const keys = Object.keys(config);

  if (routePart === "" || routePart === "index") {
    if (keys.includes("/")) {
      return { key: "/", params: {} };
    }
  }

  if (keys.includes(target)) {
    return { key: target, params: {} };
  }
  const targetSlash = target.endsWith("/") ? target : target + "/";
  if (keys.includes(targetSlash)) {
    return { key: targetSlash, params: {} };
  }

  for (const key of keys) {
    if (!key.includes("$")) {
      continue;
    }
    const params = matchPath(key, target);
    if (params) {
      return { key, params };
    }
  }
  return null;
}

function matchPath(pattern: string, target: string): Record<string, string> | null {
  const patternSegs = pattern.split("/").filter(Boolean);
  const targetSegs = target.split("/").filter(Boolean);

  const splatIdx = patternSegs.findIndex((s) => s === "$");
  if (splatIdx !== -1) {
    if (targetSegs.length < splatIdx) {
      return null;
    }
    const matched: Record<string, string> = {};
    for (let i = 0; i < splatIdx; i++) {
      const p = patternSegs[i]!;
      const t = targetSegs[i]!;
      if (p.startsWith("$")) {
        matched[p.slice(1)] = decodeURIComponent(t);
      } else if (p !== t) {
        return null;
      }
    }
    matched._splat = targetSegs
      .slice(splatIdx)
      .map((s) => decodeURIComponent(s))
      .join("/");
    return matched;
  }

  if (patternSegs.length !== targetSegs.length) {
    return null;
  }
  const matched: Record<string, string> = {};
  for (let i = 0; i < patternSegs.length; i++) {
    const p = patternSegs[i]!;
    const t = targetSegs[i]!;
    if (p.startsWith("$")) {
      matched[p.slice(1)] = decodeURIComponent(t);
    } else if (p !== t) {
      return null;
    }
  }
  return matched;
}
