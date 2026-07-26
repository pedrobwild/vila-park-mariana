import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyCrmError } from "@/lib/crmErrors";
import {
  buildProposalFlow,
  flowTotals,
  FLOW_KIND_LABEL,
  toISODate,
  type FlowKind,
} from "@/lib/proposalFlow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { brl, formatPtNumber, formatUpdatedAt, parsePtNumber } from "./settingsUtils";

type Form = {
  down_pct: string;
  monthly_count: string;
  keys_pct: string;
  balloon_every: string;
  validity_days: string;
  incc_pct: string;
};

const EMPTY: Form = {
  down_pct: "10",
  monthly_count: "15",
  keys_pct: "75",
  balloon_every: "6",
  validity_days: "15",
  incc_pct: "0,45",
};

const PREVIEW_PRICE = 500000;

export default function PropostaSettings() {
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
        "proposal_default_down_pct, proposal_default_monthly_count, proposal_default_keys_pct, proposal_balloon_every_months, proposal_validity_days, proposal_incc_monthly, updated_at",
      )
      .limit(1)
      .maybeSingle();
    if (error) {
      notifyCrmError(error, { entity: "configuração", action: "consultar" });
      setLoading(false);
      return;
    }
    const next: Form = data
      ? {
          down_pct: formatPtNumber(Number(data.proposal_default_down_pct ?? 10)),
          monthly_count: String(data.proposal_default_monthly_count ?? 15),
          keys_pct: formatPtNumber(Number(data.proposal_default_keys_pct ?? 75)),
          balloon_every: String(data.proposal_balloon_every_months ?? 6),
          validity_days: String(data.proposal_validity_days ?? 15),
          incc_pct: formatPtNumber(Number(data.proposal_incc_monthly ?? 0.0045) * 100),
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

  const n = (k: keyof Form) => parsePtNumber(form[k]);

  const validate = (): string | null => {
    const down = n("down_pct");
    const keys = n("keys_pct");
    const count = n("monthly_count");
    const every = n("balloon_every");
    const validity = n("validity_days");
    const incc = n("incc_pct");
    if (!Number.isFinite(down) || down < 0 || down > 100) return "O ato deve ficar entre 0% e 100%.";
    if (!Number.isFinite(keys) || keys < 0 || keys > 100)
      return "O saldo nas chaves deve ficar entre 0% e 100%.";
    if (down + keys > 100) return "Ato e saldo nas chaves somados não podem passar de 100%.";
    if (!Number.isFinite(count) || count < 0)
      return "A quantidade de mensais não pode ser negativa.";
    if (!Number.isFinite(every) || every < 1) return "A intermediária precisa de pelo menos 1 mês.";
    if (!Number.isFinite(validity) || validity < 1)
      return "A validade precisa ser de ao menos 1 dia.";
    if (!Number.isFinite(incc) || incc < 0 || incc > 10)
      return "O índice de correção deve ficar entre 0% e 10% ao mês.";
    return null;
  };

  const preview = useMemo(() => {
    const down = Math.max(0, n("down_pct") || 0);
    const keysPct = Math.max(0, n("keys_pct") || 0);
    const count = Math.max(0, Math.floor(n("monthly_count") || 0));
    const every = Math.max(1, Math.floor(n("balloon_every") || 6));
    const incc = Math.max(0, (n("incc_pct") || 0) / 100);

    const downBrl = (PREVIEW_PRICE * down) / 100;
    const keysBrl = (PREVIEW_PRICE * keysPct) / 100;
    const remaining = Math.max(0, PREVIEW_PRICE - downBrl - keysBrl);
    const balloonCount = Math.floor(count / every);
    const parcels = count + balloonCount;
    const each = parcels > 0 ? remaining / parcels : 0;

    const rows = buildProposalFlow(
      {
        payment_method: "financiamento",
        final_price_brl: PREVIEW_PRICE,
        down_payment_brl: downBrl,
        monthly_count: count,
        monthly_brl: each,
        balloon_count: balloonCount,
        balloon_brl: each,
        keys_brl: keysBrl,
      },
      toISODate(new Date()),
      { inccMonthly: incc, balloonEveryMonths: every },
    );

    const byKind = new Map<FlowKind, { count: number; total: number }>();
    for (const r of rows) {
      const cur = byKind.get(r.kind) ?? { count: 0, total: 0 };
      byKind.set(r.kind, { count: cur.count + 1, total: cur.total + r.contractual });
    }
    return { byKind: Array.from(byKind.entries()), totals: flowTotals(rows) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const save = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("crm_settings").upsert(
      {
        id: true,
        proposal_default_down_pct: n("down_pct"),
        proposal_default_monthly_count: Math.round(n("monthly_count")),
        proposal_default_keys_pct: n("keys_pct"),
        proposal_balloon_every_months: Math.round(n("balloon_every")),
        proposal_validity_days: Math.round(n("validity_days")),
        proposal_incc_monthly: n("incc_pct") / 100,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    setSaving(false);
    if (error) {
      notifyCrmError(error, { entity: "configuração", action: "atualizar" });
      return;
    }
    toast.success("Configurações salvas.");
    await load();
  };

  if (loading) return <Skeleton className="h-96 w-full" />;

  const field = (id: keyof Form, label: string, suffix?: string, help?: string) => (
    <div className="space-y-1.5" key={id}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={form[id]}
          onChange={(e) => set(id, e.target.value)}
          className={suffix ? "pr-16" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Padrões de uma nova proposta</CardTitle>
          <CardDescription>
            Valores sugeridos ao criar uma proposta. O vendedor pode ajustar tudo caso a caso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("down_pct", "Ato / sinal (%)", "%")}
            {field("monthly_count", "Quantidade de mensais pré-chaves")}
            {field("keys_pct", "Saldo nas chaves (%)", "%")}
            {field("balloon_every", "Intermediária a cada (meses)", "meses")}
            {field("validity_days", "Validade da proposta (dias)", "dias")}
            {field("incc_pct", "Índice de correção das parcelas (INCC-M)", "% a.m.")}
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Prévia para um imóvel de {brl(PREVIEW_PRICE)}</p>
              <p className="text-xs text-muted-foreground">
                Distribuição gerada com os padrões acima, apenas para conferência.
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Etapa</th>
                    <th className="px-3 py-2 text-right font-medium">Parcelas</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {preview.byKind.map(([kind, v]) => (
                    <tr key={kind}>
                      <td className="px-3 py-2">{FLOW_KIND_LABEL[kind]}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{v.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{brl(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border/60 bg-muted/20 font-medium">
                  <tr>
                    <td className="px-3 py-2">Total contratual</td>
                    <td />
                    <td className="px-3 py-2 text-right tabular-nums">
                      {brl(preview.totals.contractual)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-muted-foreground">
                      Total projetado com correção
                    </td>
                    <td />
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {brl(preview.totals.corrected)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              O parcelamento pré-chaves é feito diretamente com a incorporadora. Apenas o saldo das
              chaves é financiado por banco.
            </p>
            <p>
              O INCC-M aqui é uma taxa de demonstração; o índice oficial vigente será aplicado no
              contrato definitivo.
            </p>
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
