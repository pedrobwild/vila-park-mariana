import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MetasBlock, { type GoalsData } from "../MetasBlock";

function base(overrides: Partial<GoalsData> = {}): GoalsData {
  return {
    mes: "2026-07-01",
    dias: { total: 31, decorridos: 26, restantes: 5, uteis_restantes: 4 },
    equipe: {
      vgv_meta: 5_000_000,
      vgv_realizado: 1_605_000,
      vgv_pct: 32.1,
      unid_meta: 10,
      unid_realizado: 2,
      unid_pct: 20,
      vgv_projecao: 1_900_000,
      vgv_falta: 3_395_000,
      ritmo_vgv_dia_util: 848_750,
      ritmo_unid_semana: 4,
      vgv_mes_anterior: 900_000,
      unid_mes_anterior: 1,
      vgv_var_pct: 78.3,
    },
    por_corretor: [],
    historico: [],
    ...overrides,
  };
}

function renderBlock(data: GoalsData) {
  render(
    <MemoryRouter>
      <MetasBlock data={data} />
    </MemoryRouter>,
  );
}

describe("MetasBlock · tratamento de nulos", () => {
  it("mostra '—' nos termômetros quando o percentual vem nulo", () => {
    const d = base();
    d.equipe.vgv_pct = null;
    d.equipe.unid_pct = null;
    renderBlock(d);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Sem base de comparação/i).length).toBeGreaterThanOrEqual(2);
  });

  it("mostra '—' no ritmo por dia útil quando não há base", () => {
    const d = base();
    d.equipe.ritmo_vgv_dia_util = null;
    renderBlock(d);
    expect(screen.getByText(/Ritmo necessário por dia útil/i)).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("mostra 'Sem meta cadastrada' na tabela do corretor sem meta", () => {
    renderBlock(
      base({
        por_corretor: [
          {
            broker_id: "b1",
            corretor: "Camila Ferraz",
            equipe: null,
            vgv_meta: 0,
            vgv_realizado: 766_000,
            vgv_pct: null,
            unid_meta: 0,
            unid_realizado: 1,
            unid_pct: null,
            deals_ganhos: 1,
            deals_abertos: 3,
            vgv_aberto: 2_100_000,
          },
        ],
      }),
    );
    const linha = screen.getByText("Camila Ferraz").closest("tr")!;
    expect(within(linha).getByText(/Sem meta cadastrada/i)).toBeInTheDocument();
    expect(within(linha).getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("renderiza o histórico de 6 meses mesmo com meses sem meta cadastrada", () => {
    renderBlock(
      base({
        historico: [
          { mes: "2026-02-01", vgv_meta: null as unknown as number, unid_meta: 0, vgv_realizado: 500_000, unid_realizado: 1 },
          { mes: "2026-03-01", vgv_meta: 0, unid_meta: 0, vgv_realizado: 0, unid_realizado: 0 },
          { mes: "2026-04-01", vgv_meta: 4_000_000, unid_meta: 8, vgv_realizado: 3_100_000, unid_realizado: 5 },
        ],
      }),
    );
    expect(screen.getByText(/Meta e realizado de VGV nos últimos 6 meses/i)).toBeInTheDocument();
    // pelo menos um mês tem meta: não exibe o aviso de ausência total
    expect(screen.queryByText(/o gráfico mostra apenas o realizado/i)).not.toBeInTheDocument();
  });

  it("avisa quando nenhum mês do histórico tem meta cadastrada", () => {
    renderBlock(
      base({
        historico: [
          { mes: "2026-05-01", vgv_meta: null as unknown as number, unid_meta: 0, vgv_realizado: 0, unid_realizado: 0 },
          { mes: "2026-06-01", vgv_meta: 0, unid_meta: 0, vgv_realizado: 120_000, unid_realizado: 1 },
        ],
      }),
    );
    expect(screen.getByText(/o gráfico mostra apenas o realizado/i)).toBeInTheDocument();
  });

  it("ignora meses com data inválida no histórico sem quebrar", () => {
    renderBlock(
      base({
        historico: [
          { mes: "sem-data", vgv_meta: 1, unid_meta: 1, vgv_realizado: 1, unid_realizado: 1 },
          { mes: "2026-06-01", vgv_meta: 1_000_000, unid_meta: 2, vgv_realizado: 500_000, unid_realizado: 1 },
        ],
      }),
    );
    expect(screen.getByText(/Meta e realizado de VGV nos últimos 6 meses/i)).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
  });

  it("não quebra o título quando o mês de referência é inválido", () => {
    renderBlock(base({ mes: "" }));
    expect(screen.getByText(/mês não informado/i)).toBeInTheDocument();
  });
});
