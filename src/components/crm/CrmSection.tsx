import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PipelineView from "./PipelineView";
import PeopleManager from "./PeopleManager";
import DealDetailSheet from "./DealDetailSheet";
import NewDealDialog from "./NewDealDialog";
import SalesMirrorView from "./SalesMirrorView";
import CrmDashboard from "./CrmDashboard";
import { sortStages, type CrmDeal, type CrmDealUnit, type CrmPerson, type CrmProposal, type CrmStageRow } from "@/lib/crm";
import type { Unit } from "@/lib/units";

export type DealFull = CrmDeal & {
  person: CrmPerson;
  stage: CrmStageRow;
  deal_units: (CrmDealUnit & { unit: Unit })[];
  proposals: CrmProposal[];
};

type CrmTab = "pipeline" | "espelho" | "pessoas" | "painel";

export default function CrmSection({ onOpenUnits }: { onOpenUnits?: () => void }) {
  const [deals, setDeals] = useState<DealFull[]>([]);
  const [people, setPeople] = useState<CrmPerson[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [stages, setStages] = useState<CrmStageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [tab, setTab] = useState<CrmTab>("pipeline");
  const [newDeal, setNewDeal] = useState<{ open: boolean; personId?: string | null }>({
    open: false,
  });
  const [openNewPerson, setOpenNewPerson] = useState(false);



  const loadStages = useCallback(async () => {
    const { data } = await supabase.from("crm_stages").select("*");
    setStages(sortStages((data ?? []) as CrmStageRow[]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, p, u, s] = await Promise.all([
      supabase
        .from("crm_deals")
        .select("*, person:crm_people(*), stage:crm_stages(*), deal_units:crm_deal_units(*, unit:units(*)), proposals:crm_proposals(*, installments:crm_proposal_installments(*))")
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

  const handleDealCreated = useCallback(
    async (dealId: string) => {
      await load();
      setOpenDealId(dealId);
    },
    [load],
  );

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="espelho">Espelho de vendas</TabsTrigger>
          <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
          <TabsTrigger value="painel">Painel</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineView
            deals={deals}
            stages={stages}
            loading={loading}
            onReload={load}
            onReloadStages={loadStages}
            onOpenDeal={(id) => setOpenDealId(id)}
            onNewDeal={() => setNewDeal({ open: true })}
          />
        </TabsContent>
        <TabsContent value="espelho" className="mt-4">
          <SalesMirrorView
            onOpenDeal={(id) => {
              setTab("pipeline");
              setOpenDealId(id);
            }}
            onOpenUnits={onOpenUnits}
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
            onNewDealForPerson={(personId) => setNewDeal({ open: true, personId })}
            autoOpenNew={openNewPerson}
            onAutoOpenNewHandled={() => setOpenNewPerson(false)}
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

      <NewDealDialog
        open={newDeal.open}
        onOpenChange={(o) => setNewDeal((s) => ({ ...s, open: o }))}
        people={people}
        peopleLoading={loading}
        units={units}
        deals={deals}
        presetPersonId={newDeal.personId ?? null}
        onCreated={handleDealCreated}
        onCreatePerson={() => {
          setNewDeal((s) => ({ ...s, open: false }));
          setTab("pessoas");
          setOpenNewPerson(true);
        }}
      />

    </div>
  );
}
