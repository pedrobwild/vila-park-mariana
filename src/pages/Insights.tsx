import { useTranslation } from "react-i18next";
import AppNavbar from "@/components/AppNavbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Brain, UserCircle, FlaskConical } from "lucide-react";
import ConsolidatedInsights from "@/components/insights/ConsolidatedInsights";
import CorretorPerformance from "@/components/insights/CorretorPerformance";

export default function Insights() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const demoLabel = isEn ? "Demo data" : "Dados de demonstração";
  const demoDesc = isEn
    ? "This dashboard currently displays fictitious data to illustrate the interface. Real numbers will appear as reservations and meetings are recorded."
    : "Este painel exibe dados fictícios apenas para ilustrar a interface. Os números reais aparecerão conforme reservas e reuniões forem registradas.";

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-16 pt-8">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="text-amber-700 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300">
              <FlaskConical className="h-3 w-3 mr-1" />
              {demoLabel}
            </Badge>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Painel Comercial · Vila Park Vila Mariana
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {demoDesc}
          </p>
        </div>
        <Tabs defaultValue="inteligencia" className="space-y-8">
          <TabsList className="h-12 p-1">
            <TabsTrigger value="inteligencia" className="gap-2 px-5 text-sm">
              <Brain className="h-4 w-4" />
              Inteligência Comercial
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2 px-5 text-sm">
              <UserCircle className="h-4 w-4" />
              Performance de Corretores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inteligencia">
            <ConsolidatedInsights />
          </TabsContent>

          <TabsContent value="performance">
            <CorretorPerformance />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
