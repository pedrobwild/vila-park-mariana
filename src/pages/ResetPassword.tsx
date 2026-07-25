import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldAlert, CheckCircle2 } from "lucide-react";

function BrandLogo() {
  return (
    <span className="flex items-baseline gap-1 font-display text-xl font-bold leading-none">
      <span className="text-foreground">Vila</span>
      <span className="text-accent">Park</span>
      <span className="text-xs font-medium text-muted-foreground ml-1">Vila Mariana</span>
    </span>
  );
}

type Status =
  | { kind: "checking" }
  | { kind: "ready" }
  | { kind: "expired"; message: string }
  | { kind: "success" };

/**
 * Página de redefinição de senha.
 *
 * Fluxo:
 *  1. Usuário clica no link enviado por e-mail (resetPasswordForEmail).
 *  2. Supabase entrega os tokens na URL (#access_token=...&type=recovery ou
 *     ?code=... para PKCE). O SDK, com detectSessionInUrl, já processa e
 *     dispara PASSWORD_RECOVERY no onAuthStateChange.
 *  3. Aguardamos esse evento (ou o error na URL) para liberar/bloquear o form.
 *  4. Se o token estiver expirado/inválido, o Supabase retorna erro no hash
 *     (#error=access_denied&error_code=otp_expired). Mostramos mensagem clara
 *     e um caminho para pedir um novo link.
 *  5. Ao salvar, chamamos updateUser({ password }) e deslogamos, forçando o
 *     usuário a autenticar com a senha nova.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Erros vêm no hash (#error=...&error_code=otp_expired&error_description=...).
  const hashParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.hash.replace(/^#/, ""));
  }, []);

  useEffect(() => {
    const errCode = hashParams.get("error_code") || hashParams.get("error");
    if (errCode) {
      const description =
        hashParams.get("error_description")?.replace(/\+/g, " ") ||
        "Link inválido ou expirado.";
      setStatus({
        kind: "expired",
        message:
          errCode === "otp_expired"
            ? "Este link de redefinição expirou. Solicite um novo abaixo."
            : decodeURIComponent(description),
      });
      return;
    }

    // Se já existe sessão (SDK processou o hash), libera o formulário.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus({ kind: "ready" });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStatus({ kind: "ready" });
      }
    });

    // Fallback: se em 4s não há sessão nem erro, considera link inválido.
    const timer = window.setTimeout(() => {
      setStatus((prev) =>
        prev.kind === "checking"
          ? {
              kind: "expired",
              message:
                "Não conseguimos validar este link. Ele pode ter sido usado ou ter expirado.",
            }
          : prev,
      );
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [hashParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    // Desloga a sessão de recovery para forçar novo login com a senha nova.
    await supabase.auth.signOut();
    setStatus({ kind: "success" });
    window.setTimeout(() => navigate("/login", { replace: true }), 2500);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-hero-gradient-subtle px-4 py-8">
      <div className="mx-auto w-full max-w-sm">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm card-elevated space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <BrandLogo />
            <div className="space-y-1">
              <h1 className="text-xl font-semibold font-display">
                Redefinir senha
              </h1>
              <p className="text-sm text-muted-foreground">
                Escolha uma nova senha para o seu acesso.
              </p>
            </div>
          </div>

          {status.kind === "checking" && (
            <p className="text-sm text-muted-foreground text-center">
              Validando link…
            </p>
          )}

          {status.kind === "expired" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{status.message}</p>
              </div>
              <Link to="/login" className="block">
                <Button variant="outline" className="w-full">
                  Solicitar novo link
                </Button>
              </Link>
            </div>
          )}

          {status.kind === "success" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Senha atualizada. Redirecionando para o login…
                </p>
              </div>
            </div>
          )}

          {status.kind === "ready" && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 8 caracteres.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Salvando…" : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
