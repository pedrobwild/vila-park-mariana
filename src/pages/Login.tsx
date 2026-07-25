import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRole } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import LoginScreen from "@/components/auth/LoginScreen";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

type LocationState = { from?: { pathname?: string } } | null;

// Landing route per role. Both staff roles share /admin, but keep the map
// explicit so future roles (e.g. corretor) can diverge without touching the
// guard logic.
const ROLE_HOME: Record<"admin" | "incorporadora", string> = {
  admin: "/admin",
  incorporadora: "/admin",
};

export default function Login() {
  const { session, role, loading } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (loading || !session) return;
    if (!role) {
      // Authenticated but no staff role — block and surface a clear message
      // instead of bouncing to /admin where RequireAdmin would show the
      // generic "Acesso restrito" screen.
      setDenied(true);
      return;
    }
    const from = (location.state as LocationState)?.from?.pathname;
    const home = ROLE_HOME[role];
    const target = from && from !== "/login" ? from : home;
    navigate(target, { replace: true });
  }, [session, role, loading, navigate, location.state]);

  if (denied && session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Sem permissão de acesso</h1>
          <p className="text-sm text-muted-foreground">
            A conta <strong>{session.user.email}</strong> foi autenticada, mas
            não possui perfil de administrador ou incorporadora. Fale com a
            administração para liberar o acesso.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                setDenied(false);
              }}
            >
              Sair e tentar outra conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <LoginScreen />;
}
