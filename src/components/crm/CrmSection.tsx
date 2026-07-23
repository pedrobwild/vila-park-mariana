import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PipelineView from "./PipelineView";
import PeopleManager from "./PeopleManager";
import DealDetailSheet from "./DealDetailSheet";
import { sortStages, type CrmDeal, type CrmDealUnit, type CrmPerson, type CrmStageRow } from "@/lib/crm";
import type { Unit } from "@/lib/units";

export type DealFull = CrmDeal & {
  person: CrmPerson;
  stage: CrmStageRow;
  deal_units: (CrmDealUnit & { unit: Unit })[];
};

export default function CrmSection() {
  const [deals, setDeals] = useState<DealFull[]>([]);
  const [people, setPeople] = useState<CrmPerson[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [stages, setStages] = useState<CrmStageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pipeline" | "pessoas">("pipeline");

  const loadStages = useCallback(async () => {
    const { data } = await supabase.from("crm_stages").select("*");
    setStages(sortStages((data ?? []) as CrmStageRow[]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, p, u, s] = await Promise.all([
      supabase
        .from("crm_deals")
        .select("*, person:crm_people(*), stage:crm_stages(*), deal_units:crm_deal_units(*, unit:units(*))")
        .order("stage_changed_at", { ascending: false }),
      supabase.from("crm_people").select("*").order("created_at", { ascending: false }),
      supabase.from("units").select("*").order("code"),
      supabase.from("crm_stages").select("*"),
    ]);
    setDeals((d.data ?? []) as unknown as DealFull[]);
    setPeople((p.data ?? []) as CrmPerson[]);
    setUnits((u.data ?? []) as Unit[]);
    setStages(sortStages((s.data ?? []) as CrmStageRow[]));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDeal = useMemo(
    () => deals.find((d) => d.id === openDealId) ?? null,
    [deals, openDealId],
  );

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-4">
          <PipelineView
            deals={deals}
            stages={stages}
            loading={loading}
            onReload={load}
            onReloadStages={loadStages}
            onOpenDeal={(id) => setOpenDealId(id)}
          />
        </TabsContent>
        <TabsContent value="pessoas" className="mt-4">
          <PeopleManager
            people={people}
            deals={deals}
            units={units}
            onReload={load}
            onOpenDeal={(id) => {
              setTab("pipeline");
              setOpenDealId(id);
            }}
          />
        </TabsContent>
      </Tabs>

      <DealDetailSheet
        deal={openDeal}
        units={units}
        stages={stages}
        onClose={() => setOpenDealId(null)}
        onReload={load}
      />
    </div>
  );
}
