import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyCrmError } from "@/lib/crmErrors";
import { sortStages, type CrmStageRow } from "@/lib/crm";
import StageManagerDialog from "@/components/crm/StageManagerDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const KIND_LABEL: Record<string, string> = {
  aberto: "aberto",
  ganho: "ganho",
  perdido: "perdido",
};

export default function FunilSettings() {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<CrmStageRow[]>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: st, error }, { data: deals }] = await Promise.all([
      supabase.from("crm_stages").select("*").order("position"),
      supabase.from("crm_deals").select("stage_id"),
    ]);
    if (error) notifyCrmError(error, { entity: "etapa", action: "consultar" });
    setStages(sortStages(st ?? []));
    const map = new Map<string, number>();
    for (const d of deals ?? []) {
      if (!d.stage_id) continue;
      map.set(d.stage_id, (map.get(d.stage_id) ?? 0) + 1);
    }
    setCounts(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-base">Etapas do funil</CardTitle>
          <CardDescription>
            Ordem em que os negócios avançam no pipeline. Etapas de sistema (ganho e perdido) não
            podem ser removidas.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Gerenciar etapas
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : stages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma etapa cadastrada. Use “Gerenciar etapas” para criar a primeira.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {stages.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-6 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="text-sm font-medium">{s.label}</span>
                <Badge variant={s.kind === "aberto" ? "secondary" : "outline"}>
                  {KIND_LABEL[s.kind] ?? s.kind}
                </Badge>
                {s.reserves_unit && (
                  <Badge variant="outline" className="text-xs">
                    reserva unidade
                  </Badge>
                )}
                {s.is_system && (
                  <Badge variant="outline" className="text-xs">
                    etapa de sistema
                  </Badge>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {counts.get(s.id) ?? 0} negócio(s)
                </span>
              </li>
            ))}
          </ul>
        )}
        <Separator className="my-4" />
        <p className="text-xs text-muted-foreground">
          Alterar a ordem ou o nome das etapas afeta imediatamente as visões de lista e Kanban do
          CRM.
        </p>
      </CardContent>

      <StageManagerDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) void load();
        }}
        stages={stages}
        dealCountByStage={counts}
        onReload={load}
      />
    </Card>
  );
}
