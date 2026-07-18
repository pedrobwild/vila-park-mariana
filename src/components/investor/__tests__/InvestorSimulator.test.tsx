import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@/i18n";
import InvestorSimulator from "../InvestorSimulator";
import { simulatorStorage } from "../persistence";

const setCurrency = (id: string, digits: string) => {
  const input = document.getElementById(id) as HTMLInputElement;
  fireEvent.change(input, { target: { value: digits } });
  return input;
};

describe("InvestorSimulator — fluxo de caixa negativo", () => {
  beforeEach(() => {
    simulatorStorage.clear();
    localStorage.clear();
  });

  it("exibe alerta, valores em vermelho e dash em yield/payback quando annualNet <= 0", () => {
    render(<InvestorSimulator />);

    // Cenário: aluguel < condomínio => monthlyNet negativo
    setCurrency("price", "500000");
    setCurrency("condo", "5000");
    setCurrency("rent", "2000");

    // Alerta de fluxo negativo (role=alert)
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent ?? "").toMatch(/prejuízo|negativ|deficit/i);

    // Métricas: net mensal deve estar destacado como destructive
    const netMonthLabel = screen.getByText(/Líquido\/mês|Net\/month/i);
    const netMonthValue = netMonthLabel.nextElementSibling as HTMLElement;
    expect(netMonthValue.className).toMatch(/text-destructive/);
    expect(netMonthValue.textContent ?? "").toContain("-");

    // Yield e Payback devem exibir dash (—) quando annualNet <= 0
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("não mostra alerta e calcula yield/payback quando fluxo é positivo", () => {
    render(<InvestorSimulator />);

    setCurrency("price", "500000");
    setCurrency("condo", "1000");
    setCurrency("rent", "4000");

    expect(screen.queryByRole("alert")).toBeNull();

    // Yield deve conter "%" e payback deve conter "anos"/"years"
    const container = document.body;
    expect(within(container).getByText(/%/)).toBeInTheDocument();
    expect(within(container).getByText(/anos|years/i)).toBeInTheDocument();
  });
});
