import { describe, it, expect } from "vitest";
import {
  AMOSTRA_MINIMA_PARCEIRO,
  CONSENTIMENTO_VERSAO,
  demandaParaCsv,
  faixaIdade,
  faixaRenda,
  maiorFatia,
  montarRegistroBusca,
  normalizarDemandaBairro,
  pctCompraAte6Meses,
  ROTULO_PRAZO_COMPRA,
  type DadosSimulacaoBusca,
} from "@/lib/demandaBusca";

const SESSAO = "11111111-1111-4111-8111-111111111111";

const DADOS: DadosSimulacaoBusca = {
  propertyValue: 600_000,
  downPayment: 150_000,
  fgts: 20_000,
  termMonths: 360,
  system: "SAC",
  bankId: "caixa-sbpe",
  buyerAge: 37,
  monthlyIncome: 18_500,
  empreendimento: "  Residencial   Aurora ",
  bairro: " Saúde ",
  metragem: 27.5,
  prazoCompra: "3_a_6_meses",
};

describe("montarRegistroBusca", () => {
  it("grava só faixas de renda e idade, nunca os valores exatos", () => {
    const r = montarRegistroBusca(DADOS, SESSAO);
    expect(r.faixa_renda).toBe("15k_25k");
    expect(r.faixa_idade).toBe("35_44");
    const json = JSON.stringify(r);
    expect(json).not.toContain("18500");
    expect(json).not.toContain("37");
    expect(Object.keys(r)).not.toContain("monthlyIncome");
    expect(Object.keys(r)).not.toContain("buyerAge");
  });

  it("normaliza textos, calcula entrada e leva prazo de compra e consentimento", () => {
    const r = montarRegistroBusca(DADOS, SESSAO);
    expect(r).toMatchObject({
      sessao: SESSAO,
      consentimento_versao: CONSENTIMENTO_VERSAO,
      empreendimento: "Residencial Aurora",
      bairro: "Saúde",
      metragem: 27.5,
      valor_imovel: 600_000,
      prazo_compra: "3_a_6_meses",
      entrada_pct: 25,
      usa_fgts: true,
      prazo_financiamento_meses: 360,
      sistema: "SAC",
      elegivel_mcmv: false,
    });
  });

  it("campos vazios viram nulo; metragem fora da faixa não é gravada", () => {
    const r = montarRegistroBusca(
      { ...DADOS, empreendimento: "  ", bairro: "", metragem: 5, prazoCompra: "", monthlyIncome: 0, buyerAge: 0 },
      SESSAO,
    );
    expect(r.empreendimento).toBeNull();
    expect(r.bairro).toBeNull();
    expect(r.metragem).toBeNull();
    expect(r.prazo_compra).toBeNull();
    expect(r.faixa_renda).toBeNull();
    expect(r.faixa_idade).toBeNull();
  });
});

describe("faixas", () => {
  it("renda", () => {
    expect(faixaRenda(5_000)).toBe("ate_5k");
    expect(faixaRenda(5_001)).toBe("5k_10k");
    expect(faixaRenda(15_000)).toBe("10k_15k");
    expect(faixaRenda(40_001)).toBe("acima_40k");
  });
  it("idade", () => {
    expect(faixaIdade(17)).toBeNull();
    expect(faixaIdade(18)).toBe("18_24");
    expect(faixaIdade(34)).toBe("25_34");
    expect(faixaIdade(70)).toBe("55_mais");
  });
});

describe("agregado por bairro", () => {
  const linha = normalizarDemandaBairro({
    bairro: "Saúde",
    bairro_chave: "saude",
    pessoas: 3,
    simulacoes: "7",
    ultima_simulacao: "2026-10-18T20:00:00Z",
    valor_mediano: "700000",
    metragem_mediana: "35.0",
    preco_m2_mediano: "20000",
    entrada_pct_mediana: "25.0",
    pct_fgts: "33.3",
    pct_mcmv: "0.0",
    prazo_compra: { ate_3_meses: 1, "6_a_12_meses": 1, nao_informado: 1 },
    faixa_renda: { "10k_15k": 2, nao_informado: 1 },
    empreendimentos: [{ nome: "Residencial; Aurora", pessoas: 2 }],
  });

  it("converte numeric (texto) em número", () => {
    expect(linha.simulacoes).toBe(7);
    expect(linha.valor_mediano).toBe(700_000);
    expect(linha.metragem_mediana).toBe(35);
  });

  it("% de compra em até 6 meses ignora quem não respondeu", () => {
    expect(pctCompraAte6Meses(linha.prazo_compra)).toBe(50);
    expect(pctCompraAte6Meses({ nao_informado: 3 })).toBeNull();
  });

  it("maior fatia ignora 'não informado'", () => {
    expect(maiorFatia(linha.prazo_compra, ROTULO_PRAZO_COMPRA)).toMatch(/3 meses|6 a 12/);
    expect(maiorFatia({ nao_informado: 5 }, ROTULO_PRAZO_COMPRA)).toBe("—");
  });

  it("CSV traz só o agregado, marca amostra pequena e escapa ponto e vírgula", () => {
    const csv = demandaParaCsv([linha]);
    const [cab, dados] = csv.replace("﻿", "").split("\n");
    expect(cab.split(";")).toContain("Amostra pequena");
    expect(linha.pessoas).toBeLessThan(AMOSTRA_MINIMA_PARCEIRO);
    expect(dados).toContain(";sim;");
    expect(dados).toContain('"Residencial; Aurora (2)"');
  });
});
