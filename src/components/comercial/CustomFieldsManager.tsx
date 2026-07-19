import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import {
  CustomFieldDef,
  CustomFieldType,
  FIELD_TYPE_LABEL,
} from "@/lib/units";

interface Props {
  fields: CustomFieldDef[];
  onChanged: () => void;
}

const schema = z.object({
  label: z.string().trim().min(1, "Informe o rótulo").max(60),
  field_type: z.enum(["text", "currency", "number", "date", "boolean", "select"]),
  options: z.array(z.string()).optional(),
});

export default function CustomFieldsManager({ fields, onChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDef | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [optionsText, setOptionsText] = useState("");
  const [visiblePublic, setVisiblePublic] = useState(true);
  const [toDelete, setToDelete] = useState<CustomFieldDef | null>(null);

  const openNew = () => {
    setEditing(null);
    setLabel("");
    setType("text");
    setOptionsText("");
    setVisiblePublic(true);
    setDialogOpen(true);
  };

  const openEdit = (f: CustomFieldDef) => {
    setEditing(f);
    setLabel(f.label);
    setType(f.field_type);
    setOptionsText(Array.isArray(f.options) ? (f.options as string[]).join("\n") : "");
    setVisiblePublic(f.visible_public);
    setDialogOpen(true);
  };

  const save = async () => {
    const opts = type === "select" ? optionsText.split("\n").map((s) => s.trim()).filter(Boolean) : [];
    const parsed = schema.safeParse({ label: label.trim(), field_type: type, options: opts });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (type === "select" && opts.length < 2) {
      toast.error("Adicione ao menos 2 opções (uma por linha).");
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from("custom_field_definitions")
        .update({
          label: parsed.data.label,
          field_type: parsed.data.field_type,
          options: opts,
          visible_public: visiblePublic,
        })
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const maxOrder = fields.reduce((m, f) => Math.max(m, f.sort_order), 0);
      const { error } = await supabase.from("custom_field_definitions").insert({
        label: parsed.data.label,
        field_type: parsed.data.field_type,
        options: opts,
        visible_public: visiblePublic,
        sort_order: maxOrder + 1,
      });
      if (error) return toast.error(error.message);
    }
    setDialogOpen(false);
    onChanged();
    toast.success("Campo salvo.");
  };

  const move = async (f: CustomFieldDef, dir: -1 | 1) => {
    const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((x) => x.id === f.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    await supabase.from("custom_field_definitions").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("custom_field_definitions").update({ sort_order: a.sort_order }).eq("id", b.id);
    onChanged();
  };

  const toggleVisible = async (f: CustomFieldDef) => {
    await supabase
      .from("custom_field_definitions")
      .update({ visible_public: !f.visible_public })
      .eq("id", f.id);
    onChanged();
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase
      .from("custom_field_definitions")
      .delete()
      .eq("id", toDelete.id);
    setToDelete(null);
    if (error) return toast.error(error.message);
    onChanged();
    toast.success("Campo removido.");
  };

  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Campos personalizados</h2>
          <p className="text-sm text-muted-foreground">
            Adicione colunas extras às unidades (texto, valor R$, número, data, sim/não, lista).
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo campo
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Rótulo</th>
              <th className="text-left px-3 py-2 font-medium">Tipo</th>
              <th className="text-left px-3 py-2 font-medium">Visível pública</th>
              <th className="text-right px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center px-3 py-6 text-muted-foreground">
                  Nenhum campo personalizado. Clique em "Novo campo" para começar.
                </td>
              </tr>
            ) : (
              sorted.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-3 py-2">{f.label}</td>
                  <td className="px-3 py-2">{FIELD_TYPE_LABEL[f.field_type]}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleVisible(f)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {f.visible_public ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {f.visible_public ? "Sim" : "Não"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button size="icon" variant="ghost" onClick={() => move(f, -1)} aria-label="Subir">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => move(f, 1)} aria-label="Descer">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(f)} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setToDelete(f)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar campo" : "Novo campo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Rótulo</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de dado</Label>
              <Select value={type} onValueChange={(v) => setType(v as CustomFieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FIELD_TYPE_LABEL) as CustomFieldType[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FIELD_TYPE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === "select" && (
              <div className="space-y-1.5">
                <Label>Opções (uma por linha)</Label>
                <textarea
                  className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder={"Opção A\nOpção B"}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch id="vp" checked={visiblePublic} onCheckedChange={setVisiblePublic} />
              <Label htmlFor="vp" className="text-sm font-normal">
                Visível na página pública (Oportunidades)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo "{toDelete?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os valores registrados para este campo em todas as unidades serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
