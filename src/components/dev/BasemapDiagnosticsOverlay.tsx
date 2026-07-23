/**
 * In-app diagnostics overlay for the basemap subsystem.
 *
 * Toggle via any of:
 *   - URL query: `?basemap-debug=1` (persists to localStorage; use `?basemap-debug=0` to disable)
 *   - localStorage: `localStorage.setItem("basemap:debug", "1")`
 *   - Keyboard: Ctrl/Cmd + Shift + B
 *
 * Shows the last N structured `[basemap]` events plus current cached style
 * (primary vs. fallback). Meant for internal diagnostics — not user-facing.
 */
import { useEffect, useState } from "react";
import { MAP_STYLE_FALLBACK, MAP_STYLE_PRIMARY } from "@/lib/basemap";
import { BASEMAP_SESSION_ID, clearBasemapLog, getBasemapLog, subscribeBasemapLog, type BasemapLogEntry } from "@/lib/basemapLog";

const STORAGE_KEY = "basemap:debug";

function useDebugFlag(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("basemap-debug");
    if (q === "1") localStorage.setItem(STORAGE_KEY, "1");
    else if (q === "0") localStorage.removeItem(STORAGE_KEY);
    setEnabled(localStorage.getItem(STORAGE_KEY) === "1");

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "B" || e.key === "b")) {
        e.preventDefault();
        setEnabled((prev) => {
          const next = !prev;
          if (next) localStorage.setItem(STORAGE_KEY, "1");
          else localStorage.removeItem(STORAGE_KEY);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const set = (v: boolean) => {
    if (v) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
    setEnabled(v);
  };
  return [enabled, set];
}

const LEVEL_COLOR: Record<string, string> = {
  style_probe_start: "text-slate-400",
  style_probe_ok: "text-emerald-400",
  style_probe_fail: "text-amber-400",
  style_load_ok: "text-emerald-400",
  style_load_error: "text-red-400",
  tile_error: "text-amber-400",
  fallback_switch: "text-amber-400",
  map_load: "text-sky-400",
  map_idle_first: "text-sky-300",
  csp_violation: "text-red-500",
};

export default function BasemapDiagnosticsOverlay() {
  const [enabled, setEnabled] = useDebugFlag();
  const [entries, setEntries] = useState<BasemapLogEntry[]>(() => getBasemapLog());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setEntries(getBasemapLog());
    return subscribeBasemapLog(setEntries);
  }, [enabled]);

  if (!enabled) return null;

  const lastFallback = [...entries].reverse().find((e) => e.event === "fallback_switch");
  const status: "primary" | "fallback" | "unknown" = lastFallback
    ? "fallback"
    : entries.some((e) => e.event === "style_probe_ok" || e.event === "map_load")
      ? "primary"
      : "unknown";
  const activeStyle = status === "fallback" ? MAP_STYLE_FALLBACK : MAP_STYLE_PRIMARY;

  return (
    <div
      role="complementary"
      aria-label="Basemap diagnostics"
      className="fixed bottom-3 right-3 z-[9999] w-[min(420px,calc(100vw-1.5rem))] rounded-lg border border-slate-700 bg-slate-950/95 text-slate-100 font-mono text-[11px] shadow-2xl backdrop-blur-sm"
      style={{ fontFeatureSettings: '"tnum" 1' }}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              status === "primary" ? "bg-emerald-400" : status === "fallback" ? "bg-amber-400" : "bg-slate-500"
            }`}
            aria-hidden
          />
          <span className="font-sans text-xs font-semibold uppercase tracking-wide">Basemap · {status}</span>
          <span
            className="font-mono text-[10px] text-slate-400 truncate"
            title={`Session ID (this page load): ${BASEMAP_SESSION_ID}`}
          >
            #{BASEMAP_SESSION_ID}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded px-2 py-0.5 text-slate-300 hover:bg-slate-800"
            aria-label={collapsed ? "Expand diagnostics" : "Collapse diagnostics"}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <button
            type="button"
            onClick={clearBasemapLog}
            className="rounded px-2 py-0.5 text-slate-300 hover:bg-slate-800"
            aria-label="Clear log"
            title="Clear log"
          >
            clear
          </button>
          <button
            type="button"
            onClick={() => setEnabled(false)}
            className="rounded px-2 py-0.5 text-slate-300 hover:bg-slate-800"
            aria-label="Close diagnostics"
            title="Close (Ctrl/Cmd+Shift+B)"
          >
            ✕
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="p-3 space-y-2">
          <div className="text-slate-400">
            <div className="truncate">
              <span className="text-slate-500">style: </span>
              <span className="text-slate-200">{shortHost(activeStyle)}</span>
            </div>
            <div className="text-slate-500">
              events: {entries.length} · shortcut: Ctrl/Cmd+Shift+B
            </div>
          </div>

          <ul className="max-h-64 overflow-auto space-y-1 pr-1">
            {entries.length === 0 ? (
              <li className="text-slate-500 italic">no events yet — mount a map to populate</li>
            ) : (
              [...entries].reverse().map((e, i) => (
                <li key={i} className="border-t border-slate-800/60 pt-1 first:border-t-0 first:pt-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-slate-500">{e.ts.slice(11, 19)}</span>
                    <span className={LEVEL_COLOR[e.event] ?? "text-slate-200"}>{e.event}</span>
                    {e.component && <span className="text-slate-400">· {e.component}</span>}
                  </div>
                  {e.detail && (
                    <pre className="mt-0.5 whitespace-pre-wrap break-words text-slate-400 text-[10px] leading-snug">
                      {formatDetail(e.detail)}
                    </pre>
                  )}
                  {e.snapshots && e.snapshots.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {e.snapshots.map((s, si) => (
                        <div key={si} className="rounded border border-slate-800 bg-slate-950/60 p-1.5">
                          <div className="text-[10px] text-slate-400">
                            <span className="text-slate-200">{s.component}</span>
                            <span className="text-slate-500"> · z{s.camera.zoom} · {s.size.width}×{s.size.height}</span>
                            <span className="text-slate-500"> · style:{s.ready.styleLoaded ? "✓" : "✗"} tiles:{s.ready.sourcesLoaded ? "✓" : "✗"}</span>
                          </div>
                          {s.image ? (
                            <a
                              href={s.image}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block"
                              title="Open full-size snapshot"
                            >
                              <img
                                src={s.image}
                                alt={`${s.component} snapshot at ${e.ts}`}
                                className="w-full h-auto rounded border border-slate-800"
                                loading="lazy"
                              />
                            </a>
                          ) : (
                            <div className="mt-1 text-[10px] text-amber-300">
                              snapshot unavailable{s.imageError ? ` — ${s.imageError}` : ""}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function shortHost(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}

function formatDetail(detail: Record<string, unknown>): string {
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}
