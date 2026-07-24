import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Plus, Search, Pencil, CheckCircle2, AlertCircle } from "lucide-react";
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
import {
  MARITAL_STATUS_LABEL,
  MARITAL_STATUS_OPTIONS,
  UF_LIST,
  maskCPF,
  maskCEP,
  maskBRLInput,
  parseBRLInput,
  formatBRLValue,
  isValidCPF,
  ageFromISO,
  formatDateBR,
  evaluateCompleteness,
  fetchViaCEP,
  type MaritalStatus,
} from "@/lib/person";
import type { DealFull } from "./CrmSection";

interface Props {
  people: CrmPerson[];
  deals: DealFull[];
  units: Unit[];
  onReload: () => Promise<void>;
  onOpenDeal: (id: string) => void;
  onNewDealForPerson: (personId: string) => void;
  autoOpenNew?: boolean;
  onAutoOpenNewHandled?: () => void;
}

interface FormState {
  full_name: string;
  email: string;
  phone: string;
  source: CrmSource;
  occupation: string;
  notes: string;
  // registro
  cpf: string;
  rg: string;
  birth_date: string;
  marital_status: MaritalStatus | "";
  spouse_name: string;
  nationality: string;
  monthly_income_brl: string; // pt-BR formatted
  // endereço
  cep: string;
  street: string;
  street_number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  // deal creation (only on new)
  createDeal: boolean;
  interests: Record<string, CrmInterest | undefined>;
}

const emptyForm: FormState = {
  full_name: "",
  email: "",
  phone: "",
  source: "site",
  occupation: "",
  notes: "",
  cpf: "",
  rg: "",
  birth_date: "",
  marital_status: "",
  spouse_name: "",
  nationality: "Brasileira",
  monthly_income_brl: "",
  cep: "",
  street: "",
  street_number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  createDeal: true,
  interests: {},
};

function personToForm(p: CrmPerson): FormState {
  return {
    ...emptyForm,
    full_name: p.full_name,
    email: p.email ?? "",
    phone: p.phone ?? "",
    source: p.source,
    occupation: p.occupation ?? "",
    notes: p.notes ?? "",
    cpf: p.cpf ? maskCPF(p.cpf) : "",
    rg: p.rg ?? "",
    birth_date: p.birth_date ?? "",
    marital_status: (p.marital_status as MaritalStatus) || "",
    spouse_name: p.spouse_name ?? "",
    nationality: p.nationality ?? "Brasileira",
    monthly_income_brl: p.monthly_income_brl != null ? formatBRLValue(Number(p.monthly_income_brl)) : "",
    cep: p.cep ? maskCEP(p.cep) : "",
    street: p.street ?? "",
    street_number: p.street_number ?? "",
    complement: p.complement ?? "",
    neighborhood: p.neighborhood ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    createDeal: false,
    interests: {},
  };
}

function CompletenessBadge({ person }: { person: CrmPerson }) {
  const { complete, missing } = evaluateCompleteness(person);
  if (complete) {
    return (
      <Badge
        variant="outline"
        className="text-[10px] gap-1 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
      >
        <CheckCircle2 className="h-3 w-3" /> Cadastro completo
      </Badge>
    );
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="text-[10px] gap-1 border-amber-600/40 text-amber-700 dark:text-amber-400 bg-amber-500/5 cursor-help"
          >
            <AlertCircle className="h-3 w-3" /> Cadastro incompleto · faltam {missing.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs font-medium mb-1">Campos faltantes:</p>
          <ul className="text-[11px] space-y-0.5">
            {missing.map((m) => (
              <li key={m}>• {m}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function PeopleManager({
  people,
  deals,
  units,
  onReload,
  onOpenDeal,
  onNewDealForPerson,
  autoOpenNew,
  onAutoOpenNewHandled,
}: Props) {
  const [q, setQ] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpenNew) {
      setEditingId(null);
      setForm(emptyForm);
      setOpenDialog(true);
      onAutoOpenNewHandled?.();
    }
  }, [autoOpenNew, onAutoOpenNewHandled]);

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
    const termDigits = term.replace(/\D/g, "");
    return people.filter((p) => {
      if (
        p.full_name.toLowerCase().includes(term) ||
        (p.email ?? "").toLowerCase().includes(term) ||
        (p.phone ?? "").toLowerCase().includes(term)
      )
        return true;
      if (termDigits.length >= 3 && p.cpf) {
        return p.cpf.replace(/\D/g, "").includes(termDigits);
      }
      return false;
    });
  }, [people, q]);

  const availableUnits = useMemo(() => units.filter((u) => u.status !== "vendido"), [units]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpenDialog(true);
  };

  const openEdit = (p: CrmPerson) => {
    setEditingId(p.id);
    setForm(personToForm(p));
    setOpenDialog(true);
  };

  const handleCEPBlur = async () => {
    const clean = form.cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    // Only auto-fill if street looks empty
    if (form.street.trim()) return;
    setCepLoading(true);
    try {
      const res = await fetchViaCEP(clean);
      if (res) {
        setForm((f) => ({
          ...f,
          street: res.street ?? f.street,
          neighborhood: res.neighborhood ?? f.neighborhood,
          city: res.city ?? f.city,
          state: res.state ?? f.state,
        }));
      }
    } finally {
      setCepLoading(false);
    }
  };

  const submit = async () => {
    if (!form.full_name.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    if (form.cpf.trim() && !isValidCPF(form.cpf)) {
      toast.error("CPF inválido.");
      return;
    }
    const cpfDigits = form.cpf.trim() ? form.cpf.replace(/\D/g, "") : null;
    if (cpfDigits) {
      let q = supabase.from("crm_people").select("id, full_name").eq("cpf", cpfDigits).limit(1);
      if (editingId) q = q.neq("id", editingId);
      const { data: dup, error: dupErr } = await q.maybeSingle();
      if (dupErr) {
        toast.error("Não foi possível validar o CPF.", { description: dupErr.message });
        return;
      }
      if (dup) {
        toast.error("CPF já cadastrado", {
          description: `Este CPF já pertence a ${dup.full_name}. Edite o cadastro existente em vez de criar um novo.`,
        });
        return;
      }
    }
    setSaving(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        source: form.source,
        occupation: form.occupation.trim() || null,
        notes: form.notes.trim() || null,
        cpf: form.cpf.trim() ? form.cpf.replace(/\D/g, "") : null,
        rg: form.rg.trim() || null,
        birth_date: form.birth_date || null,
        marital_status: form.marital_status || null,
        spouse_name:
          (form.marital_status === "casado" || form.marital_status === "uniao_estavel") &&
          form.spouse_name.trim()
            ? form.spouse_name.trim()
            : null,
        nationality: form.nationality.trim() || null,
        monthly_income_brl: parseBRLInput(form.monthly_income_brl),
        cep: form.cep.trim() ? form.cep.replace(/\D/g, "") : null,
        street: form.street.trim() || null,
        street_number: form.street_number.trim() || null,
        complement: form.complement.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
      };

      if (editingId) {
        const { error } = await supabase.from("crm_people").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Pessoa atualizada.");
      } else {
        const { data: person, error } = await supabase
          .from("crm_people")
          .insert(payload)
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
      }

      setOpenDialog(false);
      setEditingId(null);
      setForm(emptyForm);
      await onReload();
    } catch (e) {
      notifyCrmError(e as SbErr, {
        entity: "pessoa",
        action: editingId ? "atualizar" : "criar",
      });
    } finally {
      setSaving(false);
    }
  };

  const cpfInvalid = form.cpf.trim().length > 0 && !isValidCPF(form.cpf);
  const showSpouse = form.marital_status === "casado" || form.marital_status === "uniao_estavel";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone ou CPF"
            className="pl-8 h-9"
          />
        </div>
        <Button onClick={openNew} size="sm" className="h-9">
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
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{p.full_name}</span>
                        <CompletenessBadge person={p} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      <div>{p.email ?? "—"}</div>
                      <div>{p.phone ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {SOURCE_LABEL[p.source]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {p.city ? `${p.city}${p.state ? `/${p.state}` : ""}` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{list.length}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${p.id}-deals`} className="bg-muted/20">
                      <td colSpan={6} className="px-3 py-3">
                        <PersonExpandedDetails
                          person={p}
                          onEdit={() => openEdit(p)}
                        />
                        <Separator className="my-3" />
                        {list.length > 0 ? (
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
                        ) : (
                          <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                            Nenhum negócio cadastrado para esta pessoa.
                          </p>
                        )}
                        <div className="mt-2 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNewDealForPerson(p.id);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Novo negócio
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={openDialog} onOpenChange={(o) => !o && setOpenDialog(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingId ? "Editar pessoa" : "Nova pessoa"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize os dados da pessoa."
                : "Cadastre o contato e, opcionalmente, já abra um negócio com unidades de interesse."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* ── CONTATO ── */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contato
              </h4>
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
                  <Label htmlFor="pnt">Notas</Label>
                  <Textarea
                    id="pnt"
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ── DADOS CADASTRAIS ── */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dados cadastrais
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pcpf">CPF</Label>
                  <Input
                    id="pcpf"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    aria-invalid={cpfInvalid}
                  />
                  {cpfInvalid && (
                    <p className="text-[11px] text-destructive">CPF inválido</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prg">RG</Label>
                  <Input
                    id="prg"
                    value={form.rg}
                    onChange={(e) => setForm({ ...form, rg: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pbd">Data de nascimento</Label>
                  <Input
                    id="pbd"
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado civil</Label>
                  <Select
                    value={form.marital_status || undefined}
                    onValueChange={(v) =>
                      setForm({ ...form, marital_status: v as MaritalStatus })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARITAL_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {MARITAL_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {showSpouse && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="psn">Nome do cônjuge</Label>
                    <Input
                      id="psn"
                      value={form.spouse_name}
                      onChange={(e) => setForm({ ...form, spouse_name: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="pnat">Nacionalidade</Label>
                  <Input
                    id="pnat"
                    value={form.nationality}
                    onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pmi">Renda mensal (R$)</Label>
                  <Input
                    id="pmi"
                    value={form.monthly_income_brl}
                    onChange={(e) =>
                      setForm({ ...form, monthly_income_brl: maskBRLInput(e.target.value) })
                    }
                    placeholder="0,00"
                    inputMode="decimal"
                    className="tabular-nums"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ── ENDEREÇO ── */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Endereço
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="pcep">CEP</Label>
                  <Input
                    id="pcep"
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: maskCEP(e.target.value) })}
                    onBlur={handleCEPBlur}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                  {cepLoading && (
                    <p className="text-[11px] text-muted-foreground">Buscando endereço…</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor="pstreet">Logradouro</Label>
                  <Input
                    id="pstreet"
                    value={form.street}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="pnum">Número</Label>
                  <Input
                    id="pnum"
                    value={form.street_number}
                    onChange={(e) => setForm({ ...form, street_number: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor="pcomp">Complemento</Label>
                  <Input
                    id="pcomp"
                    value={form.complement}
                    onChange={(e) => setForm({ ...form, complement: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="pnbh">Bairro</Label>
                  <Input
                    id="pnbh"
                    value={form.neighborhood}
                    onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
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
                <div className="space-y-1.5 sm:col-span-1">
                  <Label>UF</Label>
                  <Select
                    value={form.state || undefined}
                    onValueChange={(v) => setForm({ ...form, state: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* ── CRIAR NEGÓCIO (only new) ── */}
            {!editingId && (
              <>
                <Separator />
                <section className="rounded-lg border border-border/60 p-3 space-y-3">
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
                </section>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Expanded row details ──────────────────────────
function PersonExpandedDetails({
  person,
  onEdit,
}: {
  person: CrmPerson;
  onEdit: () => void;
}) {
  const age = ageFromISO(person.birth_date);
  const income =
    person.monthly_income_brl != null
      ? `R$ ${formatBRLValue(Number(person.monthly_income_brl))}`
      : "—";
  const cpfMasked = person.cpf ? maskCPF(person.cpf) : "—";
  const marital = person.marital_status
    ? MARITAL_STATUS_LABEL[person.marital_status as MaritalStatus] ?? "—"
    : "—";
  const spouse =
    (person.marital_status === "casado" || person.marital_status === "uniao_estavel") &&
    person.spouse_name
      ? ` · ${person.spouse_name}`
      : "";
  const addrParts: string[] = [];
  if (person.street) {
    addrParts.push(
      `${person.street}${person.street_number ? `, ${person.street_number}` : ""}`,
    );
  }
  if (person.neighborhood) addrParts.push(person.neighborhood);
  if (person.city) addrParts.push(`${person.city}${person.state ? `/${person.state}` : ""}`);
  if (person.cep) addrParts.push(`CEP ${maskCEP(person.cep)}`);
  const addressLine = addrParts.length > 0 ? addrParts.join(" — ") : "—";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dados cadastrais
        </h4>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-3 w-3 mr-1" /> Editar
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <div>
          <span className="text-muted-foreground">CPF:</span>{" "}
          <span className="tabular-nums">{cpfMasked}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Nascimento:</span>{" "}
          <span className="tabular-nums">
            {formatDateBR(person.birth_date)}
            {age !== null ? ` (${age} anos)` : ""}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Estado civil:</span> {marital}
          {spouse}
        </div>
        <div>
          <span className="text-muted-foreground">Renda mensal:</span>{" "}
          <span className="tabular-nums">{income}</span>
        </div>
        <div className="sm:col-span-2">
          <span className="text-muted-foreground">Endereço:</span> {addressLine}
        </div>
      </div>
    </div>
  );
}
