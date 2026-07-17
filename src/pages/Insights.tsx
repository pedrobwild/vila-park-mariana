import AppNavbar from "@/components/AppNavbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, UserCircle } from "lucide-react";
import ConsolidatedInsights from "@/components/insights/ConsolidatedInsights";
import CorretorPerformance from "@/components/insights/CorretorPerformance";

export default function Insights() {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-16 pt-8">
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
