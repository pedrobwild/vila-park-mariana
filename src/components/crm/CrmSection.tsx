import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PipelineView from "./PipelineView";
import DealDetailSheet from "./DealDetailSheet";
import NewDealDialog from "./NewDealDialog";
import SalesMirrorView from "./SalesMirrorView";

import {
  sortStages,
  type CrmBroker,
  type CrmDeal,
  type CrmDealUnit,
  type CrmLossReason,
  type CrmPerson,
  type CrmProposal,
  type CrmSettings,
  type CrmStageRow,
} from "@/lib/crm";
import type { Unit } from "@/lib/units";

export type DealFull = CrmDeal & {
  person: CrmPerson;
  stage: CrmStageRow;
  deal_units: (CrmDealUnit & { unit: Unit })[];
  proposals: CrmProposal[];
  broker: CrmBroker | null;
  loss_reason: CrmLossReason | null;
};

type CrmTab = "pipeline" | "espelho";

export default function CrmSection({
  onOpenUnits,
  onOpenLeads,
  onOpenRelatorios,
}: {
  onOpenUnits?: () => void;
  onOpenLeads?: (opts?: { novo?: boolean }) => void;
  onOpenRelatorios?: () => void;
}) {

  const [deals, setDeals] = useState<DealFull[]>([]);
  const [people, setPeople] = useState<CrmPerson[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [stages, setStages] = useState<CrmStageRow[]>([]);
  const [brokers, setBrokers] = useState<CrmBroker[]>([]);
  const [settings, setSettings] = useState<CrmSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [tab, setTab] = useState<CrmTab>("pipeline");
  const [newDeal, setNewDeal] = useState<{ open: boolean; personId?: string | null }>({
    open: false,
  });



  const loadStages = useCallback(async () => {
    const { data } = await supabase.from("crm_stages").select("*");
    setStages(sortStages((data ?? []) as CrmStageRow[]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, p, u, s, b, cfg] = await Promise.all([
      supabase
        .from("crm_deals")
        .select("*, person:crm_people(*), stage:crm_stages(*), deal_units:crm_deal_units(*, unit:units(*)), proposals:crm_proposals(*, installments:crm_proposal_installments(*)), broker:crm_brokers(*), loss_reason:crm_loss_reasons(*)")
        .order("stage_changed_at", { ascending: false }),
      supabase.from("crm_people").select("*").order("created_at", { ascending: false }),
      supabase.from("units").select("*").order("code"),
      supabase.from("crm_stages").select("*"),
      supabase.from("crm_brokers").select("*").order("full_name"),
      supabase.from("crm_settings").select("*").maybeSingle(),
    ]);
    setDeals((d.data ?? []) as unknown as DealFull[]);
    setPeople((p.data ?? []) as CrmPerson[]);
    setUnits((u.data ?? []) as Unit[]);
    setStages(sortStages((s.data ?? []) as CrmStageRow[]));
    setBrokers((b.data ?? []) as CrmBroker[]);
    setSettings((cfg.data ?? null) as CrmSettings | null);
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
          <TabsTrigger value="painel">Painel</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineView
            deals={deals}
            stages={stages}
            brokers={brokers}
            staleDealDays={settings?.stale_deal_days ?? 7}
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
        <TabsContent value="painel" className="mt-4">
          <CrmDashboard onGoToPipeline={() => setTab("pipeline")} />
        </TabsContent>


      </Tabs>

      <DealDetailSheet
        deal={openDeal}
        units={units}
        stages={stages}
        brokers={brokers}
        settings={settings}
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
        brokers={brokers}
        roletaEnabled={settings?.roleta_enabled ?? true}
        presetPersonId={newDeal.personId ?? null}
        onCreated={handleDealCreated}
        onCreatePerson={() => {
          setNewDeal((s) => ({ ...s, open: false }));
          onOpenLeads?.({ novo: true });
        }}
      />

    </div>
  );
}
