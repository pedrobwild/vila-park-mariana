import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DrillDownSheet from "../DrillDownSheet";
import type { DrillItem } from "@/lib/crmAdvanced";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const deal: DrillItem = {
  tipo: "deal",
  id: "d-123",
  titulo: "Juliana Brito · studio",
  pessoa: "Juliana Brito",
  corretor: "Camila Ferraz",
  etapa: "Lead",
  valor_brl: 766000,
  atualizado_em: null,
};

const unit: DrillItem = {
  tipo: "unit",
  id: "u-1",
  code: "1003",
  area_m2: 38.6,
  andar: 10,
  face: "Nordeste",
  price_brl: 766000,
  status: "disponivel",
  interessados: 2,
};

function setup(items: DrillItem[], total = items.length) {
  const onOpenChange = vi.fn();
  render(
    <MemoryRouter>
      <DrillDownSheet
        open
        onOpenChange={onOpenChange}
        title="Lead"
        description="Negócios na etapa"
        items={items}
        total={total}
      />
    </MemoryRouter>,
  );
  return { onOpenChange };
}

describe("DrillDownSheet", () => {
  beforeEach(() => navigate.mockClear());

  it("navega para o negócio e fecha o Sheet ao clicar num item do tipo deal", () => {
    const { onOpenChange } = setup([deal]);
    fireEvent.click(screen.getByRole("button", { name: /Abrir o negócio/i }));
    expect(navigate).toHaveBeenCalledWith("/admin?m=crm&deal=d-123");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("navega para a unidade e fecha o Sheet ao clicar num item do tipo unit", () => {
    const { onOpenChange } = setup([unit]);
    fireEvent.click(screen.getByRole("button", { name: /Abrir a unidade/i }));
    expect(navigate).toHaveBeenCalledWith("/admin?u=1003");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("informa quando a lista está truncada", () => {
    setup([deal, unit], 120);
    expect(screen.getByText(/Mostrando 2 de 120 registros/i)).toBeInTheDocument();
  });

  it("mostra 'Mostrando 50 de N' com o teto de 50 itens devolvido pelo backend", () => {
    // o RPC crm_dashboard_advanced devolve no máximo 50 itens por agrupamento,
    // mas itens_total traz a contagem completa do bucket.
    const itens: DrillItem[] = Array.from({ length: 50 }, (_, i) => ({
      ...deal,
      id: `d-${i}`,
      titulo: `Negócio ${i}`,
    }));
    setup(itens, 137);
    expect(screen.getByText(/Mostrando 50 de 137 registros/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Abrir o negócio/i })).toHaveLength(50);
  });

  it("não mostra o rodapé quando todos os registros couberam na lista", () => {
    setup([deal, unit], 2);
    expect(screen.queryByText(/Mostrando \d+ de/i)).not.toBeInTheDocument();
  });


  it("mostra estado vazio quando não há registros", () => {
    setup([], 0);
    expect(screen.getByText(/Nenhum registro neste agrupamento/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Abrir/i })).not.toBeInTheDocument();
  });
});
