import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, Info, RefreshCw, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BRL, PCT_PT } from "@/lib/financing";
import {
  AMOSTRA_MINIMA_PARCEIRO,
  ROTULO_FAIXA_RENDA,
  ROTULO_PRAZO_COMPRA,
  buscarDemandaPorBairro,
  demandaParaCsv,
  maiorFatia,
  pctCompraAte6Meses,
  topEmpreendimentos,
  type DemandaBairro,
} from "@/lib/demandaBusca";

type Periodo = "30d" | "90d" | "12m" | "tudo";

const PERIODOS: { valor: Periodo; rotulo: string; dias: number | null }[] = [
  { valor: "30d", rotulo: "30 dias", dias: 30 },
  { valor: "90d", rotulo: "90 dias", dias: 90 },
  { valor: "12m", rotulo: "12 meses", dias: 365 },
  { valor: "tudo", rotulo: "Tudo", dias: null },
];

const fmtNum = (v: number | null, digits = 0) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const fmtBRL = (v: number | null) => (v === null ? "—" : BRL(v));
const fmtPct = (v: number | null) => (v === null ? "—" : PCT_PT(v, 0));

function baixarCsv(linhas: DemandaBairro[], periodo: Periodo) {
  const blob = new Blob([demandaParaCsv(linhas)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const hoje = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `demanda-por-bairro-${periodo}-${hoje}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Kpi({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{rotulo}</p>
        <p className="text-2xl font-semibold tabular-nums text-foreground mt-1">{valor}</p>
        {dica && <p className="text-[11px] text-muted-foreground mt-1">{dica}</p>}
      </CardContent>
    </Card>
  );
}

function SeloAmostra({ pessoas }: { pessoas: number }) {
  if (pessoas >= AMOSTRA_MINIMA_PARCEIRO) return null;
  return (
    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-muted-foreground/30">
      amostra pequena
    </Badge>
  );
}

export default function DemandaBuscaSection() {
  const [periodo, setPeriodo] = useState<Periodo>("90d");
  const desde = useMemo(() => {
    const dias = PERIODOS.find((p) => p.valor === periodo)?.dias;
    if (!dias) return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - dias);
    return d;
  }, [periodo]);

  const consulta = useQuery({
    queryKey: ["admin", "demanda-busca", periodo],
    queryFn: () => buscarDemandaPorBairro(desde),
    staleTime: 60_000,
  });

  const linhas = useMemo(() => consulta.data ?? [], [consulta.data]);
  const totais = useMemo(() => {
    const pessoas = linhas.reduce((a, d) => a + d.pessoas, 0);
    const simulacoes = linhas.reduce((a, d) => a + d.simulacoes, 0);
    const bairros = linhas.filter((d) => d.bairro_chave !== "").length;
    const prazo: Record<string, number> = {};
    for (const d of linhas) for (const [k, n] of Object.entries(d.prazo_compra)) prazo[k] = (prazo[k] ?? 0) + n;
    return { pessoas, simulacoes, bairros, ate6: pctCompraAte6Meses(prazo) };
  }, [linhas]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div role="group" aria-label="Período" className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5 w-full sm:w-auto">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              aria-pressed={periodo === p.valor}
              onClick={() => setPeriodo(p.valor)}
              className={[
                "flex-1 sm:flex-none min-h-[40px] px-3 rounded-[5px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                periodo === p.valor ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-10 gap-1.5" onClick={() => consulta.refetch()} disabled={consulta.isFetching}>
            <RefreshCw className={["h-3.5 w-3.5", consulta.isFetching ? "animate-spin" : ""].join(" ")} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-1.5"
            onClick={() => baixarCsv(linhas, periodo)}
            disabled={linhas.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Baixar CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed flex gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          Simulações do modo "ainda buscando um imóvel" em /ferramentas, gravadas só com consentimento e sem dados
          pessoais. Cada pessoa conta uma vez por visita (vale a última simulação). Bairros com menos de{" "}
          {AMOSTRA_MINIMA_PARCEIRO} pessoas aparecem como <strong>amostra pequena</strong> e não devem ir para
          relatório de parceiro. Valores são o que as pessoas digitaram — hipóteses delas, não preço de mercado.
        </p>
      </div>

      {consulta.isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : consulta.isError ? (
        <Card className="border-destructive/40">
          <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">Não foi possível carregar a demanda.</p>
              <p className="text-muted-foreground text-xs mt-0.5">{(consulta.error as Error)?.message}</p>
            </div>
            <Button variant="outline" size="sm" className="h-10" onClick={() => consulta.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : linhas.length === 0 ? (
        <Card className="border-dashed border-border/70">
          <CardContent className="py-12 flex flex-col items-center text-center gap-2">
            <Search className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium text-foreground">Nenhuma simulação neste período</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              As simulações aparecem aqui quando alguém usa o simulador "ainda buscando um imóvel" e marca o
              consentimento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi rotulo="Pessoas" valor={fmtNum(totais.pessoas)} dica="última simulação de cada visita" />
            <Kpi rotulo="Simulações" valor={fmtNum(totais.simulacoes)} />
            <Kpi rotulo="Bairros citados" valor={fmtNum(totais.bairros)} />
            <Kpi rotulo="Comprar em até 6 meses" valor={fmtPct(totais.ate6)} dica="entre quem respondeu o prazo" />
          </div>

          {/* Celular: cartões */}
          <div className="md:hidden space-y-3">
            {linhas.map((d) => (
              <Card key={d.bairro_chave || "sem-bairro"} className="border-border/60">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground break-words min-w-0">{d.bairro}</p>
                    <SeloAmostra pessoas={d.pessoas} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">Pessoas</dt>
                    <dd className="text-right tabular-nums">{fmtNum(d.pessoas)} · {fmtNum(d.simulacoes)} sim.</dd>
                    <dt className="text-muted-foreground">Valor mediano</dt>
                    <dd className="text-right tabular-nums">{fmtBRL(d.valor_mediano)}</dd>
                    <dt className="text-muted-foreground">Metragem mediana</dt>
                    <dd className="text-right tabular-nums">{d.metragem_mediana === null ? "—" : `${fmtNum(d.metragem_mediana, 1)} m²`}</dd>
                    <dt className="text-muted-foreground">Preço por m²</dt>
                    <dd className="text-right tabular-nums">{fmtBRL(d.preco_m2_mediano)}</dd>
                    <dt className="text-muted-foreground">Entrada mediana</dt>
                    <dd className="text-right tabular-nums">{d.entrada_pct_mediana === null ? "—" : PCT_PT(d.entrada_pct_mediana, 0)}</dd>
                    <dt className="text-muted-foreground">Comprar em até 6 meses</dt>
                    <dd className="text-right tabular-nums">{fmtPct(pctCompraAte6Meses(d.prazo_compra))}</dd>
                    <dt className="text-muted-foreground">Prazo mais comum</dt>
                    <dd className="text-right">{maiorFatia(d.prazo_compra, ROTULO_PRAZO_COMPRA)}</dd>
                    <dt className="text-muted-foreground">Renda mais comum</dt>
                    <dd className="text-right">{maiorFatia(d.faixa_renda, ROTULO_FAIXA_RENDA)}</dd>
                    <dt className="text-muted-foreground">Usa FGTS</dt>
                    <dd className="text-right tabular-nums">{fmtPct(d.pct_fgts)}</dd>
                  </dl>
                  <p className="text-xs text-muted-foreground break-words">
                    <span className="text-foreground/80">Empreendimentos citados:</span> {topEmpreendimentos(d)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tela larga: tabela */}
          <div className="hidden md:block rounded-lg border border-border/60 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bairro</TableHead>
                  <TableHead className="text-right">Pessoas</TableHead>
                  <TableHead className="text-right">Valor mediano</TableHead>
                  <TableHead className="text-right">Metragem</TableHead>
                  <TableHead className="text-right">Preço/m²</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Até 6 meses</TableHead>
                  <TableHead>Renda mais comum</TableHead>
                  <TableHead>Empreendimentos citados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((d) => (
                  <TableRow key={d.bairro_chave || "sem-bairro"}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2 flex-wrap">
                        {d.bairro}
                        <SeloAmostra pessoas={d.pessoas} />
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtNum(d.pessoas)}
                      <span className="text-muted-foreground text-xs"> / {fmtNum(d.simulacoes)}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(d.valor_mediano)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.metragem_mediana === null ? "—" : `${fmtNum(d.metragem_mediana, 1)} m²`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(d.preco_m2_mediano)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.entrada_pct_mediana === null ? "—" : PCT_PT(d.entrada_pct_mediana, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtPct(pctCompraAte6Meses(d.prazo_compra))}</TableCell>
                    <TableCell className="text-sm">{maiorFatia(d.faixa_renda, ROTULO_FAIXA_RENDA)}</TableCell>
                    <TableCell className="text-sm max-w-[260px]">{topEmpreendimentos(d)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
