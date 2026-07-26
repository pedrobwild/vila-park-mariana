import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Bar, BarChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CalendarIcon, Download, UserPlus, Users } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  SOURCE_LABEL,
  SOURCES,
  formatBRL2,
  formatBRLCompact,
  formatDateBR,
  type CrmPerson,
  type CrmSource,
} from "@/lib/crm";
import { notifyCrmError } from "@/lib/crmErrors";
import { evaluateCompleteness } from "@/lib/person";
import { cn } from "@/lib/utils";

type PeriodKey = "30" | "90" | "180" | "ano" | "custom";

const PERIOD_LABEL: Record<PeriodKey, string> = {
  "30": "Últimos 30 dias",
  "90": "Últimos 90 dias",
  "180": "Últimos 180 dias",
  ano: "Este ano",
  custom: "Personalizado",
};

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

interface DealLite {
  id: string;
  person_id: string;
  title: string;
  value_brl: number;
  created_at: string;
  stage: { kind: string; label: string } | null;
}

interface ProposalLite {
  id: string;
  deal_id: string;
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users;
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

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

interface Props {
  onGoToLeads?: () => void;
}

export default function LeadsReport({ onGoToLeads }: Props) {
  const [period, setPeriod] = useState<PeriodKey>("180");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<CrmPerson[]>([]);
  const [deals, setDeals] = useState<DealLite[]>([]);
  const [proposals, setProposals] = useState<ProposalLite[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, d, pr] = await Promise.all([
      supabase.from("crm_people").select("*").order("created_at", { ascending: false }),
      supabase
        .from("crm_deals")
        .select("id, person_id, title, value_brl, created_at, stage:crm_stages(kind,label)"),
      supabase.from("crm_proposals").select("id, deal_id"),
    ]);
    if (p.error || d.error || pr.error) {
      notifyCrmError(p.error ?? d.error ?? pr.error, "Não foi possível carregar o relatório de leads.");
    }
    setPeople((p.data ?? []) as CrmPerson[]);
    setDeals((d.data ?? []) as unknown as DealLite[]);
    setProposals((pr.data ?? []) as ProposalLite[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { from, to } = useMemo(() => rangeFor(period, custom), [period, custom]);

  const inPeriod = useMemo(() => {
    const f = new Date(`${from}T00:00:00`).getTime();
    const t = new Date(`${to}T23:59:59`).getTime();
    return people.filter((p) => {
      const c = p.created_at ? new Date(p.created_at).getTime() : NaN;
      return Number.isFinite(c) && c >= f && c <= t;
    });
  }, [people, from, to]);

  const analysis = useMemo(() => {
    const ids = new Set(inPeriod.map((p) => p.id));
    const relDeals = deals.filter((d) => ids.has(d.person_id));
    const dealsByPerson = new Map<string, DealLite[]>();
    for (const d of relDeals) {
      const arr = dealsByPerson.get(d.person_id) ?? [];
      arr.push(d);
      dealsByPerson.set(d.person_id, arr);
    }
    const dealIds = new Set(relDeals.map((d) => d.id));
    const relProposals = proposals.filter((p) => dealIds.has(p.deal_id));
    const dealsWithProposal = new Set(relProposals.map((p) => p.deal_id));
    const won = relDeals.filter((d) => d.stage?.kind === "ganho");
    const vgvWon = won.reduce((s, d) => s + Number(d.value_brl ?? 0), 0);

    const withDeal = [...dealsByPerson.keys()].length;
    const convRate = inPeriod.length > 0 ? (withDeal / inPeriod.length) * 100 : 0;
    const ticket = won.length > 0 ? vgvWon / won.length : 0;

    // por origem
    const bySource = SOURCES.map((s) => {
      const leads = inPeriod.filter((p) => (p.source ?? "outro") === s);
      const lIds = new Set(leads.map((l) => l.id));
      const ds = relDeals.filter((d) => lIds.has(d.person_id));
      const gs = ds.filter((d) => d.stage?.kind === "ganho");
      return {
        source: s as CrmSource,
        leads: leads.length,
        deals: ds.length,
        won: gs.length,
        conv: leads.length > 0 ? (ds.length / leads.length) * 100 : 0,
        vgv: gs.reduce((sum, d) => sum + Number(d.value_brl ?? 0), 0),
      };
    })
      .filter((r) => r.leads > 0 || r.deals > 0)
      .sort((a, b) => b.leads - a.leads);

    // evolução mensal (últimos 12 meses do período)
    const monthMap = new Map<string, number>();
    for (const p of inPeriod) {
      if (!p.created_at) continue;
      const k = monthKey(p.created_at);
      monthMap.set(k, (monthMap.get(k) ?? 0) + 1);
    }
    const monthly = [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([k, v]) => ({ key: k, label: monthLabel(k), leads: v }));

    // completude
    const complete: CrmPerson[] = [];
    const incomplete: { person: CrmPerson; missing: string[] }[] = [];
    for (const p of inPeriod) {
      const r = evaluateCompleteness(p);
      if (r.complete) complete.push(p);
      else incomplete.push({ person: p, missing: r.missing });
    }

    const noDeal = inPeriod.filter((p) => !dealsByPerson.has(p.id));

    return {
      relDeals,
      dealsByPerson,
      leadsCount: inPeriod.length,
      withDeal,
      convRate,
      ticket,
      wonCount: won.length,
      vgvWon,
      proposalDeals: dealsWithProposal.size,
      bySource,
      monthly,
      complete,
      incomplete,
      noDeal,
    };
  }, [inPeriod, deals, proposals]);

  const funnel = useMemo(() => {
    const steps = [
      { label: "Leads", count: analysis.leadsCount },
      { label: "Com negócio", count: analysis.relDeals.length },
      { label: "Com proposta", count: analysis.proposalDeals },
      { label: "Ganhos", count: analysis.wonCount },
    ];
    const max = Math.max(1, ...steps.map((s) => s.count));
    return steps.map((s, i) => ({
      ...s,
      pct: i === 0 ? 100 : steps[i - 1].count > 0 ? (s.count / steps[i - 1].count) * 100 : 0,
      width: Math.max(6, (s.count / max) * 100),
    }));
  }, [analysis]);

  const exportCsv = useCallback(() => {
    const header = [
      "Nome",
      "E-mail",
      "Telefone",
      "CPF",
      "Origem",
      "Cidade",
      "Cadastro completo",
      "Negócios",
      "Etapa atual",
      "VGV",
      "Data de cadastro",
    ];
    const rows = inPeriod.map((p) => {
      const ds = analysis.dealsByPerson.get(p.id) ?? [];
      const vgv = ds.reduce((s, d) => s + Number(d.value_brl ?? 0), 0);
      const stage = ds[0]?.stage?.label ?? "";
      return [
        p.full_name,
        p.email ?? "",
        p.phone ?? "",
        p.cpf ?? "",
        SOURCE_LABEL[(p.source ?? "outro") as CrmSource] ?? "",
        p.city ?? "",
        evaluateCompleteness(p).complete ? "Sim" : "Não",
        ds.length,
        stage,
        vgv > 0 ? vgv.toFixed(2).replace(".", ",") : "",
        p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "",
      ];
    });
    const csv =
      "\uFEFF" +
      [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-vila-park-${iso(new Date())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [inPeriod, analysis]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Período + export */}
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

        <p className="text-xs text-muted-foreground">
          {formatDateBR(from)} até {formatDateBR(to)}
        </p>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-9"
          onClick={exportCsv}
          disabled={inPeriod.length === 0}
        >
          <Download className="mr-2 h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>

      {inPeriod.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="p-10 text-center">
            <p className="font-display text-lg font-semibold">Nenhum lead no período</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Amplie o período ou cadastre leads no módulo Leads para acompanhar a análise aqui.
            </p>
            {onGoToLeads && (
              <Button className="mt-4" size="sm" onClick={onGoToLeads}>
                Ir para Leads
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              icon={Users}
              label="Leads no período"
              value={String(analysis.leadsCount)}
              sub={`${people.length} leads na base total`}
            />
            <Kpi
              icon={UserPlus}
              label="Com negócio aberto"
              value={String(analysis.withDeal)}
              sub={`${analysis.relDeals.length} negócios criados`}
            />
            <Kpi
              icon={Users}
              label="Taxa lead → negócio"
              value={`${analysis.convRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              sub={`${analysis.wonCount} negócios ganhos`}
            />
            <Kpi
              icon={Users}
              label="Ticket médio ganho"
              value={formatBRLCompact(analysis.ticket)}
              sub={`${formatBRLCompact(analysis.vgvWon)} de VGV ganho`}
            />
          </div>

          {/* Origem */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Leads por origem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Negócios</TableHead>
                      <TableHead className="text-right">Ganhos</TableHead>
                      <TableHead className="text-right">Conversão</TableHead>
                      <TableHead className="text-right">VGV ganho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.bySource.map((r) => (
                      <TableRow key={r.source}>
                        <TableCell className="font-medium">{SOURCE_LABEL[r.source]}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.leads}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.deals}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.won}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.conv.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBRLCompact(r.vgv)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Evolução mensal */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Evolução mensal de leads</CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.monthly.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem leads no período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analysis.monthly}>
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={40} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
                      <RTooltip
                        formatter={(v: number) => [`${v} leads`, "Cadastros"]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="leads" radius={[4, 4, 0, 0]} fill="hsl(var(--chart-1))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Funil */}
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">
                  Funil lead → negócio → proposta → ganho
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {funnel.map((s, i) => (
                  <div key={s.label} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{s.label}</span>
                      <span className="tabular-nums text-muted-foreground">{s.count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 flex-1 rounded-md bg-muted/60">
                        <div
                          className="flex h-6 items-center rounded-md bg-primary px-2 text-[11px] font-medium tabular-nums text-primary-foreground"
                          style={{ width: `${s.width}%` }}
                        >
                          {s.count}
                        </div>
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                        {i === 0 ? "—" : `${s.pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`}
                      </span>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Percentual em relação à etapa anterior.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Completude */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Completude cadastral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="border-emerald-600/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
                  {analysis.complete.length} completos
                </Badge>
                <Badge variant="outline" className="border-amber-600/40 bg-amber-500/5 text-amber-700 dark:text-amber-400">
                  {analysis.incomplete.length} incompletos
                </Badge>
              </div>
              {analysis.incomplete.length > 0 && (
                <>
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                    Cadastro incompleto trava a análise de crédito e a emissão de contrato.
                  </p>
                  <Separator />
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {analysis.incomplete.map(({ person, missing }) => (
                      <li key={person.id} className="text-sm">
                        <span className="font-medium">{person.full_name}</span>
                        <span className="text-xs text-muted-foreground"> — falta: {missing.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          {/* Sem negócio */}
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <CardTitle className="font-display text-base">Leads sem negócio</CardTitle>
              {onGoToLeads && (
                <Button variant="outline" size="sm" className="h-8" onClick={onGoToLeads}>
                  Abrir módulo Leads
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {analysis.noDeal.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todos os leads do período já têm negócio registrado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead className="text-right">Cadastro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.noDeal.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {SOURCE_LABEL[(p.source ?? "outro") as CrmSource]}
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {p.phone ?? "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            VGV ganho considerado: {formatBRL2(analysis.vgvWon)}.
          </p>
        </>
      )}
    </div>
  );
}
