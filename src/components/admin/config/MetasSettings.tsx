import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyCrmError } from "@/lib/crmErrors";
import { formatBRL2, formatBRLCompact, type CrmBroker } from "@/lib/crm";
import { parsePtNumber, formatPtNumber } from "./settingsUtils";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Copy, Loader2 } from "lucide-react";

type GoalRow = {
  id: string;
  month: string;
  broker_id: string | null;
  vgv_target_brl: number;
  units_target: number;
};

type Draft = { vgv: string; units: string };

const EMPTY: Draft = { vgv: "", units: "" };

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(d: Date): string {
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shiftMonth(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function toDraft(row: GoalRow | undefined): Draft {
  if (!row) return EMPTY;
  return {
    vgv: row.vgv_target_brl ? formatPtNumber(Number(row.vgv_target_brl), 2) : "",
    units: row.units_target ? String(row.units_target) : "",
  };
}

function draftValues(d: Draft) {
  const vgv = parsePtNumber(d.vgv);
  const units = parsePtNumber(d.units);
  return {
    vgv: Number.isFinite(vgv) ? Math.max(0, vgv) : 0,
    units: Number.isFinite(units) ? Math.max(0, Math.round(units)) : 0,
  };
}

export default function MetasSettings() {
  const [month, setMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brokers, setBrokers] = useState<CrmBroker[]>([]);
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [team, setTeam] = useState<Draft>(EMPTY);
  const [byBroker, setByBroker] = useState<Record<string, Draft>>({});

  const mKey = monthKey(month);

  const hydrate = useCallback((goals: GoalRow[]) => {
    setTeam(toDraft(goals.find((g) => g.broker_id === null)));
    const map: Record<string, Draft> = {};
    for (const g of goals) if (g.broker_id) map[g.broker_id] = toDraft(g);
    setByBroker(map);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: bs, error: be }, { data: gs, error: ge }] = await Promise.all([
      supabase.from("crm_brokers").select("*").eq("is_active", true).order("full_name"),
      supabase.from("crm_sales_goals").select("*").eq("month", mKey),
    ]);
    if (be) notifyCrmError(be, { entity: "corretor", action: "consultar" });
    if (ge) notifyCrmError(ge, { entity: "meta", action: "consultar" });
    setBrokers((bs ?? []) as CrmBroker[]);
    const goals = (gs ?? []) as GoalRow[];
    setRows(goals);
    hydrate(goals);
    setLoading(false);
  }, [mKey, hydrate]);

  useEffect(() => {
    void load();
  }, [load]);

  const individualSum = useMemo(() => {
    return brokers.reduce((acc, b) => acc + draftValues(byBroker[b.id] ?? EMPTY).vgv, 0);
  }, [brokers, byBroker]);

  const individualUnits = useMemo(() => {
    return brokers.reduce((acc, b) => acc + draftValues(byBroker[b.id] ?? EMPTY).units, 0);
  }, [brokers, byBroker]);

  const teamValues = draftValues(team);
  const diverges = teamValues.vgv > 0 && Math.abs(individualSum - teamValues.vgv) >= 1;
  const hasAnyGoal = rows.length > 0;

  const persist = async (brokerId: string | null, d: Draft) => {
    const { vgv, units } = draftValues(d);
    const existing = rows.find((r) => r.broker_id === brokerId);
    if (!existing && vgv === 0 && units === 0) return true;
    const { error } = await supabase
      .from("crm_sales_goals")
      .upsert(
        { month: mKey, broker_id: brokerId, vgv_target_brl: vgv, units_target: units },
        { onConflict: brokerId ? "month,broker_id" : "month" },
      );
    if (error) {
      notifyCrmError(error, { entity: "meta", action: "salvar" });
      return false;
    }
    return true;
  };

  const saveTeam = async () => {
    setSaving(true);
    const ok = await persist(null, team);
    if (ok) toast({ title: "Meta da equipe salva", description: monthLabel(month) });
    await load();
    setSaving(false);
  };

  const saveBrokers = async () => {
    setSaving(true);
    let ok = true;
    for (const b of brokers) {
      const r = await persist(b.id, byBroker[b.id] ?? EMPTY);
      ok = ok && r;
    }
    if (ok) toast({ title: "Metas por corretor salvas", description: monthLabel(month) });
    await load();
    setSaving(false);
  };

  const copyPrevious = async () => {
    const prev = monthKey(shiftMonth(month, -1));
    const { data, error } = await supabase.from("crm_sales_goals").select("*").eq("month", prev);
    if (error) {
      notifyCrmError(error, { entity: "meta", action: "consultar" });
      return;
    }
    const goals = (data ?? []) as GoalRow[];
    if (goals.length === 0) {
      toast({
        title: "Nada para copiar",
        description: `Não há metas cadastradas em ${monthLabel(shiftMonth(month, -1))}.`,
      });
      return;
    }
    hydrate(goals);
    toast({
      title: "Metas copiadas para o formulário",
      description: "Revise os valores e clique em salvar para confirmar.",
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Metas de vendas</CardTitle>
            <CardDescription>
              Defina a meta de VGV e de unidades do mês para a equipe e para cada corretor. Esses
              números alimentam o painel de Relatórios.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mês anterior"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[9.5rem] text-center text-sm font-medium tabular-nums">
              {monthLabel(month)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Próximo mês"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              {!hasAnyGoal && (
                <p className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  Nenhuma meta cadastrada em {monthLabel(month)}. Preencha os campos abaixo ou copie
                  as metas do mês anterior.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="meta-vgv">Meta de VGV (R$)</Label>
                  <Input
                    id="meta-vgv"
                    inputMode="decimal"
                    placeholder="2.000.000,00"
                    className="text-right tabular-nums"
                    value={team.vgv}
                    onChange={(e) => setTeam((t) => ({ ...t, vgv: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meta-un">Meta de unidades</Label>
                  <Input
                    id="meta-un"
                    inputMode="numeric"
                    placeholder="5"
                    className="w-28 text-right tabular-nums"
                    value={team.units}
                    onChange={(e) => setTeam((t) => ({ ...t, units: e.target.value }))}
                  />
                </div>
                <Button onClick={() => void saveTeam()} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar meta da equipe
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Meta da equipe do mês: {formatBRLCompact(teamValues.vgv)} ·{" "}
                {teamValues.units} unidade(s).
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Meta por corretor</CardTitle>
            <CardDescription>
              Somente corretores ativos aparecem aqui. Edite os valores direto na tabela.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void copyPrevious()} disabled={loading}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar metas do mês anterior
            </Button>
            <Button onClick={() => void saveBrokers()} disabled={saving || loading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar metas por corretor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : brokers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum corretor ativo cadastrado. Cadastre a equipe em Comercial → Corretores para
              distribuir metas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corretor</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead className="text-right">Meta de VGV (R$)</TableHead>
                  <TableHead className="text-right">Meta de unidades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokers.map((b) => {
                  const d = byBroker[b.id] ?? EMPTY;
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{b.team ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          inputMode="decimal"
                          aria-label={`Meta de VGV de ${b.full_name}`}
                          placeholder="0,00"
                          className="ml-auto h-9 w-40 text-right tabular-nums"
                          value={d.vgv}
                          onChange={(e) =>
                            setByBroker((m) => ({ ...m, [b.id]: { ...d, vgv: e.target.value } }))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          inputMode="numeric"
                          aria-label={`Meta de unidades de ${b.full_name}`}
                          placeholder="0"
                          className="ml-auto h-9 w-24 text-right tabular-nums"
                          value={d.units}
                          onChange={(e) =>
                            setByBroker((m) => ({ ...m, [b.id]: { ...d, units: e.target.value } }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="text-xs uppercase tracking-wide">
                    Soma das metas individuais
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBRL2(individualSum)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{individualUnits}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}

          {!loading && diverges && (
            <p className="mt-3 text-xs text-muted-foreground">
              As metas individuais somam {formatBRL2(individualSum)}, a meta da equipe é{" "}
              {formatBRL2(teamValues.vgv)}.
            </p>
          )}

          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            O acompanhamento do realizado contra a meta aparece no módulo Relatórios.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
