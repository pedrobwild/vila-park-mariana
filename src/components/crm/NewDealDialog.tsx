import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Check, ChevronsUpDown, AlertCircle, Users, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, STATUS_LABEL } from "@/lib/units";
import type { Unit } from "@/lib/units";
import type { CrmBroker } from "@/lib/crm";
import { INTEREST_LABEL, type CrmInterest, type CrmPerson } from "@/lib/crm";
import type { DealFull } from "./CrmSection";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: CrmPerson[];
  peopleLoading?: boolean;
  units: Unit[];
  deals: DealFull[];
  brokers?: CrmBroker[];
  roletaEnabled?: boolean;
  presetPersonId?: string | null;
  onCreated: (dealId: string) => void;
  onCreatePerson?: () => void;
}

export default function NewDealDialog({
  open,
  onOpenChange,
  people,
  peopleLoading,
  units,
  deals,
  brokers = [],
  roletaEnabled = true,
  presetPersonId,
  onCreated,
  onCreatePerson,
}: Props) {
  const [personId, setPersonId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [interests, setInterests] = useState<Record<string, CrmInterest>>({});
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (!open) return;
    setPersonId(presetPersonId ?? null);
    setInterests({});
    setPrefilled(new Set());
    setTitle("");
    setTitleTouched(false);
  }, [open, presetPersonId]);

  const person = useMemo(
    () => people.find((p) => p.id === personId) ?? null,
    [people, personId],
  );

  const personDeals = useMemo(
    () => (personId ? deals.filter((d) => d.person_id === personId) : []),
    [deals, personId],
  );

  const openDealsCount = useMemo(
    () => personDeals.filter((d) => d.stage.kind === "aberto").length,
    [personDeals],
  );

  // Prefill interests from person's existing deal_units (most recent wins)
  useEffect(() => {
    if (!personId) {
      setInterests({});
      setPrefilled(new Set());
      return;
    }
    const sorted = [...personDeals].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const map: Record<string, CrmInterest> = {};
    for (const d of sorted) {
      for (const du of d.deal_units) {
        if (!du.unit || du.unit.status === "vendido") continue;
        if (!(du.unit_id in map)) map[du.unit_id] = du.interest_level as CrmInterest;
      }
    }
    setInterests(map);
    setPrefilled(new Set(Object.keys(map)));
  }, [personId, personDeals]);

  const availableUnits = useMemo(
    () => units.filter((u) => u.status !== "vendido"),
    [units],
  );

  const selectedCount = Object.keys(interests).length;

  // Auto-suggest title unless user has typed
  const suggestedTitle = useMemo(() => {
    if (!person) return "";
    const first = person.full_name.split(" ")[0];
    return selectedCount > 0
      ? `${first} · ${selectedCount} unidade${selectedCount > 1 ? "s" : ""}`
      : `${first} · novo negócio`;
  }, [person, selectedCount]);

  const effectiveTitle = titleTouched ? title : suggestedTitle;

  const openExistingDeal = (dealId: string) => {
    onOpenChange(false);
    setTimeout(() => onCreated(dealId), 0);
  };

  const submit = async () => {
    if (!personId) {
      toast.error("Selecione uma pessoa.");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Selecione pelo menos uma unidade de interesse para criar o negócio.");
      return;
    }
    setSaving(true);
    try {
      const { data: firstStage, error: stageErr } = await supabase
        .from("crm_stages")
        .select("id")
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (stageErr) throw stageErr;
      if (!firstStage) {
        toast.error("Nenhuma etapa cadastrada no funil.");
        setSaving(false);
        return;
      }
      const { data: deal, error: dealErr } = await supabase
        .from("crm_deals")
        .insert({
          person_id: personId,
          title: (effectiveTitle || suggestedTitle).trim(),
          stage_id: firstStage.id,
          broker_id: useRoleta ? null : brokerId || null,
        })
        .select("*")
        .single();
      if (dealErr) throw dealErr;

      const interestIds = Object.keys(interests);
      if (deal && interestIds.length > 0) {
        const rows = interestIds.map((unit_id, idx) => ({
          deal_id: deal.id,
          unit_id,
          interest_level: interests[unit_id],
          is_primary: idx === 0,
        }));
        const { error: duErr } = await supabase.from("crm_deal_units").insert(rows);
        if (duErr) throw duErr;
      }

      if (deal && useRoleta) {
        const { data: assigned } = await supabase.rpc("crm_assign_broker", { _deal: deal.id });
        if (!assigned) toast.warning("Roleta sem corretor disponível — atribua manualmente.");
      }

      toast.success("Negócio criado.");
      onOpenChange(false);
      if (deal) onCreated(deal.id);
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "negócio", action: "criar" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Novo negócio</DialogTitle>
          <DialogDescription>
            Vincule uma pessoa já cadastrada e escolha as unidades de interesse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Person picker */}
          <div className="space-y-1.5">
            <Label>Pessoa *</Label>
            {peopleLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ) : people.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-center space-y-2">
                <Users className="mx-auto h-6 w-6 text-muted-foreground/70" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Nenhuma pessoa cadastrada</p>
                  <p className="text-xs text-muted-foreground">
                    Cadastre uma pessoa antes de criar o primeiro negócio.
                  </p>
                </div>
                {onCreatePerson && !presetPersonId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false);
                      onCreatePerson();
                    }}
                  >
                    Cadastrar pessoa
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={pickerOpen}
                      className="w-full justify-between font-normal"
                      disabled={!!presetPersonId}
                    >
                      {person ? (
                        <span className="truncate">
                          {person.full_name}
                          {person.email && (
                            <span className="text-muted-foreground"> · {person.email}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Selecione uma pessoa…</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 w-[--radix-popover-trigger-width] max-h-[320px]"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar por nome ou e-mail…" />
                      <CommandList>
                        <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                        <CommandGroup>
                          {people.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.full_name} ${p.email ?? ""}`}
                              onSelect={() => {
                                setPersonId(p.id);
                                setPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  personId === p.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="truncate">{p.full_name}</span>
                                {p.email && (
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {p.email}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {onCreatePerson && !presetPersonId && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      onCreatePerson();
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    cadastrar pessoa nova
                  </button>
                )}
              </>
            )}
          </div>

          {/* Open deals warning (non-blocking) */}
          {person && openDealsCount > 0 && (() => {
            const openDeals = personDeals
              .filter((d) => d.stage.kind === "aberto")
              .sort(
                (a, b) =>
                  new Date(b.stage_changed_at ?? b.created_at).getTime() -
                  new Date(a.stage_changed_at ?? a.created_at).getTime(),
              );
            const relTime = (iso: string) => {
              const diff = Date.now() - new Date(iso).getTime();
              const d = Math.floor(diff / 86400000);
              if (d <= 0) return "hoje";
              if (d === 1) return "ontem";
              if (d < 30) return `há ${d} dias`;
              const m = Math.floor(d / 30);
              return m === 1 ? "há 1 mês" : `há ${m} meses`;
            };
            return (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-foreground">
                    Esta pessoa já tem{" "}
                    <strong>
                      {openDealsCount} negócio{openDealsCount > 1 ? "s" : ""}
                    </strong>{" "}
                    em andamento. Você pode abrir um existente ou seguir com um novo.
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {openDeals.map((d) => {
                    const unitCount = d.deal_units?.length ?? 0;
                    const primary =
                      d.deal_units?.find((u) => u.is_primary) ?? d.deal_units?.[0];
                    const changed = d.stage_changed_at ?? d.created_at;
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => openExistingDeal(d.id)}
                          className="w-full text-left rounded-md border border-amber-500/20 bg-background/60 hover:bg-background hover:border-amber-500/40 transition-colors p-2 flex items-center gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium truncate">
                                {d.title}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {d.stage.label}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {unitCount > 0
                                ? `${unitCount} unidade${unitCount > 1 ? "s" : ""}${
                                    primary?.unit ? ` · ${primary.unit.code}` : ""
                                  }`
                                : "sem unidades"}{" "}
                              · {relTime(changed)}
                            </p>
                          </div>
                          <span className="text-[11px] text-primary shrink-0">
                            Abrir →
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

          {/* Units selector */}
          {person && (
            <div className="space-y-1.5">
              <Label>Unidades de interesse</Label>
              {prefilled.size === 0 && availableUnits.length > 0 && (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground/70 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium">Nenhuma unidade de interesse cadastrada</p>
                    <p className="text-[11px] text-muted-foreground">
                      Esta pessoa ainda não possui unidades de interesse. Marque abaixo as
                      unidades que ela deseja acompanhar.
                    </p>
                  </div>
                </div>
              )}
              <div className="max-h-64 overflow-y-auto rounded border border-border/40 divide-y divide-border/40">
                {availableUnits.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground text-center">
                    Nenhuma unidade disponível.
                  </p>
                )}
                {availableUnits.map((u) => {
                  const level = interests[u.id];
                  const checked = !!level;
                  const wasInterest = prefilled.has(u.id);
                  return (
                    <div key={u.id} className="p-2 flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => {
                          setInterests((prev) => {
                            const next = { ...prev };
                            if (c) next[u.id] = prev[u.id] ?? "media";
                            else delete next[u.id];
                            return next;
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs">{u.code}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {STATUS_LABEL[u.status]}
                          </Badge>
                          {wasInterest && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-primary/30 text-primary"
                            >
                              já era interesse
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {u.block} · {formatBRL(Number(u.price_brl))}
                        </p>
                      </div>
                      {checked && (
                        <Select
                          value={level}
                          onValueChange={(v) =>
                            setInterests((prev) => ({ ...prev, [u.id]: v as CrmInterest }))
                          }
                        >
                          <SelectTrigger className="h-7 w-[100px] text-xs">
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
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                A primeira unidade marcada será definida como principal.
              </p>
            </div>
          )}

          {/* Broker */}
          {person && (
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="deal-roleta" className="text-sm">
                  Distribuir pela roleta
                </Label>
                <Switch
                  id="deal-roleta"
                  checked={useRoleta}
                  onCheckedChange={setUseRoleta}
                  disabled={!roletaEnabled}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {roletaEnabled
                  ? "A roleta escolhe o próximo corretor da fila, respeitando peso e último atendimento."
                  : "Roleta desativada nas configurações — escolha o corretor manualmente."}
              </p>
              {!useRoleta && (
                <Select value={brokerId || "none"} onValueChange={(v) => setBrokerId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9" aria-label="Corretor responsável">
                    <SelectValue placeholder="Sem corretor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem corretor</SelectItem>
                    {brokers
                      .filter((b) => b.is_active)
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.full_name}
                          {b.team ? ` · ${b.team}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Title */}
          {person && (
            <div className="space-y-1.5">
              <Label htmlFor="deal-title">Título do negócio</Label>
              <Input
                id="deal-title"
                value={effectiveTitle}
                placeholder={suggestedTitle}
                onChange={(e) => {
                  setTitleTouched(true);
                  setTitle(e.target.value);
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Etapa inicial do funil será atribuída automaticamente.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !personId || selectedCount === 0}>
            {saving ? "Criando…" : "Criar negócio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
