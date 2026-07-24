import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import { toast } from "sonner";
import { Loader2, Upload, FileText, Trash2, ImageIcon } from "lucide-react";
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
import {
  CustomFieldDef,
  Unit,
  UnitStatus,
  STATUS_LABEL,
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/units";
import DynamicFieldInput from "./DynamicFieldInput";

const MAX_UPLOAD = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const schema = z.object({
  code: z.string().trim().min(1, "Informe o código").max(50),
  block: z.string().trim().min(1, "Informe o bloco").max(50),
  area_m2: z.number().positive("Metragem deve ser > 0"),
  price_brl: z.number().positive("Preço deve ser > 0"),
  status: z.enum(["disponivel", "reservado", "vendido"]),
});

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unit: Unit | null;
  fieldDefs: CustomFieldDef[];
  onSaved: () => void;
}

interface PlantaItem {
  id: string | null; // null = pending (unit not created yet)
  url: string;
  mime: string | null;
  filename: string | null;
  storage_path: string | null;
}

export default function UnitFormDialog({ open, onOpenChange, unit, fieldDefs, onSaved }: Props) {
  const [code, setCode] = useState("");
  const [block, setBlock] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<UnitStatus>("disponivel");
  const [plantas, setPlantas] = useState<PlantaItem[]>([]);
  const [loadingPlantas, setLoadingPlantas] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PlantaItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(unit?.code ?? "");
    setBlock(unit?.block ?? "");
    setArea(unit ? String(unit.area_m2) : "");
    setPrice(unit ? formatCurrencyInput(Number(unit.price_brl)) : "");
    setStatus((unit?.status as UnitStatus) ?? "disponivel");
    setPlantas([]);
    setCustomValues({});
    setConfirmDelete(null);

    if (unit) {
      setLoadingPlantas(true);
      Promise.all([
        supabase
          .from("custom_field_values")
          .select("field_id, value")
          .eq("unit_id", unit.id),
        supabase
          .from("unit_plantas")
          .select("id, url, mime, filename, storage_path")
          .eq("unit_id", unit.id)
          .order("created_at", { ascending: true }),
      ]).then(([cv, pl]) => {
        const map: Record<string, unknown> = {};
        (cv.data ?? []).forEach((r) => {
          map[r.field_id] = r.value;
        });
        setCustomValues(map);
        setPlantas((pl.data ?? []) as PlantaItem[]);
        setLoadingPlantas(false);
      });
    }
  }, [open, unit]);

  const syncUnitPrimaryPlanta = async (unitId: string, list: PlantaItem[]) => {
    const primary = list[0] ?? null;
    await supabase
      .from("units")
      .update({
        planta_url: primary?.url ?? null,
        planta_mime: primary?.mime ?? null,
      })
      .eq("id", unitId);
  };

  const handleUpload = async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato inválido. Envie JPG, PNG, WebP ou PDF.");
      return;
    }
    if (file.size > MAX_UPLOAD) {
      toast.error("Arquivo excede 10 MB.");
      return;
    }
    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("plantas").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      toast.error("Falha no upload: " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("plantas").getPublicUrl(path);
    const item: PlantaItem = {
      id: null,
      url: data.publicUrl,
      mime: file.type,
      filename: file.name,
      storage_path: path,
    };

    if (unit) {
      const { data: inserted, error: insErr } = await supabase
        .from("unit_plantas")
        .insert({
          unit_id: unit.id,
          url: item.url,
          mime: item.mime,
          filename: item.filename,
          storage_path: item.storage_path,
        })
        .select("id, url, mime, filename, storage_path")
        .single();
      if (insErr) {
        toast.error("Falha ao registrar anexo: " + insErr.message);
        await supabase.storage.from("plantas").remove([path]);
        setUploading(false);
        return;
      }
      const next = [...plantas, inserted as PlantaItem];
      setPlantas(next);
      await syncUnitPrimaryPlanta(unit.id, next);
    } else {
      setPlantas((prev) => [...prev, item]);
    }
    setUploading(false);
    toast.success("Planta enviada.");
  };

  const handleDelete = async (item: PlantaItem) => {
    setDeleting(true);
    try {
      if (item.storage_path) {
        await supabase.storage.from("plantas").remove([item.storage_path]);
      }
      if (item.id) {
        const { error } = await supabase
          .from("unit_plantas")
          .delete()
          .eq("id", item.id);
        if (error) {
          toast.error("Falha ao excluir: " + error.message);
          return;
        }
      }
      const next = plantas.filter((p) => p !== item && (p.id ? p.id !== item.id : true));
      setPlantas(next);
      if (unit) await syncUnitPrimaryPlanta(unit.id, next);
      toast.success("Anexo excluído.");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };



  const handleSubmit = async () => {
    const parsed = schema.safeParse({
      code: code.trim(),
      block: block.trim(),
      area_m2: Number(area),
      price_brl: parseCurrencyInput(price),
      status,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setSaving(true);
    const payload = {
      code: parsed.data.code,
      block: parsed.data.block,
      area_m2: parsed.data.area_m2,
      price_brl: parsed.data.price_brl,
      status: parsed.data.status,
      planta_url: plantaUrl,
      planta_mime: plantaMime,
    };

    let unitId = unit?.id;
    if (unit) {
      const { error } = await supabase.from("units").update(payload).eq("id", unit.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase.from("units").insert(payload).select("id").single();
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      unitId = data.id;
    }

    // Save custom values (upsert)
    if (unitId && fieldDefs.length > 0) {
      const rows = fieldDefs
        .map((d) => ({
          unit_id: unitId!,
          field_id: d.id,
          value: (customValues[d.id] ?? null) as never,
        }))
        .filter((r) => r.value !== null && r.value !== "");
      if (rows.length > 0) {
        const { error } = await supabase
          .from("custom_field_values")
          .upsert(rows, { onConflict: "unit_id,field_id" });
        if (error) toast.error("Campos personalizados: " + error.message);
      }
      // Delete empty ones
      const emptyIds = fieldDefs
        .filter((d) => customValues[d.id] == null || customValues[d.id] === "")
        .map((d) => d.id);
      if (emptyIds.length > 0) {
        await supabase
          .from("custom_field_values")
          .delete()
          .eq("unit_id", unitId)
          .in("field_id", emptyIds);
      }
    }

    setSaving(false);
    toast.success(unit ? "Unidade atualizada." : "Unidade criada.");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{unit ? "Editar unidade" : "Nova unidade"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block">Bloco</Label>
              <Input id="block" value={block} onChange={(e) => setBlock(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area">Metragem (m²)</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Preço de tabela</Label>
              <Input
                id="price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(formatCurrencyInput(parseCurrencyInput(e.target.value)))}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as UnitStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["disponivel", "reservado", "vendido"] as UnitStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Planta da unidade</Label>
            {plantaUrl && (
              <div className="flex items-center gap-3 rounded-md border border-border p-2">
                {plantaMime === "application/pdf" ? (
                  <a
                    href={plantaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" /> Ver PDF
                  </a>
                ) : (
                  <img src={plantaUrl} alt="Planta" className="h-16 w-16 object-cover rounded" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPlantaUrl(null);
                    setPlantaMime(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> Remover
                </Button>
              </div>
            )}
            <label className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 cursor-pointer hover:bg-muted/50 text-sm text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>
                {uploading ? "Enviando…" : "Enviar imagem (JPG/PNG/WebP) ou PDF — até 10 MB"}
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {fieldDefs.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-sm font-medium">Campos personalizados</p>
              <div className="grid grid-cols-2 gap-3">
                {fieldDefs.map((d) => (
                  <DynamicFieldInput
                    key={d.id}
                    def={d}
                    value={customValues[d.id]}
                    onChange={(v) => setCustomValues((prev) => ({ ...prev, [d.id]: v }))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
