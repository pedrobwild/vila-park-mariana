import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { Target } from "lucide-react";
import { formatBRLCompact, formatBRL2 } from "@/lib/crm";
import { formatPct } from "@/lib/crmAdvanced";
import { cn } from "@/lib/utils";

export interface GoalsData {
  mes: string;
  dias: { total: number; decorridos: number; restantes: number; uteis_restantes: number };
  equipe: {
    vgv_meta: number;
    vgv_realizado: number;
    vgv_pct: number | null;
    unid_meta: number;
    unid_realizado: number;
    unid_pct: number | null;
    vgv_projecao: number;
    vgv_falta: number;
    ritmo_vgv_dia_util: number | null;
    ritmo_unid_semana: number | null;
    vgv_mes_anterior: number;
    unid_mes_anterior: number;
    vgv_var_pct: number | null;
  };
  por_corretor: {
    broker_id: string;
    corretor: string;
    equipe: string | null;
    vgv_meta: number;
    vgv_realizado: number;
    vgv_pct: number | null;
    unid_meta: number;
    unid_realizado: number;
    unid_pct: number | null;
    deals_ganhos: number;
    deals_abertos: number;
    vgv_aberto: number;
  }[];
  historico: { mes: string; vgv_meta: number; unid_meta: number; vgv_realizado: number; unid_realizado: number }[];
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;

/** Número opcional: mantém `null` quando o backend não tem valor (meta não cadastrada). */
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Data do mês a partir de `yyyy-MM-dd`; `null` quando o valor é inválido. */
function mesDate(iso: string): Date | null {
  const [y, m] = String(iso).split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return new Date(y, m - 1, 1);
}

function mesExtenso(iso: string) {
  const d = mesDate(iso);
  if (!d) return "mês não informado";
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mesCurto(iso: string) {
  const d = mesDate(iso);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}


/** Barra de progresso do termômetro de meta — trava em 100% e informa o excedente por texto. */
function Termometro({
  titulo,
  pct,
  realizadoTexto,
  metaTexto,
  faltaTexto,
}: {
  titulo: string;
  pct: number | null;
  realizadoTexto: string;
  metaTexto: string;
  faltaTexto: string;
}) {
  const largura = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{titulo}</p>
        <p className="font-display text-3xl font-semibold tabular-nums">
          {pct === null ? "—" : formatPct(pct)}
        </p>
      </div>
      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted/60"
        role="progressbar"
        aria-valuenow={pct ?? 0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={titulo}
      >
        <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${largura}%` }} />
      </div>
      <p className="mt-2 text-sm">
        <span className="font-medium tabular-nums">{realizadoTexto}</span>{" "}
        <span className="text-muted-foreground">de {metaTexto} de meta</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {pct === null ? "Sem base de comparação" : faltaTexto}
      </p>
    </div>
  );
}

interface Props {
  data: GoalsData;
}

export default function MetasBlock({ data }: Props) {
  const e = data.equipe;
  const semMeta = num(e.vgv_meta) === 0 && num(e.unid_meta) === 0;

  const historico = useMemo(
    () =>
      (data.historico ?? []).map((h) => ({
        mes: mesCurto(String(h.mes)),
        Meta: num(h.vgv_meta),
        Realizado: num(h.vgv_realizado),
      })),
    [data.historico],
  );

  const melhorPct = useMemo(() => {
    const pcts = (data.por_corretor ?? []).map((c) => c.vgv_pct).filter((p): p is number => p !== null);
    return pcts.length ? Math.max(...pcts) : null;
  }, [data.por_corretor]);

  const vgvExcedente = num(e.vgv_realizado) - num(e.vgv_meta);
  const unidExcedente = num(e.unid_realizado) - num(e.unid_meta);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Target className="h-4 w-4 text-primary" aria-hidden />
          Metas de vendas — {mesExtenso(String(data.mes))}
        </CardTitle>
        <CardDescription>
          Atingimento da meta do mês, ritmo necessário para fechar o período e resultado por corretor.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {semMeta ? (
          <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
            <p className="text-sm font-medium">Meta ainda não definida para {mesExtenso(String(data.mes))}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre a meta de VGV e de unidades do mês para acompanhar o atingimento aqui.
            </p>
            <Link
              to="/admin?m=config&tab=metas"
              className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-4"
            >
              Definir meta em Configurações → Metas
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              <Termometro
                titulo="Meta de VGV do mês"
                pct={e.vgv_pct}
                realizadoTexto={formatBRL2(num(e.vgv_realizado))}
                metaTexto={formatBRL2(num(e.vgv_meta))}
                faltaTexto={
                  vgvExcedente >= 0
                    ? `Meta batida — ${formatBRL2(vgvExcedente)} acima do previsto`
                    : `Faltam ${formatBRL2(num(e.vgv_falta))} para bater a meta`
                }
              />
              <Termometro
                titulo="Meta de unidades vendidas"
                pct={e.unid_pct}
                realizadoTexto={`${num(e.unid_realizado)} unidade(s)`}
                metaTexto={`${num(e.unid_meta)} unidade(s)`}
                faltaTexto={
                  unidExcedente >= 0
                    ? `Meta batida — ${unidExcedente} unidade(s) acima do previsto`
                    : `Faltam ${Math.abs(unidExcedente)} unidade(s) para bater a meta`
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Projeção de fechamento</p>
                <p className="font-display text-xl font-semibold tabular-nums">
                  {formatBRLCompact(num(e.vgv_projecao))}
                </p>
                <p className="text-xs text-muted-foreground">no ritmo atual do mês</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Ritmo necessário por dia útil</p>
                <p className="font-display text-xl font-semibold tabular-nums">
                  {e.ritmo_vgv_dia_util === null ? "—" : formatBRLCompact(num(e.ritmo_vgv_dia_util))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.ritmo_vgv_dia_util === null ? "Sem base de comparação" : "para alcançar a meta de VGV"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Dias úteis restantes</p>
                <p className="font-display text-xl font-semibold tabular-nums">{data.dias.uteis_restantes}</p>
                <p className="text-xs text-muted-foreground">
                  contagem de segunda a sexta, sem considerar feriados
                </p>
              </div>
            </div>

            <div className="-mx-6 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Corretor</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead className="text-right">Meta de VGV</TableHead>
                    <TableHead className="text-right">Realizado</TableHead>
                    <TableHead className="w-[160px]">% de atingimento</TableHead>
                    <TableHead className="text-right">Meta de unid.</TableHead>
                    <TableHead className="text-right">Unid. vendidas</TableHead>
                    <TableHead className="text-right">Neg. abertos</TableHead>
                    <TableHead className="pr-6 text-right">VGV em aberto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.por_corretor ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum corretor ativo cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.por_corretor.map((c) => {
                      const destaque = melhorPct !== null && c.vgv_pct === melhorPct;
                      return (
                        <TableRow key={c.broker_id} className={cn(destaque && "bg-primary/5")}>
                          <TableCell className="pl-6 text-sm font-medium">{c.corretor}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.equipe ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {num(c.vgv_meta) > 0 ? formatBRLCompact(num(c.vgv_meta)) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatBRLCompact(num(c.vgv_realizado))}
                          </TableCell>
                          <TableCell>
                            {c.vgv_pct === null ? (
                              <span className="text-xs text-muted-foreground">Sem meta cadastrada</span>
                            ) : (
                              <div className="space-y-1">
                                <span className="text-sm font-medium tabular-nums">{formatPct(c.vgv_pct)}</span>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                                  <div
                                    className="h-2 rounded-full bg-primary"
                                    style={{ width: `${Math.max(0, Math.min(100, c.vgv_pct))}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {num(c.unid_meta) > 0 ? num(c.unid_meta) : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{num(c.unid_realizado)}</TableCell>
                          <TableCell className="text-right tabular-nums">{num(c.deals_abertos)}</TableCell>
                          <TableCell className="pr-6 text-right tabular-nums">
                            {formatBRLCompact(num(c.vgv_aberto))}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {historico.length > 0 && (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
              Meta e realizado de VGV nos últimos 6 meses
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historico} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v: number) => formatBRLCompact(v)}
                    width={72}
                  />
                  <RTooltip
                    formatter={(v: number, n) => [formatBRL2(Number(v)), String(n)]}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Meta" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Realizado" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
