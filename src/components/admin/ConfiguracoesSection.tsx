import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const GeralSettings = lazy(() => import("./config/GeralSettings"));
const FunilSettings = lazy(() => import("./config/FunilSettings"));
const LossReasonsManager = lazy(() => import("./LossReasonsManager"));
const PropostaSettings = lazy(() => import("./config/PropostaSettings"));

const VALID_TABS = ["geral", "funil", "motivos-perda", "proposta"] as const;
type ConfigTab = (typeof VALID_TABS)[number];
const DEFAULT_TAB: ConfigTab = "geral";

function isValidTab(v: string | null): v is ConfigTab {
  return v !== null && (VALID_TABS as readonly string[]).includes(v);
}

const FALLBACK = <Skeleton className="h-64 w-full" />;

export default function ConfiguracoesSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get("tab");
  const tab: ConfigTab = isValidTab(param) ? param : DEFAULT_TAB;

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("m", "config");
    if (value === DEFAULT_TAB) next.delete("tab");
    else next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList className="h-11 p-1 w-full md:w-auto flex flex-wrap">
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="funil">Etapas do funil</TabsTrigger>
        <TabsTrigger value="motivos-perda">Motivos de perda</TabsTrigger>
        <TabsTrigger value="proposta">Proposta</TabsTrigger>
      </TabsList>

      <TabsContent value="geral" className="mt-4">
        {tab === "geral" && (
          <Suspense fallback={FALLBACK}>
            <GeralSettings />
          </Suspense>
        )}
      </TabsContent>

      <TabsContent value="funil" className="mt-4">
        {tab === "funil" && (
          <Suspense fallback={FALLBACK}>
            <FunilSettings />
          </Suspense>
        )}
      </TabsContent>

      <TabsContent value="motivos-perda" className="mt-4">
        {tab === "motivos-perda" && (
          <Suspense fallback={FALLBACK}>
            <LossReasonsManager />
          </Suspense>
        )}
      </TabsContent>

      <TabsContent value="proposta" className="mt-4">
        {tab === "proposta" && (
          <Suspense fallback={FALLBACK}>
            <PropostaSettings />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  );
}
