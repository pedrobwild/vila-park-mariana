import { Link } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, User, ShieldCheck } from "lucide-react";

interface Props {
  variant?: "default" | "mobile";
  onNavigate?: () => void;
}

export default function AuthMenu({ variant = "default", onNavigate }: Props) {
  const { session, isAdmin, loading } = useIsAdmin();

  if (loading) return null;

  if (!session) {
    if (variant === "mobile") {
      return (
        <Link
          to="/login"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm min-h-[44px] text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <LogIn className="h-4 w-4 shrink-0" />
          Entrar
        </Link>
      );
    }
    return (
      <Link to="/login">
        <Button variant="outline" size="sm" className="h-8">
          <LogIn className="h-3.5 w-3.5 mr-1.5" /> Entrar
        </Button>
      </Link>
    );
  }

  const email = session.user.email ?? "Conta";
  const initial = email[0]?.toUpperCase() ?? "U";
  const logout = () => supabase.auth.signOut();

  if (variant === "mobile") {
    return (
      <div className="space-y-1">
        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Conta
        </p>
        <p className="px-3 text-xs text-muted-foreground truncate">{email}</p>
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm min-h-[44px] text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Área do admin
          </Link>
        )}
        <button
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm min-h-[44px] text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" aria-label="Conta">
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
            {initial}
          </span>
          <User className="h-3.5 w-3.5 sm:hidden" />
          <span className="hidden md:inline text-xs text-muted-foreground max-w-[140px] truncate">
            {email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <ShieldCheck className="h-4 w-4 mr-2" /> Área do admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
