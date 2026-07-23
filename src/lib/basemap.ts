/**
 * Basemap único do projeto.
 * Primário: MapTiler Streets Light — chave pública do projeto.
 * Para trocar por chave própria: crie uma chave gratuita em cloud.maptiler.com
 * e substitua MAPTILER_KEY abaixo.
 */
import { useEffect, useState } from "react";

export const MAPTILER_KEY = "AI17dHeoeJx6rUC1KlSL";
export const MAP_STYLE_PRIMARY = `https://api.maptiler.com/maps/streets-v2-light/style.json?key=${MAPTILER_KEY}`;
export const MAP_STYLE_FALLBACK = `https://api.maptiler.com/maps/dataviz-light/style.json?key=${MAPTILER_KEY}`;

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
        console.warn("[basemap] MapTiler Streets Light indisponível, usando MapTiler Dataviz Light.", err);
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
      console.warn("[basemap] Erro ao renderizar MapTiler Streets Light; alternando para MapTiler Dataviz Light.");
    }
  };

  return { style, status, onError };
}

/**
 * Contraste do basemap para overlays (anéis, rótulos, linhas).
 * - Deriva um tema inicial ("light" | "dark") a partir da URL do estilo.
 *   Positron (OpenFreeMap e CARTO) são claros → tema "light".
 * - Após o mapa carregar, amostra a luminância média do canvas para confirmar
 *   e reage caso o estilo mude (ex.: Positron atualize sua paleta).
 *
 * Uso:
 *   const contrast = useBasemapContrast(mapRef, style);
 *   contrast.ringMain   → cor principal dos anéis (alto contraste vs. mapa)
 *   contrast.ringHalo   → cor do halo (contra-cor, garante legibilidade)
 *   contrast.labelBg    → fundo dos chips de rótulo
 *   contrast.labelFg    → texto dos chips
 */
export type BasemapTheme = "light" | "dark";

export interface BasemapContrast {
  theme: BasemapTheme;
  ringMain: string;
  ringHalo: string;
  ringMainOpacity: number;
  ringHaloOpacity: number;
  labelBg: string;
  labelFg: string;
}

function themeFromStyleUrl(url: string): BasemapTheme {
  // Ambos os basemaps atuais são "light". Deixe explícito para
  // facilitar troca futura por estilos escuros (dark-matter, streets-dark, etc.).
  const u = url.toLowerCase();
  if (u.includes("dark") || u.includes("matter") || u.includes("night")) return "dark";
  return "light";
}

function contrastFor(theme: BasemapTheme): BasemapContrast {
  if (theme === "dark") {
    return {
      theme,
      // Linha clara sobre fundo escuro
      ringMain: "hsl(0, 0%, 100%)",
      ringHalo: "hsl(0, 0%, 0%)",
      ringMainOpacity: 0.9,
      ringHaloOpacity: 0.55,
      labelBg: "rgba(15, 20, 30, 0.82)",
      labelFg: "hsl(0, 0%, 96%)",
    };
  }
  return {
    theme,
    // Linha escura sobre fundo claro, com halo branco para blindar contraste
    ringMain: "hsl(215, 30%, 15%)",
    ringHalo: "hsl(0, 0%, 100%)",
    ringMainOpacity: 0.75,
    ringHaloOpacity: 0.85,
    labelBg: "rgba(255, 255, 255, 0.88)",
    labelFg: "hsl(215, 30%, 15%)",
  };
}

function sampleCanvasLuminance(canvas: HTMLCanvasElement): number | null {
  try {
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return null;
    const w = Math.min(canvas.width, 64);
    const h = Math.min(canvas.height, 64);
    const x = Math.floor((canvas.width - w) / 2);
    const y = Math.floor((canvas.height - h) / 2);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let sum = 0;
    let n = 0;
    for (let i = 0; i < px.length; i += 4) {
      // Relative luminance sRGB (aprox.)
      const r = px[i] / 255;
      const g = px[i + 1] / 255;
      const b = px[i + 2] / 255;
      sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      n++;
    }
    return n ? sum / n : null;
  } catch {
    return null;
  }
}

export function useBasemapContrast(
  mapRef: { current: { getMap?: () => any } | null } | null,
  styleUrl: string,
): BasemapContrast {
  const [theme, setTheme] = useState<BasemapTheme>(() => themeFromStyleUrl(styleUrl));

  // Reset baseado na URL do estilo (troca primário↔fallback ou runtime change)
  useEffect(() => {
    setTheme(themeFromStyleUrl(styleUrl));
  }, [styleUrl]);

  // Confirma via amostragem de luminância quando o mapa fica ocioso
  useEffect(() => {
    const map = mapRef?.current?.getMap?.();
    if (!map) return;
    let cancelled = false;

    const check = () => {
      if (cancelled) return;
      const canvas: HTMLCanvasElement | undefined = map.getCanvas?.();
      if (!canvas) return;
      const lum = sampleCanvasLuminance(canvas);
      if (lum == null) return;
      // Thresholds com histerese para evitar flicker
      if (lum < 0.35) setTheme((t) => (t === "dark" ? t : "dark"));
      else if (lum > 0.55) setTheme((t) => (t === "light" ? t : "light"));
    };

    map.on?.("idle", check);
    map.on?.("styledata", check);
    // primeira verificação após um tick
    const t = setTimeout(check, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
      map.off?.("idle", check);
      map.off?.("styledata", check);
    };
  }, [mapRef, styleUrl]);

  return contrastFor(theme);
}
