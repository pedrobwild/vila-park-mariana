import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarIcon,
  Coins,
  Percent,
  Target,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { formatBRLCompact, formatBRL2 } from "@/lib/crm";
import { cn } from "@/lib/utils";

interface DashboardData {
  periodo: { de: string; ate: string };
  totais: {
    deals_total: number;
    deals_abertos: number;
    deals_ganhos: number;
    deals_perdidos: number;
    vgv_aberto: number;
    vgv_ganho: number;
    vgv_perdido: number;
    ticket_medio: number;
    taxa_conversao: number;
  };
  funil: { stage_id: string; label: string; kind: string; position: number; deals: number; value_brl: number }[];
  tempo_por_etapa: { stage_id: string; label: string; position: number; dias_medio: number; amostras: number }[];
  motivos_perda: { motivo: string; deals: number; value_brl: number }[];
  por_origem: { origem: string; deals: number; ganhos: number; value_brl: number }[];
  por_corretor: { broker_id: string; corretor: string; equipe: string | null; deals: number; ganhos: number; value_brl: number }[];
  tarefas: { abertas: number; atrasadas: number; hoje: number; concluidas: number };
  estoque: {
    total: number;
    disponivel: number;
    negociacao: number;
    proposta: number;
    reservado: number;
    vendido: number;
    vgv_total: number;
    vgv_vendido: number;
  };
  credito: { status: string; qtd: number; aprovado_brl: number }[];
  comissoes: { prevista_brl: number; a_pagar_brl: number; paga_brl: number };
}

type PeriodKey = "30" | "90" | "180" | "ano" | "custom";

const PERIOD_LABEL: Record<PeriodKey, string> = {
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
  "180": "Últimos 180 dias",
  ano: "Este ano",
  custom: "Personalizado",
};

const CREDIT_LABEL: Record<string, string> = {
  nao_iniciada: "Não iniciada",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  aprovada_parcial: "Aprovada parcial",
  reprovada: "Reprovada",
};

const ESTOQUE_BARS = [
  { key: "disponivel", label: "Disponível", cls: "bg-mirror-disponivel" },
  { key: "negociacao", label: "Em negociação", cls: "bg-mirror-negociacao" },
  { key: "proposta", label: "Com proposta", cls: "bg-mirror-proposta" },
  { key: "reservado", label: "Reservado", cls: "bg-mirror-reservado" },
  { key: "vendido", label: "Vendido", cls: "bg-mirror-vendido" },
] as const;

const DONUT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

function iso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function rangeFor(p: PeriodKey, custom?: DateRange): { from: string; to: string } {
  const today = new Date();
  const to = new Date(today.getTime() + 86_400_000);
  if (p === "ano") return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(to) };
  if (p === "custom" && custom?.from) {
    return { from: iso(custom.from), to: iso(custom.to ?? custom.from) };
  }
  const days = Number(p === "custom" ? "180" : p);
  return { from: iso(new Date(today.getTime() - days * 86_400_000)), to: iso(to) };
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden />
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        <p className="mt-2 font-display text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

interface Props {
  onGoToPipeline: () => void;
}

export default function CrmDashboard({ onGoToPipeline }: Props) {
  const [period, setPeriod] = useState<PeriodKey>("180");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { from, to } = rangeFor(period, custom);
    const { data: res, error } = await supabase.rpc("crm_dashboard", { _from: from, _to: to });
    if (error) {
      toast.error("Não foi possível carregar o painel.");
      setData(null);
    } else {
      setData(res as unknown as DashboardData);
    }
    setLoading(false);
  }, [period, custom]);

  useEffect(() => {
    if (period === "custom" && !custom?.from) return;
    load();
  }, [load, period, custom]);

  const funilAbertos = useMemo(
    () => (data?.funil ?? []).filter((f) => f.kind === "aberto").sort((a, b) => a.position - b.position),
    [data],
  );
  const ganho = useMemo(() => (data?.funil ?? []).find((f) => f.kind === "ganho"), [data]);
  const perdido = useMemo(() => (data?.funil ?? []).find((f) => f.kind === "perdido"), [data]);
  const maxFunil = Math.max(1, ...funilAbertos.map((f) => f.deals));
  const gargalo = useMemo(() => {
    const t = data?.tempo_por_etapa ?? [];
    return t.reduce<number>((m, x) => Math.max(m, Number(x.dias_medio)), 0);
  }, [data]);

  const isEmpty = !!data && data.totais.deals_total === 0;

  return (
    <div className="space-y-4">
      {/* Período */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="h-9 w-[190px]" aria-label="Período de análise">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABEL) as PeriodKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {PERIOD_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {period === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {custom?.from
                  ? `${format(custom.from, "dd/MM/yyyy")} — ${custom.to ? format(custom.to, "dd/MM/yyyy") : "…"}`
                  : "Escolher datas"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={custom}
                onSelect={setCustom}
                numberOfMonths={2}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        )}

        {data && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(data.periodo.de), "dd/MM/yyyy")} até {format(new Date(data.periodo.ate), "dd/MM/yyyy")}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !data ? (
        <Card className="border-border/60">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Não foi possível carregar os indicadores.{" "}
            <Button variant="link" className="px-1" onClick={() => load()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {data.tarefas.atrasadas > 0 && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                  <p className="text-sm font-medium">
                    {data.tarefas.atrasadas} {data.tarefas.atrasadas === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={onGoToPipeline}>
                  Ver no pipeline
                </Button>
              </CardContent>
            </Card>
          )}

          {isEmpty ? (
            <Card className="border-border/60">
              <CardContent className="p-10 text-center">
                <p className="font-display text-lg font-semibold">Nenhum negócio no período</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escolha um período maior ou cadastre negócios no pipeline para acompanhar os indicadores aqui.
                </p>
                <Button className="mt-4" size="sm" onClick={onGoToPipeline}>
                  Ir para o pipeline
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Linha 1 — KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi
                  icon={TrendingUp}
                  label="VGV em aberto"
                  value={formatBRLCompact(data.totais.vgv_aberto)}
                  sub={`${data.totais.deals_abertos} negócios em andamento`}
                />
                <Kpi
                  icon={Target}
                  label="VGV ganho"
                  value={formatBRLCompact(data.totais.vgv_ganho)}
                  sub={`${data.totais.deals_ganhos} negócios ganhos`}
                />
                <Kpi
                  icon={Coins}
                  label="Ticket médio"
                  value={formatBRLCompact(data.totais.ticket_medio)}
                  sub={`${data.totais.deals_total} negócios no período`}
                />
                <Kpi
                  icon={Percent}
                  label="Taxa de conversão"
                  value={`${Number(data.totais.taxa_conversao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                  sub={`${data.totais.deals_ganhos} ganhos · ${data.totais.deals_perdidos} perdidos`}
                />
              </div>

              {/* Linha 2 */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Funil de vendas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {funilAbertos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem etapas abertas configuradas.</p>
                    ) : (
                      funilAbertos.map((f, i) => {
                        const prev = i === 0 ? f.deals : funilAbertos[i - 1].deals;
                        const pct = i === 0 ? 100 : prev > 0 ? (f.deals / prev) * 100 : 0;
                        return (
                          <div key={f.stage_id} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="font-medium">{f.label}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {formatBRLCompact(f.value_brl)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-6 flex-1 rounded-md bg-muted/60">
                                <div
                                  className="flex h-6 items-center rounded-md bg-primary px-2 text-[11px] font-medium tabular-nums text-primary-foreground"
                                  style={{ width: `${Math.max(6, (f.deals / maxFunil) * 100)}%` }}
                                >
                                  {f.deals}
                                </div>
                              </div>
                              <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                {pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}

                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-mirror-vendido/40 bg-mirror-vendido/5 p-3">
                        <p className="text-xs text-muted-foreground">{ganho?.label ?? "Ganhos"}</p>
                        <p className="font-display text-lg font-semibold tabular-nums">{ganho?.deals ?? 0}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {formatBRLCompact(ganho?.value_brl ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                        <p className="text-xs text-muted-foreground">{perdido?.label ?? "Perdidos"}</p>
                        <p className="font-display text-lg font-semibold tabular-nums">{perdido?.deals ?? 0}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {formatBRLCompact(perdido?.value_brl ?? 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Tempo médio por etapa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.tempo_por_etapa.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem histórico de movimentação no período.</p>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={[...data.tempo_por_etapa].sort((a, b) => a.position - b.position)}>
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={50} angle={-15} textAnchor="end" />
                            <YAxis tick={{ fontSize: 11 }} width={30} />
                            <RTooltip
                              formatter={(v: number) => [`${Number(v).toLocaleString("pt-BR")} dias`, "Tempo médio"]}
                              contentStyle={{ fontSize: 12 }}
                            />
                            <Bar dataKey="dias_medio" radius={[4, 4, 0, 0]}>
                              {data.tempo_por_etapa.map((t) => (
                                <Cell
                                  key={t.stage_id}
                                  fill={
                                    Number(t.dias_medio) === gargalo && gargalo > 0
                                      ? "hsl(var(--destructive))"
                                      : "hsl(var(--chart-1))"
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <p className="mt-2 text-xs text-muted-foreground">
                          A etapa em destaque é o gargalo atual do funil.
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Linha 3 */}
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Origem dos negócios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.por_origem.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem origens registradas.</p>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              data={data.por_origem}
                              dataKey="deals"
                              nameKey="origem"
                              innerRadius={45}
                              outerRadius={75}
                              paddingAngle={2}
                            >
                              {data.por_origem.map((_, i) => (
                                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                              ))}
                            </Pie>
                            <RTooltip contentStyle={{ fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <ul className="mt-3 space-y-1.5 text-xs">
                          {data.por_origem.map((o, i) => (
                            <li key={o.origem} className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                                  aria-hidden
                                />
                                <span className="capitalize">{o.origem}</span>
                              </span>
                              <span className="tabular-nums text-muted-foreground">
                                {o.deals} · {formatBRLCompact(o.value_brl)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Ranking de corretores</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    {data.por_corretor.length === 0 ? (
                      <p className="px-6 text-sm text-muted-foreground">Nenhum corretor ativo cadastrado.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Corretor</TableHead>
                            <TableHead className="text-right">Neg.</TableHead>
                            <TableHead className="text-right">Ganhos</TableHead>
                            <TableHead className="text-right">VGV</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...data.por_corretor]
                            .sort((a, b) => Number(b.value_brl) - Number(a.value_brl))
                            .map((c) => (
                              <TableRow key={c.broker_id}>
                                <TableCell className="py-2">
                                  <p className="text-sm font-medium">{c.corretor}</p>
                                  {c.equipe && <p className="text-xs text-muted-foreground">{c.equipe}</p>}
                                </TableCell>
                                <TableCell className="py-2 text-right tabular-nums">{c.deals}</TableCell>
                                <TableCell className="py-2 text-right tabular-nums">{c.ganhos}</TableCell>
                                <TableCell className="py-2 text-right tabular-nums">
                                  {formatBRLCompact(c.value_brl)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Motivos de perda</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {data.motivos_perda.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma perda registrada no período.</p>
                    ) : (
                      data.motivos_perda.map((m) => {
                        const max = Math.max(...data.motivos_perda.map((x) => x.deals), 1);
                        return (
                          <div key={m.motivo} className="space-y-1">
                            <div className="flex items-baseline justify-between gap-2 text-sm">
                              <span>{m.motivo}</span>
                              <span className="tabular-nums text-muted-foreground">{m.deals}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted/60">
                              <div
                                className="h-2 rounded-full bg-destructive"
                                style={{ width: `${(m.deals / max) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Linha 4 */}
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Estoque</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60">
                      {ESTOQUE_BARS.map((b) => {
                        const v = data.estoque[b.key];
                        if (!v) return null;
                        return (
                          <div
                            key={b.key}
                            className={b.cls}
                            style={{ width: `${(v / Math.max(1, data.estoque.total)) * 100}%` }}
                            aria-hidden
                          />
                        );
                      })}
                    </div>
                    <ul className="grid grid-cols-2 gap-1.5 text-xs">
                      {ESTOQUE_BARS.map((b) => (
                        <li key={b.key} className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", b.cls)} aria-hidden />
                          <span>{b.label}</span>
                          <span className="ml-auto tabular-nums text-muted-foreground">{data.estoque[b.key]}</span>
                        </li>
                      ))}
                    </ul>
                    <Separator />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">VGV total</span>
                      <span className="tabular-nums">{formatBRLCompact(data.estoque.vgv_total)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">VGV vendido</span>
                      <span className="tabular-nums">{formatBRLCompact(data.estoque.vgv_vendido)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Análise de crédito</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.credito.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma análise de crédito registrada.</p>
                    ) : (
                      data.credito.map((c) => (
                        <div key={c.status} className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[11px]">
                            {CREDIT_LABEL[c.status] ?? c.status}
                          </Badge>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {c.qtd} · {formatBRLCompact(c.aprovado_brl)}
                          </span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base">Comissões</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prevista</span>
                      <span className="tabular-nums">{formatBRL2(data.comissoes.prevista_brl)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">A pagar</span>
                      <span className="tabular-nums">{formatBRL2(data.comissoes.a_pagar_brl)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paga</span>
                      <span className="tabular-nums">{formatBRL2(data.comissoes.paga_brl)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
