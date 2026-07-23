import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PipelineBoard from "./PipelineBoard";
import PeopleManager from "./PeopleManager";
import DealDetailSheet from "./DealDetailSheet";
import type { CrmDeal, CrmDealUnit, CrmPerson } from "@/lib/crm";
import type { Unit } from "@/lib/units";

export type DealFull = CrmDeal & {
  person: CrmPerson;
  deal_units: (CrmDealUnit & { unit: Unit })[];
};

export default function CrmSection() {
  const [deals, setDeals] = useState<DealFull[]>([]);
  const [people, setPeople] = useState<CrmPerson[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pipeline" | "pessoas">("pipeline");

  const load = useCallback(async () => {
    setLoading(true);
    const [d, p, u] = await Promise.all([
      supabase
        .from("crm_deals")
        .select("*, person:crm_people(*), deal_units:crm_deal_units(*, unit:units(*))")
        .order("stage_changed_at", { ascending: false }),
      supabase.from("crm_people").select("*").order("created_at", { ascending: false }),
      supabase.from("units").select("*").order("code"),
    ]);
    setDeals((d.data ?? []) as unknown as DealFull[]);
    setPeople((p.data ?? []) as CrmPerson[]);
    setUnits((u.data ?? []) as Unit[]);
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
          <PipelineBoard
            deals={deals}
            loading={loading}
            onReload={load}
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
        onClose={() => setOpenDealId(null)}
        onReload={load}
      />
    </div>
  );
}
