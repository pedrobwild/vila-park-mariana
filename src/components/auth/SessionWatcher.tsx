import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Rotas que exigem sessão ativa — se ela cair, mandamos o usuário para /login. */
const PROTECTED_PREFIXES = ["/admin"];

/** Inatividade máxima antes de encerrar a sessão automaticamente. */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Observa a sessão do Supabase globalmente:
 *  - Se a sessão expira ou o refresh token falha → toast + redireciona rotas protegidas para /login.
 *  - Encerra sessão após 30 min de inatividade.
 *  - Revalida ao voltar o foco / rede.
 */
export default function SessionWatcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const idleTimer = useRef<number | null>(null);
  const hadSession = useRef(false);
  const locRef = useRef(location);
  locRef.current = location;

  // Redireciona para /login preservando origem.
  const bounceToLogin = (reason: "expired" | "idle") => {
    const path = locRef.current.pathname;
    if (!isProtectedPath(path)) return;
    toast.error(
      reason === "idle"
        ? "Sessão encerrada por inatividade. Faça login novamente."
        : "Sua sessão expirou. Faça login novamente."
    );
    navigate("/login", { replace: true, state: { from: locRef.current } });
  };

  // ---- Idle timeout ----
  useEffect(() => {
    const reset = () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await supabase.auth.signOut();
          bounceToLogin("idle");
        }
      }, IDLE_TIMEOUT_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Auth state ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      hadSession.current = !!data.session;
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const wasLoggedIn = hadSession.current;
      hadSession.current = !!session;

      if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        if (wasLoggedIn) bounceToLogin("expired");
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Revalida ao voltar o foco ----
  useEffect(() => {
    const onFocus = async () => {
      const { data, error } = await supabase.auth.getSession();
      if ((error || !data.session) && hadSession.current) {
        hadSession.current = false;
        bounceToLogin("expired");
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
