import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackGlobal, useGuideAnalytics, setGlobalTrack } from "@/hooks/useGuideAnalytics";
import { renderHook, act } from "@testing-library/react";

declare global {
  // eslint-disable-next-line no-var
  var dataLayer: Array<Record<string, unknown>> | undefined;
}

describe("analytics tracking", () => {
  beforeEach(() => {
    (window as unknown as { dataLayer: unknown[] }).dataLayer = [];
    setGlobalTrack(null);
  });

  it("trackGlobal empurra evento no window.dataLayer com type + data", () => {
    trackGlobal("cta_click", { id: "hero_ctaPrimary", target: "#tipologias", location: "home:hero" });
    const dl = (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer;
    expect(dl).toHaveLength(1);
    expect(dl[0]).toMatchObject({
      event: "cta_click",
      id: "hero_ctaPrimary",
      target: "#tipologias",
      location: "home:hero",
    });
    expect(typeof dl[0].ts).toBe("number");
  });

  it("trackGlobal invoca handler global quando registrado", () => {
    const spy = vi.fn();
    setGlobalTrack(spy);
    trackGlobal("cta_click", { id: "sticky_reserva" });
    expect(spy).toHaveBeenCalledWith("cta_click", { id: "sticky_reserva" });
  });

  it("useGuideAnalytics.trackEvent inclui session_id no payload", () => {
    const { result } = renderHook(() => useGuideAnalytics());
    act(() => result.current.trackEvent("form_submit", { form: "reserva" }));
    const dl = (window as unknown as { dataLayer: Array<Record<string, unknown>> }).dataLayer;
    expect(dl[0]).toMatchObject({
      event: "form_submit",
      form: "reserva",
      session_id: result.current.sessionId,
    });
  });

  it("não quebra quando window.dataLayer não existe", () => {
    delete (window as unknown as { dataLayer?: unknown }).dataLayer;
    expect(() => trackGlobal("cta_click", { id: "x" })).not.toThrow();
  });
});
