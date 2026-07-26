import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Plus, Shuffle, Trash2, Users } from "lucide-react";
import {
  initials,
  relativeDateBR,
  type CrmBroker,
  type CrmSettings,
} from "@/lib/crm";
import LossReasonsManager from "./LossReasonsManager";

type FormState = {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  team: string;
  creci: string;
  commission_pct: string;
  weight: string;
  in_rotation: boolean;
  is_active: boolean;
};

const EMPTY: FormState = {
  full_name: "",
  email: "",
  phone: "",
  team: "",
  creci: "",
  commission_pct: "3",
  weight: "1",
  in_rotation: true,
  is_active: true,
};

export default function BrokersManager() {
  const [brokers, setBrokers] = useState<CrmBroker[]>([]);
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CrmBroker | null>(null);
  const [nextInLine, setNextInLine] = useState<string | null>(null);
  const [checkingNext, setCheckingNext] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [b, s] = await Promise.all([
      supabase.from("crm_brokers").select("*").order("full_name"),
      supabase.from("crm_settings").select("*").maybeSingle(),
    ]);
    setBrokers((b.data ?? []) as CrmBroker[]);
    setSettings((s.data ?? null) as CrmSettings | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (patch: Partial<CrmSettings>) => {
    const next = { ...(settings ?? {}), ...patch, id: true } as CrmSettings;
    setSettings(next);
    const { error } = await supabase.from("crm_settings").upsert(next, { onConflict: "id" });
    if (error) {
      notifyCrmError(error as SbErr, { entity: "configurações", action: "atualizar" });
      await load();
      return;
    }
    toast.success("Configurações salvas.");
  };

  const submit = async () => {
    if (!form) return;
    if (!form.full_name.trim()) {
      toast.error("Informe o nome do corretor.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        team: form.team.trim() || null,
        creci: form.creci.trim() || null,
        commission_pct: Number(form.commission_pct.replace(",", ".")) || 0,
        weight: Math.max(1, Math.round(Number(form.weight) || 1)),
        in_rotation: form.in_rotation,
        is_active: form.is_active,
      };
      const { error } = form.id
        ? await supabase.from("crm_brokers").update(payload).eq("id", form.id)
        : await supabase.from("crm_brokers").insert(payload);
      if (error) throw error;
      toast.success(form.id ? "Corretor atualizado." : "Corretor cadastrado.");
      setForm(null);
      await load();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "corretor", action: form.id ? "atualizar" : "criar" });
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (b: CrmBroker, field: "in_rotation" | "is_active", v: boolean) => {
    setBrokers((prev) => prev.map((x) => (x.id === b.id ? { ...x, [field]: v } : x)));
    const { error } = await supabase.from("crm_brokers").update({ [field]: v }).eq("id", b.id);
    if (error) {
      notifyCrmError(error as SbErr, { entity: "corretor", action: "atualizar" });
      await load();
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("crm_brokers").delete().eq("id", toDelete.id);
    if (error) {
      notifyCrmError(error as SbErr, { entity: "corretor", action: "excluir" });
    } else {
      toast.success("Corretor excluído.");
      await load();
    }
    setToDelete(null);
  };

  const previewNext = async () => {
    setCheckingNext(true);
    const { data, error } = await supabase.rpc("crm_next_broker");
    setCheckingNext(false);
    if (error) {
      notifyCrmError(error as SbErr, { entity: "roleta", action: "consultar" });
      return;
    }
    const found = brokers.find((b) => b.id === data);
    setNextInLine(found?.full_name ?? "Nenhum corretor elegível");
  };

  const pctToInput = (v: number | undefined | null) =>
    ((Number(v ?? 0) * 100).toFixed(2)).replace(".", ",");

  return (
    <div className="space-y-6">
      {/* Roleta settings */}
      <section className="rounded-xl border border-border/60 p-4 space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold">Configurações da roleta</h2>
          <p className="text-xs text-muted-foreground">
            A fila ordena por negócios atribuídos ÷ peso; peso maior recebe proporcionalmente mais
            negócios.
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-3">
              <Label htmlFor="roleta" className="text-sm cursor-pointer">
                Distribuição automática de novos negócios
              </Label>
              <Switch
                id="roleta"
                checked={settings?.roleta_enabled ?? true}
                onCheckedChange={(v) => saveSettings({ roleta_enabled: v })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <NumberSetting
                id="def-comm"
                label="Comissão padrão (%)"
                value={String(settings?.default_commission_pct ?? 3).replace(".", ",")}
                onCommit={(v) => saveSettings({ default_commission_pct: v })}
              />
              <NumberSetting
                id="stale"
                label="Alertar negócio parado após (dias)"
                value={String(settings?.stale_deal_days ?? 7)}
                onCommit={(v) => saveSettings({ stale_deal_days: Math.round(v) })}
              />
              <NumberSetting
                id="sla"
                label="SLA padrão de tarefas (dias)"
                value={String(settings?.task_sla_days ?? 2)}
                onCommit={(v) => saveSettings({ task_sla_days: Math.round(v) })}
              />
              <NumberSetting
                id="vpl"
                label="Taxa de desconto VPL (% a.m.)"
                value={pctToInput(settings?.vpl_monthly_rate)}
                onCommit={(v) => saveSettings({ vpl_monthly_rate: v / 100 })}
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={previewNext} disabled={checkingNext}>
                <Shuffle className="h-3.5 w-3.5 mr-1.5" />
                {checkingNext ? "Consultando…" : "Próximo da fila"}
              </Button>
              {nextInLine && (
                <span className="text-xs text-muted-foreground">
                  Próximo a receber: <strong className="text-foreground">{nextInLine}</strong>
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {/* Brokers */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Corretores</h2>
          <Button size="sm" className="h-8" onClick={() => setForm({ ...EMPTY })}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo corretor
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : brokers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center space-y-2">
            <Users className="mx-auto h-6 w-6 text-muted-foreground/70" />
            <p className="text-sm font-medium">Nenhum corretor cadastrado</p>
            <p className="text-xs text-muted-foreground">
              Cadastre a equipe para distribuir negócios automaticamente.
            </p>
            <Button size="sm" variant="outline" onClick={() => setForm({ ...EMPTY })}>
              Cadastrar corretor
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Corretor</th>
                  <th className="px-3 py-2 font-medium">Equipe</th>
                  <th className="px-3 py-2 font-medium">CRECI</th>
                  <th className="px-3 py-2 font-medium">Contato</th>
                  <th className="px-3 py-2 font-medium text-right">Comissão</th>
                  <th className="px-3 py-2 font-medium text-right">Peso</th>
                  <th className="px-3 py-2 font-medium text-center">Na roleta</th>
                  <th className="px-3 py-2 font-medium text-center">Ativo</th>
                  <th className="px-3 py-2 font-medium text-right">Atribuídos</th>
                  <th className="px-3 py-2 font-medium">Última atribuição</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {brokers.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">
                            {initials(b.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{b.full_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{b.team ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{b.creci ?? "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      <div className="truncate max-w-[180px]">{b.email ?? "—"}</div>
                      <div>{b.phone ?? ""}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {Number(b.commission_pct).toLocaleString("pt-BR", {
                        maximumFractionDigits: 2,
                      })}
                      %
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{b.weight}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Switch
                        checked={b.in_rotation}
                        onCheckedChange={(v) => toggleField(b, "in_rotation", v)}
                        aria-label={`Roleta de ${b.full_name}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Switch
                        checked={b.is_active}
                        onCheckedChange={(v) => toggleField(b, "is_active", v)}
                        aria-label={`Ativo ${b.full_name}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{b.assigned_count}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {relativeDateBR(b.last_assigned_at)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Editar ${b.full_name}`}
                          onClick={() =>
                            setForm({
                              id: b.id,
                              full_name: b.full_name,
                              email: b.email ?? "",
                              phone: b.phone ?? "",
                              team: b.team ?? "",
                              creci: b.creci ?? "",
                              commission_pct: String(b.commission_pct).replace(".", ","),
                              weight: String(b.weight),
                              in_rotation: b.in_rotation,
                              is_active: b.is_active,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label={`Excluir ${b.full_name}`}
                          onClick={() => setToDelete(b)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && brokers.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {brokers.filter((b) => b.is_active && b.in_rotation).length} corretor(es) na roleta ·{" "}
            <Badge variant="outline" className="text-[10px]">
              {brokers.filter((b) => !b.is_active).length} inativo(s)
            </Badge>
          </p>
        )}
      </section>

      <Separator />

      <LossReasonsManager />

      {/* Form dialog */}
      <Dialog open={!!form} onOpenChange={(o) => !o && !saving && setForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {form && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {form.id ? "Editar corretor" : "Novo corretor"}
                </DialogTitle>
                <DialogDescription>
                  Dados usados na distribuição de negócios e no cálculo de comissão.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="bk-name">Nome completo *</Label>
                  <Input
                    id="bk-name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-email">E-mail</Label>
                  <Input
                    id="bk-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-phone">Telefone</Label>
                  <Input
                    id="bk-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-team">Equipe</Label>
                  <Input
                    id="bk-team"
                    value={form.team}
                    onChange={(e) => setForm({ ...form, team: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-creci">CRECI</Label>
                  <Input
                    id="bk-creci"
                    value={form.creci}
                    onChange={(e) => setForm({ ...form, creci: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-comm">Comissão (%)</Label>
                  <Input
                    id="bk-comm"
                    inputMode="decimal"
                    value={form.commission_pct}
                    onChange={(e) => setForm({ ...form, commission_pct: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bk-weight">Peso na roleta</Label>
                  <Input
                    id="bk-weight"
                    inputMode="numeric"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <Label htmlFor="bk-rot" className="text-sm cursor-pointer">
                    Participa da roleta
                  </Label>
                  <Switch
                    id="bk-rot"
                    checked={form.in_rotation}
                    onCheckedChange={(v) => setForm({ ...form, in_rotation: v })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <Label htmlFor="bk-act" className="text-sm cursor-pointer">
                    Ativo
                  </Label>
                  <Switch
                    id="bk-act"
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={submit} disabled={saving || !form.full_name.trim()}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir corretor</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.full_name} será removido da equipe. Negócios já atribuídos ficarão sem
              corretor responsável.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NumberSetting({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        inputMode="decimal"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = Number(local.replace(",", "."));
          if (!Number.isFinite(n)) {
            setLocal(value);
            return;
          }
          if (local !== value) onCommit(n);
        }}
        className="h-9 tabular-nums"
      />
    </div>
  );
}
