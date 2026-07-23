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

export interface BasemapSnapshot {
  /** Component name of the map instance sampled. */
  component: string;
  /** Truncated style URL currently applied to this map. */
  style?: string;
  /** Container size in CSS pixels. */
  size: { width: number; height: number };
  /** Camera state at capture time. */
  camera: { lng: number; lat: number; zoom: number; bearing: number; pitch: number };
  /** Style / data readiness flags. */
  ready: { styleLoaded: boolean; loaded: boolean; sourcesLoaded: boolean };
  /** Downscaled JPEG data URL. Undefined when capture fails (no WebGL buffer, tainted canvas). */
  image?: string;
  /** Reason capture was skipped (only present when image is undefined). */
  imageError?: string;
}

export interface BasemapLogEntry {
  ts: string;
  /** Correlation ID — one per page load. Every entry from the same load shares this value. */
  sessionId: string;
  event: BasemapEvent;
  component?: string;
  style?: string;
  detail?: Record<string, unknown>;
  /** Auto-attached snapshots for `fallback_switch` / `csp_violation` events. */
  snapshots?: BasemapSnapshot[];
}

/**
 * Per-page-load correlation ID. Regenerated on each JS execution (reload,
 * hard nav) so every style/tile event for one load attempt shares an ID.
 * Prefer `crypto.randomUUID` when available; fall back to a compact base36 id.
 */
function makeSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().slice(0, 8);
    }
  } catch {
    /* ignore */
  }
  return Math.random().toString(36).slice(2, 10);
}

export const BASEMAP_SESSION_ID = makeSessionId();

export function getBasemapSessionId(): string {
  return BASEMAP_SESSION_ID;
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

const RING_MAX = 100;
const ring: BasemapLogEntry[] = [];
const listeners = new Set<(entries: BasemapLogEntry[]) => void>();

export function getBasemapLog(): BasemapLogEntry[] {
  return ring.slice();
}

export function subscribeBasemapLog(fn: (entries: BasemapLogEntry[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function clearBasemapLog(): void {
  ring.length = 0;
  listeners.forEach((fn) => fn(ring.slice()));
}

export function logBasemap(entry: Omit<BasemapLogEntry, "ts" | "sessionId"> & { sessionId?: string }): void {
  const payload: BasemapLogEntry = {
    ...entry,
    ts: new Date().toISOString(),
    sessionId: entry.sessionId ?? BASEMAP_SESSION_ID,
    style: shortStyle(entry.style),
    detail: entry.detail?.error
      ? { ...entry.detail, error: serializeError(entry.detail.error) }
      : entry.detail,
  };
  ring.push(payload);
  if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
  listeners.forEach((fn) => fn(ring.slice()));
  if (typeof console === "undefined") return;
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
