import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { formatBRLCompact } from "@/lib/crm";
import { formatNum, formatPct, type AdvancedData, type DrillItem } from "@/lib/crmAdvanced";

interface Props {
  data: AdvancedData["previsao"];
  onDrill: (title: string, description: string, items: DrillItem[], total: number) => void;
}

function Variacao({ v }: { v: number | null }) {
  if (v === null || v === undefined) {
    return <span className="text-xs text-muted-foreground">sem base anterior</span>;
  }
  const up = v > 0;
  const flat = v === 0;
  const Icon = flat ? ArrowRight : up ? ArrowUp : ArrowDown;
  return (
    <span
      className={
        flat
          ? "flex items-center gap-1 text-xs text-muted-foreground"
          : up
            ? "flex items-center gap-1 text-xs text-mirror-vendido"
            : "flex items-center gap-1 text-xs text-destructive"
      }
    >
      <Icon className="h-3 w-3" aria-hidden />
      {formatPct(Math.abs(v))}
    </span>
  );
}

export default function PrevisaoBlock({ data, onDrill }: Props) {
  const etapas = useMemo(
    () => [...data.por_etapa].sort((a, b) => a.position - b.position),
    [data.por_etapa],
  );
  const gargalo = useMemo(
    () => data.velocidade.por_etapa.reduce((m, x) => Math.max(m, Number(x.dias_medio)), 0),
    [data.velocidade.por_etapa],
  );
  const cmp = data.comparativo;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">Previsão e velocidade do funil</CardTitle>
        <CardDescription>
          Valor ponderado pela probabilidade de ganho de cada etapa, tempo de ciclo e comparação com o
          período anterior. Clique em uma etapa para ver os negócios que a compõem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Previsão ponderada em aberto</p>
            <p className="font-display text-xl font-semibold tabular-nums">
              {formatBRLCompact(data.total_ponderado_brl)}
            </p>
            <p className="text-xs text-muted-foreground">
              de {formatBRLCompact(data.total_aberto_brl)} em negociação
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Projeção · {data.trimestre.rotulo}</p>
            <p className="font-display text-xl font-semibold tabular-nums">
              {formatBRLCompact(data.trimestre.projecao_brl)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBRLCompact(data.trimestre.ganho_brl)} já ganho + {formatBRLCompact(data.trimestre.ponderado_a_fechar_brl)} ponderado
            </p>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">Ciclo de venda</p>
            <p className="font-display text-xl font-semibold tabular-nums">
              {formatNum(data.velocidade.ciclo_medio_dias)} dias
            </p>
            <p className="text-xs text-muted-foreground">
              mediana {formatNum(data.velocidade.ciclo_mediano_dias)} · {data.velocidade.amostras} negócio(s) ganho(s)
            </p>
          </div>
        </div>

        {etapas.length > 0 && (
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={etapas} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={50} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v) => formatBRLCompact(Number(v))} />
                <RTooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(v: number) => [formatBRLCompact(Number(v)), "Valor ponderado"]}
                />
                <Bar dataKey="valor_ponderado_brl" radius={[4, 4, 0, 0]}>
                  {etapas.map((e) => (
                    <Cell key={e.stage_id} fill="hsl(var(--chart-2))" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="-mx-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Etapa</TableHead>
                <TableHead className="text-right">Prob.</TableHead>
                <TableHead className="text-right">Neg.</TableHead>
                <TableHead className="text-right">Em aberto</TableHead>
                <TableHead className="text-right">Ponderado</TableHead>
                <TableHead className="pr-6 text-right">Tempo médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {etapas.map((e) => {
                const vel = data.velocidade.por_etapa.find((v) => v.stage_id === e.stage_id);
                return (
                  <TableRow
                    key={e.stage_id}
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`Ver negócios da etapa ${e.label}`}
                    onClick={() => onDrill(e.label, "Negócios na etapa", e.itens, e.itens_total)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        onDrill(e.label, "Negócios na etapa", e.itens, e.itens_total);
                      }
                    }}
                  >
                    <TableCell className="pl-6 text-sm font-medium">{e.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.prob_pct}%</TableCell>
                    <TableCell className="text-right tabular-nums">{e.deals}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRLCompact(e.valor_brl)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatBRLCompact(e.valor_ponderado_brl)}
                    </TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">
                      <span className={vel && Number(vel.dias_medio) === gargalo && gargalo > 0 ? "text-destructive" : ""}>
                        {formatNum(vel?.dias_medio ?? 0)} d
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Comparação com o período anterior
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Negócios criados", cur: String(cmp.deals_criados), prev: String(cmp.deals_criados_anterior), v: cmp.deals_criados_var_pct },
              { label: "Negócios ganhos", cur: String(cmp.deals_ganhos), prev: String(cmp.deals_ganhos_anterior), v: cmp.deals_ganhos_var_pct },
              { label: "VGV ganho", cur: formatBRLCompact(cmp.vgv_ganho_brl), prev: formatBRLCompact(cmp.vgv_ganho_anterior_brl), v: cmp.vgv_ganho_var_pct },
            ].map((x) => (
              <div key={x.label} className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">{x.label}</p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-lg font-semibold tabular-nums">{x.cur}</span>
                  <Variacao v={x.v} />
                </div>
                <p className="text-xs text-muted-foreground">anterior: {x.prev}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Período anterior de mesma duração, de{" "}
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold">
              {cmp.periodo_anterior.de}
            </span>{" "}
            a{" "}
            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold">
              {cmp.periodo_anterior.ate}
            </span>
            .
          </p>

        </div>
      </CardContent>
    </Card>
  );
}
