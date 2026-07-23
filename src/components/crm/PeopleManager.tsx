import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { formatBRL, STATUS_LABEL } from "@/lib/units";
import type { Unit } from "@/lib/units";
import {
  SOURCES,
  SOURCE_LABEL,
  INTEREST_LABEL,
  formatBRLCompact,
  stageBadgeClass,
  type CrmInterest,
  type CrmPerson,
  type CrmSource,
} from "@/lib/crm";
import type { DealFull } from "./CrmSection";

interface Props {
  people: CrmPerson[];
  deals: DealFull[];
  units: Unit[];
  onReload: () => Promise<void>;
  onOpenDeal: (id: string) => void;
  onNewDealForPerson: (personId: string) => void;
}

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  source: CrmSource;
  occupation: string;
  city: string;
  notes: string;
  createDeal: boolean;
  interests: Record<string, CrmInterest | undefined>;
}

const emptyForm: FormState = {
  full_name: "",
  email: "",
  phone: "",
  source: "site",
  occupation: "",
  city: "",
  notes: "",
  createDeal: true,
  interests: {},
};

export default function PeopleManager({ people, deals, units, onReload, onOpenDeal }: Props) {
  const [q, setQ] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  const dealsByPerson = useMemo(() => {
    const map = new Map<string, DealFull[]>();
    for (const d of deals) {
      const list = map.get(d.person_id) ?? [];
      list.push(d);
      map.set(d.person_id, list);
    }
    return map;
  }, [deals]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return people;
    return people.filter(
      (p) =>
        p.full_name.toLowerCase().includes(term) ||
        (p.email ?? "").toLowerCase().includes(term) ||
        (p.phone ?? "").toLowerCase().includes(term),
    );
  }, [people, q]);

  const availableUnits = useMemo(() => units.filter((u) => u.status !== "vendido"), [units]);

  const submit = async () => {
    if (!form.full_name.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    setSaving(true);
    try {
      const { data: person, error } = await supabase
        .from("crm_people")
        .insert({
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          source: form.source,
          occupation: form.occupation.trim() || null,
          city: form.city.trim() || null,
          notes: form.notes.trim() || null,
        })
        .select("*")
        .single();
      if (error) throw error;

      const interestIds = Object.keys(form.interests).filter((k) => form.interests[k]);
      if (form.createDeal && person) {
        const firstName = person.full_name.split(" ")[0];
        const title =
          interestIds.length > 0
            ? `${firstName} · ${interestIds.length} unidade${interestIds.length > 1 ? "s" : ""}`
            : `${firstName} · novo lead`;
        // Fetch first stage (lowest position) to satisfy NOT NULL stage_id.
        // A DB trigger would also default it, but the client type requires it.
        const { data: firstStage } = await supabase
          .from("crm_stages")
          .select("id")
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();
        const { data: deal, error: dealErr } = await supabase
          .from("crm_deals")
          .insert({ person_id: person.id, title, stage_id: firstStage!.id })
          .select("*")
          .single();
        if (dealErr) throw dealErr;
        if (deal && interestIds.length > 0) {
          const rows = interestIds.map((unit_id, idx) => ({
            deal_id: deal.id,
            unit_id,
            interest_level: form.interests[unit_id] as CrmInterest,
            is_primary: idx === 0,
          }));
          const { error: duErr } = await supabase.from("crm_deal_units").insert(rows);
          if (duErr) throw duErr;
        }
      }

      toast.success("Pessoa cadastrada.");
      setOpenNew(false);
      setForm(emptyForm);
      await onReload();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "pessoa", action: "criar" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, e-mail ou telefone"
            className="pl-8 h-9"
          />
        </div>
        <Button onClick={() => setOpenNew(true)} size="sm" className="h-9">
          <Plus className="h-3.5 w-3.5 mr-1" /> Nova pessoa
        </Button>
      </div>

      <div className="rounded-lg border border-border/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">Contato</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Cidade</th>
              <th className="px-3 py-2 font-medium text-right">Negócios</th>
              <th className="px-3 py-2 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  Nenhuma pessoa encontrada.
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const list = dealsByPerson.get(p.id) ?? [];
              const isOpen = expandedPerson === p.id;
              return (
                <>
                  <tr
                    key={p.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => setExpandedPerson(isOpen ? null : p.id)}
                  >
                    <td className="px-3 py-2.5 font-medium">{p.full_name}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      <div>{p.email ?? "—"}</div>
                      <div>{p.phone ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {SOURCE_LABEL[p.source]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{p.city ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{list.length}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                  {isOpen && list.length > 0 && (
                    <tr key={`${p.id}-deals`} className="bg-muted/20">
                      <td colSpan={6} className="px-3 py-2">
                        <ul className="space-y-1">
                          {list.map((d) => (
                            <li key={d.id}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDeal(d.id);
                                }}
                                className="w-full flex items-center justify-between gap-3 rounded px-2 py-1.5 text-xs hover:bg-background transition"
                              >
                                <span className="truncate">{d.title}</span>
                                <span className="flex items-center gap-2 shrink-0">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${stageBadgeClass(d.stage.kind)}`}
                                  >
                                    {d.stage.label}
                                  </Badge>
                                  <span className="tabular-nums text-muted-foreground">
                                    {formatBRLCompact(Number(d.value_brl || 0))}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={openNew} onOpenChange={(o) => !o && setOpenNew(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Nova pessoa</DialogTitle>
            <DialogDescription>
              Cadastre o contato e, opcionalmente, já abra um negócio com unidades de interesse.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pn">Nome completo *</Label>
                <Input
                  id="pn"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pe">E-mail</Label>
                <Input
                  id="pe"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp">Telefone</Label>
                <Input
                  id="pp"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm({ ...form, source: v as CrmSource })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SOURCE_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po">Ocupação</Label>
                <Input
                  id="po"
                  value={form.occupation}
                  onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pc">Cidade</Label>
                <Input
                  id="pc"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pnt">Notas</Label>
                <Textarea
                  id="pnt"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-lg border border-border/60 p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="mkdeal"
                  checked={form.createDeal}
                  onCheckedChange={(c) => setForm({ ...form, createDeal: !!c })}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="mkdeal" className="text-sm cursor-pointer">
                    Criar negócio já com unidades de interesse
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione as unidades abaixo e defina o nível de interesse.
                  </p>
                </div>
              </div>

              {form.createDeal && (
                <div className="max-h-64 overflow-y-auto rounded border border-border/40 divide-y divide-border/40">
                  {availableUnits.length === 0 && (
                    <p className="p-3 text-xs text-muted-foreground text-center">
                      Nenhuma unidade disponível.
                    </p>
                  )}
                  {availableUnits.map((u) => {
                    const level = form.interests[u.id];
                    const checked = !!level;
                    return (
                      <div key={u.id} className="p-2 flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            setForm((f) => {
                              const next = { ...f.interests };
                              if (c) next[u.id] = "media";
                              else delete next[u.id];
                              return { ...f, interests: next };
                            });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{u.code}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {STATUS_LABEL[u.status]}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {u.block} · {formatBRL(Number(u.price_brl))}
                          </p>
                        </div>
                        {checked && (
                          <Select
                            value={level}
                            onValueChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                interests: { ...f.interests, [u.id]: v as CrmInterest },
                              }))
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
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Salvando…" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
