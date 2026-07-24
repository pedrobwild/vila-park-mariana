import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  Trash2,
  Star,
  Phone,
  Mail,
  MessageSquare,
  StickyNote,
  MapPin,
  GitCommitVertical,
} from "lucide-react";
import { formatBRL, STATUS_LABEL } from "@/lib/units";
import type { Unit } from "@/lib/units";
import {
  ACTIVITY_LABEL,
  INTEREST_LABEL,
  SOURCE_LABEL,
  formatBRLCompact,
  stageBadgeClass,
  type CrmActivity,
  type CrmActivityType,
  type CrmInterest,
  type CrmStageRow,
} from "@/lib/crm";
import {
  MARITAL_STATUS_LABEL,
  maskCPF,
  formatBRLValue,
  evaluateCompleteness,
  type MaritalStatus,
} from "@/lib/person";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { DealFull } from "./CrmSection";
import ProposalsSection from "./ProposalsSection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface Props {
  deal: DealFull | null;
  units: Unit[];
  stages: CrmStageRow[];
  onClose: () => void;
  onReload: () => Promise<void>;
}

const ACTIVITY_ICONS: Record<CrmActivityType, typeof StickyNote> = {
  nota: StickyNote,
  ligacao: Phone,
  email: Mail,
  whatsapp: MessageSquare,
  visita: MapPin,
  mudanca_etapa: GitCommitVertical,
};

export default function DealDetailSheet({ deal, units, stages, onClose, onReload }: Props) {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loadingAct, setLoadingAct] = useState(false);
  const [newType, setNewType] = useState<CrmActivityType>("nota");
  const [newContent, setNewContent] = useState("");
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<CrmStageRow | null>(null);
  const [updateUnitStatus, setUpdateUnitStatus] = useState(true);
  const [lostReason, setLostReason] = useState("");

  useEffect(() => {
    if (!deal) return;
    setLoadingAct(true);
    supabase
      .from("crm_activities")
      .select("*")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setActivities((data ?? []) as CrmActivity[]);
        setLoadingAct(false);
      });
  }, [deal?.id]);

  const availableUnits = useMemo(() => {
    if (!deal) return [];
    const linked = new Set(deal.deal_units.map((du) => du.unit_id));
    return units.filter((u) => u.status !== "vendido" && !linked.has(u.id));
  }, [deal, units]);

  if (!deal) return null;

  const reload = async () => {
    await onReload();
    const { data } = await supabase
      .from("crm_activities")
      .select("*")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: false });
    setActivities((data ?? []) as CrmActivity[]);
  };

  const addUnit = async (unitId: string) => {
    setBusy(true);
    try {
      const isFirst = deal.deal_units.length === 0;
      const { error } = await supabase
        .from("crm_deal_units")
        .insert({ deal_id: deal.id, unit_id: unitId, interest_level: "media", is_primary: isFirst });
      if (error) throw error;
      setAddUnitOpen(false);
      await reload();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "unidade do negócio", action: "criar" });
    } finally {
      setBusy(false);
    }
  };

  const removeUnit = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("crm_deal_units").delete().eq("id", id);
      if (error) throw error;
      await reload();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "unidade do negócio", action: "excluir" });
    } finally {
      setBusy(false);
    }
  };

  const setInterest = async (id: string, level: CrmInterest) => {
    const { error } = await supabase
      .from("crm_deal_units")
      .update({ interest_level: level })
      .eq("id", id);
    if (error) {
      notifyCrmError(error as SbErr, { entity: "unidade do negócio", action: "atualizar" });
      return;
    }
    await reload();
  };

  const setPrimary = async (id: string) => {
    setBusy(true);
    try {
      const r1 = await supabase
        .from("crm_deal_units")
        .update({ is_primary: false })
        .eq("deal_id", deal.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase
        .from("crm_deal_units")
        .update({ is_primary: true })
        .eq("id", id);
      if (r2.error) throw r2.error;
      await reload();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "unidade do negócio", action: "atualizar" });
    } finally {
      setBusy(false);
    }
  };

  const addActivity = async () => {
    if (!newContent.trim()) {
      toast.error("Escreva a atividade.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("crm_activities")
        .insert({ deal_id: deal.id, type: newType, content: newContent.trim() });
      if (error) throw error;
      setNewContent("");
      setNewType("nota");
      await reload();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "atividade", action: "criar" });
    } finally {
      setBusy(false);
    }
  };

  const requestStageChange = (to: CrmStageRow) => {
    if (!deal || to.id === deal.stage_id) return;
    setLostReason("");
    setUpdateUnitStatus(to.reserves_unit || to.kind === "ganho");
    setPending(to);
  };

  const confirmStageChange = async () => {
    if (!deal || !pending) return;
    if (pending.kind === "perdido" && !lostReason.trim()) {
      toast.error("Informe o motivo da perda.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("crm_deals")
        .update({
          stage_id: pending.id,
          lost_reason: pending.kind === "perdido" ? lostReason.trim() : null,
        })
        .eq("id", deal.id);
      if (error) throw error;
      const pu = deal.deal_units.find((du) => du.is_primary) ?? deal.deal_units[0];
      if (updateUnitStatus && pu?.unit) {
        if (pending.reserves_unit && pu.unit.status === "disponivel") {
          await supabase.from("units").update({ status: "reservado" }).eq("id", pu.unit.id);
        } else if (pending.kind === "ganho" && pu.unit.status !== "vendido") {
          await supabase.from("units").update({ status: "vendido" }).eq("id", pu.unit.id);
        }
      }
      toast.success(`Etapa atualizada: ${pending.label}`);
      setPending(null);
      await reload();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "negócio", action: "mover" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] hover:bg-muted/40 transition ${stageBadgeClass(deal.stage.kind)}`}
                >
                  {deal.stage.label}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel className="text-xs">Mover para</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {stages
                  .filter((s) => s.id !== deal.stage_id)
                  .map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => requestStageChange(s)}>
                      {s.label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatBRLCompact(Number(deal.value_brl || 0))}
            </span>
            {(deal.proposals ?? []).some((p) => p.status === "aceita") && (
              <span className="text-[10px] text-muted-foreground italic">
                considera proposta aceita
              </span>
            )}
          </div>
          <SheetTitle className="font-display">{deal.person.full_name}</SheetTitle>
          <SheetDescription>{deal.title}</SheetDescription>
        </SheetHeader>


        <div className="mt-5 space-y-6">
          {/* Person */}
          <section className="rounded-lg border border-border/60 p-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Contato</h3>
              <Badge variant="outline" className="text-[10px]">
                {SOURCE_LABEL[deal.person.source]}
              </Badge>
            </div>
          {/* Person */}
          <section className="rounded-lg border border-border/60 p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-medium text-sm">Contato</h3>
              <div className="flex items-center gap-1.5">
                <PersonCompletenessBadge person={deal.person} />
                <Badge variant="outline" className="text-[10px]">
                  {SOURCE_LABEL[deal.person.source]}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {deal.person.email && <span>✉️ {deal.person.email}</span>}
              {deal.person.phone && <span>📞 {deal.person.phone}</span>}
              {deal.person.cpf && (
                <span className="tabular-nums">🆔 {maskCPF(deal.person.cpf)}</span>
              )}
              {deal.person.marital_status && (
                <span>
                  💍 {MARITAL_STATUS_LABEL[deal.person.marital_status as MaritalStatus]}
                  {(deal.person.marital_status === "casado" ||
                    deal.person.marital_status === "uniao_estavel") &&
                  deal.person.spouse_name
                    ? ` · ${deal.person.spouse_name}`
                    : ""}
                </span>
              )}
              {deal.person.monthly_income_brl != null && (
                <span className="tabular-nums">
                  💰 R$ {formatBRLValue(Number(deal.person.monthly_income_brl))}/mês
                </span>
              )}
              {deal.person.occupation && <span>💼 {deal.person.occupation}</span>}
              {(deal.person.city || deal.person.state) && (
                <span>
                  📍 {deal.person.city ?? ""}
                  {deal.person.state ? `/${deal.person.state}` : ""}
                </span>
              )}
            </div>
            {deal.person.notes && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                {deal.person.notes}
              </p>
            )}
          </section>

          {/* Units of interest */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Unidades de interesse</h3>
              <Popover open={addUnitOpen} onOpenChange={setAddUnitOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-72" align="end">
                  <Command>
                    <CommandInput placeholder="Buscar unidade…" />
                    <CommandList>
                      <CommandEmpty>Nenhuma unidade disponível.</CommandEmpty>
                      <CommandGroup>
                        {availableUnits.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.code} ${u.block}`}
                            onSelect={() => addUnit(u.id)}
                            disabled={busy}
                          >
                            <span className="font-mono text-xs mr-2">{u.code}</span>
                            <span className="text-xs text-muted-foreground">
                              {u.block} · {formatBRL(Number(u.price_brl))}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="rounded-lg border border-border/60 divide-y divide-border/50">
              {deal.deal_units.length === 0 && (
                <p className="text-xs text-muted-foreground p-4 text-center">
                  Nenhuma unidade vinculada. Adicione ao menos uma para calcular o valor do negócio.
                </p>
              )}
              {deal.deal_units.map((du) => (
                <div key={du.id} className="p-2.5 flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setPrimary(du.id)}
                    disabled={busy || du.is_primary}
                    className={`h-7 w-7 flex items-center justify-center rounded ${
                      du.is_primary
                        ? "text-accent"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={du.is_primary ? "Unidade primária" : "Definir como primária"}
                    aria-label="Definir como primária"
                  >
                    <Star className={`h-4 w-4 ${du.is_primary ? "fill-accent" : ""}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{du.unit?.code}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {du.unit ? STATUS_LABEL[du.unit.status] : "—"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {du.unit ? formatBRL(Number(du.unit.price_brl)) : "—"}
                    </p>
                  </div>
                  <Select
                    value={du.interest_level}
                    onValueChange={(v) => setInterest(du.id, v as CrmInterest)}
                  >
                    <SelectTrigger className="h-8 w-[110px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(INTEREST_LABEL) as CrmInterest[]).map((k) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          {INTEREST_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeUnit(du.id)}
                    disabled={busy}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <ProposalsSection deal={deal} onReload={reload} />

          <Separator />



          {/* Activity form */}
          <section className="space-y-2">
            <h3 className="font-medium text-sm">Registrar atividade</h3>
            <div className="flex gap-2">
              <Select value={newType} onValueChange={(v) => setNewType(v as CrmActivityType)}>
                <SelectTrigger className="h-9 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["nota", "ligacao", "email", "whatsapp", "visita"] as CrmActivityType[]).map(
                    (t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {ACTIVITY_LABEL[t]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Input
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="O que aconteceu?"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addActivity();
                }}
              />
              <Button onClick={addActivity} disabled={busy || !newContent.trim()}>
                Salvar
              </Button>
            </div>
          </section>

          {/* Timeline */}
          <section className="space-y-2">
            <h3 className="font-medium text-sm">Histórico</h3>
            {loadingAct ? (
              <p className="text-xs text-muted-foreground">Carregando…</p>
            ) : activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem atividades ainda.</p>
            ) : (
              <ol className="space-y-2.5">
                {activities.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.type];
                  return (
                    <li key={a.id} className="flex gap-2.5 text-sm">
                      <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-border/60 bg-muted/40 flex items-center justify-center">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {ACTIVITY_LABEL[a.type]}
                          </span>
                          <time className="text-[10px] text-muted-foreground tabular-nums">
                            {new Date(a.created_at).toLocaleString("pt-BR")}
                          </time>
                        </div>
                        <p className="text-xs">{a.content}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </SheetContent>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          {pending && deal && (
            <>
              <DialogHeader>
                <DialogTitle>Mover para {pending.label}</DialogTitle>
                <DialogDescription>
                  {deal.person.full_name} — {deal.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {(pending.reserves_unit || pending.kind === "ganho") && (
                  <div className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
                    <Checkbox
                      id="dds-upd-unit"
                      checked={updateUnitStatus}
                      onCheckedChange={(c) => setUpdateUnitStatus(!!c)}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="dds-upd-unit" className="text-sm cursor-pointer">
                        Marcar unidade primária como{" "}
                        {pending.kind === "ganho" ? "vendida" : "reservada"}
                      </Label>
                    </div>
                  </div>
                )}
                {pending.kind === "perdido" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dds-lost">Motivo da perda *</Label>
                    <Textarea
                      id="dds-lost"
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>
                  Cancelar
                </Button>
                <Button onClick={confirmStageChange} disabled={busy}>
                  {busy ? "Salvando…" : "Confirmar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
