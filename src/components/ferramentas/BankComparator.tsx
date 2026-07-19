import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Award } from "lucide-react";
import {
  INSTITUTION_RATES,
  MODALITY_LABEL,
  SITUATION_LABEL,
  situationBadgeClass,
  PREDICTABILITY_RANK,
  type InstitutionRate,
  type ModalityGroup,
} from "@/data/institutionRates";
import {
  BRL,
  PCT,
  PCT_PT,
  effectiveAnnualPct,
  requiredIncome,
  simulate,
  type AmortSystem,
} from "@/lib/financing";

interface Props {
  propertyValue: number;
  downPayment: number;
  termMonths: number;
  system: AmortSystem;
  buyerAge: number;
  monthlyIncome: number;
  eligibleProCotista: boolean;
  onToggleProCotista: (v: boolean) => void;
}

interface Row {
  rate: InstitutionRate;
  effectivePct: number;
  firstInstallment: number;
  lastInstallment: number;
  totalPaid: number;
  totalInterest: number;
  cetAnnual: number;
  requiredMonthly: number;
}

const GROUP_ORDER: ModalityGroup[] = ["TR", "IPCA", "poupanca", "MCMV", "PRO_COTISTA"];

const GROUP_HINT: Record<ModalityGroup, string | null> = {
  TR: null,
  IPCA: "Parcela e saldo variam com o IPCA — valores estimados no cenário atual.",
  poupanca: "Parcela e saldo variam com a poupança — valores estimados no cenário atual.",
  MCMV: null,
  PRO_COTISTA: null,
};

export default function BankComparator({
  propertyValue,
  downPayment,
  termMonths,
  system,
  buyerAge,
  monthlyIncome,
  eligibleProCotista,
  onToggleProCotista,
}: Props) {
  const mcmvEligible = propertyValue <= 600_000 && (!monthlyIncome || monthlyIncome <= 13_000);

  const rows = useMemo<Row[]>(() => {
    return INSTITUTION_RATES.map((rate) => {
      if (rate.annualRate == null) {
        return {
          rate,
          effectivePct: NaN,
          firstInstallment: NaN,
          lastInstallment: NaN,
          totalPaid: NaN,
          totalInterest: NaN,
          cetAnnual: NaN,
          requiredMonthly: NaN,
        };
      }
      const r = simulate(system, {
        propertyValue,
        downPayment,
        termMonths,
        annualRate: rate.annualRate,
        annualRateType: rate.annualRateType,
        buyerAgeYears: buyerAge,
      });
      return {
        rate,
        effectivePct: effectiveAnnualPct(rate.annualRate, rate.annualRateType),
        firstInstallment: r.firstInstallment,
        lastInstallment: r.lastInstallment,
        totalPaid: r.totalPaid,
        totalInterest: r.totalInterest,
        cetAnnual: r.cetAnnual,
        requiredMonthly: requiredIncome(r.firstInstallment),
      };
    });
  }, [propertyValue, downPayment, termMonths, system, buyerAge]);

  const grouped = useMemo(() => {
    const map = new Map<ModalityGroup, Row[]>();
    GROUP_ORDER.forEach((g) => map.set(g, []));
    rows.forEach((row) => map.get(row.rate.modality)!.push(row));
    // Ordenar cada grupo: taxas com número por CET, depois "não localizada" no fim.
    map.forEach((list) => {
      list.sort((a, b) => {
        const aNa = Number.isNaN(a.cetAnnual);
        const bNa = Number.isNaN(b.cetAnnual);
        if (aNa && !bNa) return 1;
        if (!aNa && bNa) return -1;
        if (aNa && bNa) return 0;
        return a.cetAnnual - b.cetAnnual;
      });
    });
    return map;
  }, [rows]);

  const winners = useMemo(() => {
    const trGroup = (grouped.get("TR") ?? []).filter((r) => !Number.isNaN(r.cetAnnual));
    const allNumeric = rows.filter((r) => !Number.isNaN(r.cetAnnual));
    const byCET = [...trGroup].sort((a, b) => a.cetAnnual - b.cetAnnual)[0];
    const byFirst = [...allNumeric].sort((a, b) => a.firstInstallment - b.firstInstallment)[0];
    const byTotal = [...allNumeric].sort((a, b) => a.totalPaid - b.totalPaid)[0];
    const byPredict = [...allNumeric].sort(
      (a, b) => PREDICTABILITY_RANK[b.rate.indexer] - PREDICTABILITY_RANK[a.rate.indexer] || a.cetAnnual - b.cetAnnual,
    )[0];
    const byLtv = [...INSTITUTION_RATES].sort((a, b) => b.maxLtvPct - a.maxLtvPct)[0];
    return { byCET, byFirst, byTotal, byPredict, byLtv };
  }, [grouped, rows]);

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="border-border/60 card-elevated">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Comparar bancos
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Cenário atual aplicado a cada instituição — comparação por indexador. Não misturamos IPCA/poupança com TR na ordenação.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={eligibleProCotista}
                onChange={(e) => onToggleProCotista(e.target.checked)}
              />
              Tenho 3+ anos de FGTS e sem imóvel/financiamento SFH
            </label>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Winners */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <WinnerCard
              title="Menor CET (+TR)"
              value={winners.byCET ? `${winners.byCET.rate.bank}` : "—"}
              caption={winners.byCET ? `${PCT(winners.byCET.cetAnnual)} a.a.` : "sem dados"}
              note="Considera apenas o grupo + TR."
            />
            <WinnerCard
              title="Menor 1ª parcela"
              value={winners.byFirst ? winners.byFirst.rate.bank : "—"}
              caption={winners.byFirst ? BRL(winners.byFirst.firstInstallment) : ""}
              note="Compare indexadores diferentes com cautela."
            />
            <WinnerCard
              title="Menor custo total"
              value={winners.byTotal ? winners.byTotal.rate.bank : "—"}
              caption={winners.byTotal ? BRL(winners.byTotal.totalPaid) : ""}
              note="Estimativa com premissas atuais."
            />
            <WinnerCard
              title="Mais previsível"
              value={winners.byPredict ? winners.byPredict.rate.bank : "—"}
              caption={winners.byPredict ? winners.byPredict.rate.product : ""}
              note="Fixa > TR > poupança > IPCA."
            />
            <WinnerCard
              title="Maior % financiável"
              value={winners.byLtv.bank}
              caption={`${winners.byLtv.maxLtvPct}%`}
              note="Sujeito a análise de crédito e avaliação."
            />
          </div>

          {/* Enquadramentos */}
          {(mcmvEligible || eligibleProCotista) && (
            <div className="flex flex-wrap gap-2">
              {mcmvEligible && (
                <Badge variant="outline" className="bg-primary/10 border-primary/40 text-primary">
                  Você pode se enquadrar no MCMV
                </Badge>
              )}
              {eligibleProCotista && (
                <Badge variant="outline" className="bg-accent/10 border-accent/40 text-accent">
                  Verifique elegibilidade no Pró-Cotista com o banco
                </Badge>
              )}
            </div>
          )}

          {/* Grupos */}
          <Tabs defaultValue="TR">
            <TabsList className="flex flex-wrap h-auto justify-start">
              {GROUP_ORDER.map((g) => (
                <TabsTrigger key={g} value={g} className="text-xs">
                  {MODALITY_LABEL[g]}
                </TabsTrigger>
              ))}
            </TabsList>
            {GROUP_ORDER.map((g) => (
              <TabsContent key={g} value={g} className="mt-3">
                {GROUP_HINT[g] && (
                  <p className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1">
                    <Info className="h-3 w-3" /> {GROUP_HINT[g]}
                  </p>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Banco</TableHead>
                        <TableHead>Taxa</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead className="text-right">1ª parcela</TableHead>
                        <TableHead className="text-right">Total pago</TableHead>
                        <TableHead className="text-right">CET a.a.</TableHead>
                        <TableHead className="text-right">Renda mín.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(grouped.get(g) ?? []).map((row) => (
                        <TableRow key={row.rate.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{row.rate.bank}</div>
                            <div className="text-[11px] text-muted-foreground">{row.rate.product}</div>
                          </TableCell>
                          <TableCell>
                            {row.rate.annualRate == null ? (
                              <span className="text-muted-foreground text-xs">Sob consulta</span>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-sm cursor-help">
                                    {PCT_PT(row.rate.annualRate)}{" "}
                                    <span className="text-[11px] text-muted-foreground">
                                      {row.rate.annualRateType} · {row.rate.indexer}
                                    </span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">
                                  {row.rate.conditions}
                                  {row.rate.note ? ` · ${row.rate.note}` : ""}
                                  {row.rate.annualRateType === "nominal" && (
                                    <div className="mt-1 opacity-80">
                                      Efetiva ≈ {PCT_PT(row.effectivePct)} a.a.
                                    </div>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${situationBadgeClass(row.rate.situation)} text-[10px]`}>
                              {SITUATION_LABEL[row.rate.situation]}
                            </Badge>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {formatConsultDate(row.rate.consultedAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number.isNaN(row.firstInstallment) ? "—" : BRL(row.firstInstallment)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number.isNaN(row.totalPaid) ? "—" : BRL(row.totalPaid)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {Number.isNaN(row.cetAnnual) ? "—" : PCT(row.cetAnnual)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number.isNaN(row.requiredMonthly) ? "—" : BRL(row.requiredMonthly)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(grouped.get(g) ?? []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                            Nenhuma instituição neste grupo.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
            As taxas e condições apresentadas correspondem às informações públicas localizadas na data indicada.
            A aprovação e as condições efetivas dependem da análise de crédito, renda, entrada, prazo, avaliação
            do imóvel, relacionamento bancário, regularidade do imóvel e políticas da instituição. Compare o Custo
            Efetivo Total e consulte as propostas oficiais antes da contratação.
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Informações tributárias, documentais e jurídicas podem variar conforme a operação e devem ser
            confirmadas com profissionais habilitados, com o banco e com os órgãos competentes.
          </p>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function WinnerCard({ title, value, caption, note }: { title: string; value: string; caption: string; note: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="font-display font-bold text-sm text-foreground mt-0.5 leading-tight">{value}</p>
      <p className="text-[11px] text-primary tabular-nums">{caption}</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{note}</p>
    </div>
  );
}

/** Formata uma data ISO (YYYY-MM-DD) como dd/mm/aaaa sem shift de fuso. */
export function formatConsultDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
