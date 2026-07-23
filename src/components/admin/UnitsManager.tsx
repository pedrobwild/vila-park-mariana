import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Plus, Pencil, Trash2, Search, ArrowUpDown, FileText, ImageIcon } from "lucide-react";
import {
  CustomFieldDef,
  Unit,
  UnitStatus,
  STATUS_LABEL,
  STATUS_BADGE,
  formatBRL,
  formatArea,
  formatCustomValue,
} from "@/lib/units";
import UnitFormDialog from "@/components/comercial/UnitFormDialog";
import CustomFieldsManager from "@/components/comercial/CustomFieldsManager";

type SortKey = "code" | "block" | "area_m2" | "price_brl" | "status";

export default function UnitsManager() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [fieldDefs, setFieldDefs] = useState<CustomFieldDef[]>([]);
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "code", dir: "asc" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [toDelete, setToDelete] = useState<Unit | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [u, f, v] = await Promise.all([
      supabase.from("units").select("*"),
      supabase.from("custom_field_definitions").select("*").order("sort_order"),
      supabase.from("custom_field_values").select("*"),
    ]);
    setUnits((u.data ?? []) as Unit[]);
    setFieldDefs((f.data ?? []) as CustomFieldDef[]);
    const map: Record<string, Record<string, unknown>> = {};
    (v.data ?? []).forEach((row) => {
      map[row.unit_id] = map[row.unit_id] ?? {};
      map[row.unit_id][row.field_id] = row.value;
    });
    setValues(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = units.filter(
      (u) => !q || u.code.toLowerCase().includes(q) || u.block.toLowerCase().includes(q),
    );
    filtered.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [units, query, sort]);

  const toggleSort = (k: SortKey) =>
    setSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }));

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("units").delete().eq("id", toDelete.id);
    setToDelete(null);
    if (error) return toast.error(error.message);
    toast.success("Unidade excluída.");
    load();
  };

  return (
    <>
      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">Unidades</TabsTrigger>
          <TabsTrigger value="fields">Campos personalizados</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-4 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou bloco…"
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Nova unidade
            </Button>
          </div>

          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {([
                    ["code", "Código"],
                    ["block", "Bloco"],
                    ["area_m2", "Metragem"],
                    ["price_brl", "Preço"],
                    ["status", "Status"],
                  ] as [SortKey, string][]).map(([k, label]) => (
                    <th key={k} className="text-left px-3 py-2 font-medium">
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => toggleSort(k)}
                      >
                        {label} <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  ))}
                  <th className="text-left px-3 py-2 font-medium">Planta</th>
                  {fieldDefs.map((d) => (
                    <th key={d.id} className="text-left px-3 py-2 font-medium">
                      {d.label}
                    </th>
                  ))}
                  <th className="text-right px-3 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7 + fieldDefs.length} className="px-3 py-8 text-center text-muted-foreground">
                      Carregando…
                    </td>
                  </tr>
                ) : sortedFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={7 + fieldDefs.length} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhuma unidade cadastrada.
                    </td>
                  </tr>
                ) : (
                  sortedFiltered.map((u) => (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{u.code}</td>
                      <td className="px-3 py-2">{u.block}</td>
                      <td className="px-3 py-2">{formatArea(Number(u.area_m2))}</td>
                      <td className="px-3 py-2">{formatBRL(Number(u.price_brl))}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full border text-xs ${STATUS_BADGE[u.status as UnitStatus]}`}
                        >
                          {STATUS_LABEL[u.status as UnitStatus]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {u.planta_url ? (
                          <a
                            href={u.planta_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                          >
                            {u.planta_mime === "application/pdf" ? (
                              <FileText className="h-3.5 w-3.5" />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5" />
                            )}
                            Ver
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {fieldDefs.map((d) => (
                        <td key={d.id} className="px-3 py-2">
                          {formatCustomValue(d, values[u.id]?.[d.id])}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditing(u);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setToDelete(u)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="fields" className="mt-4">
          <CustomFieldsManager fields={fieldDefs} onChanged={load} />
        </TabsContent>
      </Tabs>

      <UnitFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        unit={editing}
        fieldDefs={fieldDefs}
        onSaved={load}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a unidade {toDelete?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os campos personalizados vinculados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
