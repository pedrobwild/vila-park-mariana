import { format } from "date-fns";

/**
 * Mês de referência das metas exibidas no bloco "Metas" do painel.
 *
 * Regra: usar o mês do FIM do período selecionado; quando esse fim está no
 * futuro (períodos que incluem "hoje" ou intervalos personalizados com data
 * final futura), cair para o mês corrente — metas de meses que ainda não
 * começaram deixariam o termômetro sempre zerado.
 *
 * @param periodEndInclusive último dia do período (inclusivo)
 * @param today referência de "hoje" (injetável para testes)
 * @returns primeiro dia do mês no formato `yyyy-MM-01`
 */
export function goalsMonthFor(periodEndInclusive: Date, today: Date = new Date()): string {
  const fim = Number.isNaN(periodEndInclusive.getTime()) ? today : periodEndInclusive;
  const ref = fim.getTime() > today.getTime() ? today : fim;
  return format(new Date(ref.getFullYear(), ref.getMonth(), 1), "yyyy-MM-01");
}

/**
 * Último dia (inclusivo) do período selecionado nos filtros do painel.
 * Períodos pré-definidos sempre terminam hoje; o personalizado termina na data
 * final escolhida (ou na inicial, quando só uma data foi marcada).
 */
export function periodEndInclusive(
  isCustom: boolean,
  customFrom?: Date,
  customTo?: Date,
  today: Date = new Date(),
): Date {
  if (isCustom && customFrom) return customTo ?? customFrom;
  return today;
}
