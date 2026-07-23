import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  STAGE_LABEL,
  formatBRLCompact,
  type CrmActivity,
  type CrmActivityType,
  type CrmInterest,
} from "@/lib/crm";
import type { DealFull } from "./CrmSection";

interface Props {
  deal: DealFull | null;
  units: Unit[];
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

export default function DealDetailSheet({ deal, units, onClose, onReload }: Props) {
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loadingAct, setLoadingAct] = useState(false);
  const [newType, setNewType] = useState<CrmActivityType>("nota");
  const [newContent, setNewContent] = useState("");
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
      toast.error("Não foi possível adicionar a unidade.");
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
    } finally {
      setBusy(false);
    }
  };

  const setInterest = async (id: string, level: CrmInterest) => {
    await supabase.from("crm_deal_units").update({ interest_level: level }).eq("id", id);
    await reload();
  };

  const setPrimary = async (id: string) => {
    setBusy(true);
    try {
      await supabase.from("crm_deal_units").update({ is_primary: false }).eq("deal_id", deal.id);
      await supabase.from("crm_deal_units").update({ is_primary: true }).eq("id", id);
      await reload();
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
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!deal} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{STAGE_LABEL[deal.stage]}</Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatBRLCompact(Number(deal.value_brl || 0))}
            </span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {deal.person.email && <span>✉️ {deal.person.email}</span>}
              {deal.person.phone && <span>📞 {deal.person.phone}</span>}
              {deal.person.occupation && <span>💼 {deal.person.occupation}</span>}
              {deal.person.city && <span>📍 {deal.person.city}</span>}
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
    </Sheet>
  );
}
