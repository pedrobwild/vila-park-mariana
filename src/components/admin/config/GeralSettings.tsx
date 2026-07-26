import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyCrmError } from "@/lib/crmErrors";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPtNumber, formatUpdatedAt, parsePtNumber } from "./settingsUtils";

type Form = {
  roleta_enabled: boolean;
  stale_deal_days: string;
  task_sla_days: string;
  default_commission_pct: string;
  vpl_monthly_rate_pct: string;
  vpl_correct_by_incc: boolean;
};

const EMPTY: Form = {
  roleta_enabled: true,
  stale_deal_days: "7",
  task_sla_days: "2",
  default_commission_pct: "3",
  vpl_monthly_rate_pct: "0,8",
  vpl_correct_by_incc: false,
};

export default function GeralSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [initial, setInitial] = useState<Form>(EMPTY);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_settings")
      .select(
        "roleta_enabled, stale_deal_days, task_sla_days, default_commission_pct, vpl_monthly_rate, vpl_correct_by_incc, updated_at",
      )
      .limit(1)
      .maybeSingle();
    if (error) {
      notifyCrmError(error, { entity: "configuração", action: "carregar" });
      setLoading(false);
      return;
    }
    const next: Form = data
      ? {
          roleta_enabled: !!data.roleta_enabled,
          stale_deal_days: String(data.stale_deal_days ?? 7),
          task_sla_days: String(data.task_sla_days ?? 2),
          default_commission_pct: formatPtNumber(Number(data.default_commission_pct ?? 3)),
          vpl_monthly_rate_pct: formatPtNumber(Number(data.vpl_monthly_rate ?? 0.008) * 100),
          vpl_correct_by_incc: !!data.vpl_correct_by_incc,
        }
      : EMPTY;
    setForm(next);
    setInitial(next);
    setUpdatedAt(data?.updated_at ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const validate = (): string | null => {
    const stale = parsePtNumber(form.stale_deal_days);
    const sla = parsePtNumber(form.task_sla_days);
    const comm = parsePtNumber(form.default_commission_pct);
    const vpl = parsePtNumber(form.vpl_monthly_rate_pct);
    if (!Number.isFinite(stale) || stale < 1) return "Informe pelo menos 1 dia para negócio parado.";
    if (!Number.isFinite(sla) || sla < 1) return "Informe pelo menos 1 dia para o prazo de tarefa.";
    if (!Number.isFinite(comm) || comm < 0 || comm > 100)
      return "A comissão padrão deve ficar entre 0% e 100%.";
    if (!Number.isFinite(vpl) || vpl < 0 || vpl > 10)
      return "A taxa de desconto para VPL deve ficar entre 0% e 10% ao mês.";
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    const payload = {
      id: true,
      roleta_enabled: form.roleta_enabled,
      stale_deal_days: Math.round(parsePtNumber(form.stale_deal_days)),
      task_sla_days: Math.round(parsePtNumber(form.task_sla_days)),
      default_commission_pct: parsePtNumber(form.default_commission_pct),
      vpl_monthly_rate: parsePtNumber(form.vpl_monthly_rate_pct) / 100,
      vpl_correct_by_incc: form.vpl_correct_by_incc,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("crm_settings").upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (error) {
      notifyCrmError(error, { entity: "configuração", action: "salvar" });
      return;
    }
    toast.success("Configurações salvas.");
    await load();
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição e prazos</CardTitle>
          <CardDescription>
            Como os negócios chegam aos corretores e quando o sistema sinaliza atraso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
            <div className="space-y-1">
              <Label htmlFor="roleta" className="text-sm font-medium">
                Roleta de distribuição automática
              </Label>
              <p className="text-xs text-muted-foreground">
                Quando ligada, novos negócios sem corretor são distribuídos automaticamente entre os
                corretores ativos, proporcionalmente ao peso de cada um.
              </p>
            </div>
            <Switch
              id="roleta"
              checked={form.roleta_enabled}
              onCheckedChange={(v) => set("roleta_enabled", v)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stale">Negócio parado após</Label>
              <div className="relative">
                <Input
                  id="stale"
                  inputMode="decimal"
                  value={form.stale_deal_days}
                  onChange={(e) => set("stale_deal_days", e.target.value)}
                  className="pr-12"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  dias
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Depois desse tempo sem mudar de etapa, o negócio é sinalizado como parado no
                pipeline.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sla">Prazo padrão de tarefa (SLA)</Label>
              <div className="relative">
                <Input
                  id="sla"
                  inputMode="decimal"
                  value={form.task_sla_days}
                  onChange={(e) => set("task_sla_days", e.target.value)}
                  className="pr-12"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  dias
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comissão e valor presente</CardTitle>
          <CardDescription>
            Parâmetros usados no cálculo de comissões e na análise de valor presente das propostas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="comm">Comissão padrão</Label>
              <div className="relative">
                <Input
                  id="comm"
                  inputMode="decimal"
                  value={form.default_commission_pct}
                  onChange={(e) => set("default_commission_pct", e.target.value)}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vpl">Taxa de desconto para VPL</Label>
              <div className="relative">
                <Input
                  id="vpl"
                  inputMode="decimal"
                  value={form.vpl_monthly_rate_pct}
                  onChange={(e) => set("vpl_monthly_rate_pct", e.target.value)}
                  className="pr-16"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  % a.m.
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Usada para calcular o valor presente das propostas e o desconto real embutido no
                parcelamento.
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
            <Label htmlFor="incc" className="text-sm font-medium">
              Corrigir parcelas pelo INCC antes de descontar
            </Label>
            <Switch
              id="incc"
              checked={form.vpl_correct_by_incc}
              onCheckedChange={(v) => set("vpl_correct_by_incc", v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Última atualização em {formatUpdatedAt(updatedAt)}
        </p>
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
