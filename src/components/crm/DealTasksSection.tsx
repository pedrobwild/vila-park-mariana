import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  AlertCircle,
  Circle,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import {
  TASK_KINDS,
  TASK_KIND_LABEL,
  addDaysISO,
  daysOverdue,
  formatDateBR,
  todayISO,
  type CrmBroker,
  type CrmTask,
  type CrmTaskKind,
} from "@/lib/crm";
import type { DealFull } from "./CrmSection";

const KIND_ICON: Record<CrmTaskKind, typeof Circle> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  visita: MapPin,
  documentacao: FileText,
  follow_up: RotateCw,
  outro: Circle,
};

interface Props {
  deal: DealFull;
  brokers: CrmBroker[];
  slaDays: number;
  onReload: () => Promise<void>;
}

type TaskForm = {
  title: string;
  kind: CrmTaskKind;
  due_date: string;
  broker_id: string;
  notes: string;
};

export default function DealTasksSection({ deal, brokers, slaDays, onReload }: Props) {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<TaskForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [nextStep, setNextStep] = useState(deal.next_step ?? "");
  const [closeDate, setCloseDate] = useState(deal.expected_close_date ?? "");

  useEffect(() => {
    setNextStep(deal.next_step ?? "");
    setCloseDate(deal.expected_close_date ?? "");
  }, [deal.id, deal.next_step, deal.expected_close_date]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("crm_tasks").select("*").eq("deal_id", deal.id);
    const list = ((data ?? []) as CrmTask[]).sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
    setTasks(list);
    setLoading(false);
  }, [deal.id]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const open = tasks.filter((t) => !t.done);
    const late = open.filter((t) => (daysOverdue(t.due_date) ?? -1) > 0);
    return { open: open.length, late: late.length };
  }, [tasks]);

  const saveDealField = async (patch: { next_step?: string | null; expected_close_date?: string | null }) => {
    const { error } = await supabase.from("crm_deals").update(patch).eq("id", deal.id);
    if (error) {
      notifyCrmError(error as SbErr, { entity: "negócio", action: "atualizar" });
      return;
    }
    toast.success("Negócio atualizado.");
    await onReload();
  };

  const openNewTask = () =>
    setForm({
      title: "",
      kind: "follow_up",
      due_date: addDaysISO(slaDays),
      broker_id: deal.broker_id ?? "none",
      notes: "",
    });

  const submit = async () => {
    if (!form || !form.title.trim()) {
      toast.error("Informe o título da tarefa.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("crm_tasks").insert({
        deal_id: deal.id,
        title: form.title.trim(),
        kind: form.kind,
        due_date: form.due_date || null,
        broker_id: form.broker_id === "none" ? null : form.broker_id,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      toast.success("Tarefa criada.");
      setForm(null);
      await load();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "tarefa", action: "criar" });
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (t: CrmTask, done: boolean) => {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done } : x)));
    const { error } = await supabase
      .from("crm_tasks")
      .update({ done, done_at: done ? new Date().toISOString() : null })
      .eq("id", t.id);
    if (error) notifyCrmError(error as SbErr, { entity: "tarefa", action: "atualizar" });
    await load();
  };

  const remove = async (t: CrmTask) => {
    const { error } = await supabase.from("crm_tasks").delete().eq("id", t.id);
    if (error) notifyCrmError(error as SbErr, { entity: "tarefa", action: "excluir" });
    else {
      toast.success("Tarefa excluída.");
      await load();
    }
  };

  const brokerName = (id: string | null) =>
    id ? brokers.find((b) => b.id === id)?.full_name ?? "—" : null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-medium text-sm">Tarefas e próximos passos</h3>
          <p className="text-[11px] text-muted-foreground">
            {counts.open} aberta{counts.open === 1 ? "" : "s"}
            {counts.late > 0 && (
              <>
                {" · "}
                <span className="text-destructive">
                  {counts.late} atrasada{counts.late === 1 ? "" : "s"}
                </span>
              </>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={openNewTask}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Nova tarefa
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="deal-next-step" className="text-xs">
            Próximo passo
          </Label>
          <Input
            id="deal-next-step"
            value={nextStep}
            placeholder="Ex.: enviar proposta revisada"
            onChange={(e) => setNextStep(e.target.value)}
            onBlur={() => {
              if ((deal.next_step ?? "") !== nextStep) saveDealField({ next_step: nextStep || null });
            }}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deal-close-date" className="text-xs">
            Previsão de fechamento
          </Label>
          <Input
            id="deal-close-date"
            type="date"
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
            onBlur={() => {
              if ((deal.expected_close_date ?? "") !== closeDate)
                saveDealField({ expected_close_date: closeDate || null });
            }}
            className="h-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-5 text-center space-y-2">
          <p className="text-xs font-medium">Nenhuma tarefa registrada</p>
          <p className="text-[11px] text-muted-foreground">
            Crie a próxima ação para não perder o timing da negociação.
          </p>
          <Button variant="outline" size="sm" onClick={openNewTask}>
            Nova tarefa
          </Button>
        </div>
      ) : (
        <ul className="rounded-lg border border-border/60 divide-y divide-border/50">
          {tasks.map((t) => {
            const Icon = KIND_ICON[t.kind];
            const od = daysOverdue(t.due_date);
            const late = !t.done && od !== null && od > 0;
            const today = !t.done && od === 0;
            return (
              <li
                key={t.id}
                className={`p-2.5 flex items-start gap-2.5 ${t.done ? "opacity-60" : ""}`}
              >
                <Checkbox
                  checked={t.done}
                  onCheckedChange={(c) => toggleDone(t, !!c)}
                  className="mt-0.5"
                  aria-label={`Concluir ${t.title}`}
                />
                <Icon
                  className={`h-3.5 w-3.5 mt-1 shrink-0 ${late ? "text-destructive" : "text-muted-foreground"}`}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm ${t.done ? "line-through" : ""}`}>{t.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {TASK_KIND_LABEL[t.kind]}
                    </Badge>
                    {late && (
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-destructive/40 text-destructive bg-destructive/5"
                      >
                        <AlertCircle className="h-3 w-3" /> Atrasada há {od} dia{od === 1 ? "" : "s"}
                      </Badge>
                    )}
                    {today && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-accent/60 text-accent bg-accent/5"
                      >
                        Hoje
                      </Badge>
                    )}
                  </div>
                  <p
                    className={`text-[11px] ${late ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {formatDateBR(t.due_date)}
                    {brokerName(t.broker_id) ? ` · ${brokerName(t.broker_id)}` : ""}
                  </p>
                  {t.notes && <p className="text-[11px] text-muted-foreground">{t.notes}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  aria-label={`Excluir ${t.title}`}
                  onClick={() => remove(t)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && !saving && setForm(null)}>
        <DialogContent className="max-w-md">
          {form && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Nova tarefa</DialogTitle>
                <DialogDescription>
                  Vencimento sugerido pelo SLA padrão ({slaDays} dia{slaDays === 1 ? "" : "s"}).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tk-title">Título *</Label>
                  <Input
                    id="tk-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tk-kind">Tipo</Label>
                    <Select
                      value={form.kind}
                      onValueChange={(v) => setForm({ ...form, kind: v as CrmTaskKind })}
                    >
                      <SelectTrigger id="tk-kind" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_KINDS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {TASK_KIND_LABEL[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tk-due">Vencimento</Label>
                    <Input
                      id="tk-due"
                      type="date"
                      min={todayISO()}
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tk-broker">Responsável</Label>
                  <Select
                    value={form.broker_id}
                    onValueChange={(v) => setForm({ ...form, broker_id: v })}
                  >
                    <SelectTrigger id="tk-broker" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {brokers
                        .filter((b) => b.is_active)
                        .map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.full_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tk-notes">Observações</Label>
                  <Textarea
                    id="tk-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={submit} disabled={saving || !form.title.trim()}>
                  {saving ? "Salvando…" : "Criar tarefa"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
