/**
 * Basemap único do projeto.
 * Primário: OpenFreeMap Positron (keyless, produção permitida, visual claro/minimal).
 * Fallback: CARTO Positron (também keyless) caso OpenFreeMap indisponível.
 */
import { useEffect, useState } from "react";

export const MAP_STYLE_PRIMARY = "https://tiles.openfreemap.org/styles/positron";
export const MAP_STYLE_FALLBACK = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Compat: manter export legado usado por componentes existentes.
export const MAP_STYLE = MAP_STYLE_PRIMARY;

type Status = "checking" | "primary" | "fallback";

// Cache em módulo para não repetir o probe entre montagens.
let cachedStyle: string | null = null;
let inflight: Promise<string> | null = null;

async function probeStyle(): Promise<string> {
  if (cachedStyle) return cachedStyle;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(MAP_STYLE_PRIMARY, {
        method: "GET",
        signal: controller.signal,
        cache: "force-cache",
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`status ${res.status}`);
      // valida JSON minimamente
      const json = await res.json();
      if (!json || typeof json !== "object" || !("sources" in json)) {
        throw new Error("invalid style json");
      }
      cachedStyle = MAP_STYLE_PRIMARY;
    } catch (err) {
      if (typeof console !== "undefined") {
        console.warn("[basemap] OpenFreeMap indisponível, usando CARTO Positron.", err);
      }
      cachedStyle = MAP_STYLE_FALLBACK;
    }
    return cachedStyle!;
  })();

  return inflight;
}

/**
 * Hook: retorna a URL do basemap com fallback automático.
 * - Começa otimista no primário; se o probe indicar indisponibilidade, troca para o fallback.
 * - Também troca em caso de erro do próprio MapLibre (via `notifyMapStyleError`).
 */
export function useBasemapStyle(): { style: string; status: Status; onError: () => void } {
  const [style, setStyle] = useState<string>(cachedStyle ?? MAP_STYLE_PRIMARY);
  const [status, setStatus] = useState<Status>(cachedStyle ? (cachedStyle === MAP_STYLE_PRIMARY ? "primary" : "fallback") : "checking");

  useEffect(() => {
    let alive = true;
    probeStyle().then((s) => {
      if (!alive) return;
      setStyle(s);
      setStatus(s === MAP_STYLE_PRIMARY ? "primary" : "fallback");
    });
    return () => {
      alive = false;
    };
  }, []);

  const onError = () => {
    if (cachedStyle === MAP_STYLE_FALLBACK) return;
    cachedStyle = MAP_STYLE_FALLBACK;
    setStyle(MAP_STYLE_FALLBACK);
    setStatus("fallback");
    if (typeof console !== "undefined") {
      console.warn("[basemap] Erro ao renderizar OpenFreeMap; alternando para CARTO Positron.");
    }
  };

  return { style, status, onError };
}
