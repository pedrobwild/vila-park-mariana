import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const UrbanFlexInvestorGuide = lazy(() => import("./pages/UrbanFlexInvestorGuide"));
const InvestorGuide = lazy(() => import("./pages/InvestorGuide"));
const Ferramentas = lazy(() => import("./pages/Ferramentas"));
const AdminUpload = lazy(() => import("./pages/AdminUpload"));
const Insights = lazy(() => import("./pages/Insights"));
const CorretorPage = lazy(() => import("./pages/CorretorPage"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Carregando…</div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/guia-comprador" element={<UrbanFlexInvestorGuide />} />
              <Route path="/guia-investidor" element={<InvestorGuide />} />
              {/* Legacy path — redirect to home */}
              <Route path="/urban-flex-bela-cintra" element={<Navigate to="/" replace />} />
              <Route path="/ferramentas" element={<Ferramentas />} />
              <Route path="/admin/upload" element={<AdminUpload />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/corretor" element={<CorretorPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
