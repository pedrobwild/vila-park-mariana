import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ChevronDown, ChevronRight, Coins } from "lucide-react";
import {
  COMMISSION_STATUS_LABEL,
  COMMISSION_STATUSES,
  commissionStatusClass,
  daysOverdue,
  formatBRL2,
  formatBRLCompact,
  formatDateBR,
  type CrmBroker,
  type CrmCommissionStatus,
} from "@/lib/crm";
import { notifyCrmError } from "@/lib/crmErrors";
import { cn } from "@/lib/utils";

interface CommissionRow {
  id: string;
  deal_id: string;
  proposal_id: string | null;
  base_brl: number;
  total_pct: number;
  total_brl: number;
  status: CrmCommissionStatus;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  deal: { id: string; title: string; person: { full_name: string } | null } | null;
}

interface SplitRow {
  id: string;
  commission_id: string;
  role: string;
  broker_id: string | null;
  beneficiary: string | null;
  pct: number;
  amount_brl: number;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Coins className="h-4 w-4" aria-hidden />
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

export default function CommissionsReport({ onGoToPipeline }: Props) {
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [brokers, setBrokers] = useState<CrmBroker[]>([]);
  const [status, setStatus] = useState<"all" | CrmCommissionStatus>("all");
  const [brokerId, setBrokerId] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [c, s, b] = await Promise.all([
      supabase
        .from("crm_commissions")
        .select("*, deal:crm_deals(id, title, person:crm_people(full_name))")
        .order("created_at", { ascending: false }),
      supabase.from("crm_commission_splits").select("*"),
      supabase.from("crm_brokers").select("*").order("full_name"),
    ]);
    if (c.error || s.error || b.error) {
      notifyCrmError(c.error ?? s.error ?? b.error, { entity: "comissão", action: "consultar" });
    }
    setCommissions((c.data ?? []) as unknown as CommissionRow[]);
    setSplits((s.data ?? []) as SplitRow[]);
    setBrokers((b.data ?? []) as CrmBroker[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const brokerName = useCallback(
    (id: string | null) => brokers.find((b) => b.id === id)?.full_name ?? null,
    [brokers],
  );

  const splitsByCommission = useMemo(() => {
    const m = new Map<string, SplitRow[]>();
    for (const s of splits) {
      const arr = m.get(s.commission_id) ?? [];
      arr.push(s);
      m.set(s.commission_id, arr);
    }
    return m;
  }, [splits]);

  const totals = useMemo(() => {
    const sum = (st: CrmCommissionStatus) =>
      commissions.filter((c) => c.status === st).reduce((a, c) => a + Number(c.total_brl ?? 0), 0);
    return {
      prevista: sum("prevista"),
      a_pagar: sum("a_pagar"),
      paga: sum("paga"),
      count: commissions.filter((c) => c.status !== "cancelada").length,
    };
  }, [commissions]);

  const filtered = useMemo(() => {
    return commissions.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (brokerId !== "all") {
        const ss = splitsByCommission.get(c.id) ?? [];
        if (!ss.some((s) => s.broker_id === brokerId)) return false;
      }
      return true;
    });
  }, [commissions, status, brokerId, splitsByCommission]);

  const overdue = useMemo(
    () =>
      commissions.filter((c) => {
        if (c.status !== "a_pagar" || !c.due_date) return false;
        const d = daysOverdue(c.due_date);
        return d !== null && d > 0;
      }),
    [commissions],
  );

  const ranking = useMemo(() => {
    const byCommission = new Map(commissions.map((c) => [c.id, c]));
    const m = new Map<string, { name: string; count: number; previsto: number; pago: number }>();
    for (const s of splits) {
      const c = byCommission.get(s.commission_id);
      if (!c || c.status === "cancelada") continue;
      const name = brokerName(s.broker_id) ?? s.beneficiary ?? "Não identificado";
      const cur = m.get(name) ?? { name, count: 0, previsto: 0, pago: 0 };
      cur.count += 1;
      cur.previsto += Number(s.amount_brl ?? 0);
      if (c.status === "paga") cur.pago += Number(s.amount_brl ?? 0);
      m.set(name, cur);
    }
    return [...m.values()].sort((a, b) => b.previsto - a.previsto);
  }, [splits, commissions, brokerName]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-10 text-center">
          <Coins className="mx-auto h-8 w-8 text-muted-foreground/60" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold">Nenhuma comissão registrada</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            As comissões são geradas a partir de negócios ganhos com proposta aceita. Assim que o
            primeiro negócio fechar, o rateio entre corretores aparece aqui.
          </p>
          <Button className="mt-4" size="sm" onClick={onGoToPipeline}>
            Ir para o pipeline
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total previsto"
          value={formatBRLCompact(totals.prevista)}
          sub="comissões ainda não liberadas"
        />
        <Kpi label="Total a pagar" value={formatBRLCompact(totals.a_pagar)} sub="liberadas, aguardando pagamento" />
        <Kpi label="Total pago" value={formatBRLCompact(totals.paga)} sub={`${totals.count} comissões ativas`} />
      </div>

      {overdue.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <p className="text-sm font-medium">
                {overdue.length}{" "}
                {overdue.length === 1 ? "comissão vencida" : "comissões vencidas"} aguardando pagamento
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setStatus("a_pagar")}>
              Filtrar a pagar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-9 w-[170px]" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {COMMISSION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {COMMISSION_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={brokerId} onValueChange={setBrokerId}>
          <SelectTrigger className="h-9 w-[200px]" aria-label="Filtrar por corretor">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os corretores</SelectItem>
            {brokers.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-muted-foreground">
          {filtered.length} de {commissions.length} comissões
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma comissão corresponde aos filtros selecionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Negócio</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">% total</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Pago em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const ss = splitsByCommission.get(c.id) ?? [];
                    const open = expanded.has(c.id);
                    const late =
                      c.status === "a_pagar" && c.due_date && (daysOverdue(c.due_date) ?? 0) > 0;
                    return (
                      <>
                        <TableRow key={c.id} className={cn(c.status === "cancelada" && "opacity-60")}>
                          <TableCell className="p-0 pl-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => toggle(c.id)}
                              aria-expanded={open}
                              aria-label={open ? "Ocultar rateios" : "Ver rateios"}
                            >
                              {open ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{c.deal?.title ?? "Negócio removido"}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.deal?.person?.full_name ?? "—"}
                            </p>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatBRL2(Number(c.base_brl ?? 0))}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {Number(c.total_pct ?? 0).toLocaleString("pt-BR", {
                              maximumFractionDigits: 2,
                            })}
                            %
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatBRL2(Number(c.total_brl ?? 0))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={commissionStatusClass(c.status)}>
                              {COMMISSION_STATUS_LABEL[c.status]}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={cn("tabular-nums text-muted-foreground", late && "text-destructive")}
                          >
                            {formatDateBR(c.due_date)}
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {formatDateBR(c.paid_at)}
                          </TableCell>
                        </TableRow>
                        {open &&
                          (ss.length === 0 ? (
                            <TableRow key={`${c.id}-empty`} className="bg-muted/20">
                              <TableCell />
                              <TableCell colSpan={7} className="text-xs text-muted-foreground">
                                Sem rateio cadastrado para esta comissão.
                              </TableCell>
                            </TableRow>
                          ) : (
                            ss.map((s) => (
                              <TableRow key={s.id} className="bg-muted/20">
                                <TableCell />
                                <TableCell className="pl-6 text-sm">
                                  <span className="text-muted-foreground">{s.role}</span>{" "}
                                  <span className="font-medium">
                                    {brokerName(s.broker_id) ?? s.beneficiary ?? "—"}
                                  </span>
                                </TableCell>
                                <TableCell />
                                <TableCell className="text-right tabular-nums text-muted-foreground">
                                  {Number(s.pct ?? 0).toLocaleString("pt-BR", {
                                    maximumFractionDigits: 2,
                                  })}
                                  %
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatBRL2(Number(s.amount_brl ?? 0))}
                                </TableCell>
                                <TableCell colSpan={3} />
                              </TableRow>
                            ))
                          ))}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Ranking por beneficiário</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem rateios registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beneficiário</TableHead>
                    <TableHead className="text-right">Comissões</TableHead>
                    <TableHead className="text-right">Total previsto</TableHead>
                    <TableHead className="text-right">Já pago</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL2(r.previsto)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL2(r.pago)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
