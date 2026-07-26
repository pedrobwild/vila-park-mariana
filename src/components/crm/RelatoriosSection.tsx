import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const CrmDashboard = lazy(() => import("./CrmDashboard"));
const LeadsReport = lazy(() => import("./LeadsReport"));
const CommissionsReport = lazy(() => import("./CommissionsReport"));

const VALID_TABS = ["visao-geral", "leads", "comissoes"] as const;
type RelTab = (typeof VALID_TABS)[number];
const DEFAULT_TAB: RelTab = "visao-geral";

function isValidTab(v: string | null): v is RelTab {
  return v !== null && (VALID_TABS as readonly string[]).includes(v);
}

interface Props {
  onGoToPipeline: () => void;
  onGoToLeads?: () => void;
}

const FALLBACK = <Skeleton className="h-64 w-full" />;

export default function RelatoriosSection({ onGoToPipeline, onGoToLeads }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get("tab");
  const tab: RelTab = isValidTab(param) ? param : DEFAULT_TAB;

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("m", "relatorios");
    if (value === DEFAULT_TAB) next.delete("tab");
    else next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList className="h-11 p-1 w-full md:w-auto flex flex-wrap">
        <TabsTrigger value="visao-geral">Visão geral</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="comissoes">Comissões</TabsTrigger>
      </TabsList>

      <TabsContent value="visao-geral" className="mt-4">
        {tab === "visao-geral" && (
          <Suspense fallback={FALLBACK}>
            <CrmDashboard onGoToPipeline={onGoToPipeline} />
          </Suspense>
        )}
      </TabsContent>

      <TabsContent value="leads" className="mt-4">
        {tab === "leads" && (
          <Suspense fallback={FALLBACK}>
            <LeadsReport onGoToLeads={onGoToLeads} />
          </Suspense>
        )}
      </TabsContent>

      <TabsContent value="comissoes" className="mt-4">
        {tab === "comissoes" && (
          <Suspense fallback={FALLBACK}>
            <CommissionsReport onGoToPipeline={onGoToPipeline} />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  );
}
