import { describe, it, expect } from "vitest";
import { goalsMonthFor, periodEndInclusive } from "../crmGoalsMonth";

const hoje = new Date(2026, 6, 26); // 26/07/2026

describe("goalsMonthFor", () => {
  it("usa o mês corrente quando o período termina hoje", () => {
    expect(goalsMonthFor(hoje, hoje)).toBe("2026-07-01");
  });

  it("cai para o mês corrente quando o fim do período está no futuro", () => {
    expect(goalsMonthFor(new Date(2026, 11, 31), hoje)).toBe("2026-07-01");
  });

  it("usa o mês final do período quando ele já terminou", () => {
    expect(goalsMonthFor(new Date(2026, 4, 31), hoje)).toBe("2026-05-01");
  });

  it("não escorrega para o mês anterior quando o período termina no dia 1º", () => {
    expect(goalsMonthFor(new Date(2026, 5, 1), hoje)).toBe("2026-06-01");
  });

  it("mantém o mês corrente quando o fim é amanhã (borda de virada de dia)", () => {
    expect(goalsMonthFor(new Date(2026, 6, 27), hoje)).toBe("2026-07-01");
  });

  it("usa hoje quando a data de fim é inválida", () => {
    expect(goalsMonthFor(new Date("data-invalida"), hoje)).toBe("2026-07-01");
  });
});

describe("periodEndInclusive", () => {
  it("períodos pré-definidos terminam hoje", () => {
    expect(periodEndInclusive(false, undefined, undefined, hoje)).toEqual(hoje);
  });

  it("período personalizado com intervalo usa a data final", () => {
    const to = new Date(2026, 3, 30);
    expect(periodEndInclusive(true, new Date(2026, 3, 1), to, hoje)).toEqual(to);
  });

  it("período personalizado com uma só data usa a própria data", () => {
    const from = new Date(2026, 3, 10);
    expect(periodEndInclusive(true, from, undefined, hoje)).toEqual(from);
  });

  it("período personalizado sem data inicial cai para hoje", () => {
    expect(periodEndInclusive(true, undefined, undefined, hoje)).toEqual(hoje);
  });

  it("combinado: intervalo de abril mostra as metas de abril", () => {
    const fim = periodEndInclusive(true, new Date(2026, 3, 1), new Date(2026, 3, 30), hoje);
    expect(goalsMonthFor(fim, hoje)).toBe("2026-04-01");
  });
});
