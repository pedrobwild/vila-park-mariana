/**
 * Structured logging for basemap style + tile lifecycle.
 * All events share a common envelope so they are trivially greppable and can
 * be forwarded to analytics or a remote sink later without changing call sites.
 *
 *   [basemap] <event> { ...fields }
 *
 * Common fields:
 *   ts        — ISO timestamp
 *   event     — enum below
 *   component — which map mounted the event (optional)
 *   style     — style URL involved (host truncated for readability)
 *   detail    — free-form structured extras
 */

export type BasemapEvent =
  | "style_probe_start"
  | "style_probe_ok"
  | "style_probe_fail"
  | "style_load_error"
  | "style_load_ok"
  | "tile_error"
  | "fallback_switch"
  | "map_load"
  | "map_idle_first"
  | "csp_violation";

export interface BasemapLogEntry {
  ts: string;
  event: BasemapEvent;
  component?: string;
  style?: string;
  detail?: Record<string, unknown>;
}

const LEVEL: Record<BasemapEvent, "info" | "warn" | "error"> = {
  style_probe_start: "info",
  style_probe_ok: "info",
  style_probe_fail: "warn",
  style_load_error: "error",
  style_load_ok: "info",
  tile_error: "warn",
  fallback_switch: "warn",
  map_load: "info",
  map_idle_first: "info",
  csp_violation: "error",
};

function shortStyle(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}

function serializeError(err: unknown): Record<string, unknown> | undefined {
  if (err == null) return undefined;
  if (typeof err !== "object") return { value: String(err) };
  const e = err as {
    message?: string;
    name?: string;
    error?: { message?: string; status?: number; name?: string };
    status?: number;
    sourceId?: string;
    tile?: { z?: number; x?: number; y?: number };
    url?: string;
  };
  return {
    name: e.name ?? e.error?.name,
    message: e.message ?? e.error?.message,
    status: e.status ?? e.error?.status,
    sourceId: e.sourceId,
    tile: e.tile ? { z: e.tile.z, x: e.tile.x, y: e.tile.y } : undefined,
    url: shortStyle(e.url),
  };
}

export function logBasemap(entry: Omit<BasemapLogEntry, "ts">): void {
  if (typeof console === "undefined") return;
  const payload: BasemapLogEntry = {
    ts: new Date().toISOString(),
    ...entry,
    style: shortStyle(entry.style),
    detail: entry.detail?.error
      ? { ...entry.detail, error: serializeError(entry.detail.error) }
      : entry.detail,
  };
  const method =
    LEVEL[entry.event] === "error"
      ? console.error
      : LEVEL[entry.event] === "warn"
        ? console.warn
        : console.info;
  method.call(console, `[basemap] ${entry.event}`, payload);
}

/**
 * Install a global CSP violation listener that reports blocks affecting
 * basemap-related origins. Idempotent — safe to call from multiple mounts.
 */
let cspInstalled = false;
const BASEMAP_HOSTS = ["maptiler.com", "openfreemap.org", "cartocdn.com", "openstreetmap.org"];

export function installBasemapCspReporter(): void {
  if (cspInstalled) return;
  if (typeof document === "undefined") return;
  cspInstalled = true;
  document.addEventListener("securitypolicyviolation", (e) => {
    const target = (e.blockedURI || "").toLowerCase();
    if (!BASEMAP_HOSTS.some((h) => target.includes(h))) return;
    logBasemap({
      event: "csp_violation",
      detail: {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        effectiveDirective: e.effectiveDirective,
        disposition: e.disposition,
        documentURI: e.documentURI,
      },
    });
  });
}
