import { Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import LoginScreen from "./LoginScreen";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Acesso restrito aos proprietários</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ({session.user.email}) não tem permissão de administrador.
            Solicite acesso à equipe do Vila Park.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => supabase.auth.signOut()}>
              Sair
            </Button>
            <Link to="/">
              <Button>Voltar ao site</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
