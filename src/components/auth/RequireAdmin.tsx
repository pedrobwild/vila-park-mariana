import { Link, Navigate, useLocation } from "react-router-dom";
import { useRole } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: React.ReactNode;
  /** When true, only role 'admin' (Bewild) can access. Defaults to staff (admin OR incorporadora). */
  bewildOnly?: boolean;
}

export default function RequireAdmin({ children, bewildOnly = false }: Props) {
  const { session, role, loading } = useRole();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const allowed = bewildOnly ? role === "admin" : role === "admin" || role === "incorporadora";

  if (!allowed) {
    // Staff (incorporadora) hitting a Bewild-only route: send them back to /admin silently.
    if (bewildOnly && role === "incorporadora") {
      return <Navigate to="/admin" replace />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ({session.user.email}) não tem permissão para acessar esta área.
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
