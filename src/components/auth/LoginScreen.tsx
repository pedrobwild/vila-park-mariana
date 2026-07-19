import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

function BrandLogo() {
  return (
    <span className="flex items-baseline gap-1 font-display text-xl font-bold leading-none">
      <span className="text-foreground">Vila</span>
      <span className="text-accent">Park</span>
      <span className="text-xs font-medium text-muted-foreground ml-1">Vila Mariana</span>
    </span>
  );
}

export default function LoginScreen() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const t = {
    title: isEn ? "Restricted area" : "Área restrita",
    subtitle: isEn
      ? "Sign in to access the internal panel."
      : "Faça login para acessar o painel interno.",
    email: "E-mail",
    password: isEn ? "Password" : "Senha",
    submit: isEn ? "Sign in" : "Entrar",
    submitting: isEn ? "Signing in…" : "Entrando…",
    error: isEn ? "Invalid credentials." : "Credenciais inválidas.",
    hint: isEn
      ? "Access is granted by the administrator."
      : "O acesso é liberado pela administração.",
    back: isEn ? "Back to site" : "Voltar ao site",
    forgot: isEn ? "Forgot my password" : "Esqueci minha senha",
    resetTitle: isEn ? "Reset password" : "Redefinir senha",
    resetHint: isEn
      ? "We will email you a link to create a new password."
      : "Enviaremos um link no seu e-mail para criar uma nova senha.",
    send: isEn ? "Send link" : "Enviar link",
    sending: isEn ? "Sending…" : "Enviando…",
    sent: isEn
      ? "Check your inbox for the reset link."
      : "Verifique sua caixa de entrada para o link de redefinição.",
    backLogin: isEn ? "Back to sign in" : "Voltar ao login",
  };

  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(t.error);
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setInfo(t.sent);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-hero-gradient-subtle px-4 py-8">
      <div className="mx-auto w-full max-w-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm card-elevated space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <BrandLogo />
            <div className="space-y-1">
              <h1 className="text-xl font-semibold font-display">
                {mode === "signin" ? t.title : t.resetTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                {mode === "signin" ? t.subtitle : t.resetHint}
              </p>
            </div>
          </div>

          {mode === "signin" ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">{t.email}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t.password}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.submitting : t.submit}
              </Button>
              <button
                type="button"
                onClick={() => { setMode("reset"); setError(null); setInfo(null); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                {t.forgot}
              </button>
              <p className="text-xs text-muted-foreground text-center">{t.hint}</p>
            </form>
          ) : (
            <form onSubmit={onReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">{t.email}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              {info && <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">{info}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t.sending : t.send}
              </Button>
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                {t.backLogin}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
