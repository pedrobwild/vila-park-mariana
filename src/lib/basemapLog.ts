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

/**
 * Registry of live map instances. Populated by each map component on `load`
 * and cleared on unmount. Used to auto-attach snapshots to `fallback_switch`
 * and `csp_violation` log entries.
 *
 * We keep the type loose (`any`) to avoid coupling the log module to a
 * specific MapLibre/react-map-gl version.
 */
type MapLike = {
  getCanvas: () => HTMLCanvasElement;
  getContainer: () => HTMLElement;
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  getBearing: () => number;
  getPitch: () => number;
  isStyleLoaded?: () => boolean;
  loaded?: () => boolean;
  areTilesLoaded?: () => boolean;
  getStyle?: () => { sprite?: unknown; glyphs?: unknown } | undefined;
  triggerRepaint?: () => void;
};
const mapRegistry = new Map<string, { map: MapLike; style?: string }>();

export function registerBasemapMap(component: string, map: MapLike, style?: string): void {
  mapRegistry.set(component, { map, style });
}

export function unregisterBasemapMap(component: string): void {
  mapRegistry.delete(component);
}

const SNAPSHOT_MAX_WIDTH = 480;
const SNAPSHOT_QUALITY = 0.6;

export function captureBasemapSnapshots(): BasemapSnapshot[] {
  const out: BasemapSnapshot[] = [];
  for (const [component, { map, style }] of mapRegistry) {
    let snap: BasemapSnapshot;
    try {
      const canvas = map.getCanvas();
      const container = map.getContainer();
      const center = map.getCenter();
      snap = {
        component,
        style: shortStyle(style),
        size: { width: container.clientWidth, height: container.clientHeight },
        camera: {
          lng: +center.lng.toFixed(6),
          lat: +center.lat.toFixed(6),
          zoom: +map.getZoom().toFixed(2),
          bearing: +map.getBearing().toFixed(1),
          pitch: +map.getPitch().toFixed(1),
        },
        ready: {
          styleLoaded: !!map.isStyleLoaded?.(),
          loaded: !!map.loaded?.(),
          sourcesLoaded: !!map.areTilesLoaded?.(),
        },
      };
      try {
        // Force a synchronous repaint so the drawing buffer contains the
        // current frame before we sample it. Requires `preserveDrawingBuffer`
        // at map construction — otherwise the buffer is cleared post-swap
        // and toDataURL returns a blank image.
        map.triggerRepaint?.();
        const scale = Math.min(1, SNAPSHOT_MAX_WIDTH / Math.max(1, canvas.width));
        if (scale < 1) {
          const off = document.createElement("canvas");
          off.width = Math.round(canvas.width * scale);
          off.height = Math.round(canvas.height * scale);
          const ctx = off.getContext("2d");
          if (ctx) {
            ctx.drawImage(canvas, 0, 0, off.width, off.height);
            snap.image = off.toDataURL("image/jpeg", SNAPSHOT_QUALITY);
          } else {
            snap.imageError = "no_2d_context";
          }
        } else {
          snap.image = canvas.toDataURL("image/jpeg", SNAPSHOT_QUALITY);
        }
      } catch (err) {
        snap.imageError = err instanceof Error ? err.message : String(err);
      }
    } catch (err) {
      snap = {
        component,
        style: shortStyle(style),
        size: { width: 0, height: 0 },
        camera: { lng: 0, lat: 0, zoom: 0, bearing: 0, pitch: 0 },
        ready: { styleLoaded: false, loaded: false, sourcesLoaded: false },
        imageError: err instanceof Error ? err.message : String(err),
      };
    }
    out.push(snap);
  }
  return out;
}

const SNAPSHOT_EVENTS: ReadonlySet<BasemapEvent> = new Set(["fallback_switch", "csp_violation"]);

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
  if (SNAPSHOT_EVENTS.has(entry.event) && !payload.snapshots && mapRegistry.size > 0) {
    try {
      payload.snapshots = captureBasemapSnapshots();
    } catch {
      /* capture is best-effort — never let it break logging */
    }
  }
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
