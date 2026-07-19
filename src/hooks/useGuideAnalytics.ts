import { useRef, useCallback } from "react";

/**
 * Analytics leve, sem dependência de backend.
 * - Se houver GA/GTM instalado (window.dataLayer), empurra o evento — sem quebrar caso não exista.
 * - Em dev, loga no console para inspeção.
 * - Expõe também um `trackGlobal(type, data)` para uso fora de componentes React.
 *
 * IMPORTANTE: o funil ficou concentrado na Home (Guia do Comprador foi extinto).
 * Sempre inclua `location` (ex.: "home:hero", "guia-investidor:tese") para
 * segmentar origem sem depender da URL.
 */

type EventData = Record<string, unknown>;

function pushToDataLayer(eventType: string, data: EventData) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> };
  if (!Array.isArray(w.dataLayer)) return;
  w.dataLayer.push({ event: eventType, ...data });
}

function emit(eventType: string, data: EventData = {}) {
  const payload = { ts: Date.now(), ...data };
  pushToDataLayer(eventType, payload);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", eventType, payload);
  }
}

export function useGuideAnalytics() {
  const sessionId = useRef(crypto.randomUUID());

  const trackEvent = useCallback(
    (eventType: string, eventData: EventData = {}) => {
      emit(eventType, { session_id: sessionId.current, ...eventData });
    },
    []
  );

  return { trackEvent, sessionId: sessionId.current };
}

let globalTrack: ((type: string, data?: EventData) => void) | null = null;

export function setGlobalTrack(fn: typeof globalTrack) {
  globalTrack = fn;
}

export function trackGlobal(type: string, data?: EventData) {
  // Sempre emite (dataLayer + dev log), mesmo sem hook registrado.
  emit(type, data ?? {});
  globalTrack?.(type, data);
}
