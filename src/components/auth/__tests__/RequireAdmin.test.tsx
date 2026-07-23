import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

type Role = "admin" | "incorporadora" | null;
const state: { session: unknown; role: Role; loading: boolean } = {
  session: null,
  role: null,
  loading: false,
};

vi.mock("@/hooks/useIsAdmin", () => ({
  useRole: () => state,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

import RequireAdmin from "@/components/auth/RequireAdmin";

function renderAt(path: string, ui: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin" element={<div>admin-home</div>} />
        <Route path="/login" element={<div>login-page</div>} />
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  state.session = null;
  state.role = null;
  state.loading = false;
});

describe("RequireAdmin", () => {
  it("mostra loading enquanto resolve o papel", () => {
    state.loading = true;
    renderAt(
      "/admin/upload",
      <RequireAdmin>
        <div>protegido</div>
      </RequireAdmin>,
    );
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it("redireciona para /login quando não há sessão", async () => {
    renderAt(
      "/admin/upload",
      <RequireAdmin>
        <div>protegido</div>
      </RequireAdmin>,
    );
    await waitFor(() => expect(screen.getByText("login-page")).toBeInTheDocument());
  });

  it("libera acesso a staff (admin) no modo padrão", () => {
    state.session = { user: { email: "a@x" } };
    state.role = "admin";
    renderAt(
      "/admin/units",
      <RequireAdmin>
        <div>conteudo-admin</div>
      </RequireAdmin>,
    );
    expect(screen.getByText("conteudo-admin")).toBeInTheDocument();
  });

  it("libera acesso a staff (incorporadora) no modo padrão", () => {
    state.session = { user: { email: "i@x" } };
    state.role = "incorporadora";
    renderAt(
      "/admin/units",
      <RequireAdmin>
        <div>conteudo-staff</div>
      </RequireAdmin>,
    );
    expect(screen.getByText("conteudo-staff")).toBeInTheDocument();
  });

  it("bewildOnly libera 'admin'", () => {
    state.session = { user: { email: "a@x" } };
    state.role = "admin";
    renderAt(
      "/admin/upload",
      <RequireAdmin bewildOnly>
        <div>conteudo-bewild</div>
      </RequireAdmin>,
    );
    expect(screen.getByText("conteudo-bewild")).toBeInTheDocument();
  });

  it("bewildOnly redireciona incorporadora para /admin silenciosamente", async () => {
    state.session = { user: { email: "i@x" } };
    state.role = "incorporadora";
    renderAt(
      "/admin/upload",
      <RequireAdmin bewildOnly>
        <div>nao-deveria-aparecer</div>
      </RequireAdmin>,
    );
    await waitFor(() => expect(screen.getByText("admin-home")).toBeInTheDocument());
    expect(screen.queryByText("nao-deveria-aparecer")).not.toBeInTheDocument();
  });

  it("mostra tela de acesso restrito para usuário logado sem papel staff", () => {
    state.session = { user: { email: "u@x" } };
    state.role = null;
    renderAt(
      "/admin",
      <RequireAdmin>
        <div>protegido</div>
      </RequireAdmin>,
    );
    expect(screen.getByText(/acesso restrito/i)).toBeInTheDocument();
    expect(screen.queryByText("protegido")).not.toBeInTheDocument();
  });
});
