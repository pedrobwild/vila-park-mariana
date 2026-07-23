import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

type Role = "admin" | "incorporadora" | null;

// Estado controlado pelos testes: sessão atual e role retornado pela query.
const state: { session: { user: { id: string } } | null; role: Role } = {
  session: null,
  role: null,
};
const authListeners: Array<(ev: string, s: typeof state.session) => void> = [];

vi.mock("@/integrations/supabase/client", () => {
  const from = vi.fn(() => ({
    select: () => ({
      eq: () => ({
        in: () => ({
          maybeSingle: async () =>
            state.role ? { data: { role: state.role }, error: null } : { data: null, error: null },
        }),
      }),
    }),
  }));
  return {
    supabase: {
      from,
      auth: {
        getSession: async () => ({ data: { session: state.session } }),
        onAuthStateChange: (cb: (ev: string, s: typeof state.session) => void) => {
          authListeners.push(cb);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
      },
    },
  };
});

import { useRole, useIsAdmin } from "@/hooks/useIsAdmin";

beforeEach(() => {
  state.session = null;
  state.role = null;
  authListeners.length = 0;
});

describe("useRole", () => {
  it("retorna role=null quando não há sessão", async () => {
    const { result } = renderHook(() => useRole());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("resolve role='admin' para usuário admin", async () => {
    state.session = { user: { id: "u-admin" } };
    state.role = "admin";
    const { result } = renderHook(() => useRole());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe("admin");
  });

  it("resolve role='incorporadora' para usuário incorporadora", async () => {
    state.session = { user: { id: "u-inc" } };
    state.role = "incorporadora";
    const { result } = renderHook(() => useRole());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe("incorporadora");
  });

  it("retorna role=null quando usuário autenticado não tem papel staff", async () => {
    state.session = { user: { id: "u-plain" } };
    state.role = null;
    const { result } = renderHook(() => useRole());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
  });
});

describe("useIsAdmin (compat)", () => {
  it("isAdmin=true para role 'admin'", async () => {
    state.session = { user: { id: "u-admin" } };
    state.role = "admin";
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.role).toBe("admin");
  });

  it("isAdmin=true para role 'incorporadora' (staff)", async () => {
    state.session = { user: { id: "u-inc" } };
    state.role = "incorporadora";
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.role).toBe("incorporadora");
  });

  it("isAdmin=false quando não há papel staff", async () => {
    state.session = { user: { id: "u-plain" } };
    state.role = null;
    const { result } = renderHook(() => useIsAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });
});
