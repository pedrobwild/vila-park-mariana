/**
 * Modo "busca" do simulador de financiamento (seção inicial de /ferramentas):
 * quem ainda procura imóvel informa empreendimento, bairro e metragem no lugar
 * da lista de unidades do Vila Park. O cálculo continua o mesmo.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  useFinancingSimulatorController,
  FinancingSimulatorForm,
  FinancingSimulatorResults,
  descricaoImovelBuscado,
  parseMetragem,
  type FinancingSimulatorController,
  type ModoImovel,
  type SimulatorInitialForm,
} from "@/components/ferramentas/FinancingSimulator";
import { registrarSimulacaoBusca } from "@/lib/demandaBusca";

vi.mock("@/lib/demandaBusca", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/demandaBusca")>();
  return { ...real, registrarSimulacaoBusca: vi.fn(async () => true) };
});

class ROMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver ?? ROMock;
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

const BASE: SimulatorInitialForm = {
  bankId: "caixa-sbpe",
  propertyValue: 600_000,
  downOverride: 150_000,
  termMonths: 360,
  rateInput: "11,19",
  system: "SAC",
  buyerAge: 35,
  monthlyIncome: 20_000,
};

function Harness({
  modo,
  idPrefix,
  initialForm = BASE,
  onCtl,
}: {
  modo: ModoImovel;
  idPrefix?: string;
  initialForm?: SimulatorInitialForm;
  onCtl: (c: FinancingSimulatorController) => void;
}) {
  const ctl = useFinancingSimulatorController({ persist: false, modo, idPrefix, initialForm });
  onCtl(ctl);
  return (
    <>
      <FinancingSimulatorForm ctl={ctl} />
      <FinancingSimulatorResults ctl={ctl} />
    </>
  );
}

async function gerar(ctlRef: { current: FinancingSimulatorController | null }) {
  await act(async () => {
    ctlRef.current!.handleGenerate();
    await vi.advanceTimersByTimeAsync(200);
  });
}

describe("FinancingSimulator · modo busca", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(registrarSimulacaoBusca).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("troca a lista de unidades por empreendimento, bairro e metragem (ids com prefixo)", () => {
    const ctlRef: { current: FinancingSimulatorController | null } = { current: null };
    render(<Harness modo="busca" idPrefix="busca" onCtl={(c) => (ctlRef.current = c)} />);

    expect(screen.queryByText("Unidade Vila Park")).toBeNull();
    expect(screen.getByLabelText("Nome do empreendimento").id).toBe("busca-empreendimento");
    expect(screen.getByLabelText("Bairro").id).toBe("busca-bairro");
    expect(screen.getByLabelText("Metragem").id).toBe("busca-metragem");
    // Demais campos também ganham o prefixo (dois simuladores na mesma página).
    expect(document.getElementById("busca-pv")).not.toBeNull();
    expect(document.getElementById("pv")).toBeNull();
  });

  it("leva os dados do imóvel para o snapshot e mostra o preço por m²", async () => {
    const ctlRef: { current: FinancingSimulatorController | null } = { current: null };
    render(<Harness modo="busca" idPrefix="busca" onCtl={(c) => (ctlRef.current = c)} />);

    fireEvent.change(screen.getByLabelText("Nome do empreendimento"), { target: { value: "  Residencial Aurora " } });
    fireEvent.change(screen.getByLabelText("Bairro"), { target: { value: "Saúde" } });
    fireEvent.change(screen.getByLabelText("Metragem"), { target: { value: "30" } });

    // R$ 600.000 ÷ 30 m² = R$ 20.000/m²
    expect(screen.getByText(/Preço por m²/).textContent).toMatch(/20\.000/);

    await gerar(ctlRef);
    const snap = ctlRef.current!.snapshot!;
    expect(snap.modo).toBe("busca");
    expect(snap.empreendimento).toBe("Residencial Aurora");
    expect(snap.bairro).toBe("Saúde");
    expect(snap.metragem).toBe(30);
    expect(screen.getByText(/Simulação para/).textContent).toContain("Residencial Aurora · Saúde · 30 m²");
  });

  it("os três campos são opcionais, mas a metragem informada precisa ser plausível", async () => {
    const ctlRef: { current: FinancingSimulatorController | null } = { current: null };
    render(<Harness modo="busca" idPrefix="busca" onCtl={(c) => (ctlRef.current = c)} />);

    await gerar(ctlRef);
    expect(ctlRef.current!.snapshot).not.toBeNull();

    fireEvent.change(screen.getByLabelText("Metragem"), { target: { value: "5" } });
    await gerar(ctlRef);
    expect(ctlRef.current!.errors.metragem).toMatch(/10 e 1\.000 m²/);
  });

  it("no modo Vila Park o snapshot continua sem os campos novos", async () => {
    const ctlRef: { current: FinancingSimulatorController | null } = { current: null };
    render(<Harness modo="vila-park" onCtl={(c) => (ctlRef.current = c)} />);

    expect(screen.getByText("Unidade Vila Park")).toBeTruthy();
    expect(screen.queryByLabelText("Nome do empreendimento")).toBeNull();

    await gerar(ctlRef);
    const json = JSON.parse(JSON.stringify(ctlRef.current!.snapshot));
    expect(json).not.toHaveProperty("modo");
    expect(json).not.toHaveProperty("empreendimento");
    expect(json).not.toHaveProperty("metragem");
  });
});

describe("FinancingSimulator · consentimento e prazo de compra", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(registrarSimulacaoBusca).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("sem consentimento, nada é gravado", async () => {
    const ctlRef: { current: FinancingSimulatorController | null } = { current: null };
    render(<Harness modo="busca" idPrefix="busca" onCtl={(c) => (ctlRef.current = c)} />);
    expect(screen.getByLabelText(/Autorizo a Bewild/)).toBeTruthy();
    await gerar(ctlRef);
    expect(ctlRef.current!.snapshot).not.toBeNull();
    expect(registrarSimulacaoBusca).not.toHaveBeenCalled();
  });

  it("com consentimento, grava a linha anônima com o prazo de compra", async () => {
    const ctlRef: { current: FinancingSimulatorController | null } = { current: null };
    render(
      <Harness
        modo="busca"
        idPrefix="busca"
        initialForm={{ ...BASE, bairro: "Saúde", metragem: 30, prazoCompra: "ate_3_meses" }}
        onCtl={(c) => (ctlRef.current = c)}
      />,
    );
    expect(screen.getByLabelText("Quando pretende comprar?").id).toBe("busca-prazo-compra");
    fireEvent.click(screen.getByLabelText(/Autorizo a Bewild/));
    await gerar(ctlRef);

    expect(registrarSimulacaoBusca).toHaveBeenCalledTimes(1);
    const registro = vi.mocked(registrarSimulacaoBusca).mock.calls[0][0];
    expect(registro).toMatchObject({ bairro: "Saúde", metragem: 30, prazo_compra: "ate_3_meses", faixa_renda: "15k_25k" });
    expect(JSON.stringify(registro)).not.toContain("20000"); // renda exata fica fora
    expect(ctlRef.current!.snapshot!.prazoCompra).toBe("ate_3_meses");
  });

  it("no modo busca nenhum link de WhatsApp leva ao número do Vila Park", async () => {
    const ctlRef: { current: FinancingSimulatorController | null } = { current: null };
    const { container } = render(<Harness modo="busca" idPrefix="busca" onCtl={(c) => (ctlRef.current = c)} />);
    // estado vazio: sem botão de contato
    expect(screen.queryByText("Falar com o time")).toBeNull();
    await gerar(ctlRef);
    const links = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href*="whatsapp"]'));
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a.href).not.toContain("phone=");
    expect(screen.queryByText(/Falar com o time Vila Park/)).toBeNull();
  });

  it("no modo Vila Park não há consentimento nem gravação", async () => {
    const ctlRef: { current: FinancingSimulatorController | null } = { current: null };
    render(<Harness modo="vila-park" initialForm={{ ...BASE, consentimento: true }} onCtl={(c) => (ctlRef.current = c)} />);
    expect(screen.queryByLabelText(/Autorizo a Bewild/)).toBeNull();
    await gerar(ctlRef);
    expect(registrarSimulacaoBusca).not.toHaveBeenCalled();
  });
});

describe("parseMetragem / descricaoImovelBuscado", () => {
  it("lê metragem em pt-BR", () => {
    expect(parseMetragem("27,5")).toBe(27.5);
    expect(parseMetragem("27.5")).toBe(27.5);
    expect(parseMetragem("32 m²")).toBe(32);
    expect(parseMetragem("")).toBe(0);
    expect(parseMetragem("abc")).toBe(0);
    expect(parseMetragem("27,555")).toBe(27.55);
  });

  it("monta a linha só com o que foi preenchido", () => {
    expect(descricaoImovelBuscado({ empreendimento: "Aurora", bairro: "Saúde", metragem: 27.5 })).toBe(
      "Aurora · Saúde · 27,5 m²",
    );
    expect(descricaoImovelBuscado({ bairro: "Saúde" })).toBe("Saúde");
    expect(descricaoImovelBuscado({})).toBe("");
  });
});
