import { useRef, useCallback } from "react";

export function useGuideAnalytics() {
  const sessionId = useRef(crypto.randomUUID());

  const trackEvent = useCallback(
    (eventType: string, _eventData: Record<string, unknown> = {}) => {
      // No-op: analytics disabled without Supabase
      if (import.meta.env.DEV) {
        console.debug("[analytics]", eventType);
      }
    },
    []
  );

  return { trackEvent, sessionId: sessionId.current };
}

let globalTrack: ((type: string, data?: Record<string, unknown>) => void) | null = null;

export function setGlobalTrack(fn: typeof globalTrack) {
  globalTrack = fn;
}

export function trackGlobal(type: string, data?: Record<string, unknown>) {
  globalTrack?.(type, data);
}
